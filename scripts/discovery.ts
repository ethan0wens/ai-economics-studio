import Decimal from 'decimal.js';
import { z } from 'zod';
import type { RetailRecord } from '../src/catalogue';
import { inventorySchema, offeringMeter, offerings, priceComponentSchema, type Component, type Offering } from '../src/offerings';
import scope from '../catalogue/scope.json';

export const retailOrigin = 'https://prices.azure.com';
export const retailPath = '/api/retail/prices';
const regionCode = z.string().regex(/^[a-z0-9-]+$/);
const signature = z.strictObject({
  service: z.string().min(1), product: z.string().min(1), sku: z.string().min(1), meter: z.string().min(1),
  armSku: z.string().min(1).optional(),
});
const scopeSchema = z.strictObject({
  currency: z.literal('GBP'), regions: z.array(regionCode).min(1),
  templates: z.array(z.strictObject({
    id: z.string().min(1), name: z.string().min(1), family: z.string().min(1), kind: z.string().min(1),
    regions: z.array(regionCode).min(1), evidence: z.url(), note: z.string().optional(), model: z.unknown().optional(),
    deployment: z.string().optional(), selectable: z.literal(false).optional(), retained: z.record(regionCode, z.string()).optional(),
    components: z.array(priceComponentSchema.extend({ azure: signature.optional() })).min(1),
  })),
});
type Signature = z.infer<typeof signature>;
type Target = { offer: Offering; component: Component; signature: Signature };
type RetailPage = { Items: Record<string, unknown>[]; NextPageLink: string | null };
type ReadPage = (url: URL) => Promise<RetailPage>;
type ProductGroup = { targets: Target[]; service: string; product: string };
const azureTariff = z.object({
  meterId: z.uuid(), effectiveStartDate: z.iso.datetime({ offset: true }),
  retailPrice: z.number().nonnegative().max(1e9), tierMinimumUnits: z.number().nonnegative(),
});

export function inventoryPlan(definition: unknown = scope, retained: readonly Offering[] = offerings) {
  const parsed = scopeSchema.parse(definition);
  const offers = new Map(retained.map(offer => [offer.id, offer]));
  const usedAliases = new Set<string>();
  const targets: Target[] = [];
  for (const template of parsed.templates) {
    const { id, regions, retained: aliases, components, ...details } = template;
    const plain = components.map(({ azure, ...component }) => {
      void azure;
      return component;
    });
    if (new Set(regions).size !== regions.length || Object.keys(aliases ?? {}).some(region => !regions.includes(region))) {
      throw new Error(`Invalid region list for ${id}.`);
    }
    for (const region of regions) {
      if (!parsed.regions.includes(region) && region !== 'gb') throw new Error(`Unreviewed region ${region} for ${id}.`);
      const alias = aliases?.[region];
      const proposed = inventorySchema.parse([{ ...details, id: `${id}-${region}`, region, currency: parsed.currency, components: plain }])[0];
      const existing = alias && offers.get(alias);
      if (alias && (!existing || usedAliases.has(alias))) throw new Error(`Invalid retained alias ${alias} for ${id}.`);
      if (!existing && offers.has(proposed.id)) throw new Error(`Duplicate generated configuration ${proposed.id}.`);
      if (existing && (existing.kind !== proposed.kind || existing.family !== proposed.family || existing.region !== region ||
          existing.currency !== proposed.currency || (existing.kind === 'model-deployment' && proposed.kind === 'model-deployment' &&
          (existing.model.id !== proposed.model.id || existing.model.version !== proposed.model.version ||
            existing.model.sku !== proposed.model.sku || existing.model.mode !== proposed.model.mode)))) {
        throw new Error(`Billing identity changed for retained configuration ${existing.id}: ${JSON.stringify([existing.kind, existing.family, existing.region, existing.currency, "model" in existing && existing.model])} ${JSON.stringify([proposed.kind, proposed.family, region, proposed.currency, "model" in proposed && proposed.model])}.`);
      }
      const original = existing ? existing.components : [];
      const offer = existing ? {
        ...proposed, ...existing, components: [...original, ...plain.filter(component => !original.some(item => item.id === component.id))],
      } : proposed;
      offers.set(offer.id, offer);
      if (alias) usedAliases.add(alias);
      for (const component of components) {
        if (offer.selectable !== false && component.azure && !original.some(item => item.id === component.id)) {
          targets.push({ offer, component: component.id, signature: component.azure });
        }
      }
    }
  }
  return { inventory: inventorySchema.parse([...offers.values()]), targets };
}

const quoted = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const equals = (key: string, value: string) => `${key} eq ${quoted(value)}`;
const oneOf = (key: string, values: string[]) => '(' + [...new Set(values)].map(value => equals(key, value)).join(' or ') + ')';

async function scan(group: ProductGroup, readPage: ReadPage, checkedAt: string) {
  const first = new URL(retailPath, retailOrigin);
  first.searchParams.set('api-version', '2023-01-01-preview');
  first.searchParams.set('currencyCode', quoted(group.targets[0].offer.currency));
  first.searchParams.set('$filter', [
    equals('serviceName', group.service), equals('productName', group.product), equals('priceType', 'Consumption'),
    oneOf('armRegionName', group.targets.map(target => target.offer.region)),
    oneOf('skuName', group.targets.map(target => target.signature.sku)),
  ].join(' and '));
  const visited = new Set<string>();
  const accepted = new Map<Target, Record<string, unknown>[]>();
  let next: URL | null = first;
  while (next) {
    if (next.origin !== retailOrigin || next.pathname !== retailPath || next.username || next.password || visited.has(next.href) || visited.size >= 30) {
      throw new Error(`Invalid or excessive discovery pagination for ${group.service} / ${group.product}.`);
    }
    visited.add(next.href);
    const page = await readPage(next);
    for (const row of page.Items) {
      if (row.serviceName !== group.service || row.productName !== group.product || row.type !== 'Consumption') continue;
      for (const match of group.targets) {
        if (row.armRegionName !== match.offer.region || row.skuName !== match.signature.sku || row.meterName !== match.signature.meter ||
            (match.signature.armSku && row.armSkuName !== match.signature.armSku)) continue;
        const rows = accepted.get(match);
        if (rows) rows.push(row);
        else accepted.set(match, [row]);
      }
    }
    next = page.NextPageLink ? new URL(page.NextPageLink) : null;
  }
  return group.targets.flatMap(({ offer, component, signature }, index) => {
    const meter = offeringMeter(offer, component);
    const rows = accepted.get(group.targets[index]) ?? [];
    if (!meter || !rows.length) return [];
    const eligible = [];
    for (const row of rows) {
      const tariff = azureTariff.safeParse(row);
      if (!tariff.success) return [];
      const date = Date.parse(tariff.data.effectiveStartDate);
      if (date > Date.parse(checkedAt)) continue;
      if (row.currencyCode !== offer.currency || row.unitOfMeasure !== meter.unit) return [];
      eligible.push({ ...tariff.data, date });
    }
    const latest = Math.max(...eligible.map(row => row.date));
    const active = eligible.filter(row => row.date === latest);
    const current = active[0];
    if (!current || new Set(eligible.map(row => row.meterId)).size !== 1 ||
        active.some(row => row.tierMinimumUnits !== 0 || row.retailPrice !== current.retailPrice) || current.retailPrice <= 0) return [];
    const rate: RetailRecord = {
      ...meter, currency: offer.currency, product: signature.product, price: new Decimal(current.retailPrice).toFixed(),
      effectiveAt: current.effectiveStartDate, source: first.href, verification: 'azure-retail-api',
      offeringId: offer.id, component, meterName: signature.meter, publishedSku: signature.sku,
      sourceMeterId: current.meterId, publishedUnit: meter.unit,
    };
    return [rate];
  });
}

export async function discoverPrices(targets: Target[], readPage: ReadPage, checkedAt: string) {
  const groups = new Map<string, ProductGroup>();
  for (const target of targets) {
    const { service, product } = target.signature;
    const key = JSON.stringify([service, product, target.offer.currency]);
    let group = groups.get(key);
    if (!group) {
      group = { targets: [], service, product };
      groups.set(key, group);
    }
    group.targets.push(target);
  }
  const batches: ProductGroup[] = [];
  for (const group of groups.values()) {
    const skus = [...new Set(group.targets.map(target => target.signature.sku))];
    for (let offset = 0; offset < skus.length; offset += 8) {
      const batch = skus.slice(offset, offset + 8);
      batches.push({ ...group, targets: group.targets.filter(target => batch.includes(target.signature.sku)) });
    }
  }
  const records: RetailRecord[] = [];
  for (let offset = 0; offset < batches.length; offset += 4) {
    const prices = await Promise.all(batches.slice(offset, offset + 4).map(batch => scan(batch, readPage, checkedAt)));
    records.push(...prices.flat());
  }
  return records;
}

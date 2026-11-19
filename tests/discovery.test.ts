import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { discoverPrices, inventoryPlan } from '../scripts/discovery';
import { refresh, validate } from '../scripts/pricing';
import { catalogueSchema, emptyCatalogue } from '../src/catalogue';
import { catalogueCoverage } from '../src/coverage';

const at = '2026-11-20T08:00:00Z';
const signature = {
  service: 'Fictional fixture service', product: 'Fictional fixture plan', sku: 'S1', armSku: 'Standard_S1', meter: 'S1 Monthly requests',
};
const component = { id: 'usage', label: 'Requests', unit: '1K Requests', quantityPerUnit: 1000 };
const selectable = {
  id: 'fictional-s1', kind: 'supporting-resource', family: 'infrastructure', name: 'Fictional S1',
  regions: ['uksouth', 'westeurope'], evidence: 'https://example.com/',
  components: [{ ...component, azure: signature }],
};
const review = {
  currency: 'GBP', regions: ['uksouth', 'westeurope'], templates: [
    selectable,
    { ...selectable, id: 'fictional-manual', components: [component] },
    { ...selectable, id: 'fictional-unsupported', selectable: false, components: [component] },
  ],
};
const sourceMeterId = '9e5f8e9f-ad59-4558-9576-c929a578b621';
const row = {
  serviceName: signature.service, productName: signature.product, skuName: signature.sku, armSkuName: signature.armSku,
  meterName: signature.meter, type: 'Consumption', unitOfMeasure: component.unit, currencyCode: 'GBP', armRegionName: 'uksouth',
  meterId: sourceMeterId, effectiveStartDate: '2026-11-01T00:00:00Z', retailPrice: 2.5, tierMinimumUnits: 0,
};
const page = (Items: Record<string, unknown>[], NextPageLink: string | null = null) => ({ Items, NextPageLink });

it('generates independently useful regional inventory and selects only matching, currently effective provider rows across pages', async () => {
  const { inventory, targets } = inventoryPlan(review, []);
  const read = vi.fn()
    .mockResolvedValueOnce(page([
      { ...row, retailPrice: 1, effectiveStartDate: '2026-10-01T00:00:00Z' },
      { ...row, type: 'Reservation' }, { ...row, productName: signature.product + ' Windows' }, { ...row, meterName: signature.meter + ' Spot' },
      { ...row, armSkuName: 'Standard_S2' }, { ...row, armRegionName: 'eastus2' }, { ...row, skuName: 'S2' },
    ], 'https://prices.azure.com/api/retail/prices?$skip=1000'))
    .mockResolvedValueOnce(page([row, { ...row, retailPrice: 99, effectiveStartDate: '2026-12-01T00:00:00Z' }]));
  const rates = await discoverPrices(targets, read, at);
  expect(rates).toEqual([expect.objectContaining({ meterId: 'fictional-s1-uksouth/usage', sourceMeterId, price: '2.5', quantityPerUnit: 1000, region: 'uksouth' })]);
  expect(read).toHaveBeenCalledTimes(2);
  expect(read.mock.calls[0][0].searchParams.get('$filter')).toContain("armRegionName eq 'westeurope'");
  expect(read.mock.calls[0][0].searchParams.get('currencyCode')).toBe("'GBP'");
  expect(catalogueCoverage({ ...emptyCatalogue, records: rates, inventory }, at).find(group => group.family === 'infrastructure'))
    .toMatchObject({ discovered: 6, supported: 4, fully: 1, manual: 3, unsupported: 2 });
  expect(catalogueSchema.safeParse({ schemaVersion: '1.0.0', inventory, records: [{ ...rates[0], quantityPerUnit: 1 }] }).success).toBe(false);
  expect(inventoryPlan().inventory.length).toBeGreaterThan(300);
});

it('refuses conflicting identities, unsupported tiers and changed units or currency', async () => {
  const { targets } = inventoryPlan(review, []);
  for (const candidate of [
    { ...row, meterId: '6c102eb3-e8b0-4834-b7f7-155a50808946' }, { ...row, retailPrice: 99 },
    { ...row, tierMinimumUnits: 1000 }, { ...row, unitOfMeasure: '1M Requests' }, { ...row, currencyCode: 'USD' },
  ]) {
    await expect(discoverPrices(targets, async () => page([row, candidate]), at)).resolves.toEqual([]);
  }
  await expect(discoverPrices(targets, async () => page([], 'https://example.com/api/retail/prices'), at))
    .rejects.toThrow('Invalid or excessive discovery pagination');
});

it('accepts the reviewed graduated schedule and rejects missing or added bands', async () => {
  const graduated = { ...selectable, components: [{ ...component, azure: { ...signature, tierStarts: [0, 1000] } }] };
  const { targets } = inventoryPlan({ ...review, templates: [graduated] }, []);
  const bands = [{ ...row, retailPrice: 0 }, { ...row, tierMinimumUnits: 1000 }];
  await expect(discoverPrices(targets, async () => page(bands), at)).resolves.toEqual([
    expect.objectContaining({ price: '0', tiers: [{ from: 0, price: '0' }, { from: 1000, price: '2.5' }] }),
  ]);
  await expect(discoverPrices(targets, async () => page([bands[0]]), at)).resolves.toEqual([]);
  await expect(discoverPrices(targets, async () => page([...bands, { ...row, tierMinimumUnits: 10000 }]), at)).resolves.toEqual([]);
});

it('preserves a validated expanded snapshot when a provider meter vanishes or moves to a different identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'studio-discovery-'));
  const manifest = join(root, 'manifest.json');
  const plan = inventoryPlan(review, []);
  const pinned = {
    name: 'Fictional anchor', service: signature.service, product: signature.product, sku: signature.sku, armSku: signature.armSku,
    region: 'uksouth', currency: 'GBP', meter: signature.meter, unit: component.unit, quantityPerUnit: 1000,
    offeringId: 'fictional-manual-uksouth', component: 'usage' as const,
  };
  // Model a stable, previously reviewed provider identity on the anchor.
  const anchor = plan.inventory.find(offer => offer.id === pinned.offeringId)!;
  anchor.components[0].meterId = sourceMeterId;
  anchor.components[0].sku = signature.armSku;
  try {
    await writeFile(manifest, JSON.stringify(emptyCatalogue.manifest));
    const simulate = (candidate: typeof row | undefined): typeof fetch => async url => {
      const scope = new URL(String(url)).searchParams.get('$filter') ?? '';
      return Response.json(page(scope.includes('skuName') ? (candidate ? [candidate] : []) : [row]));
    };
    await refresh(root, [pinned], simulate(row), at, [], plan);
    const bytes = await readFile(manifest, 'utf8');
    await expect(refresh(root, [pinned], simulate(undefined), at, [], plan)).rejects.toThrow('Coverage dropped');
    await expect(refresh(root, [pinned], simulate({ ...row, meterId: 'fc6c1e9e-b3e7-4d46-9f2d-5fd484f7ee03' }), at, [], plan)).rejects.toThrow('changed the meter identity');
    expect(await readFile(manifest, 'utf8')).toBe(bytes);
    expect((await validate(root)).records).toHaveLength(2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

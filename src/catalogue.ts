import { z } from 'zod';
import { decodeUtf8, httpsUrl, parseBoundedJson, readResponseBytes } from './untrusted-data';
import { componentId, inventorySchema, offeringMeter, type Component, type Offering } from './offerings';
import { currency, meterKey, version, type Meter } from './domain';

export const retailDocs = 'https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices';
const priceValue = z.string().max(64).regex(/^\d+(\.\d+)?$/).refine(value => Number(value) <= 1e9);
export const sourceRecord = z.strictObject({
  meterId: z.string().min(1).max(300), sku: z.string().min(1).max(300), region: z.string().regex(/^[a-z0-9-]{1,80}$/), unit: z.string().min(1).max(300),
  quantityPerUnit: z.number().min(1).max(1e15), priceType: z.literal('Consumption'), currency,
  price: priceValue,
  tiers: z.array(z.strictObject({ from: z.number().nonnegative(), price: priceValue })).min(2).max(20).optional(),
  effectiveAt: z.iso.datetime({ offset: true }), source: z.url().max(4096),
  product: z.string().min(1).max(300), verification: z.enum(['azure-retail-api', 'microsoft-commercial']),
  offeringId: z.string().min(1).optional(), component: componentId.optional(),
  meterName: z.string().optional(), publishedSku: z.string().optional(),
  sourceMeterId: z.uuid().optional(), publishedUnit: z.string().optional(),
  review: z.strictObject({ checkedAt: z.iso.datetime({ offset: true }), expiresAt: z.iso.datetime({ offset: true }), terms: z.string().min(1), term: z.enum(['annual', 'monthly', 'monthly-pack']).optional(), identity: z.string().regex(/^[A-Z0-9]+:[A-Z0-9]+$/i).optional(), corroboration: z.array(z.url().refine(url => /^https:\/\/www\.microsoft\.com\/en-gb\//.test(url))).optional() }).optional(),
}).superRefine((record, ctx) => {
  const invalid = () => ctx.addIssue({ code: 'custom', message: 'Invalid price source or commercial review metadata' });
  const source = httpsUrl(record.source, ['prices.azure.com', 'www.microsoft.com', 'learn.microsoft.com']);
  if (record.tiers ? record.verification !== 'azure-retail-api' || record.tiers[0].from !== 0 ||
    record.tiers[0].price !== record.price || !record.tiers.some(tier => Number(tier.price) > 0) ||
    record.tiers.some((tier, index) => index > 0 && tier.from <= record.tiers![index - 1].from)
    : Number(record.price) <= 0) invalid();
  if (Boolean(record.offeringId) !== Boolean(record.component)) invalid();
  if (record.verification === 'azure-retail-api') {
    if (source?.hostname !== 'prices.azure.com' || source.pathname !== '/api/retail/prices' || record.review) invalid();
  } else if (!source || source.hostname === 'prices.azure.com' || !record.offeringId || !record.review ||
    Date.parse(record.review.expiresAt) <= Date.parse(record.review.checkedAt)) invalid();
});
export const catalogueSchema = z.strictObject({
  schemaVersion: z.literal(version), records: z.array(sourceRecord).max(5000), inventory: inventorySchema.optional(),
}).refine(value => new Set(value.records.map(item => JSON.stringify([meterKey(item), item.currency]))).size === value.records.length, 'Duplicate catalogue identity')
  .refine(({ records }) => {
    const bound = records.filter(record => record.offeringId);
    return new Set(bound.map(record => JSON.stringify([record.offeringId, record.component, record.currency]))).size === bound.length;
  }, 'Duplicate configuration component')
  .refine(({ records, inventory }) => {
    if (!inventory) return true;
    const offers = new Map(inventory.map(offer => [offer.id, offer]));
    return records.every(record => {
      if (!record.offeringId || !record.component) return false;
      const offer = offers.get(record.offeringId);
      const meter = offer && offeringMeter(offer, record.component);
      return offer?.selectable !== false && offer?.currency === record.currency && meter && meterKey(meter) === meterKey(record);
    });
  }, 'Retail rate does not match the published billing configuration');
export const manifestSchema = z.strictObject({
  schemaVersion: z.literal(version), catalogueId: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  lastCheckedAt: z.iso.datetime({ offset: true }).nullable(), records: z.number().int().nonnegative().max(5000),
  previous: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
}).refine(item => item.catalogueId ? item.lastCheckedAt !== null && item.records > 0 && item.previous !== item.catalogueId : item.lastCheckedAt === null && item.records === 0 && item.previous === null);
export type Manifest = z.infer<typeof manifestSchema>;
export type RetailRecord = z.infer<typeof sourceRecord>;
export type Catalogue = { manifest: Manifest; records: RetailRecord[]; inventory?: Offering[]; fallback?: boolean };
export const emptyCatalogue: Catalogue = {
  manifest: { schemaVersion: version, catalogueId: null, lastCheckedAt: null, records: 0, previous: null }, records: [],
};
export const maxCatalogueBytes = 6_000_000;
export const maxManifestBytes = 8_192;
export function catalogueFilename(hash: string) {
  return `catalogue-${hash}.json`;
}

async function fetchAsset(name: string, cache: RequestCache) {
  const response = await fetch(`${import.meta.env.BASE_URL}pricing/${name}`, { cache, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Catalogue asset returned HTTP ${response.status}.`);
  return response;
}

async function readAsset(hash: string) {
  const raw = await readResponseBytes(await fetchAsset(catalogueFilename(hash), 'default'), maxCatalogueBytes, 'Pricing catalogue');
  const digest = await crypto.subtle.digest('SHA-256', raw);
  const actual = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== hash) throw new Error('Catalogue integrity check failed.');
  return catalogueSchema.parse(parseBoundedJson(decodeUtf8(raw), 275_000, 'Pricing catalogue'));
}

export async function loadCatalogue(): Promise<Catalogue> {
  const raw = await readResponseBytes(await fetchAsset('manifest.json', 'no-cache'), maxManifestBytes, 'Pricing manifest');
  const manifest = manifestSchema.parse(parseBoundedJson(decodeUtf8(raw), 30, 'Pricing manifest'));
  if (!manifest.catalogueId) return { manifest, records: [] };
  try {
    const { records, inventory } = await readAsset(manifest.catalogueId);
    if (records.length !== manifest.records) throw new Error('Catalogue record count mismatch.');
    return { manifest, records, inventory };
  } catch (error) {
    if (!manifest.previous) throw error;
    const { records, inventory } = await readAsset(manifest.previous);
    return { manifest: { ...manifest, catalogueId: manifest.previous, records: records.length, lastCheckedAt: null }, records, inventory, fallback: true };
  }
}

export function isCurrentRate(record: RetailRecord, at: string) {
  const timestamp = Date.parse(at);
  return Date.parse(record.effectiveAt) <= timestamp &&
    (!record.review || (Date.parse(record.review.checkedAt) <= timestamp && Date.parse(record.review.expiresAt) >= timestamp));
}

export function findRetail(records: RetailRecord[], meter: Meter, code: string, at: string) {
  const labels = records.filter(record => record.currency === code && meterKey(record) === meterKey(meter) && isCurrentRate(record, at));
  return labels.length === 1 ? labels[0] : undefined;
}

export function resolveOffering(records: RetailRecord[], offering: Offering, component: Component, code: string, at: string) {
  const meter = offeringMeter(offering, component);
  if (!meter || offering.currency !== code) return;
  const matching = records.filter(record => record.offeringId === offering.id && record.component === component &&
    (meterKey(meter) === meterKey(record)) && record.currency === code &&
    isCurrentRate(record, at));
  if (matching.length === 1) return matching[0];
}

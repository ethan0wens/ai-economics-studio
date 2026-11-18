import { z } from 'zod';
import { currency, meterKey, version, type Meter } from './domain';

export const retailDocs = 'https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices';
export const sourceRecord = z.strictObject({
  meterId: z.string().min(1), sku: z.string().min(1), region: z.string().min(1), unit: z.string().min(1),
  quantityPerUnit: z.number().positive(), priceType: z.literal('Consumption'), currency,
  price: z.string().regex(/^\d+(\.\d+)?$/).refine(value => Number.isFinite(Number(value)) && Number(value) > 0),
  effectiveAt: z.iso.datetime({ offset: true }), source: z.url().refine(value => new URL(value).origin === 'https://prices.azure.com'),
  product: z.string().min(1), verification: z.literal('azure-retail-api'),
});
export const catalogueSchema = z.strictObject({
  schemaVersion: z.literal(version), records: z.array(sourceRecord).max(5000),
}).refine(value => new Set(value.records.map(item => JSON.stringify([meterKey(item), item.currency]))).size === value.records.length, 'Duplicate catalogue identity');
export const manifestSchema = z.strictObject({
  schemaVersion: z.literal(version), catalogueId: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  lastCheckedAt: z.iso.datetime({ offset: true }).nullable(), records: z.number().int().nonnegative(),
  previous: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
}).refine(item => item.catalogueId ? item.lastCheckedAt !== null && item.records > 0 : item.lastCheckedAt === null && item.records === 0 && item.previous === null);
export type Manifest = z.infer<typeof manifestSchema>;
export type RetailRecord = z.infer<typeof sourceRecord>;
export type Catalogue = { manifest: Manifest; records: RetailRecord[]; fallback?: boolean };
export const emptyCatalogue: Catalogue = {
  manifest: { schemaVersion: version, catalogueId: null, lastCheckedAt: null, records: 0, previous: null }, records: [],
};
export function catalogueFilename(hash: string) {
  return `catalogue-${hash}.json`;
}

async function fetchAsset(name: string, cache: RequestCache) {
  const response = await fetch(`${import.meta.env.BASE_URL}pricing/${name}`, { cache, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Catalogue asset returned HTTP ${response.status}.`);
  return response;
}

async function readAsset(hash: string) {
  const raw = await (await fetchAsset(catalogueFilename(hash), 'default')).text();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const actual = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== hash) throw new Error('Catalogue integrity check failed.');
  return catalogueSchema.parse(JSON.parse(raw)).records;
}

export async function loadCatalogue(): Promise<Catalogue> {
  const manifest = manifestSchema.parse(await (await fetchAsset('manifest.json', 'no-cache')).json());
  if (!manifest.catalogueId) return { manifest, records: [] };
  try {
    const records = await readAsset(manifest.catalogueId);
    if (records.length !== manifest.records) throw new Error('Catalogue record count mismatch.');
    return { manifest, records };
  } catch (error) {
    if (!manifest.previous) throw error;
    const records = await readAsset(manifest.previous);
    return { manifest: { ...manifest, catalogueId: manifest.previous, records: records.length, lastCheckedAt: null }, records, fallback: true };
  }
}

export function findRetail(records: RetailRecord[], meter: Meter, code: string, at: string) {
  const labels = records.filter(record => record.currency === code && meterKey(record) === meterKey(meter) && Date.parse(record.effectiveAt) <= Date.parse(at));
  return labels.length === 1 ? labels[0] : undefined;
}

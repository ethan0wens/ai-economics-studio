import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { catalogueFilename, catalogueSchema, manifestSchema, type Manifest, type RetailRecord } from '../src/catalogue';
import { meterKey, version } from '../src/domain';
import { mappings, type Mapping } from './retail-mappings';

const origin = 'https://prices.azure.com';
const pathname = '/api/retail/prices';
const directory = fileURLToPath(new URL('../public/pricing/', import.meta.url));
const digest = (source: string) => createHash('sha256').update(source).digest('hex');
const pageSchema = z.object({ Items: z.array(z.record(z.string(), z.unknown())), NextPageLink: z.url().nullable() });
const retailer = z.object({
  retailPrice: z.number().positive().max(1e9), effectiveStartDate: z.iso.datetime({ offset: true }),
  meterId: z.uuid(), currencyCode: z.string().length(3),
});
type Fetcher = typeof fetch;

function target(mapping: Mapping) {
  const escaped = (value: string) => "'" + value.replaceAll("'", "''") + "'";
  const url = new URL(pathname, origin);
  url.searchParams.set('api-version', '2023-01-01-preview');
  url.searchParams.set('currencyCode', escaped(mapping.currency));
  url.searchParams.set('$filter', [
    ['serviceName', mapping.service], ['armRegionName', mapping.region], ['armSkuName', mapping.armSku],
    ['priceType', 'Consumption'],
  ].map(([key, value]) => `${key} eq ${escaped(value)}`).join(' and '));
  return url;
}

async function retailPage(url: URL, request: Fetcher) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let response: Response | undefined;
    try {
      response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
    }
    if (response?.ok) return pageSchema.parse(await response.json());
    if (response && ((response.status !== 429 && response.status < 500) || attempt === maxAttempts - 1)) {
      throw new Error(`Azure Retail Prices API returned HTTP ${response.status}.`);
    }
    const retry = Number(response?.headers.get('Retry-After'));
    await new Promise(resolve => setTimeout(resolve, retry > 0 ? Math.min(retry, 15) * 1000 : 500 * 2 ** attempt));
  }
  throw new Error('Azure Retail Prices API did not respond.');
}

export async function ingest(mapping: Mapping, request: Fetcher = fetch, checkedAt = new Date().toISOString()): Promise<RetailRecord> {
  const first = target(mapping);
  const visited = new Set<string>();
  const exact: z.infer<typeof retailer>[] = [];
  let next: URL | null = first;
  while (next) {
    if (next.origin !== origin || next.pathname !== pathname || next.username || next.password || visited.has(next.href) || visited.size >= 30) {
      throw new Error(`Invalid or excessive pagination for ${mapping.name}.`);
    }
    visited.add(next.href);
    const page = await retailPage(next, request);
    for (const row of page.Items) {
      if (row.serviceName !== mapping.service || row.armRegionName !== mapping.region || row.productName !== mapping.product ||
          row.skuName !== mapping.sku || row.armSkuName !== mapping.armSku || row.meterName !== mapping.meter ||
          row.type !== 'Consumption' || row.tierMinimumUnits !== 0 || (mapping.meterId && row.meterId !== mapping.meterId)) continue;
      if (row.unitOfMeasure !== mapping.unit || row.currencyCode !== mapping.currency) throw new Error(`Unit or currency changed for ${mapping.name}.`);
      const parsed = retailer.parse(row);
      if (Date.parse(parsed.effectiveStartDate) <= Date.parse(checkedAt)) exact.push(parsed);
    }
    next = page.NextPageLink ? new URL(page.NextPageLink) : null;
  }
  exact.sort((a, b) => Date.parse(b.effectiveStartDate) - Date.parse(a.effectiveStartDate));
  const selected = exact[0];
  if (!selected || new Set(exact.map(item => item.meterId)).size !== 1 ||
      exact.filter(item => Date.parse(item.effectiveStartDate) === Date.parse(selected.effectiveStartDate)).length !== 1) {
    throw new Error(`Expected one exact current Azure meter for ${mapping.name}; found missing or ambiguous coverage.`);
  }
  return {
    meterId: selected.meterId, currency: selected.currencyCode, sku: mapping.armSku, product: mapping.product,
    region: mapping.region, priceType: 'Consumption', unit: mapping.unit, quantityPerUnit: mapping.quantityPerUnit,
    price: new Decimal(selected.retailPrice).toFixed(), effectiveAt: selected.effectiveStartDate, source: first.href,
    verification: 'azure-retail-api',
  };
}

async function readVersion(root: string, hash: string) {
  const source = await readFile(join(root, catalogueFilename(hash)), 'utf8');
  if (digest(source) !== hash) throw new Error(`Catalogue checksum mismatch for ${hash}.`);
  return catalogueSchema.parse(JSON.parse(source)).records;
}

export async function validate(root: string) {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')));
  const records = manifest.catalogueId ? await readVersion(root, manifest.catalogueId) : [];
  if (records.length !== manifest.records) throw new Error('The manifest does not match its catalogue record count.');
  if (manifest.previous) await readVersion(root, manifest.previous);
  return { manifest, records };
}

export async function refresh(root: string, selectors: readonly Mapping[], request: Fetcher = fetch, checkedAt = new Date().toISOString()) {
  if (!selectors.length) throw new Error('No curated meter selectors are configured.');
  const prior = await validate(root);
  const records: RetailRecord[] = [];
  for (const mapping of selectors) records.push(await ingest(mapping, request, checkedAt));
  records.sort((a, b) => meterKey(a).localeCompare(meterKey(b)) || a.currency.localeCompare(b.currency));
  const payload = catalogueSchema.parse({ schemaVersion: version, records });
  for (const old of prior.records) {
    const candidate = records.find(row => meterKey(row) === meterKey(old) && row.currency === old.currency);
    if (!candidate) throw new Error(`Coverage dropped for meter ${old.meterId}; review the mapping before republishing.`);
    const change = new Decimal(candidate.price).div(old.price);
    if (change.greaterThan(1.5) || change.lessThan(.5)) throw new Error(`Price changed by more than 50% for ${old.meterId}; review before republishing.`);
  }
  const raw = JSON.stringify(payload, null, 2) + '\n';
  const hash = digest(raw);
  const manifest: Manifest = manifestSchema.parse({
    schemaVersion: version, catalogueId: hash, lastCheckedAt: checkedAt, records: records.length,
    previous: prior.manifest.catalogueId === hash ? prior.manifest.previous : prior.manifest.catalogueId,
  });
  await mkdir(root, { recursive: true });
  const filename = catalogueFilename(hash);
  const atomicWrite = async (name: string, contents: string) => {
    const temporary = join(root, `.${name}.${process.pid}.tmp`);
    try {
      await writeFile(temporary, contents);
      await rename(temporary, join(root, name));
    } finally { await rm(temporary, { force: true }); }
  };
  await atomicWrite(filename, raw);
  await atomicWrite('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  const retain = new Set([filename, manifest.previous && catalogueFilename(manifest.previous)]);
  for (const file of await readdir(root)) {
    if (/^catalogue-[a-f0-9]{64}\.json$/.test(file) && !retain.has(file)) await rm(join(root, file));
  }
  return manifest;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const command = process.argv[2];
  try {
    if (command === 'refresh') console.log(await refresh(directory, mappings));
    else if (command === 'validate') {
      const { manifest } = await validate(directory);
      console.log(`Catalogue valid: ${manifest.records} verified records${manifest.catalogueId ? ` (${manifest.catalogueId})` : ' in unpublished bootstrap state'}.`);
    } else throw new Error('Expected refresh or validate.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

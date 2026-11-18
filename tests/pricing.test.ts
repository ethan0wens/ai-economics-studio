import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ingest, refresh, validate } from '../scripts/pricing';
import { mappings } from '../scripts/retail-mappings';
import { emptyCatalogue } from '../src/catalogue';

const mapping = mappings[0];
const checkedAt = '2026-11-18T06:17:00Z';
const row = {
  serviceName: mapping.service, armRegionName: mapping.region, productName: mapping.product,
  skuName: mapping.sku, armSkuName: mapping.armSku, meterName: mapping.meter, type: 'Consumption',
  tierMinimumUnits: 0, meterId: '6fc1a193-7ab6-4aa7-99cd-830572093adb', currencyCode: mapping.currency,
  unitOfMeasure: mapping.unit, retailPrice: 1.23, effectiveStartDate: '2026-01-01T00:00:00Z',
};
const response = (Items: unknown[], NextPageLink: string | null = null) => Response.json({ Items, NextPageLink });

describe('Azure ingestion with fictional responses', () => {
  it('paginates exact GBP selectors and chooses the latest effective base tier', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response([{ ...row, retailPrice: .85, effectiveStartDate: '2025-01-01T00:00:00Z' }],
        'https://prices.azure.com/api/retail/prices?$skip=1000'))
      .mockResolvedValueOnce(response([row, { ...row, meterName: 'Other' }]));
    expect(await ingest(mapping, request, checkedAt)).toMatchObject({ price: '1.23', unit: mapping.unit, quantityPerUnit: 1 });
    const url = request.mock.calls[0][0] as URL;
    expect(url.searchParams.get('currencyCode')).toBe("'GBP'");
    expect(url.searchParams.get('$filter')).toContain(mapping.armSku);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('preserves last-known-good on corrupt, empty, suspicious or ambiguous results', async () => {
    const root = await mkdtemp(join(tmpdir(), 'studio-prices-'));
    const path = join(root, 'manifest.json');
    try {
      await writeFile(path, JSON.stringify(emptyCatalogue.manifest));
      const original = await refresh(root, mappings, async () => response([row]), checkedAt);
      const bytes = await readFile(path, 'utf8');
      for (const body of [
        () => response([]), () => Response.json({ wrong: [] }), () => response([row, row]),
        () => response([{ ...row, unitOfMeasure: 'wrong' }]), () => response([{ ...row, retailPrice: 9 }]),
        () => response([], 'https://example.com/api/retail/prices'),
      ]) {
        await expect(refresh(root, mappings, async () => body(), checkedAt)).rejects.toThrow();
        expect(await readFile(path, 'utf8')).toBe(bytes);
      }
      const updated = await refresh(root, mappings, async () => response([{ ...row, retailPrice: 1.25 }]), '2026-11-19T06:17:00Z');
      expect(updated.previous).toBe(original.catalogueId);
      expect((await validate(root)).records[0].price).toBe('1.25');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

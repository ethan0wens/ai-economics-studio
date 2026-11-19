import { describe, expect, it, vi } from 'vitest';
import { sourceReader } from '../scripts/microsoft-source';
import { inspectUkOffer } from '../scripts/microsoft-commercial';
import { claimMatches, claimsOnPage, defenderSuiteBase } from '../scripts/microsoft-claims';
import { capabilityCells, lifecycleCells, regionalCells, sizingCells } from '../scripts/microsoft-foundry';
import { exactModelRecords } from '../scripts/discovery';
import { reconcileOffer } from '../scripts/maintenance-commercial';
import { reconcileTechnical } from '../scripts/maintenance-technical';
import { promoteWorker, workerReleases } from '../scripts/worker-release';
import { isCurrentRate, type RetailRecord } from '../src/catalogue';
import { offeringMeter, type Offering } from '../src/offerings';

const at = '2027-01-10T12:00:00Z';
const url = 'https://www.microsoft.com/en-gb/fictional-test-only';
const licence: Offering = { id: 'fictional-seat-gb', name: 'Fictional Plan A', kind: 'licence-entitlement',
  family: 'licensing', region: 'gb', currency: 'GBP', components: [{ id: 'seats', label: 'Seats', unit: 'seat/month', quantityPerUnit: 1 }] };
const card = (name: string, copy: string, sku = '0011') => `<article><section><h3>${name}</h3>
  <p data-product-id="TESTPLAN42" data-sku-id="${sku}">${copy}</p></section></article>`;
const standard = (amount: string, term = 'paid yearly (Annual subscription)') =>
  `£${amount} user/month, ${term}. Price does not include VAT.`;
const old: RetailRecord = { ...offeringMeter(licence, 'seats')!, price: '10.00', currency: 'GBP', product: licence.name,
  offeringId: licence.id, component: 'seats', source: url, verification: 'microsoft-commercial',
  effectiveAt: '2026-11-19T10:00:00Z', review: { checkedAt: '2026-11-19T10:00:00Z', expiresAt: '2027-01-17T00:00:00Z',
    terms: 'Fictional annual offer excluding VAT', term: 'annual', identity: 'TESTPLAN42:0011' } };

describe('deterministic official evidence extraction with fictional source fragments', () => {
  it('publishes only an exact standard UK card price and scope', () => {
    const html = card('Fictional Plan A', standard('12.00')) + card('Fictional Plan A (no Teams)', standard('4.00'));
    expect(inspectUkOffer(html, [licence.name], 'seats')).toMatchObject({ offer: { price: '12.00', term: 'annual', identity: 'TESTPLAN42:0011' } });
    const next = reconcileOffer(licence, { url, html }, at, old);
    expect(next).toMatchObject({ record: { ...old, price: '12.00', effectiveAt: at, review: { checkedAt: at, term: 'annual' } } });
    const unchanged = reconcileOffer(licence, { url, html: card(licence.name, standard('10.00')) }, at, old);
    expect(unchanged.record?.effectiveAt).toBe(old.effectiveAt);
    expect(unchanged.record?.review?.checkedAt).toBe(at);
  });

  it('preserves previous evidence on contradiction, promotion, SKU changes and unavailable sources', () => {
    for (const html of [
      card(licence.name, standard('11.00')) + card(licence.name, standard('12.00')),
      card(licence.name, 'Starting from ' + standard('8.00')),
      card(licence.name, '£12.00 user/month, paid yearly. Includes VAT.'),
      card(licence.name, standard('12.00'), '9999'),
      card(licence.name, standard('22.00')),
      card('A different plan', standard('12.00')),
    ]) expect(reconcileOffer(licence, { url, html }, at, old).record).toBeUndefined();
    expect(reconcileOffer(licence, { url, error: 'HTTP 429' }, at, old).record).toBeUndefined();
    expect(reconcileOffer(licence, { url: url.replace('/en-gb/', '/en-us/'), html: card(licence.name, standard('12.00')) }, at, old).record).toBeUndefined();
    expect(isCurrentRate(old, '2027-01-18T00:00:00Z')).toBe(false);
    expect(reconcileOffer(licence, { url, html: card(licence.name, standard('12.00', 'Monthly subscription')) }, at, old))
      .toMatchObject({ conditional: true, record: { review: { term: 'monthly' } } });
  });

  it('does not accept diffuse or negated prerequisites as exact evidence', () => {
    const qualifier = 'Requires: Microsoft 365 E3; or Office 365 E3 and Enterprise Mobility + Security E3.';
    expect(defenderSuiteBase(claimsOnPage(`<p>${qualifier}</p>`))).toMatchObject({
      eligible: ['m365-e3-gb'], qualifyingBundles: [['o365-e3-gb', 'ems-e3-gb']],
    });
    expect(defenderSuiteBase(claimsOnPage(`<p>${qualifier} Additional plan required.</p>`))).toBeUndefined();
    expect(claimMatches('defender-office-plan2', claimsOnPage('<p>Defender for Office 365 Plan 2 offers everything in Plan 1.</p>'))).toBe(true);
    expect(claimMatches('defender-office-plan2', claimsOnPage('<p>Defender for Office 365 Plan 2 no longer includes what offers everything in Plan 1.</p>'))).toBe(false);
  });

  it('verifies exact table cells and flags conflicts without inferring from missing rows', () => {
    const table = (cell: string) => `<table><tr><th>Model</th><th>Version</th><th>uksouth</th><th>westeurope</th></tr>
      <tr><td>test-model</td><td>2027-01-01</td><td>${cell}</td><td></td></tr></table>`;
    expect(regionalCells('<h2>Global Standard</h2>' + table('✅'))).toMatchObject(
      new Map([['test-model|2027-01-01|globalstandard|uksouth', { status: 'compatible' }]]));
    expect(regionalCells('<h2>Global Standard</h2>' + table('✅') + table('❌')).get('test-model|2027-01-01|globalstandard|uksouth')).toBeNull();
    expect(regionalCells('<h2>Other data</h2>' + table('✅')).size).toBe(0);
    expect(regionalCells('<h2>Global Standard</h2>' + table('✅')).has('test-model|2027-01-01|globalstandard|westeurope')).toBe(false);
  });

  it('adds a previously unseen model version with independent billing and lifecycle evidence', () => {
    const table = (header: string[], rows: string[][]) => '<table><tr>' + header.map(x => `<th>${x}</th>`).join('') + '</tr>' +
      rows.map(row => '<tr>' + row.map(x => `<td>${x}</td>`).join('') + '</tr>').join('') + '</table>';
    const regional = table(['Model', 'Version', 'uksouth'], [['test-model', '2027-01-01', '✅']]);
    const capabilities = table(['Model', 'Capabilities'], [['test-model (2027-01-01)', 'Text and image input. Text output. Responses API.']]);
    const sizing = table(['Deployment parameter', 'test-model, 2027-01-01'], [
      ['Global & data zone provisioned minimum deployment', '15'], ['Global & data zone provisioned scale increment', '5'],
      ['Input TPM per PTU', '3,000'], ['Output-to-input ratio', '4'],
    ]);
    const lifecycle = table(['Model', 'Version', 'Lifecycle', 'Retirement date', 'Replacement'],
      [['test-model', '2027-01-01', 'GA', '2027-12-01', 'test-model-two (2027-07-01)']]);
    expect(capabilityCells(capabilities).size).toBe(1);
    expect(sizingCells(sizing).get('test-model|2027-01-01|globalprovisionedmanaged')).toMatchObject({ minimum: 15, increment: 5, inputTpmPerPtu: 3000 });
    expect(lifecycleCells(lifecycle).get('test-model|2027-01-01')).toMatchObject({ date: '2027-12-01', replacement: 'test-model-two (2027-07-01)' });
    const result = reconcileTechnical({ regionHtml: '<h2>Global Standard</h2>' + regional + '<h2>Global Provisioned Managed</h2>' + regional,
      capabilitiesHtml: capabilities, sizingHtml: sizing, lifecycleHtml: lifecycle,
      matrix: { version: 'test', regions: [], capabilities: [], integrations: [], lifecycle: [] }, at, discovered: [], inventory: [], sizing: [],
      check: vi.fn(), change: vi.fn(), issue: vi.fn() });
    expect(result.discovered.map(row => row.id)).toEqual([
      'foundry-test-model-2027-01-01-global-standard-uksouth', 'foundry-test-model-2027-01-01-global-provisioned-uksouth',
    ]);
    expect(result.sizing).toHaveLength(1);
    const offer = result.discovered[0];
    if (offer.kind !== 'model-deployment') throw new Error('Expected the discovered deployment');
    const sku = 'test-model 2027-01-01 Global Standard';
    const exact = { meterId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', productName: 'Azure OpenAI', serviceName: 'Cognitive Services',
      armRegionName: 'uksouth', type: 'Consumption', skuName: sku, meterName: sku + ' Input Tokens', unitOfMeasure: '1M', currencyCode: 'GBP',
      tierMinimumUnits: 0, retailPrice: 2.15, effectiveStartDate: '2027-01-01T00:00:00Z' };
    const get = (rows: Record<string, unknown>[]) => exactModelRecords(offer, rows, 'https://prices.azure.com/api/retail/prices', at);
    expect(get([exact])).toMatchObject([{ component: 'input', price: '2.15', publishedUnit: '1M', sourceMeterId: exact.meterId }]);
    expect(get([{ ...exact, skuName: 'test-model Global Standard' }])).toEqual([]);
    expect(get([{ ...exact, unitOfMeasure: '1K' }])).toEqual([]);
    expect(get([exact, { ...exact, retailPrice: 3.15 }])).toEqual([]);
  });

  it('caches official document fetches and rejects unexpected redirect hosts separately', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('<main>Official</main>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: 'https://unrelated.test/' } }));
    const read = sourceReader(request);
    expect(await read(url + '#price')).toMatchObject({ html: '<main>Official</main>' });
    expect(await read(url + '#terms')).toMatchObject({ html: '<main>Official</main>' });
    expect(await read(url + '/redirect')).toMatchObject({ error: expect.stringContaining('approved') });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('production promotion and rollback', () => {
  const original = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const candidate = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb';
  function operations() {
    let version = original;
    return {
      previous: { version: original, deployment: original },
      upload: vi.fn(() => version = candidate),
      current: vi.fn(async () => ({ version, deployment: version })),
      verify: vi.fn(async () => {}),
      persist: vi.fn(),
      restore: vi.fn(async value => { version = value; }),
      verifyRestore: vi.fn(async () => {}),
    };
  }
  it('persists a checked candidate and only after successful live verification', async () => {
    const flow = operations();
    await expect(promoteWorker(flow)).resolves.toBeUndefined();
    expect(flow.persist).toHaveBeenCalledOnce();
    expect(flow.verify.mock.invocationCallOrder[0]).toBeLessThan(flow.persist.mock.invocationCallOrder[0]);
    expect(flow.restore).not.toHaveBeenCalled();
  });
  it('restores previous public assets after a live browser failure or rejected Git push', async () => {
    for (const phase of ['verify', 'persist'] as const) {
      const flow = operations();
      if (phase === 'verify') flow.verify.mockRejectedValueOnce(new Error('Browser check failed'));
      else flow.persist.mockImplementationOnce(() => { throw new Error('main advanced'); });
      await expect(promoteWorker(flow)).rejects.toThrow('Previous production version restored');
      if (phase === 'verify') expect(flow.persist).not.toHaveBeenCalled();
      expect(flow.restore).toHaveBeenCalledWith(original);
      expect(flow.verifyRestore).toHaveBeenCalledOnce();
    }
  });
  it('uses the existing Cloudflare deployment API and rejects split traffic', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ success: true, result: { deployments: [
      { id: original, created_on: '2027-01-01T00:00:00Z', versions: [{ version_id: original, percentage: 100 }] },
    ] } })).mockResolvedValueOnce(Response.json({ success: true, result: {} }))
      .mockResolvedValueOnce(Response.json({ success: true, result: { deployments: [
        { id: candidate, created_on: '2027-01-01T00:00:00Z', versions: [{ version_id: candidate, percentage: 50 }, { version_id: original, percentage: 50 }] },
      ] } }));
    const api = workerReleases('a'.repeat(32), 'fictional-test-token', 'ai-econmics-studio', request);
    await expect(api.current()).resolves.toEqual({ deployment: original, version: original });
    await expect(api.restore(original)).resolves.toBeUndefined();
    expect(JSON.parse(String(request.mock.calls[1][1]?.body))).toMatchObject({ versions: [{ version_id: original, percentage: 100 }] });
    await expect(api.current()).rejects.toThrow();
  });
});

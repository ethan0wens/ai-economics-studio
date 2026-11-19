import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { reportText } from './report-text';
import { enterpriseInventory, referenceAt, scenarios } from '../../fixtures/enterprise-scenarios';

const money = (value: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value));
async function navigate(page: Page, name: 'Cost & Value Analysis' | 'Reports & Export') {
  await page.getByRole('navigation', { name: 'Studio navigation' }).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
}
async function exported(page: Page, action: string) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: action, exact: true }).first().click();
  return readFile((await (await download).path())!);
}
for (const item of scenarios) {
  test(item.env.name + ' reconciles the interface, JSON, logical architecture and PDF', async ({ page }) => {
    await page.clock.setFixedTime(new Date(referenceAt));
    const payload = JSON.stringify({ schemaVersion: '1.0.0', records: item.records, inventory: enterpriseInventory });
    const catalogueId = createHash('sha256').update(payload).digest('hex');
    await page.route('**/pricing/manifest.json', route => route.fulfill({
      json: { schemaVersion: '1.0.0', catalogueId, records: item.records.length, lastCheckedAt: referenceAt, previous: null },
    }));
    await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: payload, contentType: 'application/json' }));
    await page.goto('/');
    await page.locator('input[type=file]').setInputFiles({
      name: 'fictional-enterprise-reference.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(item.env)),
    });
    await expect(page.locator('.metric').first()).toContainText(money(item.expected.monthly));
    await navigate(page, 'Cost & Value Analysis');
    await expect(page.getByRole('heading', { name: 'Improve your estimate' })).toBeVisible();
    await expect(page.locator('.metric').first()).toContainText(money(item.expected.monthly));
    await navigate(page, 'Reports & Export');
    await page.getByRole('link', { name: 'Review your design', exact: true }).click();
    await page.getByRole('navigation', { name: 'Environment review views' }).getByRole('link', { name: 'Architecture', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Architecture objects and outgoing links' })).toBeVisible();
    if (item.expected.missing) await expect(page.getByRole('cell', { name: /Verified incompatible/ })).toBeVisible();
    await navigate(page, 'Reports & Export');
    const raw = await exported(page, 'Export JSON');
    const snapshot = JSON.parse(raw.toString()).sourceSnapshot;
    expect(snapshot).toMatchObject({ catalogueId, currentKnown: item.expected.monthly, annualKnown: item.expected.annual, incomplete: item.expected.missing });
    const pdf = await exported(page, 'Generate PDF');
    const pages = await reportText(pdf);
    const text = pages.join(' ');
    expect(pages[1]).toContain(`${item.expected.missing ? 'Monthly known-cost subtotal' : 'Estimated monthly cost'} ${money(item.expected.monthly)}`);
    expect(pages[1]).toContain(`Annualised estimate ${money(item.expected.annual)}`);
    expect(pages[1]).toContain(`Current estimate ${money(item.expected.monthly)} ${money(item.expected.annual)} ${item.expected.missing}`);
    expect(text).toContain('Technical compatibility and licensing evidence');
    expect(text).toContain('Itemised monthly costs');
    if (item.expected.forecast) expect(pages[1]).toContain(`Price forecast ${money(item.expected.forecast)}`);
    if (item.expected.existing) expect(pages[1]).toContain(`Existing licence spend ${money(item.expected.existing)}`);
    if (item.expected.proposed) expect(pages[1]).toContain(`Proposed licence spend ${money(item.expected.proposed)}`);
  });
}

if (process.env.STUDIO_CHECK_PUBLISHED_CATALOGUE === '1') {
  test('published UK licence price and technical availability come from independent evidence', async ({ page }, info) => {
    const expected = process.env.STUDIO_EXPECTED_CATALOGUE_ID;
    if (expected) {
      info.setTimeout(95_000);
      await expect.poll(async () => {
        const response = await page.request.get('/pricing/manifest.json', { headers: { 'Cache-Control': 'no-cache' } });
        return response.ok() ? (await response.json()).catalogueId : String(response.status());
      }, { timeout: 60_000, message: 'The public edge should serve the catalogue hash deployed by this run' }).toBe(expected);
    }
    const response = await page.request.get('/pricing/manifest.json');
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    if (process.env.STUDIO_EXPECTED_CATALOGUE_ID) expect(manifest.catalogueId).toBe(process.env.STUDIO_EXPECTED_CATALOGUE_ID);
    const { records, inventory } = await (await page.request.get(`/pricing/catalogue-${manifest.catalogueId}.json`)).json();
    const rate = records.find((row: { offeringId?: string }) => row.offeringId === 'm365-e3-gb');
    expect(rate).toMatchObject({ verification: 'microsoft-commercial', currency: 'GBP', region: 'gb', unit: 'seat/month' });
    expect(records.find((row: { offeringId?: string }) => row.offeringId === 'defender-suite-gb'))
      .toMatchObject({ verification: 'microsoft-commercial', currency: 'GBP', region: 'gb', unit: 'seat/month' });
    expect(inventory).toContainEqual(expect.objectContaining({ id: 'gpt-5-global-standard-uksouth',
      model: expect.objectContaining({ version: '2025-08-07' }) }));
    const scenario = scenarios[0].env;
    const env = { ...scenario, objects: [
      scenario.objects[0],
      { id: 'new-e3', name: 'Example base licence', kind: 'licence-entitlement', offeringId: 'm365-e3-gb',
        product: 'Microsoft 365 E3', procurement: 'incremental', seats: 2 },
    ], relationships: [] };
    await page.goto('/');
    await page.locator('input[type=file]').setInputFiles({ name: 'published-rates-smoke.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(env)) });
    await page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Advanced' }).click();
    await page.getByRole('button', { name: /^Example base licence / }).click();
    await expect(page.locator('.inspector').getByText('Microsoft retail pricing')).toBeVisible();
    if (Date.parse(rate.review.expiresAt) >= Date.now()) {
      await expect(page.locator('.inspector .retail-preview').getByRole('link', { name: /^GBP / })).toBeVisible();
      await expect(page.locator('.metric').first()).toContainText(money(String(Number(rate.price) * 2)));
    }
    await page.getByRole('button', { name: /^Assistant deployment / }).click();
    await page.locator('.inspector').getByText('Technical compatibility', { exact: true }).click();
    await expect(page.locator('.inspector').getByText('Model deployment and region', { exact: true })).toBeVisible();
    await expect(page.locator('.inspector').getByRole('link', { name: 'Microsoft evidence' }).first()).toHaveAttribute('href', /region-availability/);
  });
}

test('provisioned reservation and PAYG comparison reconcile in the builder, architecture, JSON and PDF', async ({ page }) => {
  await page.clock.setFixedTime(new Date(referenceAt));
  const fixture = scenarios[2];
  const offer = 'gpt-4-1-global-standard-uksouth';
  const records = [...fixture.records, ...scenarios[0].records.filter(row => row.offeringId === offer)];
  const payload = JSON.stringify({ schemaVersion: '1.0.0', records, inventory: enterpriseInventory });
  const catalogueId = createHash('sha256').update(payload).digest('hex');
  await page.route('**/pricing/manifest.json', route => route.fulfill({
    json: { schemaVersion: '1.0.0', catalogueId, records: records.length, lastCheckedAt: referenceAt, previous: null },
  }));
  await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: payload, contentType: 'application/json' }));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fictional-reservation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture.env)),
  });
  await expect(page.locator('.metric').first()).toContainText('£7,400.00');
  await page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Advanced' }).click();
  await page.getByRole('button', { name: /^Reserved model / }).click();
  const inspector = page.locator('.inspector');
  await inspector.getByRole('button', { name: 'Usage', exact: true }).click();
  await inspector.getByRole('button', { name: 'Advanced', exact: true }).click();
  await inspector.getByLabel('Compare with PAYG retail', { exact: true }).selectOption(offer);
  await inspector.getByLabel('Apply a customer reservation', { exact: true }).check();
  await inspector.getByLabel('Reserved PTUs', { exact: true }).fill('30');
  await inspector.getByLabel('Reservation term', { exact: true }).selectOption('12');
  await inspector.getByLabel('Reservation total for the term', { exact: true }).fill('36000');
  await inspector.getByLabel('Reservation start date', { exact: true }).fill('2026-11-01');
  await inspector.getByLabel('Billable hours covered by reservation', { exact: true }).fill('400');
  await inspector.getByLabel('Reservation evidence reference', { exact: true }).fill('Fictional quote fixture');
  await expect(page.locator('.metric').first()).toContainText('£5,600.00');
  await navigate(page, 'Cost & Value Analysis');
  await page.getByText('Compare pricing assumptions', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Provisioned and PAYG costs' })).toBeVisible();
  await expect(page.getByText('£5,400.00 provisioned · £3.77 PAYG retail')).toBeVisible();
  await navigate(page, 'Reports & Export');
  await page.getByRole('link', { name: 'Review your design', exact: true }).click();
  await page.getByRole('navigation', { name: 'Environment review views' }).getByRole('link', { name: 'Architecture', exact: true }).click();
  await expect(page.getByRole('cell', { name: /PAYG comparison £3.77/ })).toBeVisible();
  await navigate(page, 'Reports & Export');
  const json = JSON.parse((await exported(page, 'Export JSON')).toString());
  expect(json.sourceSnapshot).toMatchObject({ currentKnown: '5600.00', annualKnown: '67200.00', incomplete: 0 });
  expect(json.objects.find((row: { id: string }) => row.id === 'Reserved model')).toMatchObject({
    reservation: { term: '12', ptus: 30, coveredHours: 400 }, comparisonOfferingId: offer,
  });
  const pdf = await exported(page, 'Generate PDF');
  const pages = await reportText(pdf);
  const texts = pages.join(' ');
  expect(pages[1]).toContain('Current estimate £5,600.00 £67,200.00 0');
  expect(texts).toContain('Provisioned minus PAYG');
  expect(texts).toContain('£5,400.00 £3.77 £5,396.23');
  expect(texts).toContain('Retail comparison quantity without reservation: 18000 PTU-hours.');

});

test('keyboard selects Executive Summary and both exports reconcile with the open estimate', async ({ page }) => {
  const sample = scenarios[4];
  const payload = JSON.stringify({ schemaVersion: '1.0.0', records: sample.records, inventory: enterpriseInventory });
  const catalogueId = createHash('sha256').update(payload).digest('hex');
  await page.clock.setFixedTime(new Date(referenceAt));
  await page.route('**/pricing/manifest.json', route => route.fulfill({
    json: { schemaVersion: '1.0.0', catalogueId, records: sample.records.length, lastCheckedAt: referenceAt, previous: null },
  }));
  await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: payload, contentType: 'application/json' }));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'fictional-formats.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(sample.env)) });
  await navigate(page, 'Reports & Export');
  const full = page.getByRole('radio', { name: /Full Report/ });
  const summary = page.getByRole('radio', { name: /Executive Summary/ });
  await expect(full).toBeChecked();
  const complete = await reportText(await exported(page, 'Generate PDF'));
  await full.focus();
  await full.press('ArrowUp');
  await expect(summary).toBeChecked();
  const compact = await reportText(await exported(page, 'Generate PDF'));
  for (const pages of [complete, compact]) {
    expect(pages[1]).toContain(`Current estimate ${money(sample.expected.monthly)} ${money(sample.expected.annual)} ${sample.expected.missing}`);
    expect(pages.join(' ')).toContain(`${sample.expected.missing} unresolved charge`);
  }
  expect(compact[0]).toContain('Executive Summary');
  expect(compact[0]).toContain('Planning estimates do not establish quotes, licence eligibility or compliance.');
  expect(complete[0]).toContain('Full Report');
  expect(compact.length).toBeLessThan(complete.length);
  await expect(page.getByRole('status').filter({ hasText: 'Your Executive Summary PDF is ready.' })).toBeVisible();
});

test('a precise fixed contract stays distinct from the graduated retail rate in the PDF', async ({ page }) => {
  const sample = scenarios[0];
  const storage = sample.records.find(record => record.tiers)!;
  const { meterId, sku, unit, quantityPerUnit, region, priceType } = storage;
  const agreedRate = '0.012345678901234';
  const environment = { ...sample.env, pricingOverrides: [{
    objectId: 'Indexed documents', meter: { meterId, sku, unit, quantityPerUnit, region, priceType },
    mode: 'fixed', currency: 'GBP', value: agreedRate, reason: 'Fictional fixed storage contract',
  }] };
  const payload = JSON.stringify({ schemaVersion: '1.0.0', records: sample.records, inventory: enterpriseInventory });
  const catalogueId = createHash('sha256').update(payload).digest('hex');
  await page.clock.setFixedTime(new Date(referenceAt));
  await page.route('**/pricing/manifest.json', route => route.fulfill({
    json: { schemaVersion: '1.0.0', catalogueId, records: sample.records.length, lastCheckedAt: referenceAt, previous: null },
  }));
  await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: payload, contentType: 'application/json' }));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fictional-fixed-storage.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(environment)),
  });
  await expect(page.locator('.metric').first()).toContainText('£1,478.54');
  await navigate(page, 'Reports & Export');
  const pages = await reportText(await exported(page, 'Generate PDF'));
  expect(pages[1]).toContain('Retail baseline £1,893.80 £22,725.60 0');
  expect(pages[1]).toContain('Current estimate £1,478.54 £17,742.48 0');
  const itemised = pages.filter(text => text.includes('Charge component')).join(' ');
  expect(itemised).toContain('£740.74 Fixed customer rate');
  expect(itemised.replace(/\s+/g, '')).toContain(agreedRate);
  expect(itemised).not.toContain('Blended');
  expect(pages.join(' ')).toContain('Graduated retail bands');
});

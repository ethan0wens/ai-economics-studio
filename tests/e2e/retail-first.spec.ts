import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { catalogueSchema } from '../../src/catalogue';
import { catalogueCoverage } from '../../src/coverage';
import { blankEnvironment } from '../../src/domain';
import { offeringMeter, offerings } from '../../src/offerings';

test('selected model applies both catalogue meters, restores retail and opens exact coverage', async ({ page }) => {
  const offering = offerings.find(item => item.id === 'gpt-4o-mini-global-uksouth')!;
  const records = (['input', 'output'] as const).map((component, index) => ({
    ...offeringMeter(offering, component)!, offeringId: offering.id, component, currency: 'GBP',
    price: index ? '0.50' : '0.20', effectiveAt: '2020-01-01T00:00:00Z',
    source: 'https://prices.azure.com/api/retail/prices', product: 'Fictional browser test only',
    verification: 'azure-retail-api',
  }));
  const payload = JSON.stringify({ schemaVersion: '1.0.0', records });
  const catalogueId = createHash('sha256').update(payload).digest('hex');
  await page.route('**/pricing/manifest.json', route => route.fulfill({
    json: { schemaVersion: '1.0.0', catalogueId, lastCheckedAt: new Date().toISOString(), records: 2, previous: null },
  }));
  await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: payload, contentType: 'application/json' }));
  await page.goto('/');
  await expect(page.getByText(/2 published rates/)).toBeVisible();
  const env = { ...blankEnvironment(),
    objects: [
      { kind: 'model-deployment', id: 'model', name: 'Catalogue model', modelId: 'Unlisted', mode: 'payg' },
      { kind: 'agent', id: 'agent', name: 'Fixture agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' },
      { kind: 'usage-profile', id: 'usage', name: 'Fixture usage', executions: 500, calls: 2, input: 3000, output: 1000 },
    ], relationships: [
      { from: 'agent', to: 'model', type: 'agent-uses-deployment' },
      { from: 'agent', to: 'usage', type: 'agent-uses-usage' },
    ],
  };
  await page.locator('input[type=file]').setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(env)) });
  await page.getByRole('button', { name: /^Catalogue model / }).click();
  const inspector = page.locator('.inspector');
  await inspector.getByRole('combobox', { name: 'Microsoft retail configuration', exact: true }).selectOption(offering.id);
  await expect(inspector.getByRole('link', { name: 'GBP 0.20 per 1,000 tokens' })).toBeVisible();
  // 3,000,000 input × 0.20/1,000 + 1,000,000 output × 0.50/1,000 = 1,100.
  await expect(page.locator('.metric').first()).toContainText('£1,100.00');
  await page.getByRole('button', { name: 'Cost Analysis' }).click();
  await page.getByText('Input tokens', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Price agreement', exact: true }).selectOption('fixed');
  await page.getByRole('textbox', { name: /^Rate per billed unit/ }).fill('0.10');
  await page.getByLabel('Agreement reason', { exact: true }).fill('Fictional contract');
  await page.getByRole('button', { name: 'Save price assumptions' }).click();
  await expect(page.locator('.metric').first()).toContainText('£800.00');
  await page.getByRole('button', { name: 'Restore Microsoft retail for this object' }).click();
  await expect(page.locator('.metric').first()).toContainText('£1,100.00');
  await page.getByRole('button', { name: 'Pricing Catalogue', exact: true }).click();
  await page.getByText('Microsoft Foundry models', { exact: true }).click();
  await expect(page.getByText('1 / 3 verified · 33.3%', { exact: true })).toBeVisible();
  await expect(page.getByText('GPT-4o mini · Global Standard', { exact: true })).toBeVisible();
  await expect(page.getByText(/1 use verified retail and 0 use customer-supplied rates/)).toBeVisible();
});

if (process.env.STUDIO_CHECK_PUBLISHED_CATALOGUE === '1') {
  test('live dashboard verifies the actual published catalogue across all five families', async ({ page }) => {
    const total = offerings.reduce((sum, offering) => sum + offering.components.length, 0);
    const manifestResponse = await page.request.get('/pricing/manifest.json');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    expect(manifest.records).toBe(total);
    const catalogueResponse = await page.request.get(`/pricing/catalogue-${manifest.catalogueId}.json`);
    expect(catalogueResponse.ok()).toBe(true);
    const raw = await catalogueResponse.body();
    expect(createHash('sha256').update(raw).digest('hex')).toBe(manifest.catalogueId);
    const catalogue = catalogueSchema.parse(JSON.parse(raw.toString()));
    const verified = catalogueCoverage({ manifest, records: catalogue.records }).reduce((sum, family) => sum + family.fully, 0);
    await page.goto('/');
    await expect(page.getByText(new RegExp(`${total} published rates`))).toBeVisible();
    await page.getByRole('button', { name: 'Pricing Catalogue', exact: true }).click();
    await expect(page.getByText(new RegExp(`${verified} of ${offerings.length} reviewed configurations`))).toBeVisible();
    for (const name of ['Microsoft Foundry models', 'Copilot Studio', 'Microsoft licensing', 'Supporting Azure services', 'Security and governance']) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });
}

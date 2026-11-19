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
  await page.getByRole('link', { name: 'Pricing Catalogue', exact: true }).click();
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
  await page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Advanced' }).click();
  await page.getByRole('button', { name: /^Catalogue model / }).click();
  const inspector = page.locator('.inspector');
  await inspector.getByRole('combobox', { name: 'Microsoft retail configuration', exact: true }).selectOption(offering.id);
  await expect(inspector.getByRole('link', { name: 'GBP 0.20 per 1,000 tokens' })).toBeVisible();
  // 3,000,000 input × 0.20/1,000 + 1,000,000 output × 0.50/1,000 = 1,100.
  await expect(page.locator('.metric').first()).toContainText('£1,100.00');
  await page.getByRole('link', { name: 'Cost & Value Analysis' }).click();
  await page.getByText('Input tokens', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Price agreement', exact: true }).selectOption('fixed');
  await page.getByRole('textbox', { name: /^Rate per billed unit/ }).fill('0.10');
  await page.getByLabel('Agreement reason', { exact: true }).fill('Fictional contract');
  await page.getByRole('button', { name: 'Save price assumptions' }).click();
  await expect(page.locator('.metric').first()).toContainText('£800.00');
  await page.getByRole('button', { name: 'Restore Microsoft retail for this object' }).click();
  await expect(page.locator('.metric').first()).toContainText('£1,100.00');
  await page.getByRole('link', { name: 'Pricing Catalogue', exact: true }).click();
  await page.getByText('Microsoft Foundry models', { exact: true }).click();
  await expect(page.getByText('1 / 3 verified · 33.3%', { exact: true })).toBeVisible();
  await expect(page.getByText('GPT-4o mini · Global Standard', { exact: true })).toBeVisible();
  await expect(page.getByText(/1 use verified retail and 0 use customer-supplied rates/)).toBeVisible();
});

if (process.env.STUDIO_CHECK_PUBLISHED_CATALOGUE === '1') {
  test('dashboard and ledger verify the published inventory and exact regional retail', async ({ page }, info) => {
    const expected = process.env.STUDIO_EXPECTED_CATALOGUE_ID;
    if (expected) {
      info.setTimeout(95_000);
      await expect.poll(async () => {
        const response = await page.request.get('/pricing/manifest.json', { headers: { 'Cache-Control': 'no-cache' } });
        return response.ok() ? (await response.json()).catalogueId : String(response.status());
      }, { timeout: 60_000, message: 'The public edge should serve the catalogue hash deployed by this run' }).toBe(expected);
    }
    const manifestResponse = await page.request.get('/pricing/manifest.json');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    if (process.env.STUDIO_EXPECTED_CATALOGUE_ID) expect(manifest.catalogueId).toBe(process.env.STUDIO_EXPECTED_CATALOGUE_ID);
    const catalogueResponse = await page.request.get(`/pricing/catalogue-${manifest.catalogueId}.json`);
    expect(catalogueResponse.ok()).toBe(true);
    const raw = await catalogueResponse.body();
    expect(createHash('sha256').update(raw).digest('hex')).toBe(manifest.catalogueId);
    const catalogue = catalogueSchema.parse(JSON.parse(raw.toString()));
    expect(catalogue.records).toHaveLength(manifest.records);
    expect(catalogue.inventory!.length).toBeGreaterThan(offerings.length * 5);
    const coverage = catalogueCoverage({ manifest, ...catalogue });
    const verified = coverage.reduce((sum, family) => sum + family.fully, 0);
    const supported = coverage.reduce((sum, family) => sum + family.supported, 0);
    expect(verified).toBeGreaterThan(offerings.length);
    expect(supported).toBeGreaterThan(verified);
    await page.goto('/');
    await page.getByRole('link', { name: 'Pricing Catalogue', exact: true }).click();
    await expect(page.getByText(new RegExp(`${manifest.records} published rates`))).toBeVisible();
    await expect(page.getByText(new RegExp(`${verified} of ${supported} supported configurations`))).toBeVisible();
    for (const name of ['Microsoft Foundry models', 'Copilot Studio', 'Microsoft licensing', 'Supporting Azure services', 'Security and governance']) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    const offer = coverage.flatMap(family => family.configurations).find(item => item.kind === 'supporting-resource' && item.family === 'infrastructure' && item.region === 'westeurope' && item.status === 'verified' && !item.components[0].rate?.tiers)!;
    expect(offer).toBeDefined();
    await page.getByLabel('Filter by billing region or market', { exact: true }).selectOption(offer.region);
    await page.getByLabel('Find a catalogue configuration', { exact: true }).fill(offer.id);
    await page.getByText('Supporting Azure services', { exact: true }).click();
    await expect(page.getByText(offer.name, { exact: true })).toBeVisible();
    const env = { ...blankEnvironment(), region: offer.region, objects: [
      { kind: 'supporting-resource', id: 'azure-resource', name: 'Regional service test', monthlyQuantity: offer.components[0].quantityPerUnit * 1000 },
    ] };
    await page.locator('input[type=file]').setInputFiles({ name: 'fictional.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(env)) });
    await page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Advanced' }).click();
    await page.getByRole('button', { name: /^Regional service test / }).click();
    await page.getByLabel('Microsoft retail configuration', { exact: true }).selectOption(offer.id);
    await expect(page.locator('.inspector .retail-preview').getByRole('link', { name: /^GBP / })).toBeVisible();
    const amount = Number(offer.components[0].rate!.price) * 1000;
    await expect(page.locator('.metric').first()).toContainText(new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount));
  });
}

if (process.env.STUDIO_CHECK_RELEASE_HEALTH === '1') {
  test('catalogue health reports the verified public release and catalogue', async ({ page }) => {
    const response = await page.request.get('/pricing/health.json');
    expect(response.ok()).toBe(true);
    const { release, maintenance } = await response.json();
    expect(release.status).toBe('published');
    expect(release.catalogueId).toBe(process.env.STUDIO_EXPECTED_CATALOGUE_ID);
    expect(release.application).toMatch(/^[a-f0-9]{40}$/);
    expect(Array.isArray(maintenance.unresolved)).toBe(true);
    await page.goto('/');
    await page.getByRole('link', { name: 'Pricing Catalogue', exact: true }).click();
    const health = page.getByRole('region', { name: 'Catalogue health' });
    await expect(health.getByText(new RegExp('Published application ' + release.application.slice(0, 12)))).toBeVisible();
    await expect(health.getByText('Provisioned capacity sizing', { exact: true })).toBeVisible();
  });
}

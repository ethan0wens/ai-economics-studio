import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { browserIcons } from '../../scripts/security-http';
import { reportText } from './report-text';

async function add(page: Page, kind: string, name: string) {
  await page.getByRole('button', { name: 'Add object', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: kind, exact: true }).click();
  await page.getByLabel('Object name', { exact: true }).fill(name);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

async function createAdvanced(page: Page) {
  await page.getByLabel('Environment name', { exact: true }).fill('Fictional test environment');
  await page.getByRole('button', { name: 'Create environment', exact: true }).click();
  await page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Advanced' }).click();
}

async function fileFrom(page: Page, button: string) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).first().click();
  return readFile((await (await event).path())!);
}

test('draft creation, shared costing, keyboard graph, reconciled report and JSON round-trip', async ({ page }) => {
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Understand the cost of your AI ambitions.' })).toBeVisible();
  await createAdvanced(page);
  await add(page, 'Agent', 'Fictional Alpha');
  await page.getByRole('combobox', { name: 'Platform', exact: true }).selectOption('foundry-agent-service');
  await page.getByLabel('Model source', { exact: true }).selectOption('deployment-ref');
  await expect(page.getByText('Choose the model deployment this agent uses so the studio can estimate its costs.', { exact: true })).toBeVisible();
  await add(page, 'Agent', 'Fictional Beta');
  await page.getByRole('combobox', { name: 'Platform', exact: true }).selectOption('foundry-agent-service');
  await page.getByLabel('Model source', { exact: true }).selectOption('deployment-ref');
  await add(page, 'Model deployment', 'Fictional capacity');
  await page.getByLabel('Model identifier', { exact: true }).fill('TEST ONLY');
  await page.getByLabel('Billing mode', { exact: true }).selectOption('provisioned');
  await page.getByRole('button', { name: 'Usage', exact: true }).click();
  await page.getByLabel('Provisioned capacity units', { exact: true }).fill('2');
  await page.getByLabel('Billable hours per month', { exact: true }).fill('5');

  for (const name of ['Fictional Alpha', 'Fictional Beta']) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await page.getByRole('combobox', { name: 'Model deployment', exact: true }).selectOption({ label: 'Fictional capacity / TEST ONLY / UK South / provisioned' });
  }
  await page.getByRole('link', { name: 'Cost & Value Analysis' }).click();
  await page.getByText('Shared provisioned capacity', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Price agreement', exact: true }).selectOption('fixed');
  await page.getByRole('textbox', { name: /^Rate per billed unit/ }).fill('70');
  await page.getByLabel('Agreement reason', { exact: true }).fill('Fictional test contract');
  await page.getByRole('button', { name: 'Save price assumptions' }).click();
  await expect(page.locator('.metric').first()).toContainText('£700.00');
  await page.getByText('Compare pricing assumptions', { exact: true }).click();
  await page.getByLabel('Global price change (%)', { exact: true }).fill('20');
  await expect(page.locator('.compare-grid > div').last()).toContainText('£700.00');
  await page.getByLabel('Apply forecast to fixed contracts', { exact: true }).check();
  await expect(page.locator('.compare-grid > div').last()).toContainText('£840.00');

  await page.getByRole('link', { name: 'Reports & Export' }).click();
  await page.getByRole('link', { name: 'Review your design', exact: true }).click();
  await page.getByRole('navigation', { name: 'Environment review views' }).getByRole('link', { name: 'Architecture', exact: true }).click();
  const node = page.getByRole('button', { name: 'Inspect Fictional capacity' });
  await expect(node).toBeVisible();
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Fictional capacity' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete object' }).click();
  await expect(page.getByRole('dialog')).toContainText('Fictional Beta');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('link', { name: 'Reports & Export' }).click();
  const pdf = await fileFrom(page, 'Generate PDF');
  const pages = await reportText(pdf);
  expect(pages.length).toBeGreaterThanOrEqual(2);
  expect(pages.length).toBeLessThan(10);
  const text = pages.join(' ');
  for (const expected of ['Logical architecture', 'Shared provisioned capacity', '£700.00', '£840.00', 'Governance advisory findings',
    'Assumptions and sources', 'Unknown', 'Fictional Alpha']) expect(text).toContain(expected);
  const itemised = pages.filter(pageText => pageText.includes('Charge component')).join(' ').split('Charge details')[0];
  expect(itemised.match(/Shared provisioned capacity/g)?.length).toBe(1);
  const json = await fileFrom(page, 'Export JSON');
  expect(JSON.parse(json.toString()).sourceSnapshot).toMatchObject({ current: '700.00', incomplete: 0 });
  expect(await page.evaluate(async () => [localStorage.length, sessionStorage.length, document.cookie, (await indexedDB.databases()).length])).toEqual([0, 0, '', 0]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Open an environment' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'env.json', mimeType: 'application/json', buffer: json });
  await expect(page.locator('.metric').first()).toContainText('£700.00');
  await expect(page.getByText(/Recalculated with the applied catalogue/)).toBeVisible();
  await page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Advanced' }).click();
  await page.getByLabel('Search inventory', { exact: true }).fill('Beta');
  await expect(page.getByRole('button', { name: /Fictional Beta/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fictional Alpha/ })).toHaveCount(0);
  const origin = new URL(page.url()).origin;
  expect(requests.length).toBeGreaterThan(3);
  expect(requests.every(({ url, method, body }) => {
    if (url.startsWith('blob:')) return true;
    const target = new URL(url);
    return target.origin === origin && !target.search && method === 'GET' && body === null &&
      (target.pathname === '/' || target.pathname === '/pricing/manifest.json' ||
        /^\/pricing\/catalogue-[a-f0-9]{64}\.json$/.test(target.pathname) || target.pathname.startsWith('/assets/') ||
        browserIcons.has(target.pathname));
  })).toBe(true);
});

test('mobile reflow, keyboard drafts and accessible overview', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto('/');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await expect.poll(overflow).toBe(0);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await createAdvanced(page);
  const addButton = page.getByRole('button', { name: 'Add object', exact: true });
  await addButton.focus();
  await page.keyboard.press('Enter');
  const group = page.getByRole('dialog').getByRole('button', { name: 'User group' });
  await group.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'New user group' })).toBeVisible();
  await expect.poll(overflow).toBe(0);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Cost & Value Analysis' }).click();
  await expect(page.getByRole('heading', { name: 'Cost & Value Analysis' })).toBeVisible();
  await expect.poll(overflow).toBe(0);
  await page.setViewportSize({ width: 640, height: 950 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await expect.poll(overflow).toBe(0);
  await expect(page.getByRole('heading', { name: 'Cost & Value Analysis' })).toBeVisible();
});

test('an unexported workspace is discarded on accepted reload and invalid JSON is reported', async ({ page }) => {
  await page.goto('/');
  await createAdvanced(page);
  await add(page, 'Supporting resource', 'Fictional resource');
  await expect(page.getByText('Unexported changes')).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Open an environment' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('alert')).toContainText('Could not import this environment');
});

test('catalogue changes require explicit adoption and preserve a fixed agreement', async ({ page }) => {
  const { createHash } = await import('node:crypto');
  function edition(price: string, lastCheckedAt: string) {
    const data = JSON.stringify({
      schemaVersion: '1.0.0',
      records: [{ meterId: 'fictional-hourly', sku: 'fictional', region: 'uksouth', unit: '1 Hour', quantityPerUnit: 1,
        priceType: 'Consumption', currency: 'GBP', price, effectiveAt: '2025-01-01T00:00:00Z',
        source: 'https://prices.azure.com/api/retail/prices', product: 'Fictional test-only meter', verification: 'azure-retail-api' }],
    });
    const catalogueId = createHash('sha256').update(data).digest('hex');
    return { data, manifest: { schemaVersion: '1.0.0', catalogueId, lastCheckedAt, records: 1, previous: null } };
  }
  let current = edition('10', '2025-10-01T00:00:00Z');
  await page.route('**/pricing/manifest.json', route => route.fulfill({ json: current.manifest }));
  await page.route('**/pricing/catalogue-*.json', route => route.fulfill({ contentType: 'application/json', body: current.data }));
  await page.goto('/');
  await page.getByRole('link', { name: 'Pricing Catalogue' }).click();
  await expect(page.getByText(/1 published rates/)).toBeVisible();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await createAdvanced(page);
  await add(page, 'Supporting resource', 'Fictional billable resource');
  await page.getByLabel('Verified Azure retail meter', { exact: true }).selectOption({ label: 'Fictional test-only meter / fictional / 1 Hour' });
  await page.getByLabel('Monthly usage quantity', { exact: true }).fill('2');
  await expect(page.locator('.metric').first()).toContainText('£20.00');
  await page.getByRole('link', { name: 'Cost & Value Analysis' }).click();
  await page.getByText('Supporting usage', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Price agreement', exact: true }).selectOption('fixed');
  await page.getByRole('textbox', { name: /^Rate per billed unit/ }).fill('7');
  await page.getByLabel('Agreement reason', { exact: true }).fill('Fictional fixed rate');
  await page.getByRole('button', { name: 'Save price assumptions' }).click();
  await expect(page.locator('.metric').first()).toContainText('£14.00');
  current = edition('12', '2025-11-01T00:00:00Z');
  await page.getByRole('button', { name: 'Check for updates' }).click();
  await expect(page.locator('.compare-grid > div').first()).toContainText('£20.00');
  await page.getByRole('button', { name: 'Apply catalogue' }).click();
  await expect(page.locator('.compare-grid > div').first()).toContainText('£24.00');
  await expect(page.locator('.metric').first()).toContainText('£14.00');
});

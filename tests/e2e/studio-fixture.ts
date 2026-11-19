import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { businessCase } from '../../fixtures/adoption-business-case';
import { offeringMeter } from '../../src/offerings';
import type { Catalogue, RetailRecord } from '../../src/catalogue';


const at = '2026-11-19T13:00:00Z';
const version = '1.0.0';
export const show = (page: Page, name: string) => page.getByRole('navigation', { name: 'Builder steps' }).getByRole('button', { name, exact: true });
export const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Studio navigation' }).getByRole('link', { name, exact: true });
export const mode = (page: Page, name: string) => page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name, exact: true });
export const monthly = (page: Page) => page.getByRole('region', { name: 'Running estimate' }).locator('.metric').first();
const specs = [
  ...businessCase.rateSpecs,
  ['copilot-payg-uksouth', 'credits', '0.02'], ['m365-copilot-enterprise-gb', 'seats', '20'],
  ['search-basic-uksouth', 'usage', '2'], ['openai-global-ptu-uksouth', 'capacity', '0.50'],
] as const;

export async function prices(page: Page, exclude?: RetailRecord['component']) {
  // The inventory matches the app scope. All price amounts below are fictional and intercepted in this browser only.
  const manifest = JSON.parse(await readFile('public/pricing/manifest.json', 'utf8'));
  const { inventory } = JSON.parse(await readFile(`public/pricing/catalogue-${manifest.catalogueId}.json`, 'utf8')) as Pick<Catalogue, 'inventory'>;
  const records: RetailRecord[] = specs.flatMap(([id, component, price]) => {
    const offer = inventory!.find(item => item.id === id)!;
    const meter = offeringMeter(offer, component);
    if (!meter || component === exclude) return [];
    return [{ ...meter, offeringId: id, component, product: 'FICTIONAL browser verification', currency: 'GBP', price,
      effectiveAt: '2026-01-01T00:00:00Z', verification: 'azure-retail-api', source: 'https://prices.azure.com/api/retail/prices' }];
  });
  const raw = JSON.stringify({ schemaVersion: version, inventory, records });
  const catalogueId = createHash('sha256').update(raw).digest('hex');
  await page.clock.setFixedTime(new Date(at));
  await page.route('**/pricing/manifest.json', route => route.fulfill({ json: { schemaVersion: version, catalogueId, records: records.length, lastCheckedAt: at, previous: null } }));
  await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: raw, contentType: 'application/json' }));
}

export async function start(page: Page, name = 'Fictional assisted estimate') {
  await page.goto('/');
  await page.getByLabel('Environment name').fill(name);
  await page.getByRole('button', { name: 'Create environment', exact: true }).click();
  await expect(mode(page, 'Guided')).toHaveAttribute('aria-pressed', 'true');
}
export async function addAgent(page: Page, name: string, platform?: string) {
  await page.getByLabel('Agent name', { exact: true }).fill(name);
  if (platform) await page.getByRole('combobox', { name: 'Agent platform', exact: true }).selectOption(platform);
  await page.getByRole('button', { name: 'Add agent', exact: true }).click();
}
export async function example(page: Page, id: string) {
  await page.goto(`/#/examples/${id}`);
  await expect(page.getByText('Illustrative example. Usage is for demonstration.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open editable copy' }).click();
  await expect(page.getByRole('heading', { name: 'Your AI environment, in numbers', exact: true })).toBeVisible();
}
export async function getFile(page: Page, action: string) {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: action, exact: true }).click();
  return readFile((await (await promise).path())!);
}

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { enterpriseInventory, referenceAt, scenarios } from '../../fixtures/enterprise-scenarios';

async function openSample(page: Page, index = 0) {
  const sample = scenarios[index];
  const payload = JSON.stringify({ schemaVersion: '1.0.0', records: sample.records, inventory: enterpriseInventory });
  const catalogueId = createHash('sha256').update(payload).digest('hex');
  await page.clock.setFixedTime(new Date(referenceAt));
  await page.route('**/pricing/manifest.json', route => route.fulfill({
    json: { schemaVersion: '1.0.0', catalogueId, records: sample.records.length, lastCheckedAt: referenceAt, previous: null },
  }));
  await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: payload, contentType: 'application/json' }));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'fictional-value.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(sample.env)) });
  await expect(page.getByRole('heading', { name: 'Environment Builder' })).toBeVisible();
}
async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Studio navigation' }).getByRole('link', { name, exact: true }).click();
}
async function download(page: Page, action: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: action, exact: true }).click();
  return readFile((await (await pending).path())!);
}

test('guided value assumptions are optional, explicitly accepted and reopened from JSON', async ({ page }) => {
  await openSample(page);
  await expect(page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Guided' })).toHaveAttribute('aria-pressed', 'true');
  await navigate(page, 'Cost & Value Analysis');
  await expect(page.locator('.metric').first()).toContainText('£1,893.80');
  await page.getByRole('button', { name: 'Potential value', exact: true }).click();
  await page.getByRole('button', { name: 'Estimate potential value' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Who will use it?' })).toBeFocused();
  await expect(page.getByLabel('Expected active adoption (%)', { exact: true })).toHaveValue('');
  await page.getByLabel('Target users', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Cancel draft' }).click();
  await navigate(page, 'Reports & Export');
  const before = JSON.parse((await download(page, 'Export JSON')).toString());
  expect(before.valuePlan).toBeUndefined();

  await navigate(page, 'Cost & Value Analysis');
  await page.getByRole('button', { name: 'Potential value', exact: true }).click();
  await page.getByRole('button', { name: 'Estimate potential value' }).click();
  await page.getByLabel('Target users', { exact: true }).fill('200');
  await page.getByLabel('Expected active adoption (%)', { exact: true }).fill('37.5');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Tasks per active user per month', { exact: true }).fill('20');
  await page.getByLabel('Minutes saved per task', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Assumed value per productive hour (GBP)', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Accept value assumptions' }).click();
  await expect(page.getByText('300 hours monthly · 3,600 hours annualised')).toBeVisible();
  await expect(page.getByText('Assumed economic equivalent', { exact: true }).locator('..')).toContainText('Unknown');
  await expect(page.getByText('Declared cashable savings', { exact: true }).locator('..')).toContainText('Unknown');
  await page.getByRole('button', { name: 'Costs', exact: true }).click();
  await expect(page.locator('.metric').first()).toContainText('£1,893.80');
  await navigate(page, 'Reports & Export');
  const json = await download(page, 'Export JSON');
  const file = JSON.parse(json.toString());
  expect(file.sourceSnapshot).toEqual(before.sourceSnapshot);
  expect(file.valuePlan.assumptions.adoption).toEqual({ value: 37.5, source: 'entered' });
  await page.reload();
  await page.locator('input[type=file]').setInputFiles({ name: 'fictional-value-roundtrip.json', mimeType: 'application/json', buffer: json });
  await navigate(page, 'Cost & Value Analysis');
  await page.getByRole('button', { name: 'Potential value', exact: true }).click();
  await page.getByText('Accepted assumptions and sources', { exact: true }).click();
  await expect(page.getByText('37.5 · Imported customer assumption')).toBeVisible();
});

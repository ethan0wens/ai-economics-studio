import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { enterpriseInventory, referenceAt, scenarios } from '../../fixtures/enterprise-scenarios';
import type { Environment } from '../../src/domain';
import type { ValuePlan } from '../../src/value';

async function openSample(page: Page, index = 0, valuePlan?: ValuePlan, withEnvironment: (env: Environment) => Environment = env => env) {
  const sample = scenarios[index];
  const payload = JSON.stringify({ schemaVersion: '1.0.0', records: sample.records, inventory: enterpriseInventory });
  const catalogueId = createHash('sha256').update(payload).digest('hex');
  await page.clock.setFixedTime(new Date(referenceAt));
  await page.route('**/pricing/manifest.json', route => route.fulfill({
    json: { schemaVersion: '1.0.0', catalogueId, records: sample.records.length, lastCheckedAt: referenceAt, previous: null },
  }));
  await page.route(`**/pricing/catalogue-${catalogueId}.json`, route => route.fulfill({ body: payload, contentType: 'application/json' }));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'fictional-value.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(withEnvironment({ ...sample.env, valuePlan }))) });
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

const input = (value: number) => ({ value, source: 'fictional' as const });
const accepted: ValuePlan = { currency: 'GBP', assumptions: { audience: input(200), adoption: input(50), tasks: input(20), minutes: input(12),
  realisation: input(60), hourlyValue: input(25), cashableSavings: input(200) } };

test('adoption changes productivity and only projects costs after an explicit workload link', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await openSample(page, 0, accepted);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await navigate(page, 'Cost & Value Analysis');
  await page.getByRole('button', { name: 'Explore changes', exact: true }).click();
  await page.getByLabel('What would you like to change?').selectOption('adoption');
  await page.getByLabel('Lower adoption (%)', { exact: true }).fill('25');
  await page.getByLabel('Higher adoption (%)', { exact: true }).fill('75');
  const compare = page.getByRole('button', { name: 'Compare adoption assumptions' });
  await compare.press('Enter');
  const low = page.getByRole('row').filter({ hasText: 'Lower adoption' });
  await expect(low.getByRole('cell', { name: '200', exact: true })).toBeVisible();
  await expect(low.getByRole('cell', { name: 'Unknown', exact: true })).toHaveCount(3);
  await expect(page.getByText('AI cost effects need an explicit, usable workload link.', { exact: false })).toBeVisible();
  await page.getByText('Link adoption to workload usage', { exact: true }).click();
  await page.getByLabel('Workload affected by adoption').selectOption({ label: 'Support assistant' });
  await page.getByLabel('Monthly interactions per active user', { exact: true }).fill('10');
  await compare.click();
  await expect(low).toContainText('500 executions');
  await expect(low).toContainText('£1,617.10');
  await expect(page.getByRole('row').filter({ hasText: 'Higher adoption' })).toContainText('£1,631.29');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.getByRole('button', { name: 'Clear comparison' }).click();
  await expect(page.getByRole('table', { name: 'Monthly adoption comparison' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await navigate(page, 'Reports & Export');
  const json = JSON.parse((await download(page, 'Export JSON')).toString());
  expect(json.valuePlan).toEqual(accepted);
  expect(json.objects.find((object: { id: string }) => object.id === 'Enterprise demand').executions).toBe(20_000);
  expect(json.sourceSnapshot.currentKnown).toBe('1893.80');
});

test('Environment Review groups evidence and declarations and opens the existing focused editor', async ({ page }) => {
  await openSample(page, 4, undefined, env => ({
    ...env,
    objects: [...env.objects.map(object => object.kind === 'agent' && object.id === 'Audio pilot' ?
      { ...object, autonomy: 'read-only' as const } : object),
    { id: 'fictional-policy', name: 'Fictional identity policy', kind: 'security-policy', control: 'identity', status: 'implemented' }],
    relationships: [...env.relationships, { type: 'policy-applies-to-environment', from: 'fictional-policy', to: env.id }],
  }));
  await page.getByRole('link', { name: 'Review your design', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Environment Review' })).toBeVisible();
  await expect(page.getByText('1 policy declarations')).toBeVisible();
  const primary = page.getByRole('navigation', { name: 'Studio navigation' });
  await expect(primary.getByRole('link', { name: 'Environment Review' })).toHaveCount(0);
  const views = page.getByRole('navigation', { name: 'Environment review views' });
  await views.getByRole('link', { name: 'Technical fit' }).press('Enter');
  await page.locator('summary').filter({ hasText: 'Incompatible audio output' }).click();
  await expect(page.getByText('Technical · Verified incompatible', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review model output modality for Incompatible audio output' }).click();
  await expect(page.getByLabel('Required output modality', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Back to Environment Review' }).click();
  await expect(views.getByRole('link', { name: 'Technical fit' })).toHaveAttribute('aria-current', 'page');

  await views.getByRole('link', { name: 'Controls' }).click();
  await page.getByText('Identity and access', { exact: true }).click();
  await expect(page.getByText('Declared implemented', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Review Fictional identity policy' }).first().click();
  await expect(page.getByLabel('Declared status', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Back to Environment Review' }).click();
  await page.getByText('Human approval', { exact: true }).click();
  await expect(page.getByText('Not assessed', { exact: true })).toBeVisible();
  await expect(page.getByText('Unknown', { exact: true }).first()).toBeVisible();

  await page.evaluate(() => { location.hash = '#/architecture'; });
  await expect(page.getByRole('table', { name: 'Architecture objects and outgoing links' })).toBeVisible();
  const svg = await download(page, 'Export SVG');
  expect(svg.toString()).toContain('AI Economics Studio logical architecture');
  await page.evaluate(() => { location.hash = '#/governance'; });
  await expect(views.getByRole('link', { name: 'Controls' })).toHaveAttribute('aria-current', 'page');
});

import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { example, nav, prices } from '../tests/e2e/studio-fixture';

const directory = 'docs/assets/readme';

test('captures the real Studio with its fictional worked example', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir(directory, { recursive: true });
  await prices(page);
  async function capture(name: string) {
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.screenshot({ path: `${directory}/${name}.png`, animations: 'disabled', caret: 'hide' });
  }

  await page.goto('/');
  await expect(page.getByLabel('Environment name')).toBeVisible();
  await capture('home');
  await example(page, 'ai-adoption-business-case');
  await page.getByRole('button', { name: 'Build your AI solution' }).click();
  await capture('guided-builder');

  await nav(page, 'Cost & Value Analysis').click();
  await expect(page.locator('.metric').first()).toContainText('£450.00');
  await capture('cost-analysis');
  await page.getByRole('button', { name: 'Explore changes', exact: true }).click();
  await page.getByLabel('What would you like to change?').selectOption('adoption');
  await page.getByLabel('Lower adoption (%)').fill('25');
  await page.getByLabel('Higher adoption (%)').fill('75');
  await page.getByText('Link adoption to workload usage', { exact: true }).click();
  await page.getByLabel('Workload affected by adoption').selectOption({ label: 'Internal support assistant' });
  await page.getByLabel('Monthly interactions per active user').fill('10');
  await page.getByRole('button', { name: 'Compare adoption assumptions' }).click();
  await expect(page.getByRole('table', { name: 'Monthly adoption comparison' })).toContainText('£675.00');
  await page.getByRole('table', { name: 'Monthly adoption comparison' }).scrollIntoViewIfNeeded();
  await capture('explore-changes');

  await page.getByRole('button', { name: 'Potential value', exact: true }).click();
  await expect(page.getByText('240 hours monthly · 2,880 hours annualised')).toBeVisible();
  await capture('potential-value');

  await nav(page, 'Environment Review').click();
  await page.getByRole('link', { name: 'Architecture', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Scrollable logical diagram' })).toBeVisible();
  await capture('environment-review');

  await nav(page, 'Reports & Export').click();
  await expect(page.getByRole('radio', { name: /Executive Summary/ })).toBeVisible();
  await capture('reports-export');
  expect(errors).toEqual([]);
});

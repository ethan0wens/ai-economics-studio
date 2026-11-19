import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import technicalIndex from '../../docs/technical/index.json' with { type: 'json' };

test('technical index opens all seven sections from Documentation', async ({ page }) => {
  await page.goto('/#/documentation');
  const entry = page.getByRole('navigation', { name: 'Documentation areas' });
  await entry.getByRole('link', { name: 'Technical Documentation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Technical Documentation', level: 1 })).toBeFocused();
  for (const [index, group] of technicalIndex.sections.entries()) {
    const sections = page.getByRole('navigation', { name: 'Technical sections' });
    await sections.getByRole('link', { name: group.title, exact: true }).click();
    const title = `${index + 1}. ${group.title}`;
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeFocused();
    const first = group.articles[0];
    await page.getByRole('region', { name: title, exact: true }).getByRole('link', { name: first.title, exact: true }).click();
    await expect(page.getByRole('heading', { name: first.title, level: 1, exact: true })).toBeFocused();
    await expect(page.getByRole('navigation', { name: 'Related documentation' }).getByRole('heading', { name: 'User Guides' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Technical documentation breadcrumb' }).getByRole('link', { name: 'Technical Documentation' }).click();
    await expect(page.getByRole('heading', { name: 'Technical Documentation', level: 1 })).toBeFocused();
  }
});

test('search distinguishes technical results from user guides and opens a legacy deep link', async ({ page }) => {
  await page.goto('/#/documentation');
  await page.getByRole('searchbox', { name: 'Search documentation', exact: true }).fill('ledger');
  const results = page.locator('.doc-results');
  await expect(results.getByText(/^User Guide · /).first()).toBeVisible();
  await expect(results.getByText(/^Technical Documentation · /).first()).toBeVisible();
  await results.getByRole('link', { name: 'Ledger quantities and cost methodology', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ledger quantities and cost methodology', level: 1 })).toBeVisible();
  await page.getByRole('navigation', { name: 'Technical documentation breadcrumb' }).getByRole('link', { name: 'Technical Documentation' }).click();
  const search = page.getByRole('searchbox', { name: 'Search technical documentation' });
  const queries = [
    ['PTU', 'Microsoft Foundry and Azure supporting services'], ['Copilot Credits', 'Copilot Studio and Microsoft licensing evidence'],
    ['schema', 'Environment schema and object fields'], ['contract override', 'Contracts, forecasts and licence expenditure'],
    ['catalogue refresh', 'Catalogue refresh and maintenance runbook'], ['Cloudflare deployment', 'Local development and Cloudflare deployment'],
    ['shared capacity', 'Ledger quantities and cost methodology'], ['unknown pricing', 'Ledger quantities and cost methodology'],
    ['financial reconciliation', 'Worked financial reconciliations'],
  ];
  for (const [query, title] of queries) {
    await search.fill(query);
    await expect(results.getByRole('link', { name: title, exact: true })).toBeVisible();
  }
  await page.goto('/#/documentation/model-evidence?section=billing-and-deployment');
  await expect(page.getByRole('heading', { name: 'Enter billing and deployment locations separately' })).toBeFocused();
  await page.getByRole('link', { name: 'Microsoft Foundry and Azure supporting services', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Microsoft Foundry and Azure supporting services', level: 1 })).toBeFocused();
  await expect(page.getByRole('table', { name: 'Model billing configurations' })).toBeVisible();
});

test('deep links expose diagrams, formulas, source references and generated contracts', async ({ page }) => {
  await page.goto('/#/documentation/technical/system-architecture?section=system-boundary');
  await expect(page.getByRole('heading', { name: 'System boundary', exact: true })).toBeFocused();
  await expect(page.getByText('Diagram 1. System architecture and public data paths', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Diagram 1. System architecture and public data paths' })).toContainText('Cloudflare Static Assets');
  await expect(page.getByRole('link', { name: 'Bootstrap', exact: true })).toHaveAttribute('href', /github\.com\/ethan0wens\/ai-economics-studio\/blob\/main\/src\/main\.tsx$/);
  await page.goto('/#/documentation/technical/environment-schema?section=generated-reference');
  await expect(page.getByRole('heading', { name: 'Generated schema reference' })).toBeFocused();
  await expect(page.getByRole('table', { name: 'Object kinds and fields from the executable schema' })).toContainText('reservation');
  await page.goto('/#/documentation/technical/relationships-and-files?section=generated-reference');
  await expect(page.getByRole('table', { name: 'Allowed relationship endpoints' })).toContainText('licence-replaces-entitlement');
  await page.goto('/#/documentation/technical/ledger-methodology?section=copilot-credits-and-supporting-resources');
  await expect(page.getByRole('heading', { name: 'Copilot credits and supporting resources' })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Copilot credits and supporting resources code example' })).toContainText('G − A − P');
  await page.goto('/#/documentation/technical/build-and-deploy?section=local-setup');
  await expect(page.getByRole('region', { name: 'Local setup code example' })).toContainText('npm run docs:validate');
  await expect(page.getByRole('table', { name: 'Local commands from package.json' })).toContainText('tsx scripts/docs.ts');
});

test('all chapters reflow at 320 pixels and code and tables are keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/#/documentation/technical');
  await expect(page.getByRole('heading', { name: 'Technical Documentation', level: 1 })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Studio menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  for (const { id, title } of technicalIndex.sections.flatMap(group => group.articles)) {
    await page.goto(`/#/documentation/technical/${id}`);
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  await page.goto('/#/documentation/technical/security-and-operations?section=verify-a-published-release');
  const code = page.getByRole('region', { name: 'Verify a published release code example' });
  await code.focus();
  await expect(code).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => code.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto('/#/documentation/technical/environment-schema?section=top-level-contract');
  const table = page.getByRole('region', { name: 'Top-level contract table' });
  await table.focus();
  await expect(table).toBeFocused();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
});

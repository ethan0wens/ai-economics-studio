import { expect, test, type Page } from '@playwright/test';
import { blankEnvironment, type Environment } from '../../src/domain';

async function openEnvironment(page: Page, objects: Environment['objects'], relationships: Environment['relationships'] = []) {
  await page.goto('/');
  const env = { ...blankEnvironment(), name: 'Help navigation example', objects, relationships };
  await page.locator('input[type=file]').setInputFiles({
    name: 'help-example.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(env)),
  });
  await expect(page.getByRole('heading', { name: 'Environment Builder', level: 1 })).toBeVisible();
}

async function fieldHelp(page: Page, label: string) {
  await page.getByRole('button', { name: `Help for ${label}`, exact: true }).click();
  return page.getByRole('group', { name: `${label} guidance`, exact: true });
}

test('Guided Foundry usage opens the internal guide and returns to the same field and value', async ({ page }) => {
  await openEnvironment(page, [
    { id: 'a', name: 'Foundry sample', kind: 'agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' },
    { id: 'm', name: 'Foundry model', kind: 'model-deployment', mode: 'payg', modelId: 'gpt-4.1-mini' },
    { id: 'u', name: 'Monthly profile', kind: 'usage-profile', executions: 10, calls: 2, input: 1500, output: 300 },
  ], [{ from: 'a', to: 'm', type: 'agent-uses-deployment' }, { from: 'a', to: 'u', type: 'agent-uses-usage' }]);
  await page.getByRole('navigation', { name: 'Builder steps' }).getByRole('button', { name: 'Estimate usage' }).click();
  const help = await fieldHelp(page, 'Monthly executions');
  await help.getByRole('link', { name: 'Learn more in Documentation' }).click();
  await expect(page).toHaveURL(/documentation\/foundry-usage\?section=per-request$/);
  await expect(page.getByRole('heading', { name: 'Enter monthly runs and per-request usage' })).toBeFocused();
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await expect(page.getByLabel('Monthly executions', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Monthly executions', { exact: true })).toHaveValue('10');
  await expect(page.getByRole('button', { name: 'Settings for Help navigation example' })).toBeVisible();
});

test('Advanced Copilot help and Cost & Value Analysis agreement help preserve workspace context', async ({ page }) => {
  await openEnvironment(page, [{ id: 'a', name: 'Copilot sample', kind: 'agent', platform: 'copilot-studio', modelSource: 'platform-managed', credits: 125 }]);
  await page.getByRole('group', { name: 'Builder mode' }).getByRole('button', { name: 'Advanced' }).click();
  await page.getByRole('button', { name: /^Copilot sample / }).click();
  await page.getByRole('button', { name: 'Usage', exact: true }).click();
  const creditHelp = await fieldHelp(page, 'Monthly Copilot Credits');
  await creditHelp.getByRole('link', { name: 'Learn more in Documentation' }).click();
  await expect(page).toHaveURL(/documentation\/copilot-credits\?section=monthly-credits$/);
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await expect(page.getByLabel('Monthly Copilot Credits', { exact: true })).toHaveValue('125');
  await page.getByRole('navigation', { name: 'Studio navigation' }).getByRole('link', { name: 'Cost & Value Analysis' }).click();
  await page.getByText('Copilot Studio credits', { exact: true }).click();
  const agreementHelp = await fieldHelp(page, 'Price agreement');
  await agreementHelp.getByRole('link', { name: 'Learn more in Documentation' }).click();
  await expect(page).toHaveURL(/documentation\/technical\/agreements-and-licences\?section=price-precedence$/);
  await expect(page.getByRole('heading', { name: 'Price precedence' })).toBeFocused();
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await expect(page.getByLabel('Price agreement', { exact: true })).toBeFocused();
});

test('PTU guidance and Markdown cross-references stay in the Hub and label explicit sources', async ({ page }) => {
  await openEnvironment(page, [
    { id: 'a', name: 'Foundry sample', kind: 'agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' },
    { id: 'm', name: 'Capacity', kind: 'model-deployment', mode: 'provisioned', modelId: 'gpt-4.1', capacity: 15, billableHours: 400 },
  ], [{ type: 'agent-uses-deployment', from: 'a', to: 'm' }]);
  await page.getByRole('navigation', { name: 'Builder steps' }).getByRole('button', { name: 'Estimate usage' }).click();
  await page.getByRole('link', { name: 'PTU sizing and reservations' }).click();
  await expect(page).toHaveURL(/documentation\/ptu-and-reservations\?section=capacity-and-hours$/);
  await expect(page.getByRole('link', { name: /Microsoft provisioned throughput sizing/ })).toHaveAttribute('href', /^https:\/\/learn\.microsoft\.com/);
  await page.goto('/#/documentation/technical/system-architecture');
  await page.getByRole('link', { name: 'workspace flow', exact: true }).click();
  await expect(page).toHaveURL(/documentation\/technical\/workspace-flow$/);
  await page.getByRole('link', { name: 'ledger method', exact: true }).click();
  await expect(page).toHaveURL(/documentation\/technical\/ledger-methodology$/);
  await expect(page.getByRole('link', { name: 'src/ledger.ts', exact: true })).toHaveAttribute('aria-description', 'Implementation source on GitHub');
  await page.goto('/#/documentation/technical/interfaces-and-troubleshooting');
  await page.getByRole('link', { name: 'maintenance guidance', exact: true }).click();
  await expect(page).toHaveURL(/documentation\/technical\/documentation-maintenance$/);
  await page.getByRole('link', { name: 'product language guidance', exact: true }).click();
  await expect(page).toHaveURL(/documentation\/technical\/product-language$/);
  await expect(page.getByRole('heading', { name: 'Product language guide', level: 1 })).toBeVisible();
});

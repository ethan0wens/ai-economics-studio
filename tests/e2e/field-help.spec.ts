import { expect, test, type Page } from '@playwright/test';
import { blankEnvironment, type Environment } from '../../src/domain';
import { fieldHelp } from '../../src/field-help';

const data: Environment = {
  ...blankEnvironment(), region: 'westus',
  objects: [
    { id: 'desk', name: 'Support desk', kind: 'agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' },
    { id: 'copilot', name: 'HR assistant', kind: 'agent', platform: 'copilot-studio', modelSource: 'platform-managed' },
    { id: 'model', name: 'Reserved model', kind: 'model-deployment', modelId: 'Test model', mode: 'provisioned', allocationBasis: 'input-tokens', capacity: 2, billableHours: 10 },
    { id: 'profile', name: 'Support workload', kind: 'usage-profile', executions: 100, calls: 2, input: 500, output: 100, retries: 5 },
    { id: 'group', name: 'Service team', kind: 'user-group' },
    { id: 'licence', name: 'Entitlement', kind: 'licence-entitlement', procurement: 'incremental' },
    { id: 'resource', name: 'Queue storage', kind: 'supporting-resource', monthlyQuantity: 100 },
    { id: 'policy', name: 'Approval policy', kind: 'security-policy' },
  ],
  relationships: [
    { type: 'agent-uses-deployment', from: 'desk', to: 'model' },
    { type: 'agent-uses-usage', from: 'desk', to: 'profile' },
  ],
};

async function workspace(page: Page, fixture = data) {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'scenario.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await expect(page.getByRole('heading', { name: 'Environment Builder' })).toBeVisible();
}

test('every registered field is reachable with an accessible help trigger', async ({ page }) => {
  const revealed = new Set<string>();
  async function inspect() {
    for (const element of await page.locator('[data-help]:visible').all()) {
      const key = (await element.getAttribute('data-help'))!;
      revealed.add(key);
      const trigger = element.getByRole('button', { name: /^Help for / });
      await expect(trigger).toBeVisible();
      expect(await trigger.getAttribute('aria-controls')).toBeTruthy();
    }
  }

  await page.goto('/');
  await inspect();
  const fixture: Environment = {
    ...data,
    objects: [...data.objects.map(object => object.kind === 'model-deployment' ? { ...object, modelId: 'azure-openai' } : object),
      { id: 'other', name: 'Other group', kind: 'user-group' },
      { id: 'existing', name: 'Existing licence', kind: 'licence-entitlement', procurement: 'existing' }],
    relationships: [...data.relationships,
      { type: 'agent-uses-prompt-model', from: 'copilot', to: 'model' },
      { type: 'agent-uses-resource', from: 'desk', to: 'resource' },
      { type: 'group-has-entitlement', from: 'group', to: 'licence' },
      { type: 'group-has-entitlement', from: 'other', to: 'licence' },
      { type: 'licence-replaces-entitlement', from: 'licence', to: 'existing' }],
  };
  await workspace(page, fixture);
  const inspector = page.getByRole('complementary', { name: /.+/ }).filter({ has: page.getByRole('group', { name: 'Inspector sections' }) });
  for (const object of fixture.objects) {
    await page.getByRole('button', { name: new RegExp(`^${object.name} `) }).click();
    const deeper = inspector.getByRole('button', { name: /^(Advanced|Detailed)$/ });
    if (await deeper.count()) await deeper.last().click();
    await inspect();
    if (['agent', 'model-deployment'].includes(object.kind)) {
      await inspector.getByRole('button', { name: 'Usage', exact: true }).click();
      await inspect();
      if (object.id === 'copilot') {
        await inspector.getByLabel('Copilot credit input method', { exact: true }).selectOption('breakdown');
        await inspector.getByLabel('Apply declared included usage', { exact: true }).check();
        await inspect();
      }
    }
    await inspector.getByRole('button', { name: 'Dependencies' }).click();
    await inspect();
  }
  await page.getByRole('button', { name: /^Approval policy / }).click();
  await inspector.getByRole('button', { name: 'Dependencies' }).click();
  await inspector.getByLabel('Relationship type', { exact: true }).selectOption('policy-applies-to-environment');
  await inspect();
  await page.getByRole('button', { name: 'Untitled environment' }).click();
  await inspect();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cost Analysis' }).click();
  await page.getByText('Shared provisioned capacity', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Price agreement', exact: true }).selectOption('fixed');
  await page.locator('.ledger-row[open] .price-more summary').click();
  await inspect();
  await page.getByRole('combobox', { name: 'Price agreement', exact: true }).selectOption('discount');
  await inspect();
  await page.getByRole('button', { name: 'Pricing Catalogue', exact: true }).click();
  await inspect();
  expect([...revealed].sort()).toEqual(Object.keys(fieldHelp).sort());
});

test('help opens on focus and hover, supports links and dismisses without losing focus', async ({ page }) => {
  await workspace(page);
  await page.getByRole('button', { name: /^Support desk / }).click();
  const trigger = page.getByRole('button', { name: 'Help for Platform', exact: true });
  const help = page.getByRole('group', { name: 'Platform guidance' });
  await trigger.hover();
  await expect(help).toBeVisible();
  await page.getByLabel('Object name', { exact: true }).hover();
  await expect(help).toBeHidden();
  await trigger.focus();
  await expect(help).toContainText('Required · One platform');
  await page.keyboard.press('Tab');
  await expect(help.getByRole('link')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(help).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(help).toBeVisible();
  await page.keyboard.press('Space');
  await expect(help).toBeHidden();
});

test('conditional fields and configuration levels preserve saved assumptions and totals', async ({ page }) => {
  await workspace(page);
  await page.getByRole('button', { name: /^Reserved model / }).click();
  const inspector = page.locator('.inspector');
  await expect(inspector.getByLabel('SKU', { exact: true })).toHaveCount(0);
  await inspector.getByRole('button', { name: 'Advanced' }).click();
  await inspector.getByLabel('SKU', { exact: true }).fill('Example SKU');
  await inspector.getByRole('button', { name: 'Usage', exact: true }).click();
  await expect(inspector.getByLabel('Allocate fixed cost by declared input tokens', { exact: true })).toBeChecked();
  await inspector.getByRole('button', { name: 'Essential' }).click();
  await expect(inspector.getByLabel('Allocate fixed cost by declared input tokens', { exact: true })).toHaveCount(0);
  await expect(inspector.getByLabel('Provisioned capacity units', { exact: true })).toHaveValue('2');
  await inspector.getByRole('button', { name: 'Costs', exact: true }).click();
  await inspector.getByText('Shared provisioned capacity', { exact: true }).click();
  await expect(inspector.getByRole('textbox', { name: /^Rate per billed unit/ })).toHaveCount(0);
  await inspector.getByRole('combobox', { name: 'Price agreement', exact: true }).selectOption('fixed');
  await inspector.getByRole('textbox', { name: /^Rate per billed unit/ }).fill('3');
  await inspector.getByLabel('Agreement reason', { exact: true }).fill('Fictional test rate');
  await inspector.getByRole('button', { name: 'Save price assumptions' }).click();
  await expect(page.locator('.metric').first()).toContainText('£60.00');
  await inspector.getByRole('button', { name: 'Configuration', exact: true }).click();
  await inspector.getByRole('button', { name: 'Advanced' }).click();
  await expect(inspector.getByLabel('SKU', { exact: true })).toHaveValue('Example SKU');
  await expect(page.locator('.metric').first()).toContainText('£60.00');
  await inspector.getByLabel('Billing mode', { exact: true }).selectOption('payg');
  await inspector.getByRole('button', { name: 'Usage', exact: true }).click();
  await expect(inspector.getByLabel('Provisioned capacity units', { exact: true })).toHaveCount(0);
  await inspector.getByRole('button', { name: 'Configuration', exact: true }).click();
  await inspector.getByLabel('Billing mode', { exact: true }).selectOption('provisioned');
  await expect(page.locator('.metric').first()).toContainText('£60.00');

  await page.getByRole('button', { name: /^HR assistant / }).click();
  await expect(inspector.getByLabel('Model source', { exact: true }).locator('option[value=deployment-ref]')).toHaveCount(0);
  await expect(inspector.getByLabel('Model deployment', { exact: true })).toHaveCount(0);
  await inspector.getByRole('button', { name: 'Usage', exact: true }).click();
  await expect(inspector.getByLabel('Monthly Copilot credits', { exact: true })).toHaveValue('');
  await expect(inspector.getByText('Required to complete')).toBeVisible();
  await expect(inspector.getByLabel('Usage profile', { exact: true })).toHaveCount(0);
  await inspector.getByLabel('Monthly Copilot credits', { exact: true }).fill('10');
  await expect(inspector.getByText('Unknown price', { exact: true })).toBeVisible();
});

test('mobile tap opens field guidance and a second tap closes it', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    await workspace(page);
    await page.getByRole('button', { name: /^Support desk / }).tap();
    const help = page.getByRole('group', { name: 'Platform guidance' });
    const trigger = page.getByRole('button', { name: 'Help for Platform', exact: true });
    await trigger.tap();
    await expect(help).toBeVisible();
    await trigger.tap();
    await expect(help).toBeHidden();
  } finally { await page.close(); }
});

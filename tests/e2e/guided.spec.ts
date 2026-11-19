import { expect, test, type Page } from '@playwright/test';
import { reportText } from './report-text';
import AxeBuilder from '@axe-core/playwright';
import { addAgent, example, getFile, mode, monthly, nav, prices, show, start } from './studio-fixture';

async function modelUsage(page: Page, executions = '1000') {
  await page.getByLabel('Monthly executions', { exact: true }).fill(executions);
  await page.getByLabel('Model calls per execution', { exact: true }).fill('1');
  await page.getByLabel('Input tokens per call', { exact: true }).fill('1500');
  await page.getByLabel('Output tokens per call', { exact: true }).fill('300');
}

test('named Home, Foundry guidance, automatic links, progressive cost, JSON and PDF', async ({ page }) => {
  await prices(page);
  await start(page);
  await page.getByRole('button', { name: /^Microsoft Foundry Choose/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await addAgent(page, 'Fictional Foundry agent');
  await page.getByRole('combobox', { name: 'Model configuration', exact: true }).selectOption('gpt-4-1-mini-global-uksouth');
  await page.getByLabel('Actual deployment region', { exact: true }).fill('uksouth');
  await show(page, 'Estimate usage').click();
  await expect(page.getByLabel('Monthly executions', { exact: true })).toBeEmpty();
  await modelUsage(page);
  await expect(monthly(page)).toContainText('£450.00');
  await expect(page.getByRole('region', { name: 'Running estimate' })).toContainText('£5,400.00');
  await expect(page.getByText('Uses verified Microsoft retail prices where available')).toBeVisible();
  await page.getByLabel('Monthly executions', { exact: true }).fill('2000');
  await expect(monthly(page)).toContainText('£900.00');
  await nav(page, 'Home').click();
  await page.getByRole('button', { name: 'Continue building' }).click();
  await expect(page.getByLabel('Monthly executions', { exact: true })).toHaveValue('2000');
  await nav(page, 'Reports & Export').click();
  const json = await getFile(page, 'Export JSON');
  const before = JSON.parse(json.toString());
  expect(before.objects.map((item: { kind: string }) => item.kind).sort()).toEqual(['agent', 'model-deployment', 'usage-profile']);
  expect(before.relationships.map((edge: { type: string }) => edge.type).sort()).toEqual(['agent-uses-deployment', 'agent-uses-usage']);
  expect(before.sourceSnapshot).toMatchObject({ current: '900.00', annualKnown: '10800.00', incomplete: 0 });
  const pdf = await getFile(page, 'Generate PDF');
  const pages = await reportText(pdf);
  expect(pages[0]).toContain('AI Environment Cost Assessment');
  expect(pages[1]).toContain('Estimated monthly cost £900.00');
  expect(pages[1]).toContain('Current estimate £900.00 £10,800.00 0');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Open an environment' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'fictional-export.json', mimeType: 'application/json', buffer: json });
  await expect(monthly(page)).toContainText('£900.00');
  await expect(page.getByText(/Recalculated with the applied catalogue/)).toBeVisible();
});

test('combined workloads remain distinct, existing deployment is reused and advanced values survive switching', async ({ page }) => {
  await prices(page);
  await start(page);
  await page.getByRole('button', { name: /^Both platforms/ }).click();
  await show(page, 'Build your AI solution').click();
  await addAgent(page, 'Foundry alpha', 'foundry-agent-service');
  await page.getByRole('combobox', { name: 'Model configuration', exact: true }).selectOption('gpt-4-1-mini-global-uksouth');
  await show(page, 'Estimate usage').click();
  await modelUsage(page);
  await page.getByRole('button', { name: 'More usage options' }).click();
  await expect(page.getByLabel('Cached input tokens per call', { exact: true })).toBeFocused();
  await page.getByLabel('Additional retries (%)', { exact: true }).fill('10');
  await mode(page, 'Guided').click();
  await expect(monthly(page)).toContainText('£495.00');
  await show(page, 'Build your AI solution').click();
  await addAgent(page, 'Copilot beta', 'copilot-studio');
  await show(page, 'Estimate usage').click();
  await expect(page.getByLabel('Monthly Copilot Credits', { exact: true })).toBeEmpty();
  await expect(page.getByLabel('Input tokens per call', { exact: true })).toHaveCount(0);
  await page.getByText('Try example usage', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Illustrative preset' }).selectOption('typical');
  await page.getByRole('button', { name: 'Apply typical scenario preset' }).click();
  await expect(page.getByLabel('Monthly Copilot Credits', { exact: true })).toHaveValue('12000');
  await expect(monthly(page)).toContainText('£735.00');
  await show(page, 'Build your AI solution').click();
  await page.getByLabel('Agent name', { exact: true }).fill('Foundry gamma');
  await page.getByRole('combobox', { name: 'Agent platform', exact: true }).selectOption('foundry-agent-service');
  await page.getByRole('combobox', { name: 'Use an existing deployment', exact: true }).selectOption({ label: 'Foundry alpha model' });
  await page.getByRole('button', { name: 'Add agent', exact: true }).click();
  await show(page, 'Estimate usage').click();
  await modelUsage(page);
  await expect(monthly(page)).toContainText('£1,185.00');
  await nav(page, 'Reports & Export').click();
  const data = JSON.parse((await getFile(page, 'Export JSON')).toString());
  expect(data.objects.filter((item: { kind: string }) => item.kind === 'model-deployment')).toHaveLength(1);
  expect(data.objects.find((item: { name: string }) => item.name === 'Foundry alpha usage').retries).toBe(10);
  expect(data.objects.find((item: { name: string }) => item.name === 'Copilot beta').modelSource).toBe('platform-managed');
  expect(data.relationships.filter((edge: { type: string }) => edge.type === 'agent-uses-deployment')).toHaveLength(2);
});

test('Copilot readiness focuses missing credits and an unresolved exact rate opens its cost control', async ({ page }) => {
  await prices(page, 'credits');
  await start(page);
  await page.getByRole('button', { name: /^Copilot Studio Plan/ }).click();
  await show(page, 'Build your AI solution').click();
  await addAgent(page, 'Fictional Copilot');
  await show(page, 'Review your estimate').click();
  await expect(page.getByRole('heading', { name: 'Improve your estimate' })).toBeVisible();
  await page.getByRole('button', { name: 'Resolve enter monthly copilot credits for Fictional Copilot' }).click();
  await expect(page.getByLabel('Monthly Copilot Credits', { exact: true })).toBeFocused();
  await page.getByLabel('Monthly Copilot Credits', { exact: true }).fill('12000');
  await page.getByRole('button', { name: 'Back to estimate checks' }).click();
  await expect(page.getByText('The studio cannot yet calculate 1 unresolved charge.')).toBeVisible();
  await expect(page.getByText(/Enter a customer-specific rate if you have one/)).toBeVisible();
  await page.getByRole('button', { name: 'Resolve review price for copilot studio credits for Fictional Copilot' }).click();
  await expect(page.getByLabel('Price agreement', { exact: true })).toBeFocused();
  await expect(monthly(page)).toContainText('—');
});

for (const [id, expected, quantity, edited] of [
  ['foundry-assistant', '£450.00', '1000', '2000'],
  ['copilot-agent', '£240.00', '12000', '15000'],
  ['enterprise-ai', '£1,592.00', '18000', '20000'],
  ['shared-deployment', '£3,000.00', '400', '500'],
] as const) {
  test(`example ${id} is previewable, editable and exportable`, async ({ page }) => {
    await prices(page);
    await example(page, id);
    await expect(monthly(page)).toContainText(expected);
    const exportReview = await page.getByRole('heading', { name: 'Your AI environment, in numbers' }).isVisible();
    expect(exportReview).toBe(true);
    if (id === 'enterprise-ai' || id === 'shared-deployment') {
      await nav(page, 'Cost Analysis').click();
      if (id === 'enterprise-ai') {
        const table = page.getByRole('table').first();
        await expect(table.getByRole('row', { name: /Existing licence spend/ })).toContainText('£4,000.00');
        await expect(table.getByRole('row', { name: /Proposed environment/ })).toContainText('£5,592.00');
      } else {
        const fixed = page.locator('.ledger-row').filter({ hasText: 'Shared provisioned capacity' });
        await expect(fixed).toHaveCount(1);
        await fixed.locator(':scope > summary').click();
        await expect(fixed).toContainText('Support assistant: £2,250.00');
        await expect(fixed).toContainText('Operations assistant: £750.00');
      }
      await nav(page, 'Environment Builder').click();
    }
    await show(page, 'Estimate usage').click();
    const field = page.getByLabel(id === 'foundry-assistant' ? 'Monthly executions' :
      id === 'shared-deployment' ? 'Billable hours per month' : 'Monthly Copilot Credits', { exact: true });
    await expect(field).toHaveValue(quantity);
    await field.fill(edited);
    await expect(monthly(page)).not.toContainText(expected);
    await mode(page, 'Advanced').click();
    await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
    await nav(page, 'Reports & Export').click();
    const json = JSON.parse((await getFile(page, 'Export JSON')).toString());
    expect(json.description).toMatch(/fictional/i);
    expect(json.sourceSnapshot.incomplete).toBe(0);
  });
}

test('docs search, deep links, contextual help, and mobile menu focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Understand the cost of your AI ambitions.' })).toBeVisible();
  await expect(page.getByText(/No account required. Your environment stays in this browser tab/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await start(page);
  await page.getByRole('button', { name: 'Help for Default billing region' }).click();
  await page.getByRole('group', { name: 'Default billing region guidance' }).getByRole('link', { name: 'Learn more in Documentation' }).click();
  const anchor = page.getByRole('heading', { name: 'Enter billing and deployment locations separately', exact: true });
  await expect(anchor).toBeFocused();
  await expect(page).toHaveURL(/documentation\/model-evidence\?section=billing-and-deployment/);
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await expect(page.getByLabel('Default billing region', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Help for Default billing region' }).click();
  await page.getByRole('group', { name: 'Default billing region guidance' }).getByRole('link', { name: 'Learn more in Documentation' }).click();
  await page.getByRole('link', { name: 'Documentation', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search documentation', exact: true });
  await search.fill('PTU');
  await expect(page.getByRole('link', { name: 'Size and price provisioned capacity', exact: true })).toBeVisible();
  await search.fill('already owned');
  await expect(page.getByRole('link', { name: 'How do I account for licences I already own?', exact: true })).toBeVisible();
  await search.fill('fictionaltermnotfound');
  await expect(page.getByText('Try a different term, or browse all topics.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  await menu.click();
  await expect(page.getByRole('dialog', { name: 'Studio menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Studio menu' })).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await nav(page, 'Environment Builder').click();
  await expect(page.getByRole('heading', { name: 'Environment Builder', exact: true })).toBeFocused();
  await page.getByRole('button', { name: /^Copilot Studio Plan/ }).click();
  const stepPicker = page.getByRole('combobox', { name: 'Builder step', exact: true });
  await expect(stepPicker).toContainText('Choose your AI platform');
  await stepPicker.selectOption('1');
  await addAgent(page, 'Mobile Copilot agent');
  await stepPicker.selectOption('2');
  await page.getByLabel('Monthly Copilot Credits', { exact: true }).fill('1000');
  await expect(page.getByRole('heading', { name: 'How much will your AI be used?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Copilot Credits', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('replacing a modified workspace preserves it when the user cancels', async ({ page }) => {
  await start(page, 'Keep this estimate');
  await show(page, 'Build your AI solution').click();
  await addAgent(page, 'Original agent', 'copilot-studio');
  await nav(page, 'Home').click();
  await page.getByRole('link', { name: 'Explore examples' }).click();
  await page.getByRole('link', { name: 'Preview Basic Foundry Assistant' }).click();
  await page.getByRole('button', { name: 'Open editable copy' }).click();
  await expect(page.getByRole('dialog')).toContainText('Keep this estimate');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await nav(page, 'Home').click();
  await page.getByRole('button', { name: 'Continue building' }).click();
  await expect(page.getByRole('heading', { name: 'Original agent', exact: true })).toBeVisible();
});

if (process.env.STUDIO_CHECK_RELEASE_HEALTH === '1') {
  test('production guided entry, live documentation reference and example catalogue', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Understand the cost of your AI ambitions.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Start with a new environment' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import existing', exact: true })).toBeVisible();
    await start(page, 'Release smoke estimate');
    await expect(page.getByRole('heading', { name: 'What are you looking to build?' })).toBeVisible();
    await page.getByRole('button', { name: /^Copilot Studio Plan/ }).click();
    await show(page, 'Build your AI solution').click();
    await addAgent(page, 'Release smoke agent');
    await show(page, 'Estimate usage').click();
    await page.getByLabel('Monthly Copilot Credits', { exact: true }).fill('1000');
    await expect(monthly(page)).toContainText('£');
    await nav(page, 'Cost Analysis').click();
    await expect(page.getByText('Annualised estimate', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where your money goes' })).toBeVisible();
    await nav(page, 'Environment Builder').click();
    await page.getByRole('link', { name: 'How to estimate Copilot Credits' }).click();
    await expect(page.getByRole('heading', { name: 'Enter your monthly credits' })).toBeFocused();
    await page.goto('/#/documentation/deployment-availability');
    const table = page.getByRole('table', { name: 'Model billing configurations' });
    await expect(table).toBeVisible();
    const expected = process.env.STUDIO_EXPECTED_CATALOGUE_ID;
    if (expected) await expect(page.getByText(new RegExp(`Applied catalogue ${expected.slice(0, 12)}`))).toBeVisible();
    await page.goto('/#/documentation/quickstart');
    await expect(page.getByRole('heading', { name: 'How do I build my first AI cost estimate?' })).toBeVisible();
    await page.goto('/#/examples');
    for (const introduction of [
      'Explore how a simple AI assistant generates costs from the requests it processes.',
      'Understand how Copilot Studio usage translates into credit-based costs.',
      'See how existing Microsoft licences, new purchases and supporting services affect your overall investment.',
      'Explore how multiple AI agents can share one deployment and account for its fixed-capacity cost once.',
    ]) await expect(page.getByText(introduction, { exact: true })).toBeVisible();
    await page.goto('/#/examples/shared-deployment');
    await expect(monthly(page)).toContainText('£');
  });
}

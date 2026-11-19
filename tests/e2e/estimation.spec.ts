import { expect, test, type Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { addAgent, getFile, monthly, nav, prices, show, start } from './studio-fixture';

async function addFoundry(page: Page, narrow = false) {
  await page.getByRole('button', { name: /^Microsoft Foundry Choose/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await addAgent(page, 'Fictional Foundry assistant');
  await page.getByRole('combobox', { name: 'Model configuration', exact: true }).selectOption('gpt-4-1-mini-global-uksouth');
  await page.getByLabel('Actual deployment region', { exact: true }).fill('uksouth');
  if (narrow) await page.getByRole('combobox', { name: 'Builder step' }).selectOption({ label: '3. Estimate usage' });
  else await show(page, 'Estimate usage').click();
}
async function addCopilot(page: Page) {
  await page.getByRole('button', { name: /^Copilot Studio Plan/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await addAgent(page, 'Fictional Copilot agent');
  await show(page, 'Estimate usage').click();
}

test('Foundry previews and confirms values, with temporary sensitivity and reconciled exports', async ({ page }) => {
  await prices(page);
  await start(page);
  await addFoundry(page);
  const executions = page.getByLabel('Monthly executions', { exact: true });
  await executions.fill('50');
  await page.getByText('Help me estimate usage', { exact: true }).click();
  const assistant = page.getByRole('form', { name: 'Foundry usage assistant' });
  await assistant.getByLabel('Monthly active users').fill('200');
  await assistant.getByLabel('Interactions per active user per month').fill('10');
  await assistant.getByLabel('Average model calls per interaction', { exact: true }).fill('2');
  await assistant.getByLabel('Average uncached input tokens per call', { exact: true }).fill('1500');
  await assistant.getByLabel('Average output tokens per call', { exact: true }).fill('300');
  await assistant.getByLabel('Source of these assumptions').selectOption('Customer forecast');
  await assistant.getByRole('button', { name: 'Preview usage' }).press('Enter');
  await expect(assistant.getByText('Usage preview · Customer forecast')).toBeVisible();
  await expect(assistant.getByText(/4,000 calls per month/)).toBeVisible();
  await expect(assistant.getByText(/6,000,000 uncached input and 1,200,000 output tokens/)).toBeVisible();
  await expect(executions).toHaveValue('50');
  await assistant.getByRole('button', { name: 'Apply Foundry usage' }).press('Enter');
  await expect(assistant.getByText(/Customer forecast applied/)).toBeVisible();
  await expect(assistant.getByRole('button', { name: 'Preview usage', exact: true })).toBeFocused();
  await expect(executions).toHaveValue('2000');
  await expect(monthly(page)).toContainText('£1,800.00');
  await executions.fill('2500');
  await expect(monthly(page)).toContainText('£2,250.00');

  await nav(page, 'Cost Analysis').click();
  await page.getByText('Largest monthly charges', { exact: true }).click();
  const driver = page.getByRole('listitem').filter({ hasText: 'Fictional Foundry assistant · Input tokens' });
  await expect(driver).toContainText('£1,500.00 per month · Microsoft retail');
  await expect(driver).toContainText('applied rate GBP 0.2 per 1,000 tokens');
  await driver.getByRole('button', { name: 'Open cost line' }).click();
  await expect(page.locator('details.ledger-row[open]')).toContainText('Input tokens');
  await page.getByText('Preview a change in usage', { exact: true }).click();
  const sensitivity = page.getByRole('form', { name: 'Usage sensitivity' });
  await sensitivity.getByLabel('Workload').selectOption({ label: 'Fictional Foundry assistant' });
  await sensitivity.getByLabel('Usage input').selectOption('executions');
  await sensitivity.getByLabel('Proposed monthly executions').fill('5000');
  await sensitivity.getByRole('button', { name: 'Compare monthly costs' }).click();
  await expect(sensitivity).toContainText('£4,500.00');
  await expect(sensitivity).toContainText('+£2,250.00');
  await expect(monthly(page)).toContainText('£2,250.00');

  await nav(page, 'Reports & Export').click();
  const json = await getFile(page, 'Export JSON');
  const exported = JSON.parse(json.toString());
  expect(exported.objects.find((item: { kind: string }) => item.kind === 'usage-profile')).toMatchObject(
    { executions: 2500, calls: 2, input: 1500, output: 300 },
  );
  expect(exported.sourceSnapshot).toMatchObject({ current: '2250.00', annualKnown: '27000.00', incomplete: 0 });
  expect(json.toString()).not.toContain('Customer forecast');
  const pdf = await getFile(page, 'Generate PDF');
  const loading = getDocument({ data: new Uint8Array(pdf), standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' });
  try {
    const report = await loading.promise;
    const content = await (await report.getPage(1)).getTextContent();
    const text = content.items.flatMap(item => 'str' in item ? [item.str] : []).join(' ');
    expect(text).toContain('Current estimate | Estimated monthly cost £2,250.00 | Annualised estimate £27,000.00 | 0 unresolved charges');
    expect(text).not.toContain('£4,500.00');
  } finally { await loading.destroy(); }
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Open an environment' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'fictional-assisted.json', mimeType: 'application/json', buffer: json });
  await expect(monthly(page)).toContainText('£2,250.00');
});

test('Copilot leaves activity conversion unresolved and confirms only documented credits', async ({ page }) => {
  await prices(page);
  await start(page);
  await addCopilot(page);
  const credits = page.getByLabel('Monthly Copilot Credits', { exact: true });
  await credits.fill('800');
  await page.getByText('Help me estimate usage', { exact: true }).click();
  const assistant = page.getByRole('form', { name: 'Copilot Credits assistant' });
  await assistant.getByLabel('What do you know?').selectOption('activity');
  await expect(assistant.getByText(/verified conversion for these activity counts is unavailable/)).toBeVisible();
  await expect(assistant.getByRole('button', { name: 'Apply monthly credits' })).toHaveCount(0);
  await expect(credits).toHaveValue('800');

  await assistant.getByLabel('What do you know?').selectOption('credits');
  const enterCredits = async () => {
    await assistant.getByLabel('Generative answers (credits/month)', { exact: true }).fill('10000');
    await assistant.getByLabel('Agent actions and tools (credits/month)', { exact: true }).fill('5000');
    await assistant.getByLabel('Source of these assumptions').selectOption('Measured usage');
    await assistant.getByRole('button', { name: 'Preview usage' }).click();
  };
  await enterCredits();
  await expect(assistant.getByText(/15,000 monthly Copilot Credits before any eligible allowance/)).toBeVisible();
  await assistant.getByRole('button', { name: 'Cancel usage preview' }).click();
  await expect(credits).toHaveValue('800');
  await enterCredits();
  await assistant.getByRole('button', { name: 'Apply monthly credits' }).click();
  await expect(credits).toHaveValue('15000');
  await expect(monthly(page)).toContainText('£300.00');
  await nav(page, 'Cost Analysis').click();
  const itemised = page.locator('details.ledger-row');
  await expect(itemised).toHaveCount(1);
  await expect(itemised).toContainText('Copilot');
});

test('unknown charges stay visible in both usage comparisons', async ({ page }) => {
  await prices(page, 'output');
  await start(page);
  await addFoundry(page);
  await page.getByLabel('Monthly executions', { exact: true }).fill('2000');
  await page.getByLabel('Model calls per execution', { exact: true }).fill('2');
  await page.getByLabel('Input tokens per call', { exact: true }).fill('1500');
  await page.getByLabel('Output tokens per call', { exact: true }).fill('300');
  await nav(page, 'Cost Analysis').click();
  await expect(page.getByText('Costs still to confirm')).toBeVisible();
  await expect(page.getByText('The known-cost subtotal excludes 1 unresolved charge.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Resolve missing quantities or rates' })).toHaveAttribute('href', /#\/documentation\/missing-rate-or-volume/);
  await page.getByText('Preview a change in usage', { exact: true }).click();
  const sensitivity = page.getByRole('form', { name: 'Usage sensitivity' });
  await sensitivity.getByLabel('Workload').selectOption({ label: 'Fictional Foundry assistant' });
  await sensitivity.getByLabel('Usage input').selectOption('input');
  await sensitivity.getByLabel('Proposed input tokens per call').fill('3000');
  await sensitivity.getByRole('button', { name: 'Compare monthly costs' }).click();
  await expect(sensitivity.getByText('£1,200.00 · 1 unresolved charge')).toBeVisible();
  await expect(sensitivity.getByText('£2,400.00 · 1 unresolved charge')).toBeVisible();
  await expect(sensitivity.getByText('Monthly difference')).toHaveCount(0);
});

test('assistance is usable by keyboard and reflows at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await prices(page);
  await start(page);
  await addFoundry(page, true);
  const trigger = page.getByText('Help me estimate usage', { exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  await page.keyboard.press('Tab');
  const assistant = page.getByRole('form', { name: 'Foundry usage assistant' });
  await expect(assistant.getByLabel('Monthly active users')).toBeFocused();
  await assistant.getByLabel('Source of these assumptions').selectOption('Illustrative assumption');
  await assistant.getByRole('button', { name: 'Preview usage' }).press('Enter');
  await expect(assistant.getByText(/Enter all five assumptions/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await assistant.getByRole('link', { name: 'Understand tokens and requests' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Build and preview a monthly workload' })).toBeFocused();
  await page.getByRole('button', { name: 'Back to workspace' }).press('Enter');
  await expect(page.getByLabel('Monthly executions', { exact: true })).toBeVisible();
});

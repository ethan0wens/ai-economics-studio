import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { browserIcons } from '../../scripts/security-http';
import { example, mode, nav, prices } from './studio-fixture';

test('browser identity uses the local Economic Signal marks and resolves each icon', async ({ page }) => {
  await page.goto('/');
  const brandLink = page.getByRole('link', { name: 'AI Economics Studio', exact: true });
  await expect(brandLink).toBeVisible();
  const standard = brandLink.locator('img');
  await expect(standard).toHaveAttribute('alt', '');
  await expect(standard).toHaveAttribute('src', /^\/(?:assets|bundles\/v2)\/economic-signal-mark-[\w-]+\.svg$/);
  const source = (await page.request.get((await standard.getAttribute('src'))!));
  expect(source.ok()).toBe(true);
  expect(await source.text()).toContain('M 56 76 L 74 76 L 89 15 L 72 15 Z');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#17243B');
  for (const [path, { rel, mime }] of browserIcons) {
    await expect(page.locator(`link[rel="${rel}"][href="${path}"]`)).toHaveCount(1);
    const response = await page.request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(mime, path).toContain(response.headers()['content-type'].split(';')[0].toLowerCase());
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(brandLink.locator('img')).toHaveAttribute('src', /^\/(?:assets|bundles\/v2)\/economic-signal-mark-on-dark-[\w-]+\.svg$/);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const menu = page.getByRole('button', { name: 'Toggle navigation', exact: true });
  await expect(menu).toBeFocused();
  await expect(menu).toHaveCSS('outline-style', 'solid');
  await menu.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Studio menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
});

for (const width of [320, 375, 768, 1280, 1920]) {
  test(`branded Home, planning tools and reports reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await prices(page);
    await page.goto('/');
    await expect(page.getByText('Plan the architecture. Model the economics. Explore the value.')).toBeVisible();
    const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await fits();
    const audit = async () => expect((await new AxeBuilder({ page }).include('#main').analyze()).violations).toEqual([]);
    if (width === 320 || width === 1280) await audit();
    await page.getByRole('link', { name: 'Explore examples' }).click();
    await expect(page.locator('.example-card')).toHaveCount(5);
    await fits();
    await example(page, 'ai-adoption-business-case');
    await expect(mode(page, 'Guided')).toHaveAttribute('aria-pressed', 'true');
    await fits();

    if (width <= 900) await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await nav(page, 'Cost & Value Analysis').click();
    await expect(page.getByRole('button', { name: 'Costs', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await fits();
    for (const [view, name] of [['explore', 'Explore changes'], ['value', 'Potential value']]) {
      await page.goto(`/#/costs/${view}`);
      await expect(page.getByRole('button', { name, exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
      await fits();
    }
    await page.goto('/#/review/architecture');
    await expect(page.getByRole('region', { name: 'Scrollable logical diagram' })).toBeVisible();
    await fits();
    await page.goto('/#/reports');
    await expect(page.getByRole('radio', { name: /Executive Summary/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Full Report/ })).toBeChecked();
    await fits();
    if (width === 320 || width === 1280) await audit();
  });
}

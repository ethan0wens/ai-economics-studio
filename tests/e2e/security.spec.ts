import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { blankEnvironment, maxBytes } from '../../src/domain';
import { getFile, nav, start } from './studio-fixture';

test('a normal workspace downloads locally and neither transmits nor persists its data', async ({ page, context }) => {
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  const marker = 'Fictional private environment marker';
  await start(page, marker);
  const origin = new URL(page.url()).origin;
  const beforeCookies = await context.cookies();
  await nav(page, 'Reports & Export').click();
  const json = JSON.parse((await getFile(page, 'Export JSON')).toString());
  expect(json.name).toBe(marker);
  expect(requests.every(({ url, method, body }) => (url.startsWith('blob:') || new URL(url).origin === origin) &&
    method === 'GET' && !body && !decodeURIComponent(url).includes(marker))).toBe(true);
  expect(await page.evaluate(async () => [localStorage.length, sessionStorage.length, (await indexedDB.databases()).length])).toEqual([0, 0, 0]);
  expect(await context.cookies()).toEqual(beforeCookies);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Open an environment' })).toBeVisible();
});

test('rejected and cancelled imports preserve the active estimate and literal text', async ({ page }) => {
  test.skip(!!process.env.STUDIO_TEST_URL, 'Malformed file regression runs at the local test origin.');
  const active = 'Fictional <marker> & report';
  await start(page, active);
  await page.getByRole('button', {name: `Settings for ${active}`}).click();
  await page.getByLabel('Description', { exact: true }).fill('Local fictional description');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Environment settings' })).toBeHidden();
  await expect(page.getByText('Unexported changes', { exact: true })).toBeVisible();
  const input = page.locator('input[type=file]');
  await input.setInputFiles({ name: 'too-large.json', mimeType: 'application/json', buffer: Buffer.alloc(maxBytes + 1) });
  await expect(page.getByRole('alert')).toContainText('2 MB');
  const next = { ...blankEnvironment(), name: 'Fictional replacement' };
  await input.setInputFiles({ name: 'replacement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(next)) });
  await expect(page.getByRole('dialog', { name: 'Replace the open environment?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('button', { name: `Settings for ${active}` })).toBeVisible();
  expect(await page.locator('marker').count()).toBe(0);
  await nav(page, 'Reports & Export').click();
  expect(JSON.parse((await getFile(page, 'Export JSON')).toString())).toMatchObject({ name: active, description: 'Local fictional description' });
});

test('Chromium enforces the reviewed inline script policy and still runs the application', async ({ page }) => {
  test.skip(!!process.env.STUDIO_TEST_URL, 'Uses the reviewed static policy on a local document.');
  const headers = await readFile('public/_headers', 'utf8');
  const policy = headers.split('\n').find(line => line.trimStart().startsWith('Content-Security-Policy:'))!.split(': ', 2)[1];
  await page.route('/', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
  });
  await page.goto('/');
  await page.evaluate(() => {
    document.addEventListener('securitypolicyviolation', event => { document.documentElement.dataset.cspDirective = event.effectiveDirective; }, { once: true });
    const script = document.createElement('script');
    script.textContent = 'void 0';
    document.head.append(script);
  });
  await expect(page.locator('html')).toHaveAttribute('data-csp-directive', 'script-src-elem');
  await page.getByLabel('Environment name').fill('Fictional CSP check');
  await page.getByRole('button', { name: 'Create environment', exact: true }).click();
  await expect(nav(page, 'Environment Builder')).toHaveAttribute('aria-current', 'page');
});

test('an older file read cannot replace a newer workspace choice', async ({ page }) => {
  test.skip(!!process.env.STUDIO_TEST_URL, 'File ordering is tested with a local browser fixture.');
  await page.addInitScript(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      if (this.name === 'pending.json') {
        await new Promise<void>(resolve => { Object.assign(window, { finishFictionalRead: resolve }); });
      }
      return original.call(this);
    };
  });
  await start(page);
  const input = page.locator('input[type=file]');
  const fixture = (name: string, file: string) => ({ name: file, mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...blankEnvironment(), name })) });
  await input.setInputFiles(fixture('Fictional older file', 'pending.json'));
  await page.waitForFunction(() => 'finishFictionalRead' in window);
  await input.setInputFiles(fixture('Fictional newer file', 'newer.json'));
  await expect(page.getByRole('button', { name: 'Settings for Fictional newer file' })).toBeVisible();
  await page.evaluate(async () => {
    (window as Window & { finishFictionalRead?: () => void }).finishFictionalRead?.();
    await new Promise(requestAnimationFrame);
  });
  await expect(page.getByRole('button', { name: 'Settings for Fictional newer file' })).toBeVisible();
});

test('switching workspaces clears an in-flight report from the earlier workspace', async ({ page }) => {
  test.skip(!!process.env.STUDIO_TEST_URL, 'Deferred PDF module response is a local browser fixture.');
  await start(page);
  const input = page.locator('input[type=file]');
  const open = (name: string) => input.setInputFiles({ name: 'fictional.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...blankEnvironment(), name, objects: [{ kind: 'usage-profile', id: 'usage', name: 'Fixture' }] })),
  });
  let release!: () => void;
  let started!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const intercepted = new Promise<void>(resolve => { started = resolve; });
  await page.route('**/assets/report-*.js', async route => {
    started();
    await pending;
    await route.continue();
  });
  let earlierDownloads = 0;
  page.on('download', () => earlierDownloads++);
  await open('Fictional first workspace');
  await nav(page, 'Reports & Export').click();
  await page.getByRole('button', { name: 'Generate PDF', exact: true }).click();
  await intercepted;
  await open('Fictional second workspace');
  await expect(page.getByRole('button', { name: 'Settings for Fictional second workspace' })).toBeVisible();
  await nav(page, 'Reports & Export').click();
  release();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('fictional-second-workspace.pdf');
  expect(earlierDownloads).toBe(1);
});

test('an insecure browser context cannot open a workspace', async ({ page }) => {
  test.skip(!!process.env.STUDIO_TEST_URL, 'Secure-context fallback uses a local browser fixture.');
  await page.addInitScript(() => Object.defineProperty(window, 'isSecureContext', { value: false }));
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'Open the studio over HTTPS'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Open HTTPS version'})).toHaveAttribute('href', /^https:\/\//);
  await expect(page.getByRole('button', {name: 'Create environment'})).toHaveCount(0);
});

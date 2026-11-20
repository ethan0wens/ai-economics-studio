import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { verifyPublishedAssets, verifyWorker } from '../scripts/deploy';
import { workerReleases } from '../scripts/worker-release';

const account = 'a'.repeat(32);
const token = 'test-token';
const config = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/workers`;
const success = (result: object) => Response.json({ success: true, result });
const productionBinding = { hostname: 'studio.ethan0wens.tech', zone_name: 'ethan0wens.tech', service: 'ai-econmics-studio', enabled: true };
const boundWorker = () => vi.fn<typeof fetch>()
  .mockResolvedValueOnce(success({ subdomain: 'ethan0wens' }))
  .mockResolvedValueOnce(success({ compatibility_date: '2026-11-18' }));


describe('production Worker guard', () => {
  it('checks the configured account and exact existing Worker with read-only requests', async () => {
    const request = boundWorker().mockResolvedValueOnce(success([productionBinding]));
    await expect(verifyWorker(config, account, token, request)).resolves.toBe('ai-econmics-studio');
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      `${endpoint}/subdomain`, `${endpoint}/scripts/ai-econmics-studio/settings`, `${endpoint}/domains?hostname=studio.ethan0wens.tech`,
    ]);
    for (const [, options] of request.mock.calls) {
      expect(options?.method ?? 'GET').toBe('GET');
      expect(options?.redirect).toBe('error');
    }
  });

  it('stops before sending a request when the name or credentials are wrong', async () => {
    const request = vi.fn<typeof fetch>();
    await expect(verifyWorker('{"name":"ai-economics-studio"}', account, token, request)).rejects.toThrow('must target');
    await expect(verifyWorker(config, undefined, token, request)).rejects.toThrow('requires');
    expect(request).not.toHaveBeenCalled();
  });

  it('fails closed for another account or a missing Worker', async () => {
    const wrongAccount = vi.fn<typeof fetch>().mockResolvedValueOnce(success({ subdomain: 'other' }));
    await expect(verifyWorker(config, account, token, wrongAccount)).rejects.toThrow('account subdomain');
    expect(wrongAccount).toHaveBeenCalledTimes(1);

    const missingWorker = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(success({ subdomain: 'ethan0wens' }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(verifyWorker(config, account, token, missingWorker)).rejects.toThrow('existing Worker ai-econmics-studio (HTTP 404)');
  });
});

it('reads the current Cloudflare version with cache bypass and requires a single active candidate', async () => {
  const id = 'afdc5f6f-fb09-4cc2-8338-0678ac37e78c';
  const response = (percentage: number) => success({ deployments: [{
    id, created_on: '2026-11-20T12:00:00Z', versions: [{ version_id: id, percentage }],
  }] });
  const request = vi.fn<typeof fetch>().mockResolvedValueOnce(response(100)).mockResolvedValueOnce(response(95));
  const releases = workerReleases(account, token, 'ai-econmics-studio', request);
  await expect(releases.current()).resolves.toEqual({ deployment: id, version: id });
  await expect(releases.current()).rejects.toThrow();
  expect(request.mock.calls[0][1]).toMatchObject({ method: 'GET', cache: 'no-store', credentials: 'omit' });
});

describe('custom-domain deployment configuration', () => {
  it('accepts the exact Custom Domain declaration and rejects an ordinary or foreign route', async () => {
    const base = JSON.parse(config);
    const pattern = productionBinding.hostname;
    await expect(verifyWorker(JSON.stringify({ ...base, routes: [{ pattern, custom_domain: true }] }),
      account, token, boundWorker().mockResolvedValueOnce(success([productionBinding])))).resolves.toBe('ai-econmics-studio');
    for (const route of [{ pattern }, { pattern: 'other.example.test', custom_domain: true }]) {
      const request = vi.fn<typeof fetch>();
      await expect(verifyWorker(JSON.stringify({ ...base, routes: [route] }), account, token, request)).rejects.toThrow('exact custom_domain');
      expect(request).not.toHaveBeenCalled();
    }
  });

  it('fails closed without read permission or a unique enabled binding on the expected Worker', async () => {
    await expect(verifyWorker(config, account, token, boundWorker().mockResolvedValueOnce(new Response(null, { status: 403 }))))
      .rejects.toThrow('enabled Custom Domain binding (HTTP 403)');
    for (const domains of [[], [{ ...productionBinding, enabled: false }], [{ ...productionBinding, service: 'different-worker' }],
      [{ ...productionBinding, zone_name: 'example.test' }], [productionBinding, productionBinding]]) {
      await expect(verifyWorker(config, account, token, boundWorker().mockResolvedValueOnce(success(domains))))
        .rejects.toThrow('enabled Custom Domain on ai-econmics-studio');
    }
  });
});

describe('public deployment verification', () => {
  it('checks build bytes against the exact public host without credentials', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('expected'));
    await expect(verifyPublishedAssets(new Map([['/pricing/manifest.json', 'expected']]), request)).resolves.toBeUndefined();
    const [url, options] = request.mock.calls[0];
    expect(String(url)).toBe('https://studio.ethan0wens.tech/pricing/manifest.json');
    expect(new Headers(options?.headers).has('Authorization')).toBe(false);
    expect(options).toMatchObject({ cache: 'no-store', credentials: 'omit', redirect: 'error' });
    expect(new Headers(options?.headers).get('Accept-Encoding')).toBe('identity');
  });

  it('fails when the previous build is still being served', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('previous'));
    await expect(verifyPublishedAssets(new Map([['/', 'current']]), request)).rejects.toThrow('does not match the build');
  });

  it('compares a binary browser icon without decoding it as text', async () => {
    const icon = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00]);
    const path = '/brand/favicon-32.png';
    const expected = new Map([[path, icon]]);
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(icon));
    await expect(verifyPublishedAssets(expected, request)).resolves.toBeUndefined();
    request.mockResolvedValueOnce(new Response(new Uint8Array([0x88, 0x50, 0x4e, 0x47, 0x00])));
    await expect(verifyPublishedAssets(expected, request)).rejects.toThrow('does not match the build');
  });

  it('requires the canonical receipt bytes and diagnoses a stale response without logging content', async () => {
    const stale = '{"release":"previous"}';
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(stale));
    const path = '/pricing/health.json';
    const result = verifyPublishedAssets(new Map([[path, '{"release":"current"}']]), request);
    await expect(result).rejects.toThrow(/^Live .*expected SHA-256 [a-f0-9]{12}, received [a-f0-9]{12}/);
    expect(String(request.mock.calls[0]?.[0])).toBe('https://studio.ethan0wens.tech' + path);
  });
});

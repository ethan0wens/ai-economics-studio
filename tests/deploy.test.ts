import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { verifyPublishedAssets, verifyWorker } from '../scripts/deploy';

const account = 'a'.repeat(32);
const token = 'test-token';
const config = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/workers`;
const success = (result: object) => Response.json({ success: true, result });

describe('production Worker guard', () => {
  it('checks the configured account and exact existing Worker with read-only requests', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(success({ subdomain: 'ethan0wens' }))
      .mockResolvedValueOnce(success({ compatibility_date: '2026-11-18' }));
    await expect(verifyWorker(config, account, token, request)).resolves.toBe('ai-econmics-studio');
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      `${endpoint}/subdomain`, `${endpoint}/scripts/ai-econmics-studio/settings`,
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

describe('public deployment verification', () => {
  it('checks build bytes against the exact public host without credentials', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('expected'));
    await expect(verifyPublishedAssets(new Map([['/pricing/manifest.json', 'expected']]), request)).resolves.toBeUndefined();
    const [url, options] = request.mock.calls[0];
    expect(String(url)).toBe('https://ai-econmics-studio.ethan0wens.workers.dev/pricing/manifest.json');
    expect(new Headers(options?.headers).has('Authorization')).toBe(false);
  });

  it('fails when the previous build is still being served', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('previous'));
    await expect(verifyPublishedAssets(new Map([['/', 'current']]), request)).rejects.toThrow('does not match the build');
  });
});

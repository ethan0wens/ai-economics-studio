import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { staticHeaders } from '../scripts/static-site';

it('rewrites only the supported direct navigation path and keeps missing files out of the shell', async () => {
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  expect(config.assets.not_found_handling).toBe('none');
  expect(await readFile('public/_redirects', 'utf8')).toBe('/documentation / 200\n');
});

it('makes only existing typed bundle and catalogue paths immutable', async () => {
  const base = await readFile('public/_headers', 'utf8');
  const bundle = 'bundles/v2/index-example.js';
  const snapshot = 'pricing/catalogue-' + 'a'.repeat(64) + '.json';
  const indexed = staticHeaders(base, [bundle, snapshot, 'index.html', 'pricing/manifest.json', 'bundles/v2/unexpected.md']);
  const cacheRules = indexed.split('\n').filter(line => line.startsWith('/'));
  expect(cacheRules).toEqual(['/*', '/' + bundle, '/' + snapshot]);
  expect(indexed).toContain('/' + bundle + '\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable, no-transform');
  expect(indexed).not.toContain('/assets/*');
  expect(indexed).not.toContain('/pricing/catalogue-*');
  expect(indexed).not.toContain('/bundles/v2/studio-missing-probe.js');
});

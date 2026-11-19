import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parse, type DefaultTreeAdapterTypes as Html } from 'parse5';
import { catalogueFilename, manifestSchema, maxCatalogueBytes, maxManifestBytes } from '../src/catalogue';
import { decodeUtf8, parseBoundedJson, readResponseBytes } from '../src/untrusted-data';

export const workerUrl = 'https://ai-econmics-studio.ethan0wens.workers.dev';
const directives = {
  'default-src': "'self'", 'script-src': "'self'", 'style-src': "'self'", 'font-src': "'self'",
  'img-src': "'self' data:", 'connect-src': "'self'", 'object-src': "'none'", 'base-uri': "'self'",
  'frame-ancestors': "'none'", 'form-action': "'none'",
};

export function verifySecurityHeaders(headers: Headers, mode: 'document' | 'mutable' | 'immutable', requireFrameHeader = true) {
  function requireValue(header: string, expected: string) {
    if (headers.get(header)?.toLowerCase() !== expected) throw new Error(`Delivery security header ${header} did not match its intended value.`);
  }

  requireValue('x-content-type-options', 'nosniff');
  const cache = new Set(headers.get('cache-control')?.split(',').map(value => value.trim().toLowerCase()));
  const required = mode === 'immutable' ? ['public', 'max-age=31536000', 'immutable'] : ['no-cache'];
  if (!required.every(value => cache.has(value)) || mode !== 'immutable' && cache.has('immutable')) throw new Error('Incorrect public asset cache policy.');
  if (mode !== 'document') return;

  const policy = headers.get('content-security-policy') ?? '';
  const actual = new Map(policy.split(';').map(value => {
    const [name, ...terms] = value.trim().split(/\s+/);
    return [name, terms.join(' ')];
  }));
  if (Object.entries(directives).some(([key, value]) => actual.get(key) !== value) ||
    ['script-src-elem', 'script-src-attr', 'style-src-elem', 'style-src-attr'].some(key => actual.has(key))) {
    throw new Error('Public Content Security Policy differs from the approved policy.');
  }
  requireValue('referrer-policy', 'no-referrer');
  if (requireFrameHeader) requireValue('x-frame-options', 'deny');
  const permissions = headers.get('permissions-policy') ?? '';
  if (['camera', 'microphone', 'geolocation'].some(name => !permissions.includes(`${name}=()`))) throw new Error('Expected restricted browser permissions.');
}

export function documentAssetPaths(source: string) {
  const scripts: string[] = [];
  const assets = new Set<string>();
  function visit(node: Html.Node) {
    if ('tagName' in node) {
      const attributes = new Map(node.attrs.map(({name, value}) => [name, value]));
      if (node.attrs.some(({name}) => name.startsWith('on')) || ['base', 'object', 'embed', 'iframe'].includes(node.tagName)) {
        throw new Error('Unexpected active content in the published document.');
      }
      const path = node.tagName === 'script' ? attributes.get('src') : node.tagName === 'link' ? attributes.get('href') : undefined;
      if (node.tagName === 'script' && !path) throw new Error('The built HTML includes an inline script.');
      if (path) {
        if (!/^\/assets\/[a-z0-9][a-z0-9._-]*\.(?:js|css)$/i.test(path)) throw new Error('The built HTML references an unexpected resource.');
        assets.add(path);
        if (node.tagName === 'script') scripts.push(path);
      }
    }
    if ('childNodes' in node) for (const child of node.childNodes) visit(child);
  }
  visit(parse(source));
  if (scripts.length !== 1) throw new Error('Expected one hashed application entry script.');
  return { script: scripts[0], assets };
}

export async function verifyPublicSecurity(site: string, expected?: string | null, request = fetch) {
  async function get(path: string) {
    const response = await request(new URL(path, site), {
      redirect: 'error', cache: 'no-cache', credentials: 'omit', signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Security delivery probe received HTTP ${response.status} for ${path}.`);
    return response;
  }
  const [html, fallback, manifestResponse, redirect] = await Promise.all([
    get('/'), get('/documentation'), get('/pricing/manifest.json'),
    request(new URL('/', site.replace(/^https:/, 'http:')), { redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(12_000) }),
  ]);
  const upgrade = [301, 302, 307, 308].includes(redirect.status) &&
    URL.parse(redirect.headers.get('location') ?? '', site)?.href === new URL('/', site).href;
  const rejected = [400, 403, 404, 421, 426].includes(redirect.status) && redirect.headers.get('server') === 'cloudflare';
  const transport = `HTTP ${redirect.status} · ${upgrade ? 'redirects to the same HTTPS origin' : rejected ? 'plaintext refused by Cloudflare' : 'secure upgrade or provider refusal unverified'}`;
  const secured = upgrade || rejected;
  await redirect.body?.cancel();
  [html, fallback].forEach(response => verifySecurityHeaders(response.headers, 'document', expected !== undefined));
  verifySecurityHeaders(manifestResponse.headers, 'mutable');
  const rawHtml = decodeUtf8(await readResponseBytes(html, 128_000, 'Application shell'));
  const fallbackText = decodeUtf8(await readResponseBytes(fallback, 128_000, 'SPA fallback'));
  const { script } = documentAssetPaths(rawHtml);
  if (rawHtml !== fallbackText) throw new Error('The direct SPA route did not serve the application shell.');
  const manifest = manifestSchema.parse(parseBoundedJson(
    decodeUtf8(await readResponseBytes(manifestResponse, maxManifestBytes, 'Public pricing manifest')), 30, 'Public pricing manifest'));
  if (expected !== undefined && expected !== manifest.catalogueId) throw new Error('Public security probe received a different catalogue.');
  const bundle = await get(script);
  verifySecurityHeaders(bundle.headers, 'immutable');
  if (!/(?:text|application)\/javascript/i.test(bundle.headers.get('content-type') ?? '')) throw new Error('Application script served without a JavaScript MIME type.');
  await bundle.body?.cancel();
  if (manifest.catalogueId) {
    const catalogue = await get(`/pricing/${catalogueFilename(manifest.catalogueId)}`);
    verifySecurityHeaders(catalogue.headers, 'immutable');
    const bytes = await readResponseBytes(catalogue, maxCatalogueBytes, 'Public pricing catalogue');
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.catalogueId) throw new Error('Public catalogue bytes did not match the manifest hash.');
  }
  if (expected !== undefined && !secured) throw new Error(`Public plaintext delivery check failed. ${transport}.`);
  return { catalogueId: manifest.catalogueId, frameHeader: html.headers.get('x-frame-options'),
    hsts: html.headers.get('strict-transport-security'), transport, secured };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = await verifyPublicSecurity(workerUrl);
  console.log(`Public HTTPS, CSP, cache, SPA and catalogue checks passed. Catalogue ${result.catalogueId}; X-Frame-Options ${result.frameHeader ?? 'absent'}; HSTS response header ${result.hsts ?? 'absent'}; ${result.transport}.`);
  if (!result.secured) process.exitCode = 1;
}

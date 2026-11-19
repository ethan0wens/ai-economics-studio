import { createHash } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { parse, type DefaultTreeAdapterTypes as Html } from 'parse5';
import { catalogueFilename, catalogueSchema, manifestSchema, maxCatalogueBytes, maxManifestBytes, type Manifest } from '../src/catalogue';
import { releaseHealthSchema } from '../src/catalogue-health';
import { decodeUtf8, parseBoundedJson, readResponseBytes } from '../src/untrusted-data';

export const workerUrl = 'https://ai-econmics-studio.ethan0wens.workers.dev';
const stage5Application = 'ba6b9c90e75beba0873003249286930f8ebdf024';
const maxShellBytes = 128_000;
const maxAssetBytes = 6_000_000;

export type ReleaseSecurityPolicy = {
  expectedCatalogueId?: string | null;
  expectedApplication?: string;
} & (
  { policy: 'preview'; observeCurrent?: true } |
  { policy: 'public'; approvedHostname: string }
);

type Transport = { status: number; outcome: 'redirected' | 'cloudflare-refused' | 'plaintext-shell' };
export type SecurityVerification = {
  hostname: string;
  policy: 'preview' | 'public';
  https: { verified: true; headers: 'hardened' | 'stage-5-baseline'; catalogueId: string | null };
  http: Transport;
  exception: 'S6-10' | null;
  warnings: string[];
  decision: 'conditional-pass-preview-only' | 'stage-5-observation' | 'pass-public-delivery';
};

export function publicHostname(hostname: string) {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname) &&
    hostname.length <= 253 && !/(?:^|\.)(?:workers\.dev|localhost|local|internal)$/.test(hostname);
}

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
  if (requireFrameHeader) {
    requireValue('x-frame-options', 'deny');
    requireValue('strict-transport-security', 'max-age=31536000');
  }
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

export async function verifyPublicSecurity(site: string, options: ReleaseSecurityPolicy, request = fetch): Promise<SecurityVerification> {
  const origin = URL.parse(site);
  if (!origin || origin.protocol !== 'https:' || origin.href !== origin.origin + '/') {
    throw new Error('Use an exact HTTPS origin for delivery verification.');
  }
  if (options.policy === 'preview' && origin.origin !== workerUrl) {
    throw new Error('The preview policy applies only to the existing ai-econmics-studio Worker hostname.');
  }
  if (options.policy === 'public' && (!publicHostname(origin.hostname) || origin.origin !== `https://${options.approvedHostname}`)) {
    throw new Error('Wider public release requires the approved custom domain and Cloudflare HTTPS enforcement.');
  }

  async function get(path: string) {
    const response = await request(new URL(path, origin!), {
      redirect: 'error', cache: 'no-cache', credentials: 'omit', signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Security delivery probe received HTTP ${response.status} for ${path}.`);
    return response;
  }
  async function readRelease(manifest: Manifest) {
    const bytes = await readResponseBytes(await get('/pricing/health.json'), 1_000_000, 'Release receipt');
    const payload = parseBoundedJson(decodeUtf8(bytes), 30_000, 'Release receipt') as { release?: unknown } | null;
    const release = releaseHealthSchema.parse(payload?.release);
    if (release.catalogueId !== manifest.catalogueId || release.pricingCheckedAt !== manifest.lastCheckedAt ||
        release.coverage.records !== manifest.records) throw new Error('The live release receipt did not match the pricing manifest.');
    return release;
  }
  const plaintextUrl = new URL(origin.href);
  plaintextUrl.protocol = 'http:';
  const [html, fallback, manifestResponse, plaintext] = await Promise.all([
    get('/'), get('/documentation'), get('/pricing/manifest.json'),
    request(plaintextUrl, { redirect: 'manual', cache: 'no-cache', credentials: 'omit', signal: AbortSignal.timeout(12_000) }),
  ]);
  const root = await readResponseBytes(html, maxShellBytes, 'Application shell');
  const alternate = await readResponseBytes(fallback, maxShellBytes, 'SPA fallback');
  if (!Buffer.from(root).equals(alternate)) throw new Error('The direct SPA route did not serve the application shell.');
  const { assets } = documentAssetPaths(decodeUtf8(root));
  verifySecurityHeaders(manifestResponse.headers, 'mutable');
  const manifest = manifestSchema.parse(parseBoundedJson(
    decodeUtf8(await readResponseBytes(manifestResponse, maxManifestBytes, 'Public pricing manifest')), 30, 'Public pricing manifest'));
  if (options.expectedCatalogueId !== undefined && options.expectedCatalogueId !== manifest.catalogueId) {
    throw new Error('Public security probe received a different catalogue.');
  }

  // The read-only work-branch probe can observe the one previously verified Stage 5
  // deployment while it is still active. Every candidate requires both new headers.
  const stage5 = options.policy === 'preview' && options.observeCurrent === true && options.expectedApplication === undefined &&
    [html, fallback].every(response => !response.headers.has('x-frame-options') && !response.headers.has('strict-transport-security'));
  [html, fallback].forEach(response => verifySecurityHeaders(response.headers, 'document', !stage5));
  if (stage5 || options.expectedApplication !== undefined) {
    const release = await readRelease(manifest);
    if (release.application !== (stage5 ? stage5Application : options.expectedApplication)) {
      throw new Error('The live application revision did not match the checked release.');
    }
  }

  await Promise.all([...assets].map(async path => {
    const response = await get(path);
    verifySecurityHeaders(response.headers, 'immutable');
    const mime = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (path.endsWith('.js') ? !['text/javascript', 'application/javascript'].includes(mime ?? '') : mime !== 'text/css') {
      throw new Error(`Unexpected asset MIME type for ${path}.`);
    }
    await readResponseBytes(response, maxAssetBytes, 'Application asset');
  }));

  if (manifest.catalogueId) {
    const response = await get(`/pricing/${catalogueFilename(manifest.catalogueId)}`);
    verifySecurityHeaders(response.headers, 'immutable');
    const bytes = await readResponseBytes(response, maxCatalogueBytes, 'Public pricing catalogue');
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.catalogueId) throw new Error('Public catalogue bytes did not match the manifest hash.');
    const catalogue = catalogueSchema.parse(parseBoundedJson(decodeUtf8(bytes), 275_000, 'Public pricing catalogue'));
    if (catalogue.records.length !== manifest.records) throw new Error('Public catalogue record count did not match the manifest.');
  }

  const location = plaintext.headers.get('location');
  const redirects = [301, 302, 307, 308].includes(plaintext.status);
  const refuses = [400, 403, 404, 421, 426].includes(plaintext.status) && plaintext.headers.get('server') === 'cloudflare' &&
    /^[a-f0-9]{16,32}-[a-z0-9]{3}$/i.test(plaintext.headers.get('cf-ray') ?? '');
  const plainBytes = plaintext.body ? await readResponseBytes(plaintext, maxShellBytes, 'Plain HTTP response') : undefined;
  const sameShell = plainBytes !== undefined && Buffer.from(root).equals(plainBytes);
  const mime = plaintext.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  let outcome: Transport['outcome'];
  if (redirects && location && URL.parse(location, plaintextUrl)?.href === origin.href && !sameShell) outcome = 'redirected';
  else if (refuses && !location && !sameShell) outcome = 'cloudflare-refused';
  else if (plaintext.status === 200 && !location && mime === 'text/html' && sameShell) outcome = 'plaintext-shell';
  else throw new Error(`Unexpected plaintext HTTP response (HTTP ${plaintext.status}). Expected an exact HTTPS redirect, Cloudflare refusal or the known application shell.`);

  if (options.policy === 'public' && outcome === 'plaintext-shell') throw new Error('Public plaintext delivery check failed. HTTP 200 served the application shell.');
  const exception = outcome === 'plaintext-shell' ? 'S6-10' as const : null;
  const warnings = exception
    ? ['HTTP 200 served the same application shell as HTTPS. The owner temporarily accepts S6-10 for development and preview on this hostname. Custom-domain HTTPS enforcement is mandatory before wider public release.']
    : [];
  return {
    hostname: origin.hostname, policy: options.policy,
    https: { verified: true, headers: stage5 ? 'stage-5-baseline' : 'hardened', catalogueId: manifest.catalogueId },
    http: { status: plaintext.status, outcome }, exception, warnings,
    decision: stage5 ? 'stage-5-observation' : options.policy === 'preview' ? 'conditional-pass-preview-only' : 'pass-public-delivery',
  };
}

export async function reportSecurityVerification(result: SecurityVerification) {
  const decisions = {
    'stage-5-observation': 'ACTIVE STAGE 5 BASELINE OBSERVED',
    'conditional-pass-preview-only': 'CONDITIONAL PASS — PREVIEW ONLY',
    'pass-public-delivery': 'PUBLIC DELIVERY CHECKS PASSED',
  };
  const outcomes = { redirected: 'redirected to the exact HTTPS origin', 'cloudflare-refused': 'Cloudflare refused plaintext delivery',
    'plaintext-shell': 'served the same application shell as HTTPS' };
  const headline = decisions[result.decision];
  const details = [
    `${headline} · ${result.hostname}`,
    `HTTPS policy, headers (${result.https.headers}), assets, SPA fallback and catalogue integrity verified. Catalogue ${result.https.catalogueId ?? 'bootstrap'}.`,
    `HTTP ${result.http.status} ${outcomes[result.http.outcome]}.`,
    ...(result.decision === 'stage-5-observation' ? ['Candidate HSTS and X-Frame-Options must pass at deployment.'] : []),
  ];
  console.log(details.join('\n'));
  for (const warning of result.warnings) {
    const label = 'Preview transport exception — S6-10';
    console.log(process.env.GITHUB_ACTIONS === 'true' ? `::warning title=${label}::${warning}` : `WARNING ${label} · ${warning}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [`## ${headline}`, ...details.slice(1)];
    if (result.exception) summary.push('### Preview transport exception — S6-10', ...result.warnings);
    if (result.policy === 'preview') summary.push('**Wider public release is blocked pending custom-domain HTTPS enforcement and release approval.**');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary.join('\n\n') + '\n\n');
  }
}

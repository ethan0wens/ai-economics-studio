import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { verifyPublicRelease } from '../scripts/release-readiness';
import { browserIcons, observeProductionSecurity, previewOrigin, productionHostname, productionOrigin, verifyPublicSecurity, verifyRetiredPreview, type ReleaseSecurityPolicy } from '../scripts/security-http';
import { promoteWorker } from '../scripts/worker-release';

const preview: ReleaseSecurityPolicy = { policy: 'preview' };
const app = 'a'.repeat(40);
const stage5 = 'ba6b9c90e75beba0873003249286930f8ebdf024';
const at = '2026-11-19T14:00:00Z';
const html = '<!doctype html><html><head><script type="module" src="/assets/index-Abcd1234.js"></script><link rel="stylesheet" href="/assets/index-QWER5678.css"></head></html>';
const productionHtml = html.replace('</head>', [...browserIcons].map(([path, { rel }]) =>
  `<link rel="${rel}" href="${path}">`).join('') + '</head>');
const raw = JSON.stringify({ schemaVersion: '1.0.0', records: [{
  meterId: 'fictional-meter', sku: 'fictional-sku', region: 'uksouth', unit: 'per request', quantityPerUnit: 1,
  priceType: 'Consumption', verification: 'azure-retail-api', currency: 'GBP', price: '10.25',
  effectiveAt: '2026-01-01T00:00:00Z', product: 'Fictional fixture', source: 'https://prices.azure.com/api/retail/prices',
}] });
const hash = createHash('sha256').update(raw).digest('hex');
const strict: ReleaseSecurityPolicy = { policy: 'public', expectedApplication: app, expectedCatalogueId: hash };
const manifest = { schemaVersion: '1.0.0', catalogueId: hash, records: 1, lastCheckedAt: at, previous: null };

const documentHeaders = {
  'content-type': 'text/html',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'",
  'x-content-type-options': 'nosniff', 'x-frame-options': 'deny', 'strict-transport-security': 'max-age=31536000',
  'referrer-policy': 'no-referrer', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'cache-control': 'public, no-cache, no-transform',
};
const immutable = { 'x-content-type-options': 'nosniff', 'cache-control': 'public, max-age=31536000, immutable' };
const plaintext = (body = html, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/html' } });

type Overrides = {
  http?: (url: URL) => Response;
  failTLS?: Error;
  catalogueMissing?: true;
  html?: string;
  alternate?: string;
  missingHeaders?: readonly string[];
  mime?: string;
  iconMime?: string;
  iconCache?: string;
  shellCache?: string;
  cache?: string;
  catalogue?: string;
  receipt?: string;
  missingBundle?: Response;
};
function fixture(options: Overrides = {}) {
  return vi.fn<typeof fetch>(async input => {
    const url = new URL(String(input));
    const shell = options.html ?? (url.hostname === productionHostname ? productionHtml : html);
    if (url.protocol === 'http:') return options.http ? options.http(url) : plaintext(shell);
    if (options.failTLS) throw options.failTLS;
    if (url.pathname === '/pricing/manifest.json') return Response.json(manifest, { headers: { 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' } });
    if (url.pathname === '/pricing/health.json') return Response.json({ release: {
      schemaVersion: 1, application: options.receipt ?? app, catalogueId: hash, pricingCheckedAt: at, evidenceHash: 'c'.repeat(64),
      deployedAt: at, status: 'published', coverage: { inventory: 1, complete: 1, partial: 0, unpriced: 0, unsupported: 0, records: 1 },
      previous: { cloudflareVersion: 'de767e83-1736-46c0-9097-f0fb93c570ff', catalogueId: null, application: null },
    } }, { headers: { 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' } });
    if (url.pathname.startsWith('/pricing/catalogue-')) return options.catalogueMissing
      ? new Response(null, { status: 404 }) : new Response(options.catalogue ?? raw, { headers: immutable });
    if (url.pathname === '/bundles/v2/studio-missing-probe.js') return options.missingBundle ?? new Response(null, { status: 404 });
    if (url.pathname.endsWith('.js')) return new Response('', { headers: {
      ...immutable, 'cache-control': options.cache ?? immutable['cache-control'], 'content-type': options.mime ?? 'text/javascript',
    } });
    if (url.pathname.endsWith('.css')) return new Response('', { headers: { ...immutable, 'content-type': 'text/css; charset=utf-8' } });
    const icon = browserIcons.get(url.pathname);
    if (icon) return new Response('Fictional test asset', { headers: {
      'x-content-type-options': 'nosniff', 'cache-control': options.iconCache ?? 'no-cache', 'content-type': options.iconMime ?? icon.mime[0],
    } });
    const headers = new Headers(documentHeaders);
    if (options.shellCache) headers.set('cache-control', options.shellCache);
    for (const key of options.missingHeaders ?? []) headers.delete(key);
    return new Response(url.pathname === '/documentation' && options.alternate !== undefined
      ? options.alternate : shell, { headers });
  });
}

describe('preview delivery', () => {
  it('checks the local favicon type and revalidation independently of the immutable scripts', async () => {
    const withIcon = html.replace('</head>', '<link rel="icon" href="/brand/favicon.svg"></head>');
    await expect(verifyPublicSecurity(previewOrigin, preview, fixture({ html: withIcon }))).resolves.toMatchObject({ exception: 'S6-10' });
    await expect(verifyPublicSecurity(previewOrigin, preview, fixture({ html: withIcon, iconMime: 'text/html' }))).rejects.toThrow('asset MIME type');
    await expect(verifyPublicSecurity(previewOrigin, preview, fixture({ html: withIcon, iconCache: immutable['cache-control'] }))).rejects.toThrow('cache policy');
  });

  it('records the byte-identical HTTP shell as S6-10 on the existing host and verifies HTTPS', async () => {
    const request = fixture();
    await expect(verifyPublicSecurity(previewOrigin, { ...preview, expectedCatalogueId: hash, expectedApplication: app }, request))
      .resolves.toMatchObject({
        hostname: new URL(previewOrigin).hostname, policy: 'preview', decision: 'conditional-pass-preview-only',
        https: { verified: true, headers: 'hardened', catalogueId: hash }, http: { status: 200, outcome: 'plaintext-shell' },
        exception: 'S6-10', warnings: [expect.stringContaining('Custom-domain HTTPS enforcement is mandatory')],
      });
    expect(request.mock.calls.find(([url]) => String(url).startsWith('http:'))?.[1]?.redirect).toBe('manual');
    expect(request.mock.calls.every(([, options]) => options?.credentials === 'omit')).toBe(true);
  });

  it('limits the temporary receipt check to the identified Stage 5 release and read-only observation', async () => {
    const missingHeaders = ['strict-transport-security', 'x-frame-options'];
    const options = { policy: 'preview', observeCurrent: true } as const;
    await expect(verifyPublicSecurity(previewOrigin, options, fixture({ missingHeaders, receipt: stage5 })))
      .resolves.toMatchObject({ decision: 'stage-5-observation', https: { headers: 'stage-5-baseline' }, exception: 'S6-10' });
    await expect(verifyPublicSecurity(previewOrigin, options, fixture({ missingHeaders }))).rejects.toThrow('revision did not match');
    await expect(verifyPublicSecurity(previewOrigin, preview, fixture({ missingHeaders, receipt: stage5 }))).rejects.toThrow('x-frame-options');
    await expect(verifyPublicSecurity(previewOrigin, options, fixture({ missingHeaders: ['strict-transport-security'], receipt: stage5 })))
      .rejects.toThrow('strict-transport-security');
  });

  it('checks the candidate application and catalogue identifiers', async () => {
    await expect(verifyPublicSecurity(previewOrigin, { ...preview, expectedApplication: 'b'.repeat(40) }, fixture())).rejects.toThrow('revision did not match');
    await expect(verifyPublicSecurity(previewOrigin, { ...preview, expectedCatalogueId: 'b'.repeat(64) }, fixture())).rejects.toThrow('different catalogue');
  });

  it.each([
    ['different HTTP content', { http: () => plaintext('Another document') }, 'Unexpected plaintext HTTP response'],
    ['different HTTP media type', { http: () => new Response(html, { headers: { 'content-type': 'text/plain' } }) }, 'Unexpected plaintext HTTP response'],
    ['unexpected HTTP status', { http: () => plaintext(html, 201) }, 'Unexpected plaintext HTTP response'],
    ['unverified redirect', { http: () => Response.redirect('https://other.example.test', 301) }, 'Unexpected plaintext HTTP response'],
    ['unexpected relative redirect', { http: () => new Response(null, { status: 308, headers: { location: '/' } }) }, 'Unexpected plaintext HTTP response'],
    ['unverified refusal', { http: () => new Response(null, { status: 403, headers: { server: 'cloudflare' } }) }, 'Unexpected plaintext HTTP response'],
    ['missing CSP', { missingHeaders: ['content-security-policy'] }, 'Content Security Policy'],
    ['missing HSTS', { missingHeaders: ['strict-transport-security'] }, 'strict-transport-security'],
    ['bad asset cache', { cache: 'no-cache' }, 'cache policy'],
    ['catalogue tampering', { catalogue: raw + ' ' }, 'manifest hash'],
    ['wrong script MIME', { mime: 'text/plain' }, 'asset MIME type'],
    ['unexpected static resource', { html: html.replace('/assets/index-Abcd1234.js', '/unexpected.js') }, 'unexpected resource'],
    ['SPA byte mismatch', { alternate: html + ' ' }, 'did not serve the application shell'],
    ['unrelated HTTP network failure', { http: () => { throw new Error('fixture connection refused'); } }, 'fixture connection refused'],
  ] as const)('rejects %s despite the preview exception', async (_label, options, message) => {
    const configured = 'missingHeaders' in options ? { missingHeaders: [...options.missingHeaders] } : options;
    await expect(verifyPublicSecurity(previewOrigin, preview, fixture(configured))).rejects.toThrow(message);
  });

  it('fails before fetching another workers.dev host or custom domain', async () => {
    const request = fixture();
    for (const url of ['https://other.example.workers.dev', productionOrigin, previewOrigin + ':444', previewOrigin + '/unapproved']) {
      await expect(verifyPublicSecurity(url, preview, request)).rejects.toThrow();
    }
    expect(request).not.toHaveBeenCalled();
  });
});

describe('strict public release', () => {
  it('proves the versioned bundle path returns a real 404 for missing modules without immutable caching', async () => {
    const html = productionHtml.replaceAll('/assets/', '/bundles/v2/');
    const http = (url: URL) => Response.redirect(new URL(url.pathname + url.search, productionOrigin), 301);
    await expect(verifyPublicSecurity(productionOrigin, strict, fixture({ html, http }))).resolves.toMatchObject({
      bundleResponses: [
        { path: '/bundles/v2/index-Abcd1234.js', status: 200, mime: 'text/javascript' },
        { path: '/bundles/v2/index-QWER5678.css', status: 200, mime: 'text/css' },
      ],
    });
    for (const missingBundle of [new Response(html), new Response(null, { status: 404, headers: immutable })]) {
      await expect(verifyPublicSecurity(productionOrigin, strict, fixture({ html, http, missingBundle })))
        .rejects.toThrow('Missing bundle must return a 404 without immutable caching');
    }
  });

  it('rejects the preview hostname before probing even with an otherwise valid response', async () => {
    const request = fixture();
    await expect(verifyPublicSecurity(previewOrigin, strict, request))
      .rejects.toThrow('approved custom domain');
    await expect(verifyPublicSecurity('https://studio.example.test', strict, request)).rejects.toThrow('approved custom domain');
    expect(request).not.toHaveBeenCalled();
  });

  it('requires verifiable delivery and mandatory HTTPS checks on the approved domain', async () => {
    const redirect = (url: URL) => Response.redirect(new URL(url.pathname + url.search, productionOrigin), 308);
    const refusal = () => new Response('Cloudflare denial', { status: 403, headers: { server: 'cloudflare', 'cf-ray': 'abcd0123abcd0123-LHR' } });
    await expect(verifyPublicSecurity(productionOrigin, strict, fixture())).rejects.toThrow('Public plaintext delivery check failed');
    await expect(verifyPublicSecurity(productionOrigin, strict, fixture({ http: () => Response.redirect(previewOrigin) }))).rejects.toThrow('Unexpected plaintext');
    await expect(verifyPublicSecurity(productionOrigin, strict, fixture({ http: redirect }))).resolves.toMatchObject({
      decision: 'pass-public-delivery', http: { status: 308, outcome: 'redirected' },
      pathTransport: { status: 308, outcome: 'redirected', path: '/documentation?studio_transport_probe=1' }, exception: null, warnings: [],
    });
    await expect(verifyPublicSecurity(productionOrigin, strict, fixture({ http: refusal }))).resolves.toMatchObject({
      http: { status: 403, outcome: 'cloudflare-refused' }, exception: null,
    });
    await expect(verifyPublicSecurity(productionOrigin, strict, fixture({ http: redirect, missingHeaders: ['x-frame-options'] })))
      .rejects.toThrow('x-frame-options');
  });

  it('rejects a path or query change and a plaintext shell below the root', async () => {
    for (const path of ['/different?studio_transport_probe=1', '/documentation', '/documentation?studio_transport_probe=2']) {
      const request = fixture({ http: url => Response.redirect(new URL(url.pathname === '/' ? '/' : path, productionOrigin), 301) });
      await expect(verifyPublicSecurity(productionOrigin, strict, request)).rejects.toThrow('Unexpected plaintext');
    }
    await expect(verifyPublicSecurity(productionOrigin, strict, fixture({
      http: url => url.pathname === '/' ? Response.redirect(productionOrigin, 308) : plaintext(productionHtml),
    }))).rejects.toThrow('Public plaintext delivery check failed');
  });

  it('fails closed on TLS errors, missing pricing assets, a stale receipt or missing icons', async () => {
    const http = (url: URL) => Response.redirect(new URL(url.pathname + url.search, productionOrigin), 308);
    for (const [override, message] of [
      [{ failTLS: new Error('certificate hostname mismatch') }, 'certificate hostname mismatch'],
      [{ catalogueMissing: true }, 'HTTP 404'],
      [{ receipt: 'b'.repeat(40) }, 'revision did not match'],
      [{ missingHeaders: ['strict-transport-security'] }, 'strict-transport-security'],
      [{ html }, 'missing approved stylesheet or icon'],
      [{ shellCache: 'no-cache' }, 'prevent edge script injection'],
    ] as const) {
      await expect(verifyPublicSecurity(productionOrigin, strict, fixture({ ...override, http }))).rejects.toThrow(message);
    }
    const request = fixture({ http });
    await expect(verifyPublicSecurity(productionOrigin, { ...strict, expectedCatalogueId: '' }, request))
      .rejects.toThrow('requires an expected application revision and catalogue digest');
    expect(request).not.toHaveBeenCalled();
  });

  it('observes a consistent live receipt independently of the evidence gate', async () => {
    const http = (url: URL) => Response.redirect(new URL(url.pathname + url.search, productionOrigin), 308);
    const current = fixture({ http });
    await expect(observeProductionSecurity(current)).resolves.toMatchObject({ decision: 'pass-public-delivery', exception: null });
    const newer = fixture({ http, receipt: 'b'.repeat(40) });
    let captured = false;
    const changed: typeof fetch = (url, options) => {
      if (!captured && String(url).endsWith('/pricing/health.json')) {
        captured = true;
        return current(url, options);
      }
      return newer(url, options);
    };
    await expect(observeProductionSecurity(changed)).rejects.toThrow('revision did not match');
  });

  it('blocks missing evidence or open S6-10 independently of a successful preview assessment', async () => {
    const reference = 'https://example.test/review';
    const evidence = {
      application: app, catalogueId: hash, reviewedOn: '2026-11-19', edgeEnforcement: reference, repositoryProtections: reference,
      deploymentTokenScope: reference, securityAndFinancialChecks: reference, verifiedDeployment: reference, riskRegisterReview: reference, publicReleaseApproval: reference,
    };
    const request = fixture({ http: url => Response.redirect(new URL(url.pathname + url.search, productionOrigin), 308) });
    await expect(verifyPublicRelease({ hostname: null, s6_10: 'accepted-preview-only', evidence: null }, request)).rejects.toThrow('approved custom domain');
    await expect(verifyPublicRelease({ hostname: productionHostname, s6_10: 'resolved', evidence: null }, request)).rejects.toThrow('evidence');
    await expect(verifyPublicRelease({ hostname: 'studio.example.test', s6_10: 'resolved', evidence }, request)).rejects.toThrow('approved custom domain');
    await expect(verifyPublicRelease({ hostname: productionHostname, s6_10: 'accepted-preview-only', evidence }, request)).rejects.toThrow('remediation of S6-10');
    expect(request).not.toHaveBeenCalled();
    await expect(verifyPublicRelease({ hostname: productionHostname, s6_10: 'resolved', evidence }, request)).resolves.toMatchObject({
      decision: 'pass-public-delivery', exception: null,
    });
  });
});

describe('retired workers.dev delivery', () => {
  const refusal = (body = 'Cloudflare denial') => new Response(body, {
    status: 404, headers: { server: 'cloudflare', 'cf-ray': 'abcd0123abcd0123-LHR' },
  });

  it('requires Cloudflare to refuse both protocols or direct HTTP to the refused HTTPS endpoint', async () => {
    await expect(verifyRetiredPreview(vi.fn<typeof fetch>().mockImplementation(async () => refusal())))
      .resolves.toEqual({ httpsStatus: 404, httpStatus: 404 });
    const request = vi.fn<typeof fetch>(async input =>
      String(input).startsWith('https:') ? refusal() : Response.redirect(previewOrigin, 301));
    await expect(verifyRetiredPreview(request)).resolves.toEqual({ httpsStatus: 404, httpStatus: 301 });
    expect(request.mock.calls.map(([url]) => String(url))).toEqual([previewOrigin + '/', previewOrigin.replace('https:', 'http:') + '/']);
    expect(request.mock.calls[0][1]).toMatchObject({ redirect: 'manual', credentials: 'omit' });
  });

  it('rejects active studio delivery, unverified denials or redirects to any other endpoint', async () => {
    for (const response of [() => plaintext(html), () => refusal('<div id="root"></div>'),
      () => new Response(null, { status: 404 }), () => Response.redirect(productionOrigin, 301)]) {
      await expect(verifyRetiredPreview(vi.fn<typeof fetch>(async input =>
        String(input).startsWith('https:') ? refusal() : response()))).rejects.toThrow('did not refuse the studio over HTTP');
    }
    await expect(verifyRetiredPreview(vi.fn<typeof fetch>(async input => String(input).startsWith('https:')
      ? plaintext(html) : Response.redirect(previewOrigin, 301)))).rejects.toThrow('did not refuse the studio over HTTPS');
  });
});

it('persists catalogue after verified preview and restores on a separate failed check', async () => {
  const old = { deployment: 'previous-deploy', version: 'previous-version' };
  const next = { deployment: 'next-deploy', version: 'next-version' };
  for (const unexpected of [false, true]) {
    let active = old;
    const persist = vi.fn();
    const restore = vi.fn(async () => { active = old; });
    const verifyRestore = vi.fn(async () => {});
    const promotion = promoteWorker({
      previous: old,
      upload() { active = next; return next.version; },
      current: async () => active,
      verify: async () => {
        await verifyPublicSecurity(previewOrigin, preview, fixture(unexpected ? { missingHeaders: ['strict-transport-security'] } : {}));
      },
      persist, restore, verifyRestore,
    });
    if (unexpected) {
      await expect(promotion).rejects.toThrow('Previous production version restored');
      expect(persist).not.toHaveBeenCalled();
      expect(restore).toHaveBeenCalledWith(old.version);
      expect(verifyRestore).toHaveBeenCalledOnce();
    } else {
      await expect(promotion).resolves.toBeUndefined();
      expect(persist).toHaveBeenCalledOnce();
      expect(restore).not.toHaveBeenCalled();
    }
  }
});

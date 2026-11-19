import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { marked } from 'marked';
import { PDFDocument, PDFName } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyCatalogue, catalogueSchema, loadCatalogue, manifestSchema, sourceRecord } from '../src/catalogue';
import { blankEnvironment, importEnvironment, maxBytes, maxObjects } from '../src/domain';
import { exportName } from '../src/download';
import { governance, ledger } from '../src/ledger';
import { report } from '../src/report';
import { technicalLink } from '../src/technical-content';
import { TechnicalMarkdown } from '../src/technical-markdown';
import { readResponseBytes } from '../src/untrusted-data';
import { retailPage } from '../scripts/pricing';
import { verifyPublicSecurity, verifySecurityHeaders, workerUrl } from '../scripts/security-http';

const at = '2026-11-19T14:00:00Z';
const fixture = {
  meterId: 'fictional-meter', sku: 'fictional-sku', region: 'uksouth', unit: 'per activity', quantityPerUnit: 1,
  priceType: 'Consumption', verification: 'azure-retail-api', currency: 'GBP', price: '10.25',
  effectiveAt: '2026-01-01T00:00:00Z', product: 'Fictional security fixture',
  source: 'https://prices.azure.com/api/retail/prices',
};
const snapshot = JSON.stringify({ schemaVersion: '1.0.0', records: [fixture] });
const hash = createHash('sha256').update(snapshot).digest('hex');
const manifest = { schemaVersion: '1.0.0', catalogueId: hash, records: 1, lastCheckedAt: at, previous: null };
afterEach(() => vi.unstubAllGlobals());

describe('untrusted environment input', () => {
  it('rejects invalid, too large, too deep and overly broad JSON', () => {
    expect(() => importEnvironment('{')).toThrow(SyntaxError);
    expect(() => importEnvironment(' '.repeat(maxBytes + 1))).toThrow('2 MB');
    expect(() => importEnvironment('['.repeat(15) + '0' + ']'.repeat(15))).toThrow('complexity');
    expect(() => importEnvironment(JSON.stringify(Array(60_000).fill(0)))).toThrow('too many');
    const env = blankEnvironment();
    const objects = Array.from({length: maxObjects + 1}, (_, index) => ({ kind: 'agent', id: String(index), name: 'Fixture' }));
    expect(() => importEnvironment(JSON.stringify({ ...env, objects }))).toThrow('Invalid value or configuration');
  });

  it('enforces existing strings, numeric, exact-property and graph constraints', () => {
    const env = blankEnvironment();
    const usage = { kind: 'usage-profile', id: 'usage', name: 'Fictional usage', executions: 100 };
    for (const candidate of [
      { ...env, name: 'a'.repeat(301) },
      { ...env, objects: [{ ...usage, executions: 0.1 }] },
      { ...env, objects: [{ ...usage, executions: '100' }] },
      { ...env, objects: [usage, usage] },
      { ...env, objects: [{ id: 'unknown', kind: 'unexpected', name: 'Fixture' }] },
      { ...env, relationships: [{ from: 'missing', to: 'usage', type: 'agent-uses-usage' }], objects: [usage] },
      { ...env, sourceSnapshot: { catalogueId: { unsupported: 'value' }, checkedAt: null, current: null, incomplete: 0 } },
    ]) expect(() => importEnvironment(JSON.stringify(candidate))).toThrow();
    const overflow = JSON.stringify({ ...env, objects: [{ ...usage, executions: 7331 }] }).replace('7331', '1e400');
    expect(() => importEnvironment(overflow)).toThrow('Invalid value');
  });

  it('rejects prototype control properties before schema parsing', () => {
    const env = blankEnvironment();
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const value = JSON.stringify({ ...env, objects: [{ kind: 'agent', id: 'agent', name: 'Fictional',
        [key]: { testOnlyFlag: true },
      }] });
      expect(() => importEnvironment(value)).toThrow('unsupported property');
      expect(Object.hasOwn(Object.prototype, 'testOnlyFlag')).toBe(false);
    }
    expect(importEnvironment(JSON.stringify(env))).toEqual(env);
  });
});

describe('documentation and exports', () => {
  it('keeps invalid URLs inert and resolves approved internal and external references', () => {
    const file = '03-ledger-methodology.md';
    for (const href of [
      'javascript:', 'data:text/plain,example', 'http://learn.microsoft.com/', 'https://[malformed',
      'https://learn.microsoft.com:8443/', 'https://reader@learn.microsoft.com/', 'https://example.invalid/',
      '03-ledger-methodology.md#%E0%A4%A', '#/documentation/%not-encoded', '#/unrecognised',
      'https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/03-domain-model.md',
    ]) expect(technicalLink(href, file)).toBeUndefined();
    expect(technicalLink('03-ledger-methodology.md#inputs-and-outputs', file)).toMatchObject({
      kind: 'internal', href: '#/documentation/technical/ledger-methodology?section=inputs-and-outputs',
    });
    expect(technicalLink('https://learn.microsoft.com/en-us/', file)).toMatchObject({ kind: 'evidence' });
    const tokens = marked.lexer('Plain <mark data-fixture="yes">label</mark> and [unsupported](data:text/plain,example).\n\n`<sensor>`');
    const output = renderToStaticMarkup(createElement(TechnicalMarkdown, { tokens, file, title: 'Fixture' }));
    expect(output).not.toMatch(/<mark|href=/);
    expect(output).toContain('&lt;sensor&gt;');
  });

  it('uses bounded portable filenames and plain PDF text/metadata', async () => {
    expect(exportName('CON')).toBe('environment');
    expect(exportName('../Name/Other\\File')).toBe('name-other-file');
    expect(exportName('x'.repeat(300))).toHaveLength(100);
    const env = { ...blankEnvironment(), name: 'Fictional <label> & £ \u202e例', description: 'Notes <markup> \u0001 🧪' };
    const restored = importEnvironment(JSON.stringify(env));
    expect(restored.name).toBe(env.name);
    const bytes = await report(restored, ledger(restored, [], at), emptyCatalogue, governance(restored));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toContain('Fictional <label> & £');
    expect(pdf.getTitle()).not.toContain('\u202e');
    for (const key of ['OpenAction', 'AA', 'Names']) expect(pdf.catalog.has(PDFName.of(key))).toBe(false);
    expect(pdf.getPages().every(page => (page.node.Annots()?.size() ?? 0) === 0)).toBe(true);
  });
});

describe('catalogue boundaries', () => {
  it('rejects duplicate or invalid price records, units, evidence and pointers', () => {
    expect(sourceRecord.safeParse(fixture).success).toBe(true);
    for (const change of [{ price: '0' }, { price: '1e309' }, { price: '1000000001' }, { quantityPerUnit: 1e-30 }, { region: 'wrong region' },
      { source: 'http://prices.azure.com/api/retail/prices' }, { source: 'https://prices.azure.com/invalid' }]) {
      expect(sourceRecord.safeParse({ ...fixture, ...change }).success).toBe(false);
    }
    expect(catalogueSchema.safeParse({ schemaVersion: '1.0.0', records: [fixture, fixture] }).success).toBe(false);
    for (const change of [{ catalogueId: '../bad-path' }, { previous: hash }, { records: 50_000 }]) {
      expect(manifestSchema.safeParse({ ...manifest, ...change }).success).toBe(false);
    }
  });

  it('rejects invalid manifest before fetching a snapshot and falls back only to a matching hash', async () => {
    const request = vi.fn<typeof fetch>().mockImplementationOnce(async () => Response.json({ ...manifest, catalogueId: '../invalid' }));
    vi.stubGlobal('fetch', request);
    await expect(loadCatalogue()).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    request.mockImplementationOnce(async () => Response.json({ ...manifest, catalogueId: 'f'.repeat(64), previous: hash }))
      .mockImplementationOnce(async () => new Response('unexpected content'))
      .mockImplementationOnce(async () => new Response(snapshot));
    await expect(loadCatalogue()).resolves.toMatchObject({ manifest: { catalogueId: hash, lastCheckedAt: null }, fallback: true });
    expect(request.mock.calls.slice(1).every(([, init]) => init?.credentials === 'omit' && init.redirect === 'error')).toBe(true);
  });

  it('bounds streamed source bytes and restricts Azure pricing to the approved endpoint', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(9)); }, cancel });
    await expect(readResponseBytes(new Response(stream), 8, 'Fictional response')).rejects.toThrow('supported response size');
    expect(cancel).toHaveBeenCalledOnce();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { headers: { 'content-length': '4000001' } }));
    await expect(retailPage(new URL('https://example.invalid/api/retail/prices'), request)).rejects.toThrow('permitted endpoint');
    expect(request).not.toHaveBeenCalled();
    await expect(retailPage(new URL(fixture.source), request)).rejects.toThrow('response size');
  });
});

it('rejects changed delivery headers with a weaker script policy', async () => {
  const raw = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
  const entries = raw.split('\n').slice(1).filter(line => line.startsWith('  ') && !line.includes('!')).slice(0, 7);
  const headers = new Headers(entries.map((line): [string, string] => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  expect(() => verifySecurityHeaders(headers, 'document')).not.toThrow();
  headers.set('content-security-policy', headers.get('content-security-policy')!.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"));
  expect(() => verifySecurityHeaders(headers, 'document')).toThrow('approved policy');
});

it('reports plaintext shell delivery and rejects promotion without a secure upgrade or provider refusal', async () => {
  const html = '<!doctype html><html><head><script type="module" src="/assets/index-Abcd1234.js"></script></head></html>';
  const headers = {
    'content-type': 'text/html',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'",
    'x-content-type-options': 'nosniff', 'x-frame-options': 'deny', 'strict-transport-security': 'max-age=31536000',
    'referrer-policy': 'no-referrer', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'cache-control': 'no-cache',
  };
  const check = (secure: boolean): typeof fetch => async input => {
    const url = new URL(String(input));
    if (url.protocol === 'http:' && secure) return new Response(null, { status: 308, headers: { location: workerUrl + '/' } });
    if (url.pathname === '/pricing/manifest.json') return Response.json(manifest, { headers });
    const immutable = { 'x-content-type-options': 'nosniff', 'cache-control': 'public, max-age=31536000, immutable' };
    if (url.pathname.startsWith('/pricing/catalogue-')) return new Response(snapshot, { headers: immutable });
    if (url.pathname.startsWith('/assets/')) return new Response('', { headers: { ...immutable, 'content-type': 'text/javascript' } });
    return new Response(html, { headers });
  };
  await expect(verifyPublicSecurity(workerUrl, undefined, check(false))).resolves.toMatchObject({
    catalogueId: hash, secured: false, transport: expect.stringContaining('same application shell over plaintext'),
  });
  await expect(verifyPublicSecurity(workerUrl, hash, check(false))).rejects.toThrow('plaintext delivery check failed');
  await expect(verifyPublicSecurity(workerUrl, hash, check(true))).resolves.toMatchObject({ catalogueId: hash, secured: true });
});

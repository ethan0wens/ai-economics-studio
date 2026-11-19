import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { catalogueFilename, manifestSchema, maxCatalogueBytes } from '../src/catalogue';
import { documentAssetPaths, verifySecurityHeaders } from './security-http';

const dist = resolve('dist');
const allowed = /^(?:_headers|index\.html|assets\/[\w.-]+\.(?:js|css|woff2?|svg|png)|pricing\/(?:manifest|catalogue-[a-f0-9]{64})\.json)$/;
const credentials = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/;

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(join(dist, directory), { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path);
    if (!entry.isFile() || !allowed.test(path)) throw new Error(`Unexpected production build asset ${path}.`);
    return [path];
  }))).flat();
}

const assets = await files('');
const present = new Set(assets);
for (const file of assets) {
  if (!/\.(?:js|json|html)$/.test(file)) continue;
  const contents = await readFile(join(dist, file), 'utf8');
  if (credentials.test(contents)) throw new Error(`Credential-like material in ${file}.`);
  if (file.endsWith('.js') && /\/\/#[\t ]*sourceMappingURL\s*=/.test(contents)) throw new Error(`Source map directive in ${file}.`);
}
const reviewedHeaders = await readFile('public/_headers', 'utf8');
const headersPath = join(dist, '_headers');
const stylesheetHeaders = assets.filter(file => file.endsWith('.css')).sort()
  .map(file => `\n/${file}\n  Content-Type: text/css; charset=utf-8\n`).join('');
const expectedHeaders = reviewedHeaders + stylesheetHeaders;
const headers = await readFile(headersPath, 'utf8');
const prepare = process.argv.length === 3 && process.argv[2] === '--prepare';
if (prepare) {
  if (headers !== reviewedHeaders) throw new Error('Vite did not copy the reviewed static security configuration.');
  await writeFile(headersPath, expectedHeaders);
} else if (headers !== expectedHeaders) throw new Error('Built security headers differ from the reviewed static configuration and exact stylesheets.');
const configured = new Headers();
for (const line of reviewedHeaders.split('\n').slice(1)) {
  if (line.startsWith('/')) break;
  const colon = line.indexOf(':');
  if (colon > 0) configured.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
}
verifySecurityHeaders(configured, 'document');

const { assets: entry } = documentAssetPaths(await readFile(join(dist, 'index.html'), 'utf8'));
for (const path of entry) if (!present.has(path.slice(1))) throw new Error('HTML references a missing build asset.');
const manifest = manifestSchema.parse(JSON.parse(await readFile(join(dist, 'pricing/manifest.json'), 'utf8')));
for (const id of [manifest.catalogueId, manifest.previous]) {
  if (id === null) continue;
  const bytes = await readFile(join(dist, 'pricing', catalogueFilename(id)));
  if (bytes.length > maxCatalogueBytes || createHash('sha256').update(bytes).digest('hex') !== id) throw new Error('Built pricing asset failed its digest check.');
}
const snapshots = assets.filter(file => dirname(file) === 'pricing');
if (snapshots.length !== 1 + Number(!!manifest.catalogueId) + Number(!!manifest.previous)) throw new Error('Build contains unexpected catalogue snapshots.');
console.log(`Validated the security policy and production asset allowlist for ${assets.length} files.`);

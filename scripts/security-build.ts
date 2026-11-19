import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { catalogueFilename, manifestSchema, maxCatalogueBytes } from '../src/catalogue';
import { browserIcons, documentAssetPaths, verifySecurityHeaders } from './security-http';

const dist = resolve('dist');
const allowed = /^(?:_headers|index\.html|assets\/[\w.-]+\.(?:js|css|woff2?|svg|png)|pricing\/(?:manifest|catalogue-[a-f0-9]{64})\.json)$/;
const credentials = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/;

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(join(dist, directory), { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path);
    if (!entry.isFile() || !(allowed.test(path) || browserIcons.has('/' + path))) throw new Error(`Unexpected production build asset ${path}.`);
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
const headers = await readFile(join(dist, '_headers'), 'utf8');
if (headers !== await readFile('public/_headers', 'utf8')) throw new Error('Built security headers differ from the reviewed static configuration.');
const configured = new Headers();
for (const line of headers.split('\n').slice(1)) {
  if (line.startsWith('/')) break;
  const colon = line.indexOf(':');
  if (colon > 0) configured.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
}
verifySecurityHeaders(configured, 'document');

const { assets: entry } = documentAssetPaths(await readFile(join(dist, 'index.html'), 'utf8'));
for (const path of entry) if (!present.has(path.slice(1))) throw new Error('HTML references a missing build asset.');
for (const path of browserIcons.keys()) if (!entry.has(path)) throw new Error(`HTML is missing the browser icon ${path}.`);
const manifest = manifestSchema.parse(JSON.parse(await readFile(join(dist, 'pricing/manifest.json'), 'utf8')));
for (const id of [manifest.catalogueId, manifest.previous]) {
  if (id === null) continue;
  const bytes = await readFile(join(dist, 'pricing', catalogueFilename(id)));
  if (bytes.length > maxCatalogueBytes || createHash('sha256').update(bytes).digest('hex') !== id) throw new Error('Built pricing asset failed its digest check.');
}
const snapshots = assets.filter(file => dirname(file) === 'pricing');
if (snapshots.length !== 1 + Number(!!manifest.catalogueId) + Number(!!manifest.previous)) throw new Error('Build contains unexpected catalogue snapshots.');
console.log(`Validated the security policy and production asset allowlist for ${assets.length} files.`);

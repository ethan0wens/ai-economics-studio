import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const bundleDirectory = 'bundles/v2';
export const buildAsset = /^bundles\/v2\/[a-z0-9][a-z0-9._-]*\.(?:js|css|woff2?|svg|png)$/i;
const immutableSnapshot = /^pricing\/catalogue-[a-f0-9]{64}\.json$/;

export async function listStaticFiles(directory: string) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter(entry => !entry.isDirectory())
    .map(entry => relative(directory, join(entry.parentPath, entry.name)).split('\\').join('/'));
}

export function staticHeaders(base: string, files: readonly string[]) {
  const immutable = [...new Set(files.filter(path => buildAsset.test(path) || immutableSnapshot.test(path)))].sort();
  if (immutable.length > 99) throw new Error('The build exceeds the Cloudflare limit of 100 static header rules.');
  const rules = immutable.map(path => [
    '/' + path, '  ! Cache-Control', '  Cache-Control: public, max-age=31536000, immutable, no-transform',
  ].join('\n'));
  return [base.trimEnd(), ...rules].join('\n') + '\n';
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const base = await readFile('public/_headers', 'utf8');
  await writeFile('dist/_headers', staticHeaders(base, await listStaticFiles('dist')));
}

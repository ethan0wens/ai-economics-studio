import { execFileSync } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { catalogueFilename, manifestSchema } from '../src/catalogue';
import { maintenanceHealthSchema } from '../src/catalogue-health';

export const evidenceFiles = [
  'catalogue/commercial.json', 'catalogue/compatibility.json', 'catalogue/entitlements.json',
  'catalogue/provisioned.json', 'catalogue/discovered.json', 'catalogue/maintenance.json',
];
const manifestFile = 'public/pricing/manifest.json';
const refreshWindow = 7 * 86_400_000;

export function git(args: string[], options: { input?: string; env?: NodeJS.ProcessEnv } = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32_000_000, stdio: ['pipe', 'pipe', 'pipe'], ...options }).trimEnd();
}

export function assertPricingPaths(paths: string[]) {
  if (!paths.every(path => path === manifestFile || evidenceFiles.includes(path) ||
    /^public\/pricing\/catalogue-[a-f0-9]{64}\.json$/.test(path))) {
    throw new Error('Candidate contains a path outside the generated pricing and evidence allowlist.');
  }
}

export function assertPricingIndex(paths: string[]) {
  assertPricingPaths(paths);
  const entries = git(['ls-files', '--stage', '-z', '--', ...paths]).split('\0').filter(Boolean);
  if (entries.some(entry => !entry.startsWith('100644 ') || !entry.includes(' 0\t'))) {
    throw new Error('Candidate contains an executable, symlink or unmerged file.');
  }
}

const volatile = new Set(['checkedAt', 'reviewedAt', 'expiresAt', 'firstSeen', 'lastSeen', 'occurrences']);
function semantic(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semantic);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !volatile.has(key))
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, semantic(child)]));
}

function expiries(value: unknown): (string | undefined)[] {
  if (Array.isArray(value)) return value.flatMap(expiries);
  if (!value || typeof value !== 'object') return [];
  const row = value as Record<string, unknown>;
  return ['expiresAt' in row ? String(row.expiresAt) : undefined, ...Object.keys(row).sort().flatMap(key => expiries(row[key]))];
}

export function meaningfulEvidenceChange(before: unknown, after: unknown, now: number) {
  if (JSON.stringify(semantic(before)) !== JSON.stringify(semantic(after))) return true;
  const previous = expiries(before);
  const current = expiries(after);
  return previous.some((value, index) => !!value && !!current[index] && value !== current[index] &&
    (Date.parse(value) <= now + refreshWindow || Date.parse(current[index]!) < Date.parse(value)));
}

export function assertSafeReview(value: unknown) {
  const health = maintenanceHealthSchema.parse(value);
  if (health.unresolved.some(item => item.kind === 'ambiguous' || item.kind === 'expired')) {
    throw new Error('Microsoft review reported contradictory or expired evidence. The current published catalogue is retained.');
  }
  return health;
}

async function stage() {
  const output = process.env.GITHUB_OUTPUT;
  if (!output || process.argv.length !== 3) throw new Error('Use the preparation workflow to stage a reviewed pricing patch.');
  const read = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as unknown;
  const before = (path: string) => JSON.parse(git(['show', `HEAD:${path}`])) as unknown;
  const previous = manifestSchema.parse(before(manifestFile));
  const next = manifestSchema.parse(await read(manifestFile));
  const snapshot = (digest: string) => `public/pricing/${catalogueFilename(digest)}`;
  if (!next.catalogueId) throw new Error('The candidate has no verified catalogue digest.');
  const health = assertSafeReview(await read('catalogue/maintenance.json'));
  const now = Date.parse(next.lastCheckedAt ?? '');
  const evidence = await Promise.all(evidenceFiles.filter(path => !path.endsWith('/maintenance.json')).map(async path =>
    meaningfulEvidenceChange(before(path), await read(path), now)));
  const previousHealth = maintenanceHealthSchema.parse(before('catalogue/maintenance.json'));
  const findings = (report: typeof health) => report.unresolved.filter(item => item.kind !== 'source')
    .map(({ group, id, kind, detail, source }) => JSON.stringify([group, id, kind, detail, source])).sort();
  const changed = !previous.catalogueId ||
    meaningfulEvidenceChange(before(snapshot(previous.catalogueId)), await read(snapshot(next.catalogueId)), now) ||
    evidence.some(Boolean) || JSON.stringify(findings(previousHealth)) !== JSON.stringify(findings(health));

  const paths = [...new Set([
    ...git(['diff', '--name-only', '-z', 'HEAD']).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
  ].filter(Boolean))];
  assertPricingPaths(paths);
  if (changed) {
    if (!paths.length) throw new Error('A material change must produce a tracked pricing patch.');
    git(['add', '-A', '--', ...paths]);
    assertPricingIndex(paths);
    const patch = execFileSync('git', ['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'], { maxBuffer: 32_000_000 });
    await writeFile(process.argv[2], patch);
  }
  await appendFile(output, `changed=${changed}\ncatalogue=${next.catalogueId}\n`);
  const observation = `Azure and Microsoft validation completed at ${next.lastCheckedAt}. ${changed
    ? `Candidate catalogue ${next.catalogueId} has material evidence or pricing changes.`
    : `No material changes. Keep the published catalogue ${previous.catalogueId}.`}`;
  console.log(process.env.GITHUB_ACTIONS === 'true' ? `::notice title=Microsoft pricing rehearsal::${observation}` : observation);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '\n' + observation + '\n');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await stage();

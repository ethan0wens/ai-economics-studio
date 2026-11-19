import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseConfigFileTextToJson } from 'typescript';
import { catalogueFilename, catalogueSchema, manifestSchema } from '../src/catalogue';
import { catalogueCoverage } from '../src/coverage';
import { maintenanceHealthSchema, releaseHealthSchema } from '../src/catalogue-health';
import { promoteWorker, workerReleases, type ActiveWorker } from './worker-release';

const worker = 'ai-econmics-studio';
const workersSubdomain = 'ethan0wens';
const site = `https://${worker}.${workersSubdomain}.workers.dev`;
const config = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));

export async function verifyWorker(configText: string, accountId?: string, token?: string, request = fetch) {
  const parsed = parseConfigFileTextToJson(config, configText);
  if (parsed.error || parsed.config?.name !== worker) {
    throw new Error(`wrangler.jsonc must target the existing Worker ${worker}.`);
  }
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token) {
    throw new Error('Production deployment requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.');
  }
  async function lookup(path: string, purpose: string) {
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Cloudflare could not confirm ${purpose} (HTTP ${response.status}). Deployment stopped.`);
    const body = await response.json() as { success?: boolean; result?: { subdomain?: string } };
    if (body?.success !== true || typeof body.result !== 'object' || body.result === null) {
      throw new Error(`Cloudflare could not confirm ${purpose}. Deployment stopped.`);
    }
    return body.result;
  }
  const account = await lookup('subdomain', 'the Workers account subdomain');
  if (account.subdomain !== workersSubdomain) {
    throw new Error(`Expected the ${workersSubdomain}.workers.dev account subdomain. Deployment stopped.`);
  }
  await lookup(`scripts/${worker}/settings`, `the existing Worker ${worker}`);
  return worker;
}

export async function verifyPublishedAssets(expected: ReadonlyMap<string, string>, request = fetch) {
  await Promise.all([...expected].map(async ([path, contents]) => {
    const response = await request(new URL(path, site), {
      headers: { 'Cache-Control': 'no-cache' },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || await response.text() !== contents) {
      throw new Error(`Live ${path} does not match the build (HTTP ${response.status}).`);
    }
  }));
}

const manifestPath = '/pricing/manifest.json';
const healthPath = '/pricing/health.json';
const cleanEnv = { ...process.env, CLOUDFLARE_ACCOUNT_ID: undefined, CLOUDFLARE_API_TOKEN: undefined };

function command(program: string, args: string[]) {
  const result = spawnSync(program, args, { env: cleanEnv, encoding: 'utf8', maxBuffer: 4_000_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${args[0]} failed (exit ${result.status ?? result.signal}). ${result.stderr.trim()}`);
  return result.stdout.trim();
}

async function currentAssets() {
  async function get(path: string) {
    const response = await fetch(new URL(path, site), { redirect: 'error', cache: 'no-cache', signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Cannot capture current production ${path} (HTTP ${response.status}).`);
    return response.text();
  }
  const [html, manifest, health] = await Promise.all([get('/'), get(manifestPath), get(healthPath).catch(() => '')]);
  const catalogueId = manifestSchema.parse(JSON.parse(manifest)).catalogueId;
  const parsed = (() => { try { return releaseHealthSchema.safeParse(JSON.parse(health).release); } catch { return undefined; } })();
  const application = parsed?.success ? parsed.data.application : null;
  const assets = new Map([['/', html], [manifestPath, manifest]]);
  if (catalogueId) {
    const path = `/pricing/${catalogueFilename(catalogueId)}`;
    const raw = await get(path);
    if (createHash('sha256').update(raw).digest('hex') !== catalogueId) throw new Error('Production rollback target catalogue hash could not be validated.');
    assets.set(path, raw);
  }
  if (parsed?.success) assets.set(healthPath, health);
  return { application, catalogueId, assets };
}

async function builtAssets(previous: ActiveWorker, previousAssets: Awaited<ReturnType<typeof currentAssets>>, application: string) {
  const readAsset = (path: string) => readFile(new URL(`../dist${path}`, import.meta.url), 'utf8');
  const raw = await readAsset(manifestPath);
  const manifest = manifestSchema.parse(JSON.parse(raw));
  const assets = new Map([['/', await readAsset('/index.html')], [manifestPath, raw]]);
  const catalogue = manifest.catalogueId ? await readAsset(`/pricing/${catalogueFilename(manifest.catalogueId)}`) : undefined;
  const checksum = (source: string) => createHash('sha256').update(source).digest('hex');
  if (manifest.catalogueId && (!catalogue || checksum(catalogue) !== manifest.catalogueId)) throw new Error('Built pricing asset has an invalid checksum.');
  if (manifest.catalogueId && catalogue) assets.set(`/pricing/${catalogueFilename(manifest.catalogueId)}`, catalogue);
  const payload = catalogue && catalogueSchema.parse(JSON.parse(catalogue));
  const coverage = catalogueCoverage({ manifest, records: payload ? payload.records : [], inventory: payload ? payload.inventory : undefined });
  const sum = (key: 'discovered' | 'fully' | 'partial' | 'manual' | 'unsupported') => coverage.reduce((total, row) => total + row[key], 0);
  const evidence = await Promise.all(['commercial.json', 'compatibility.json', 'entitlements.json', 'provisioned.json', 'discovered.json', 'maintenance.json']
    .map(name => readFile(new URL(`../catalogue/${name}`, import.meta.url), 'utf8')));
  const maintenance = maintenanceHealthSchema.parse(JSON.parse(evidence.at(-1)!));
  const release = releaseHealthSchema.parse({ schemaVersion: 1, application, catalogueId: manifest.catalogueId,
    pricingCheckedAt: manifest.lastCheckedAt, evidenceHash: checksum(JSON.stringify(evidence)), deployedAt: new Date().toISOString(), status: 'published',
    coverage: { inventory: sum('discovered'), complete: sum('fully'), partial: sum('partial'), unpriced: sum('manual'), unsupported: sum('unsupported'), records: manifest.records },
    previous: { cloudflareVersion: previous.version, catalogueId: previousAssets.catalogueId, application: previousAssets.application },
  });
  const health = JSON.stringify({ release, maintenance }, null, 2) + '\n';
  await writeFile(new URL(`../dist${healthPath}`, import.meta.url), health);
  assets.set(healthPath, health);
  return { assets, manifest };
}

function assertUpstream(application: string) {
  const remote = command('git', ['ls-remote', '--exit-code', 'origin', 'refs/heads/main']).split(/\s+/)[0];
  if (remote !== application) throw new Error('main advanced during this run. The checked candidate cannot supersede it.');
}

function publishCatalogue(application: string) {
  assertUpstream(application);
  command('git', ['add', '--', 'catalogue/commercial.json', 'catalogue/compatibility.json', 'catalogue/entitlements.json',
    'catalogue/provisioned.json', 'catalogue/discovered.json', 'catalogue/maintenance.json', 'public/pricing']);
  if (!command('git', ['diff', '--cached', '--name-only'])) return;
  command('git', ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    'commit', '-m', 'Publish validated catalogue and Microsoft evidence']);
  command('git', ['push', 'origin', 'HEAD:main']);
}

function liveBrowser(catalogueId: string | null) {
  const browser = spawnSync('npm', ['run', 'test:e2e', '--', '--retries=1', 'tests/e2e/field-help.spec.ts',
    'tests/e2e/retail-first.spec.ts', 'tests/e2e/enterprise.spec.ts', 'tests/e2e/guided.spec.ts', 'tests/e2e/technical-docs.spec.ts'], {
    stdio: 'inherit', env: { ...cleanEnv, STUDIO_TEST_URL: site, STUDIO_EXPECTED_CATALOGUE_ID: catalogueId ?? undefined, STUDIO_CHECK_RELEASE_HEALTH: '1', STUDIO_CHECK_PUBLISHED_CATALOGUE: '1' },
  });
  if (browser.error) throw browser.error;
  if (browser.status !== 0) throw new Error(`Production browser reconciliation failed (exit ${browser.status ?? browser.signal}).`);
}

function report(status: 'notice' | 'error', message: string) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.log(`::${status} title=Cloudflare production::${escaped}`);
  } else if (status === 'error') console.error(message);
  else console.log(message);
}

async function waitForPublishedAssets(assets: ReadonlyMap<string, string>) {
  for (let attempt = 1; ; attempt++) {
    try {
      await verifyPublishedAssets(assets);
      report('notice', `Production HTML and pricing assets match this build at ${site}`);
      return;
    } catch (error) {
      if (attempt === 6) {
        throw new Error(`Post-deploy verification failed for ${site}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
      await delay(5_000);
    }
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const publish = process.argv[2] === '--publish-catalogue';
    if (process.argv.length !== (publish ? 3 : 2)) throw new Error('Production deploy uses the checked-in Worker target.');
    const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
    const name = await verifyWorker(await readFile(config, 'utf8'), account, token);
    const application = command('git', ['rev-parse', 'HEAD']);
    if (process.env.GITHUB_ACTIONS === 'true') assertUpstream(application);
    const worker = workerReleases(account!, token!, name);
    const previous = await worker.current();
    const previousAssets = await currentAssets();
    if ((await worker.current()).deployment !== previous.deployment) throw new Error('The active Worker changed while capturing the rollback target.');
    const { assets, manifest } = await builtAssets(previous, previousAssets, application);
    report('notice', `Verified existing Worker ${site} with rollback target ${previous.version}`);
    await promoteWorker({
      previous,
      upload() {
        const result = spawnSync(process.execPath, [wrangler, 'deploy', '--config', config, '--name', name], { encoding: 'utf8', maxBuffer: 4_000_000 });
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`Wrangler deploy failed (exit ${result.status ?? result.signal}).`);
        const version = /Current Version ID:\s*([a-f0-9-]{36})/i.exec(result.stdout)?.[1];
        if (!version) throw new Error('Wrangler did not return the deployed version ID.');
        return version;
      },
      current: worker.current,
      async verify() {
        await waitForPublishedAssets(assets);
        liveBrowser(manifest.catalogueId);
      },
      persist() { if (publish) publishCatalogue(application); },
      restore: worker.restore,
      verifyRestore: () => waitForPublishedAssets(previousAssets.assets),
    });
    report('notice', `Production browser reconciliation passed for ${manifest.catalogueId ?? 'unpriced bootstrap catalogue'} at ${site}`);
  } catch (error) {
    report('error', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

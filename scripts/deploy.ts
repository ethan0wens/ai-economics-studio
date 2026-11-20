import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseConfigFileTextToJson } from 'typescript';
import { catalogueFilename, catalogueSchema, manifestSchema, maxCatalogueBytes, maxManifestBytes } from '../src/catalogue';
import { catalogueCoverage } from '../src/coverage';
import { maintenanceHealthSchema, releaseHealthSchema } from '../src/catalogue-health';
import { documentAssetPaths, parsePublishedReceipt, productionHostname, productionOrigin, reportSecurityVerification, verifyPublicSecurity, verifyRetiredPreview } from './security-http';
import { readResponseBytes } from '../src/untrusted-data';
import { promoteWorker, workerReleases, type ActiveWorker } from './worker-release';

const worker = 'ai-econmics-studio';
const workersSubdomain = 'ethan0wens';
const site = productionOrigin;
const config = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));

export async function verifyWorker(configText: string, accountId?: string, token?: string, request = fetch) {
  const parsed = parseConfigFileTextToJson(config, configText);
  if (parsed.error || parsed.config?.name !== worker) {
    throw new Error(`wrangler.jsonc must target the existing Worker ${worker}.`);
  }
  if (parsed.config.workers_dev === false && parsed.config.preview_urls !== false) {
    throw new Error('Retiring workers.dev also requires preview_urls to be false.');
  }
  const routes: unknown = parsed.config.routes;
  if (parsed.config.route !== undefined || (routes !== undefined && (!Array.isArray(routes) || routes.length !== 1 ||
    routes[0]?.pattern !== productionHostname || routes[0]?.custom_domain !== true))) {
    throw new Error(`Use the dashboard-managed Custom Domain ${productionHostname} or declare that exact custom_domain in Wrangler.`);
  }
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token) {
    throw new Error('Production deployment requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.');
  }
  async function lookup(path: string, purpose: string): Promise<object> {
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/${path}`, {
      cache: 'no-store', credentials: 'omit',
      headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Cloudflare could not confirm ${purpose} (HTTP ${response.status}). Deployment stopped.`);
    const body = await response.json() as { success?: boolean; result?: object };
    if (body?.success !== true || typeof body.result !== 'object' || body.result === null) {
      throw new Error(`Cloudflare could not confirm ${purpose}. Deployment stopped.`);
    }
    return body.result;
  }
  const account = await lookup('subdomain', 'the Workers account subdomain');
  if (!('subdomain' in account) || account.subdomain !== workersSubdomain) {
    throw new Error(`Expected the ${workersSubdomain}.workers.dev account subdomain. Deployment stopped.`);
  }
  await lookup(`scripts/${worker}/settings`, `the existing Worker ${worker}`);
  const domains = await lookup(`domains?hostname=${productionHostname}`, 'the enabled Custom Domain binding');
  if (!Array.isArray(domains) || domains.length !== 1 || domains[0]?.hostname !== productionHostname ||
    domains[0]?.service !== worker || domains[0]?.zone_name !== 'ethan0wens.tech' || domains[0]?.enabled !== true) {
    throw new Error(`Expected ${productionHostname} as an enabled Custom Domain on ${worker} in the ethan0wens.tech zone. Deployment stopped.`);
  }
  return worker;
}

type AssetContents = string | Uint8Array;
const manifestPath = '/pricing/manifest.json';
const healthPath = '/pricing/health.json';

export async function verifyPublishedAssets(expected: ReadonlyMap<string, AssetContents>, request = fetch) {
  const checks = await Promise.allSettled([...expected].map(async ([path, contents]) => {
    const response = await request(new URL(path, site), {
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity' },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const bytes = typeof contents === 'string' ? Buffer.from(contents, 'utf8') : Buffer.from(contents);
    const observed = response.ok && await readResponseBytes(response, path === healthPath ? 1_000_000 : bytes.length, `Published ${path}`)
      .catch(() => false as const);
    if (observed && bytes.equals(observed)) return;
    const digest = (value: Uint8Array) => createHash('sha256').update(value).digest('hex').slice(0, 12);
    const detail = observed ? `; expected SHA-256 ${digest(bytes)}, received ${digest(observed)}` : '';
    throw new Error(`Live ${path} does not match the build (HTTP ${response.status}${detail}).`);
  }));
  const failed = checks.filter(result => result.status === 'rejected');
  if (failed.length) throw new Error(failed.map(({ reason }) => reason instanceof Error ? reason.message : String(reason)).join(' '));
}

const cleanEnv = { ...process.env, CLOUDFLARE_ACCOUNT_ID: undefined, CLOUDFLARE_API_TOKEN: undefined,
  GITHUB_TOKEN: undefined, STUDIO_PRICING_APP_PRIVATE_KEY: undefined };

function command(program: string, args: string[], env: NodeJS.ProcessEnv = cleanEnv) {
  const result = spawnSync(program, args, { env, encoding: 'utf8', maxBuffer: 4_000_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${args[0]} failed (exit ${result.status ?? result.signal}). ${result.stderr.trim()}`);
  return result.stdout.trim();
}

async function currentAssets() {
  async function get(path: string, max: number) {
    const response = await fetch(new URL(path, site), {
      redirect: 'error', cache: 'no-store', credentials: 'omit', headers: { 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Cannot capture current production ${path} (HTTP ${response.status}).`);
    return Buffer.from(await readResponseBytes(response, max, `Current production ${path}`));
  }
  const [html, rawManifest, health] = await Promise.all([get('/', 128_000), get(manifestPath, maxManifestBytes), get(healthPath, 1_000_000)]);
  const manifest = manifestSchema.parse(JSON.parse(rawManifest.toString('utf8')));
  const { application, catalogueId } = parsePublishedReceipt(health);
  if (!catalogueId || manifest.catalogueId !== catalogueId) throw new Error('The current production receipt did not match an applied catalogue.');
  const path = `/pricing/${catalogueFilename(catalogueId)}`;
  const [catalogue, entry] = await Promise.all([
    get(path, maxCatalogueBytes),
    Promise.all([...documentAssetPaths(html.toString('utf8')).assets].map(async asset => [asset, await get(asset, 6_000_000)] as const)),
  ]);
  if (createHash('sha256').update(catalogue).digest('hex') !== catalogueId) {
    throw new Error('Production rollback target catalogue hash could not be validated.');
  }
  const assets = new Map([['/', html], [manifestPath, rawManifest], [healthPath, health], [path, catalogue], ...entry]);
  await verifyPublicSecurity(site, { policy: 'public', expectedCatalogueId: catalogueId, expectedApplication: application });
  return { application, catalogueId, assets };
}

async function builtAssets(previous: ActiveWorker, previousAssets: Awaited<ReturnType<typeof currentAssets>>, application: string) {
  const readAsset = (path: string) => readFile(new URL(`../dist${path}`, import.meta.url), 'utf8');
  const raw = await readAsset(manifestPath);
  const manifest = manifestSchema.parse(JSON.parse(raw));
  const catalogueId = manifest.catalogueId;
  if (!catalogueId) throw new Error('Production deployment requires a validated catalogue.');
  const html = await readAsset('/index.html');
  const assets = new Map<string, AssetContents>([['/', html], [manifestPath, raw]]);
  for (const path of documentAssetPaths(html).assets) assets.set(path, await readFile(new URL(`../dist${path}`, import.meta.url)));
  const cataloguePath = `/pricing/${catalogueFilename(catalogueId)}`;
  const catalogue = await readAsset(cataloguePath);
  const checksum = (source: string) => createHash('sha256').update(source).digest('hex');
  if (checksum(catalogue) !== catalogueId) throw new Error('Built pricing asset has an invalid checksum.');
  assets.set(cataloguePath, catalogue);
  const payload = catalogueSchema.parse(JSON.parse(catalogue));
  const coverage = catalogueCoverage({ manifest, records: payload.records, inventory: payload.inventory });
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
  return { assets, catalogueId };
}

function assertUpstream(application: string) {
  const remote = command('git', ['ls-remote', '--exit-code', 'origin', 'refs/heads/main']).split(/\s+/)[0];
  if (remote !== application) throw new Error('main advanced during this run. The checked candidate cannot supersede it.');
}

function liveBrowser(catalogueId: string) {
  const browser = spawnSync('npm', ['run', 'test:e2e', '--', '--retries=1', 'tests/e2e/field-help.spec.ts',
    'tests/e2e/retail-first.spec.ts', 'tests/e2e/enterprise.spec.ts', 'tests/e2e/guided.spec.ts', 'tests/e2e/technical-docs.spec.ts',
    'tests/e2e/documentation-links.spec.ts', 'tests/e2e/estimation.spec.ts', 'tests/e2e/value-review.spec.ts',
    'tests/e2e/security.spec.ts', 'tests/e2e/brand.spec.ts', 'tests/e2e/studio.spec.ts'], {
    stdio: 'inherit', env: { ...cleanEnv, STUDIO_TEST_URL: site, STUDIO_EXPECTED_CATALOGUE_ID: catalogueId, STUDIO_CHECK_RELEASE_HEALTH: '1', STUDIO_CHECK_PUBLISHED_CATALOGUE: '1' },
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

async function waitForPublishedAssets(assets: ReadonlyMap<string, AssetContents>, release: 'candidate' | 'rollback target') {
  for (let attempt = 1; ; attempt++) {
    try {
      await verifyPublishedAssets(assets);
      report('notice', `Application and pricing assets match the ${release} at ${site}`);
      return;
    } catch (error) {
      if (attempt === 13) {
        throw new Error(`Post-deploy verification failed for ${site}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
      await delay(5_000);
    }
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    if (process.argv.length !== 2) throw new Error('Production deploy uses the checked-in Worker target and catalogue.');
    const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
    const configText = await readFile(config, 'utf8');
    const name = await verifyWorker(configText, account, token);
    const legacyRetired = parseConfigFileTextToJson(config, configText).config?.workers_dev === false;
    const application = command('git', ['rev-parse', 'HEAD']);
    if (process.env.GITHUB_ACTIONS === 'true') assertUpstream(application);
    const worker = workerReleases(account!, token!, name);
    const previous = await worker.current();
    const previousAssets = await currentAssets();
    if ((await worker.current()).deployment !== previous.deployment) throw new Error('The active Worker changed while capturing the rollback target.');
    const { assets, catalogueId } = await builtAssets(previous, previousAssets, application);
    report('notice', `Verified enabled Custom Domain ${productionHostname} on the existing Worker ${name} with rollback target ${previous.version}`);
    await promoteWorker({
      previous,
      upload() {
        if (process.env.GITHUB_ACTIONS === 'true') assertUpstream(application);
        const result = spawnSync(process.execPath, [wrangler, 'deploy', '--config', config, '--name', name], { encoding: 'utf8', maxBuffer: 4_000_000,
          env: { ...cleanEnv, CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } });
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
        await waitForPublishedAssets(assets, 'candidate');
        await reportSecurityVerification(await verifyPublicSecurity(site, {
          policy: 'public', expectedCatalogueId: catalogueId, expectedApplication: application,
        }));
        liveBrowser(catalogueId);
        if (legacyRetired) {
          await worker.confirmPreviewDisabled();
          const legacy = await verifyRetiredPreview();
          report('notice', `Cloudflare confirmed workers.dev and its Preview URLs are disabled. Legacy delivery returned HTTP ${legacy.httpStatus} and HTTPS ${legacy.httpsStatus}.`);
        }
      },
      persist() { if (process.env.GITHUB_ACTIONS === 'true') assertUpstream(application); },
      restore: worker.restore,
      async verifyRestore() {
        await waitForPublishedAssets(previousAssets.assets, 'rollback target');
        await reportSecurityVerification(await verifyPublicSecurity(site, {
          policy: 'public', expectedCatalogueId: previousAssets.catalogueId, expectedApplication: previousAssets.application,
        }));
      },
    });
    report('notice', `Production browser reconciliation passed for application ${application}, catalogue ${catalogueId} at ${site}`);
  } catch (error) {
    report('error', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

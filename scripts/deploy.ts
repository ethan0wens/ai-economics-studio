import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseConfigFileTextToJson } from 'typescript';
import { catalogueFilename, catalogueSchema, manifestSchema, maxCatalogueBytes, maxManifestBytes } from '../src/catalogue';
import { catalogueCoverage } from '../src/coverage';
import { maintenanceHealthSchema, releaseHealthSchema } from '../src/catalogue-health';
import { assetResponseSummary, documentAssetPaths, missingBundleProbe, parsePublishedReceipt, productionHostname, productionOrigin, reportSecurityVerification, verifyAssetMime, verifyPublicSecurity, verifyRetiredPreview } from './security-http';
import { buildAsset, listStaticFiles } from './static-site';
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
const noticesPath = '/third-party-notices.txt';

type ReleaseFiles = ReadonlyMap<string, AssetContents>;
type DeliveryTarget = { application: string; catalogueId: string; assets: ReleaseFiles };

export class EdgeReleasePending extends Error {}

function previousBytes(files: ReleaseFiles | undefined, path: string) {
  const value = files?.get(path);
  return value === undefined ? undefined : Buffer.from(value);
}

function bundlePath(path: string) {
  return path.startsWith('/') && (buildAsset.test(path.slice(1)) ||
    /^\/assets\/[a-z0-9][a-z0-9._-]*\.(?:js|css)$/i.test(path));
}

async function verifyResponse(path: string, response: Response, contents: AssetContents, expected: ReleaseFiles, preceding?: ReleaseFiles) {
  const bytes = Buffer.from(contents);
  const prior = previousBytes(preceding, path);
  const previousShell = previousBytes(preceding, '/');
  const isHtml = /^text\/html\b/i.test(response.headers.get('content-type') ?? '');
  const max = path === healthPath ? 1_000_000 : Math.max(bytes.length, prior?.length ?? 0, isHtml ? 128_000 : 0) + 256;
  const observed = response.status === 200 && await readResponseBytes(response, max, `Published ${path}`)
    .catch(() => false as const);
  if (response.status !== 200) await response.body?.cancel();
  const summary = assetResponseSummary(response);
  const digest = (value: Uint8Array) => createHash('sha256').update(value).digest('hex').slice(0, 12);
  if (observed && bytes.equals(observed)) {
    // A matching body with the wrong MIME is an invalid candidate response, even during a rollout.
    verifyAssetMime(path, response, observed, previousBytes(expected, '/'));
    return Buffer.from(observed);
  }
  const rolloutFile = bundlePath(path) || path === noticesPath || /^\/pricing\/catalogue-[a-f0-9]{64}\.json$/.test(path);
  if (observed && (prior?.equals(observed) || rolloutFile && !prior && isHtml && previousShell?.equals(observed))) {
    throw new EdgeReleasePending(`The preceding release was served for ${path} (${summary}, SHA-256 ${digest(observed)}).`);
  }
  if (preceding && !prior && response.status === 404 && rolloutFile) {
    throw new EdgeReleasePending(`The current edge has not exposed the new file ${path} (${summary}).`);
  }
  if (response.status === 200) verifyAssetMime(path, response, observed || undefined, previousBytes(expected, '/'));
  const detail = observed ? `; expected SHA-256 ${digest(bytes)}, received ${digest(observed)}` : '';
  throw new Error(`Live ${path} does not match the build (${summary}${detail}).`);
}

export async function verifyPublishedAssets(expected: ReleaseFiles, request = fetch, preceding?: ReleaseFiles, identity = true) {
  const checks = await Promise.allSettled([...expected].map(async ([path, contents]) => {
    const response = await request(new URL(path, site), {
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Cache-Control': 'no-cache', ...(identity ? { 'Accept-Encoding': 'identity' } : {}) },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    await verifyResponse(path, response, contents, expected, preceding);
  }));
  const failed = checks.filter(result => result.status === 'rejected');
  if (failed.length) {
    const reason = failed.map(({ reason }) => reason instanceof Error ? reason.message : String(reason)).join(' ');
    throw failed.every(({ reason }) => reason instanceof EdgeReleasePending) ? new EdgeReleasePending(reason) : new Error(reason);
  }
}

export async function verifyReleaseDelivery(target: DeliveryTarget, preceding: ReleaseFiles, identity: boolean, request = fetch) {
  const checked = new Set<string>();
  const observation = await verifyPublicSecurity(site, {
    policy: 'public', expectedCatalogueId: target.catalogueId, expectedApplication: target.application,
  }, async (input, init) => {
    const url = new URL(String(input));
    if (url.origin !== site) return request(input, init);
    const path = url.pathname === '/documentation' ? '/' : url.pathname;
    const headers = new Headers(init?.headers);
    if (identity) headers.set('Accept-Encoding', 'identity');
    const response = await request(input, { ...init, headers });
    const expected = target.assets.get(path);
    if (expected !== undefined) {
      const bytes = await verifyResponse(path, response, expected, target.assets, preceding);
      checked.add(path);
      return new Response(bytes, { status: response.status, headers: response.headers });
    }
    if (path === missingBundleProbe && response.status === 200 && /^text\/html\b/i.test(response.headers.get('content-type') ?? '')) {
      const bytes = await readResponseBytes(response, 128_000, 'Missing-bundle HTML');
      if (previousBytes(preceding, '/')?.equals(bytes)) {
        throw new EdgeReleasePending(`The preceding application shell was served for the missing bundle probe (${assetResponseSummary(response)}).`);
      }
      return new Response(Buffer.from(bytes), { status: response.status, headers: response.headers });
    }
    return response;
  });
  const outstanding = new Map([...target.assets].filter(([path]) => !checked.has(path)));
  await verifyPublishedAssets(outstanding, request, preceding, identity);
  return observation;
}

export async function waitForStableDelivery<T>(check: (identity: boolean) => Promise<T>, options: {
  beforeAttempt?: () => Promise<void>; observePending?: (message: string) => void; pause?: () => Promise<void>;
} = {}) {
  let identityVerified = false;
  let pending: EdgeReleasePending | undefined;
  for (let attempt = 1; attempt <= 13; attempt++) {
    await options.beforeAttempt?.();
    try {
      const result = await check(!identityVerified);
      if (identityVerified) return result;
      identityVerified = true;
      pending = undefined;
    } catch (error) {
      if (!(error instanceof EdgeReleasePending)) throw error;
      if (!pending) options.observePending?.(error.message);
      pending = error;
      identityVerified = false;
    }
    if (attempt < 13) await (options.pause?.() ?? delay(5_000));
  }
  throw new Error(`Public delivery did not converge at ${site} within 13 checks.${pending ? ' ' + pending.message : ''}`, { cause: pending });
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
      redirect: 'error', cache: 'no-store', credentials: 'omit',
      headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Cannot capture current production ${path} (HTTP ${response.status}).`);
    const bytes = await readResponseBytes(response, max, `Current production ${path}`);
    verifyAssetMime(path, response, bytes);
    return Buffer.from(bytes);
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
  assets.set(noticesPath, await readAsset(noticesPath));
  const bundles = (await listStaticFiles('dist'))
    .filter(path => buildAsset.test(path) && /\.(?:js|css)$/.test(path)).map(path => '/' + path);
  for (const path of new Set([...documentAssetPaths(html).assets, ...bundles])) {
    assets.set(path, await readFile(new URL(`../dist${path}`, import.meta.url)));
  }
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

async function verifyStableRelease(target: DeliveryTarget, preceding: ReleaseFiles, version: ActiveWorker,
  activeWorker: () => Promise<ActiveWorker>, label: string) {
  const observation = await waitForStableDelivery(identity => verifyReleaseDelivery(target, preceding, identity), {
    async beforeAttempt() {
      const active = await activeWorker();
      if (active.deployment !== version.deployment || active.version !== version.version) {
        throw new Error(`The Worker deployment changed while verifying the ${label}.`);
      }
    },
    observePending: message => report('notice', `Public delivery is still converging for the ${label}. ${message}`),
  });
  report('notice', `MIME, exact bytes and security checks match the ${label} in consecutive identity and default fetches at ${site}`);
  await reportSecurityVerification(observation);
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
        report('notice', `Wrangler returned candidate Worker version ${version}.`);
        return version;
      },
      current: worker.current,
      async verify(candidate) {
        await verifyStableRelease({ application, catalogueId, assets }, previousAssets.assets, candidate, worker.current, 'candidate');
        liveBrowser(catalogueId);
        if (legacyRetired) {
          await worker.confirmPreviewDisabled();
          const legacy = await verifyRetiredPreview();
          report('notice', `Cloudflare confirmed workers.dev and its Preview URLs are disabled. Legacy delivery returned HTTP ${legacy.httpStatus} and HTTPS ${legacy.httpsStatus}.`);
        }
      },
      persist() { if (process.env.GITHUB_ACTIONS === 'true') assertUpstream(application); },
      restore: worker.restore,
      async verifyRestore(restored) {
        await verifyStableRelease(previousAssets, assets, restored, worker.current, 'rollback target');
      },
    });
    report('notice', `Production browser reconciliation passed for application ${application}, catalogue ${catalogueId} at ${site}`);
  } catch (error) {
    report('error', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

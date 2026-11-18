import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseConfigFileTextToJson } from 'typescript';
import { catalogueFilename, manifestSchema } from '../src/catalogue';

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

async function builtAssets() {
  const manifestPath = '/pricing/manifest.json';
  const readAsset = (path: string) => readFile(new URL(`../dist${path}`, import.meta.url), 'utf8');
  const raw = await readAsset(manifestPath);
  const manifest = manifestSchema.parse(JSON.parse(raw));
  const assets = new Map([['/', await readAsset('/index.html')], [manifestPath, raw]]);
  if (manifest.catalogueId) {
    const path = `/pricing/${catalogueFilename(manifest.catalogueId)}`;
    assets.set(path, await readAsset(path));
  }
  return assets;
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
    if (process.argv.length !== 2) throw new Error('Production deploy uses the checked-in target. Use Wrangler directly for a dry run.');
    const name = await verifyWorker(await readFile(config, 'utf8'), process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN);
    const assets = await builtAssets();
    report('notice', `Verified existing Worker ${site}`);
    const deploy = spawnSync(process.execPath, [wrangler, 'deploy', '--config', config, '--name', name], { stdio: 'inherit' });
    if (deploy.error) throw deploy.error;
    if (deploy.status !== 0) throw new Error(`Wrangler failed after verifying the target Worker (exit ${deploy.status ?? deploy.signal ?? 'unknown'}). See the deploy step log for the Cloudflare response.`);
    await waitForPublishedAssets(assets);
  } catch (error) {
    report('error', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

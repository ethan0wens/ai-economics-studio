import { createSign } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { assertPricingIndex, assertPricingPaths, git } from './pricing-candidate';

const repository = 'ethan0wens/ai-economics-studio';
const branch = 'automation/verified-pricing';
const branchRef = `refs/heads/${branch}`;
const checkedBaseRef = 'refs/heads/main';
const expectedCheck = 'checks';
const githubActionsAppId = 15368;
const sha = /^[a-f0-9]{40}$/;
const retryable = [408, 429, 500, 502, 503, 504];

type Rules = Array<{ type: string; parameters?: {
  required_approving_review_count?: number; require_code_owner_review?: boolean;
  require_last_push_approval?: boolean; require_extra_approval_for_unattributed_changes?: boolean;
  strict_required_status_checks_policy?: boolean; required_status_checks?: Array<{ context: string; integration_id?: number }>;
} }>;
type Pull = { number: number; state: string; merged?: boolean; merge_commit_sha?: string; user: { login: string };
  base: { ref: string }; head: { ref: string; sha: string; repo: { full_name: string } | null } };
type Runs = { workflow_runs: Array<{ id: number; head_sha: string; status: string; conclusion: string | null }> };
type Jobs = { jobs: Array<{ name: string; status: string; conclusion: string | null }> };

export class GitHubFailure extends Error {
  constructor(public status: number, method: string, route: string) {
    super(`GitHub returned HTTP ${status} for ${method} ${route}.`);
  }
}

export function github(request = fetch, sleep: (milliseconds: number) => Promise<void> = pause) {
  return async function api<T>(route: string, token: string, method = 'GET', body?: object): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        response = await request(`https://api.github.com${route}`, { method, redirect: 'error', signal: AbortSignal.timeout(15_000),
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
          body: body && JSON.stringify(body) });
      } catch (error) {
        if (attempt === 3 || method !== 'GET') throw new Error(`GitHub request failed for ${method} ${route}.`, { cause: error });
      }
      if (response?.ok) return response.status === 204 ? undefined as T : await response.json() as T;
      const limited = response?.status === 403 && (response.headers.has('retry-after') || response.headers.get('x-ratelimit-remaining') === '0');
      if (response && (method !== 'GET' || attempt === 3 || (!limited && !retryable.includes(response.status)))) {
        throw new GitHubFailure(response.status, method, route);
      }
      const retryAfter = Number(response?.headers.get('retry-after'));
      const reset = Number(response?.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
      const backoff = retryAfter > 0 ? retryAfter * 1000 : limited && reset > 0 ? reset : 1000 * 2 ** attempt;
      await sleep(Math.min(backoff, 30_000));
    }
  };
}

export function assertProtectedMain(rules: Rules) {
  const reviews = rules.filter(rule => rule.type === 'pull_request');
  const statuses = rules.filter(rule => rule.type === 'required_status_checks');
  if (!reviews.length || reviews.some(({ parameters: p }) => !p || p.required_approving_review_count !== 0 ||
    p.require_code_owner_review || p.require_last_push_approval || p.require_extra_approval_for_unattributed_changes) ||
    !statuses.some(({ parameters: p }) => p?.strict_required_status_checks_policy && p.required_status_checks?.some(
      check => check.context === expectedCheck && check.integration_id === githubActionsAppId)) ||
    ['non_fast_forward', 'deletion', 'required_linear_history'].some(type => !rules.some(rule => rule.type === type))) {
    throw new Error('Protection Main must enforce a PR, linear history, deletion and force-push protection, and the current GitHub Actions checks context with zero required reviews.');
  }
}

export function requiredJob(jobs: Jobs['jobs']) {
  const job = jobs.find(item => item.name === expectedCheck);
  if (!job || job.status !== 'completed') return 'pending';
  if (job.conclusion === 'success') return 'passed';
  if (['cancelled', 'timed_out', 'startup_failure', 'stale'].includes(job.conclusion ?? '')) return 'retryable';
  return 'failed';
}

export function assertOwnedPull(pull: Pull, bot: string, expectedHead?: string) {
  if (pull.user.login !== bot || pull.base.ref !== 'main' || pull.head.ref !== branch ||
    pull.head.repo?.full_name !== repository || (expectedHead !== undefined && pull.head.sha !== expectedHead)) {
    throw new Error('Pricing pull request identity, repository, branch or revision was unexpected.');
  }
}

const publisherPermissions = { contents: 'write', pull_requests: 'write', actions: 'read' } as const;
type AppToken = { token: string; permissions?: Record<string, string> };

async function appInstallation(api: ReturnType<typeof github>) {
  const { STUDIO_PRICING_APP_ID: id, STUDIO_PRICING_APP_PRIVATE_KEY: key } = process.env;
  if (!id || !/^\d+$/.test(id) || !key) throw new Error('Configure STUDIO_PRICING_APP_ID and STUDIO_PRICING_APP_PRIVATE_KEY for the pricing-publisher environment.');
  const jwtPart = (data: object) => Buffer.from(JSON.stringify(data)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = jwtPart({ alg: 'RS256', typ: 'JWT' }) + '.' + jwtPart({ iss: id, iat: now - 30, exp: now + 300 });
  let jwt: string;
  try { jwt = unsigned + '.' + createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url'); }
  catch (error) { throw new Error('Could not sign with the configured pricing App private key.', { cause: error }); }
  const app = await api<{ slug: string }>('/app', jwt);
  if (!/^[a-z0-9-]+$/i.test(app.slug)) throw new Error('Could not identify the pricing GitHub App.');
  const installation = await api<{ id: number; repository_selection?: string; permissions?: Record<string, string> }>(
    `/repos/${repository}/installation`, jwt);
  if (!Number.isSafeInteger(installation.id) || installation.id <= 0) throw new Error('The pricing App is not installed on this repository.');
  return {
    installation, bot: app.slug + '[bot]',
    async mint(permissions: Record<string, string>, scoped = true) {
      const grant = await api<AppToken>(`/app/installations/${installation.id}/access_tokens`, jwt, 'POST',
        { ...(scoped && { repositories: [repository.split('/')[1]] }), permissions });
      if (!grant.token || /\s/.test(grant.token)) throw new Error('The pricing App did not issue a scoped installation token.');
      return grant;
    },
  };
}

async function revokeAppToken(api: ReturnType<typeof github>, token: string) {
  try { await api('/installation/token', token, 'DELETE'); }
  catch { console.warn('The short-lived GitHub App token could not be revoked and will expire automatically.'); }
}

function assertPermissions(actual: Record<string, string> | undefined, expected: Record<string, string>) {
  const allowed: Record<string, string> = { ...expected, metadata: 'read' };
  if (!actual || Object.entries(expected).some(([key, value]) => actual[key] !== value) ||
    Object.entries(actual).some(([key, value]) => !Object.hasOwn(allowed, key) || allowed[key] !== value)) {
    throw new Error('GitHub App permissions do not match the checked pricing publisher permissions.');
  }
}

export async function withVerifiedPricingApp<T>(operation: (app: { api: ReturnType<typeof github>; token: string; bot: string }) => Promise<T>) {
  if (process.env.GITHUB_REPOSITORY !== repository || process.env.GITHUB_REF !== checkedBaseRef ||
    !sha.test(process.env.GITHUB_SHA ?? '') || git(['rev-parse', 'HEAD']) !== process.env.GITHUB_SHA) {
    throw new Error('Pricing App verification requires the exact main workflow checkout for this repository.');
  }
  const api = github();
  const { installation, bot, mint } = await appInstallation(api);
  if (installation.repository_selection !== 'selected') throw new Error('The pricing App must be installed on selected repositories only.');
  assertPermissions(installation.permissions, publisherPermissions);

  // Omit the repositories constraint to check the whole installation with a metadata-only token.
  const metadata = await mint({ metadata: 'read' }, false);
  try {
    assertPermissions(metadata.permissions, { metadata: 'read' });
    const installed = await api<{ total_count: number; repositories: Array<{ full_name: string }> }>(
      '/installation/repositories?per_page=2', metadata.token);
    if (installed.total_count !== 1 || installed.repositories.length !== 1 || installed.repositories[0]?.full_name !== repository) {
      throw new Error('The pricing App installation must contain only the Studio repository.');
    }
  } finally {
    await revokeAppToken(api, metadata.token);
  }

  const grant = await mint(publisherPermissions);
  try {
    assertPermissions(grant.permissions, publisherPermissions);
    const repo = `/repos/${repository}`;
    const [main, rules, pulls, workflow] = await Promise.all([
      api<{ object: { sha: string } }>(`${repo}/git/ref/heads/main`, grant.token),
      api<Rules>(`${repo}/rules/branches/main`, grant.token),
      api<Pull[]>(`${repo}/pulls?state=open&base=main&per_page=1`, grant.token),
      api<{ path: string; state: string }>(`${repo}/actions/workflows/ci.yml`, grant.token),
    ]);
    if (main.object.sha !== process.env.GITHUB_SHA || !Array.isArray(pulls) || workflow.path !== '.github/workflows/ci.yml' ||
      workflow.state !== 'active') throw new Error('The App did not verify the current main ref, pull requests and active PR checks workflow.');
    assertProtectedMain(rules);
    return await operation({ api, token: grant.token, bot });
  } finally {
    await revokeAppToken(api, grant.token);
  }
}

export async function smokePricingApp() {
  await withVerifiedPricingApp(async ({ bot }) => {
    const message = `Verified ${bot} on ${repository} only, with Contents write, Pull requests write and Actions read. The current protected main ref and required workflow APIs are accessible.`;
    console.log(process.env.GITHUB_ACTIONS === 'true' ? `::notice title=GitHub pricing App authentication::${message}` : message);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, message + '\n');
  });
}

class Superseded extends Error {}

export async function publishPricing(noChange: boolean, wait = () => pause(20_000)) {
  if (process.env.GITHUB_REPOSITORY !== repository || process.env.GITHUB_REF !== checkedBaseRef) {
    throw new Error('Pricing publication runs only from this repository’s checked-out main workflow.');
  }
  const expected = git(['rev-parse', 'HEAD']);
  if (!sha.test(expected)) throw new Error('Could not identify the checked candidate base.');
  const paths = git(['diff', '--cached', '--name-only', '-z', expected]).split('\0').filter(Boolean);
  if (noChange ? paths.length : !paths.length) throw new Error('Pricing changes did not match the validated preparation outcome.');
  if (paths.length) assertPricingIndex(paths);

  const api = github();
  const { mint, bot } = await appInstallation(api);
  const { token } = await mint(publisherPermissions);
  const repo = `/repos/${repository}`;
  const remote = `https://github.com/${repository}.git`;
  const gitEnv = { ...process.env, STUDIO_PRICING_APP_PRIVATE_KEY: undefined, GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: 'AUTHORIZATION: basic ' + Buffer.from('x-access-token:' + token).toString('base64'),
    GIT_CONFIG_KEY_1: 'http.followRedirects', GIT_CONFIG_VALUE_1: 'false' };
  function authenticatedGit(args: string[]) {
    try { return git(['-c', 'credential.helper=', ...args], { env: gitEnv }); }
    catch { throw new Error(`Git could not ${args[0]} the scoped pricing branch.`); }
  }
  async function freshMain() {
    const current = await api<{ object: { sha: string } }>(`${repo}/git/ref/heads/main`, token);
    if (current.object.sha !== expected) throw new Superseded('main advanced. A fresh generation will run automatically at the next preparation opportunity.');
  }
  function remoteHead() {
    const remoteSha = authenticatedGit(['ls-remote', '--heads', remote, branchRef]).split(/\s/)[0];
    if (remoteSha && !sha.test(remoteSha)) throw new Error('Unexpected remote pricing branch revision.');
    return remoteSha;
  }
  async function findOpen() {
    const open = await api<Pull[]>(`${repo}/pulls?state=open&base=main&head=${encodeURIComponent(repository.split('/')[0] + ':' + branch)}`, token);
    if (open.length > 1) throw new Error('Multiple open pricing pull requests require reconciliation.');
    if (open[0]) assertOwnedPull(open[0], bot);
    return open[0];
  }
  function makeCandidate(tree: string, parents: string[]) {
    return git(['-c', `user.name=${bot}`, '-c', 'user.email=pricing@users.noreply.github.com',
      'commit-tree', tree, ...parents.flatMap(parent => ['-p', parent]), '-m', 'Publish verified Microsoft pricing and evidence']);
  }

  try {
    await freshMain();
    const existing = await findOpen();
    const previous = remoteHead();
    if (existing && existing.head.sha !== previous) throw new Error('The pricing branch changed while reviewing the pull request.');
    if (noChange) {
      if (existing) {
        await freshMain();
        if (remoteHead() !== previous) throw new Error('The pending pricing branch changed during cancellation.');
        await api(`${repo}/pulls/${existing.number}`, token, 'PATCH', { state: 'closed' });
      }
      console.log('No material catalogue changes. No commit or deployment is needed.');
      return;
    }

    assertProtectedMain(await api<Rules>(`${repo}/rules/branches/main`, token));
    if (previous) {
      authenticatedGit(['fetch', '--no-tags', remote, branchRef]);
      if (git(['rev-parse', 'FETCH_HEAD']) !== previous) throw new Error('The pricing branch changed during fetch.');
      const fork = git(['merge-base', previous, expected]);
      assertPricingPaths(git(['diff', '--name-only', '-z', fork, previous]).split('\0').filter(Boolean));
    }
    const tree = git(['write-tree']);
    let head = previous;
    if (!previous || git(['rev-parse', `${previous}^{tree}`]) !== tree || git(['merge-base', expected, previous]) !== expected) {
      const parents = !previous ? [expected] : [previous, ...(git(['merge-base', expected, previous]) === expected ? [] : [expected])];
      head = makeCandidate(tree, parents);
      await freshMain();
      authenticatedGit(['push', remote, `${head}:${branchRef}`]);
    }

    let pull = existing;
    if (!pull) {
      try {
        pull = await api<Pull>(`${repo}/pulls`, token, 'POST', { head: branch, base: 'main',
          title: 'Publish verified Microsoft pricing and evidence',
          body: 'Generated from official Microsoft sources. The publisher checks the file allowlist, staging validation and the required GitHub Actions check before the protected squash merge.' });
      } catch (error) {
        pull = await findOpen();
        if (!pull) throw error;
      }
    }
    const number = pull.number;
    if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Could not identify the pricing pull request.');
    console.log(`Pricing PR https://github.com/${repository}/pull/${number} · candidate ${head}`);
    let checkRetried = false;
    let mergeRetries = 0;
    for (let attempt = 0; attempt <= 40; attempt++) {
      await freshMain();
      const current = await api<Pull>(`${repo}/pulls/${number}`, token);
      assertOwnedPull(current, bot, head);
      if (current.state !== 'open') throw new Error('The pricing pull request closed while checks were pending.');
      const filter = new URLSearchParams({ event: 'pull_request', head_sha: head, branch, per_page: '5' });
      const latest = (await api<Runs>(`${repo}/actions/workflows/ci.yml/runs?${filter}`, token)).workflow_runs[0];
      let restart = !latest && attempt >= 10;
      if (latest?.head_sha === head && latest.status === 'completed') {
        const jobs = await api<Jobs>(`${repo}/actions/runs/${latest.id}/jobs?filter=latest`, token);
        const result = requiredJob(jobs.jobs);
        if (result === 'failed' || latest.conclusion === 'failure' && result !== 'retryable') {
          throw new Error('The required PR workflow failed. Publication was withheld.');
        }
        restart = result === 'retryable' || ['cancelled', 'timed_out', 'startup_failure', 'stale'].includes(latest.conclusion ?? '');
        if (result === 'passed' && latest.conclusion === 'success') {
          await freshMain();
          assertProtectedMain(await api<Rules>(`${repo}/rules/branches/main`, token));
          try {
            const result = await api<{ merged: boolean; sha: string }>(`${repo}/pulls/${number}/merge`, token, 'PUT',
              { sha: head, merge_method: 'squash', commit_title: 'Publish verified Microsoft pricing and evidence' });
            if (!result.merged || !sha.test(result.sha)) throw new Error('GitHub did not confirm the protected pricing merge.');
            if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
              `\nPricing PR #${number} merged as \`${result.sha}\`. The main-branch deploy verifies production separately.\n`);
            console.log(`Pricing PR #${number} merged as ${result.sha}.`);
            return;
          } catch (error) {
            const observed = await api<Pull>(`${repo}/pulls/${number}`, token);
            assertOwnedPull(observed, bot, head);
            if (observed.merged && observed.merge_commit_sha && sha.test(observed.merge_commit_sha)) {
              console.log(`GitHub confirmed pricing PR #${number} was merged as ${observed.merge_commit_sha}.`);
              return;
            }
            if (!(error instanceof GitHubFailure) || !retryable.includes(error.status) || ++mergeRetries > 2) throw error;
          }
        }
      }
      if (!checkRetried && restart) {
        checkRetried = true;
        const retry = makeCandidate(tree, [head]);
        await freshMain();
        authenticatedGit(['push', remote, `${retry}:${branchRef}`]);
        head = retry;
        console.log(`Requested one fresh PR check run on the same validated tree at ${head}.`);
      }
      if (attempt < 40) await wait();
    }
    throw new Error('Required checks did not pass within the publication window. A later scheduled refresh can safely rebuild the candidate.');
  } catch (error) {
    if (!(error instanceof Superseded)) throw error;
    console.log(error.message);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, error.message + '\n');
  } finally {
    await revokeAppToken(api, token);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    if (process.argv[2] === '--verify-app') await smokePricingApp();
    else await publishPricing(process.argv[2] === '--no-change');
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

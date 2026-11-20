import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { git } from '../scripts/pricing-candidate';
import { publishPricing } from '../scripts/publish-pricing';

vi.mock('../scripts/pricing-candidate', async original => ({
  ...await original<typeof import('../scripts/pricing-candidate')>(),
  git: vi.fn(),
}));

const base = 'a'.repeat(40);
const newer = 'b'.repeat(40);
const candidate = 'c'.repeat(40);
const retry = 'd'.repeat(40);
const merged = 'e'.repeat(40);
const repo = 'ethan0wens/ai-economics-studio';
const bot = 'fictional-pricing[bot]';
const branch = 'automation/verified-pricing';
const manifest = 'public/pricing/manifest.json';
const signingKey = generateKeyPairSync('rsa', { modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey;
const effectiveRules = [
  { type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'required_linear_history' },
  { type: 'pull_request', parameters: { required_approving_review_count: 0 } },
  { type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true,
    required_status_checks: [{ context: 'checks', integration_id: 15368 }] } },
];

type Options = { open?: boolean; unchanged?: boolean; stale?: boolean; failed?: boolean; missingChecks?: boolean; mergeRejected?: boolean };

function rehearsal(options: Options = {}) {
  let head = options.open ? candidate : '';
  let open = options.open ?? false;
  let commits = 0;
  const events: string[] = [];
  const wait = vi.fn(async () => {});
  const pull = () => ({ number: 42, state: open ? 'open' : 'closed', user: { login: bot }, base: { ref: 'main' },
    head: { ref: branch, sha: head, repo: { full_name: repo } } });
  vi.mocked(git).mockImplementation(args => {
    if (args[0] === 'rev-parse') return args[1] === 'HEAD' ? base : args[1] === 'FETCH_HEAD' ? head : 'fixture-tree';
    if (args[0] === 'diff') return args.includes('--cached') && !options.unchanged ? manifest + '\0' : '';
    if (args[0] === 'ls-files') return `100644 ${base} 0\t${manifest}\0`;
    if (args[0] === 'merge-base') return base;
    if (args[0] === 'write-tree') return 'fixture-tree';
    if (args.includes('commit-tree')) return ++commits === 1 ? candidate : retry;
    if (args.includes('ls-remote')) return head ? `${head}\trefs/heads/${branch}` : '';
    if (args.includes('fetch')) return '';
    if (args.includes('push')) {
      const [revision, ref] = args.at(-1)!.split(':');
      expect(ref).toBe('refs/heads/' + branch);
      expect(args).not.toContain('--force');
      head = revision;
      events.push('push:' + head);
      return '';
    }
    throw new Error('Unexpected Git fixture command.');
  });

  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/repos/' + repo, '');
    const method = init?.method;
    expect(url.origin).toBe('https://api.github.com');
    if (path === '/app') return Response.json({ slug: 'fictional-pricing' });
    if (path === '/installation' && method === 'GET') return Response.json({ id: 2 });
    if (path === '/app/installations/2/access_tokens') {
      expect(JSON.parse(String(init?.body))).toEqual({ repositories: ['ai-economics-studio'],
        permissions: { contents: 'write', pull_requests: 'write', actions: 'read' } });
      return Response.json({ token: 'fixture-installation-credential' });
    }
    if (path === '/installation/token' && method === 'DELETE') {
      events.push('revoke');
      return new Response(null, { status: 204 });
    }
    if (path === '/git/ref/heads/main') return Response.json({ object: { sha: options.stale ? newer : base } });
    if (path === '/rules/branches/main') return Response.json(effectiveRules);
    if (path === '/pulls' && method === 'GET') return Response.json(open ? [pull()] : []);
    if (path === '/pulls' && method === 'POST') {
      open = true;
      events.push('open');
      return Response.json(pull());
    }
    if (path === '/pulls/42' && method === 'GET') return Response.json(pull());
    if (path === '/pulls/42' && method === 'PATCH') {
      expect(JSON.parse(String(init?.body))).toEqual({ state: 'closed' });
      events.push('close');
      open = false;
      return Response.json(pull());
    }
    if (path === '/actions/workflows/ci.yml/runs') {
      expect(url.searchParams.get('head_sha')).toBe(head);
      return Response.json({ workflow_runs: options.missingChecks ? [] : [{
        id: 9, head_sha: head, status: 'completed', conclusion: options.failed ? 'failure' : 'success',
      }] });
    }
    if (path === '/actions/runs/9/jobs') {
      events.push('checks');
      return Response.json({ jobs: [{ name: 'checks', status: 'completed', conclusion: options.failed ? 'failure' : 'success' }] });
    }
    if (path === '/pulls/42/merge') {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ sha: head, merge_method: 'squash' });
      expect(events.at(-1)).toBe('checks');
      events.push('merge');
      return options.mergeRejected ? new Response(null, { status: 405 }) : Response.json({ merged: true, sha: merged });
    }
    return new Response(null, { status: 404 });
  }));
  return { events, wait };
}

beforeEach(() => {
  vi.stubEnv('GITHUB_REPOSITORY', repo);
  vi.stubEnv('GITHUB_REF', 'refs/heads/main');
  vi.stubEnv('GITHUB_ACTIONS', 'false');
  vi.stubEnv('GITHUB_STEP_SUMMARY', '');
  vi.stubEnv('STUDIO_PRICING_APP_ID', '1');
  vi.stubEnv('STUDIO_PRICING_APP_PRIVATE_KEY', signingKey);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('scheduled pricing publisher flow with fictional provider responses', () => {
  it('opens the generated branch and PR, waits for the exact check and merges with its head SHA', async () => {
    const { events, wait } = rehearsal();
    await publishPricing(false, wait);
    expect(events).toEqual(['push:' + candidate, 'open', 'checks', 'merge', 'revoke']);
  });

  it('resumes a matching open PR without duplicating its branch update or pull request', async () => {
    const { events, wait } = rehearsal({ open: true });
    await publishPricing(false, wait);
    expect(events).toEqual(['checks', 'merge', 'revoke']);
  });

  it('closes an obsolete open PR after a no-change comparison without writing any branch', async () => {
    const { events, wait } = rehearsal({ open: true, unchanged: true });
    await publishPricing(true, wait);
    expect(events).toEqual(['close', 'revoke']);
  });

  it('stops without pushing or merging when main has advanced', async () => {
    const { events, wait } = rehearsal({ stale: true });
    await publishPricing(false, wait);
    expect(events).toEqual(['revoke']);
  });

  it('fails closed before contacting GitHub without the publishing App credentials', async () => {
    const { events, wait } = rehearsal();
    vi.stubEnv('STUDIO_PRICING_APP_PRIVATE_KEY', '');
    await expect(publishPricing(false, wait)).rejects.toThrow('Configure STUDIO_PRICING_APP_ID');
    expect(fetch).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('never merges a failed required check', async () => {
    const { events, wait } = rehearsal({ failed: true });
    await expect(publishPricing(false, wait)).rejects.toThrow('required PR workflow failed');
    expect(events).toEqual(['push:' + candidate, 'open', 'checks', 'revoke']);
  });

  it('starts one replacement check and fails safely if no required check ever starts', async () => {
    const { events, wait } = rehearsal({ missingChecks: true });
    await expect(publishPricing(false, wait)).rejects.toThrow('within the publication window');
    expect(events).toEqual(['push:' + candidate, 'open', 'push:' + retry, 'revoke']);
  });

  it('reports a rejected protected merge and revokes its installation token', async () => {
    const { events, wait } = rehearsal({ mergeRejected: true });
    await expect(publishPricing(false, wait)).rejects.toThrow('HTTP 405');
    expect(events).toEqual(['push:' + candidate, 'open', 'checks', 'merge', 'revoke']);
  });
});

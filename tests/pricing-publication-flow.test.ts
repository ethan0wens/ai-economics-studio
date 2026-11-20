import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { git } from '../scripts/pricing-candidate';
import { publishPricing, smokePricingApp } from '../scripts/publish-pricing';

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
const expectedGrant = { contents: 'write', pull_requests: 'write', actions: 'read', metadata: 'read' };

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
  vi.stubEnv('GITHUB_SHA', base);
  vi.stubEnv('GITHUB_ACTIONS', 'false');
  vi.stubEnv('GITHUB_STEP_SUMMARY', '');
  vi.stubEnv('STUDIO_PRICING_APP_ID', '1');
  vi.stubEnv('STUDIO_PRICING_APP_PRIVATE_KEY', signingKey);
});

describe('main-only GitHub App authentication smoke', () => {
  function scopeFixture(total: number, selection = 'selected', permissions = expectedGrant) {
    const mutations: string[] = [];
    const metadataFixture = 'fictional-metadata-grant';
    const writerFixture = 'fictional-publisher-grant';
    vi.mocked(git).mockReturnValue(base);
    const request = vi.fn<typeof fetch>(async (input, options) => {
      const url = new URL(String(input));
      const path = url.pathname.replace('/repos/' + repo, '');
      const method = options?.method ?? 'GET';
      const authorization = new Headers(options?.headers).get('Authorization');
      if (method !== 'GET') mutations.push(method + ' ' + path);
      if (path === '/app') return Response.json({ slug: 'fictional-pricing' });
      if (path === '/installation' && method === 'GET') {
        return Response.json({ id: 2, repository_selection: selection, permissions });
      }
      if (path === '/app/installations/2/access_tokens') {
        const required = JSON.parse(String(options?.body));
        if (required.permissions.metadata === 'read') {
          expect(required).toEqual({ permissions: { metadata: 'read' } });
          return Response.json({ token: metadataFixture, permissions: { metadata: 'read' } });
        }
        expect(required.repositories).toEqual(['ai-economics-studio']);
        return Response.json({ token: writerFixture, permissions: expectedGrant });
      }
      if (path === '/installation/repositories') {
        expect(authorization).toBe('Bearer ' + metadataFixture);
        return Response.json({ total_count: total, repositories: [{ full_name: repo }] });
      }
      if (path === '/installation/token' && method === 'DELETE') return new Response(null, { status: 204 });
      expect(authorization).toBe('Bearer ' + writerFixture);
      if (path === '/git/ref/heads/main') return Response.json({ object: { sha: base } });
      if (path === '/rules/branches/main') return Response.json(effectiveRules);
      if (path === '/pulls') return Response.json([]);
      if (path === '/actions/workflows/ci.yml') return Response.json({ path: '.github/workflows/ci.yml', state: 'active' });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', request);
    return { mutations, request, metadataFixture, writerFixture };
  }

  it('confirms the whole installation and required read APIs with no repo mutations or credential output', async () => {
    const fixture = scopeFixture(1);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await smokePricingApp();
      expect(fixture.mutations).toEqual([
        'POST /app/installations/2/access_tokens', 'DELETE /installation/token',
        'POST /app/installations/2/access_tokens', 'DELETE /installation/token',
      ]);
      expect(output.mock.calls.flat().join(' ')).toContain('only, with Contents write');
      expect(output.mock.calls.flat().join(' ')).not.toContain(fixture.writerFixture);
      expect(output.mock.calls.flat().join(' ')).not.toContain(fixture.metadataFixture);
    } finally { output.mockRestore(); }
  });

  it('rejects a second installed repository even when a token could be narrowed to Studio', async () => {
    const fixture = scopeFixture(2);
    await expect(smokePricingApp()).rejects.toThrow('only the Studio repository');
    expect(fixture.mutations).toEqual(['POST /app/installations/2/access_tokens', 'DELETE /installation/token']);
  });

  it('fails before minting operational tokens for an all-repo installation or extra permissions', async () => {
    const selection = scopeFixture(1, 'all');
    await expect(smokePricingApp()).rejects.toThrow('selected repositories only');
    expect(selection.mutations).toEqual([]);
    const permissions = scopeFixture(1, 'selected', { ...expectedGrant, issues: 'write' } as typeof expectedGrant);
    await expect(smokePricingApp()).rejects.toThrow('permissions do not match');
    expect(permissions.mutations).toEqual([]);
  });

  it('refuses to read credentials on a feature ref', async () => {
    const fixture = scopeFixture(1);
    vi.stubEnv('GITHUB_REF', 'refs/heads/release/fixture');
    await expect(smokePricingApp()).rejects.toThrow('main workflow checkout');
    expect(fixture.request).not.toHaveBeenCalled();
  });
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

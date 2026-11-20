import { describe, expect, it, vi } from 'vitest';
import { assertPricingPaths, assertSafeReview, meaningfulEvidenceChange } from '../scripts/pricing-candidate';
import { assertOwnedPull, assertProtectedMain, github, requiredJob } from '../scripts/publish-pricing';

const observedAt = Date.parse('2026-11-20T00:00:00Z');
const original = { price: '0.12', dimension: 'fictional', review: { checkedAt: '2026-11-19T00:00:00Z', expiresAt: '2027-01-03T00:00:00Z' } };
const updated = { ...original, review: { checkedAt: '2026-11-20T00:00:00Z', expiresAt: '2027-01-04T00:00:00Z' } };
const protectedRules = [
  { type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'required_linear_history' },
  { type: 'pull_request', parameters: { required_approving_review_count: 0, require_code_owner_review: false } },
  { type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true,
    required_status_checks: [{ context: 'checks', integration_id: 15368 }] } },
];
const marker = { group: 'commercial', id: 'fictional', detail: 'Fictional review', source: 'https://www.microsoft.com/en-gb/copilot/pricing',
  firstSeen: '2026-11-20T00:00:00Z', occurrences: 1 };
const health = { schemaVersion: 1, reviewedAt: null, reviews: {}, sources: [], changes: [], discovered: [], lifecycle: [] };

describe('candidate publication boundary', () => {
  it('keeps timestamp-only reviews out of Git until positive evidence needs renewal', () => {
    expect(meaningfulEvidenceChange(original, updated, observedAt)).toBe(false);
    expect(meaningfulEvidenceChange(original, updated, Date.parse('2026-12-30T00:00:00Z'))).toBe(true);
    expect(meaningfulEvidenceChange(original, { ...updated, price: '0.13' }, observedAt)).toBe(true);
    expect(meaningfulEvidenceChange(original, { ...updated, dimension: 'new fictional scope' }, observedAt)).toBe(true);
  });

  it('publishes only declared data paths with exact digest filenames', () => {
    expect(() => assertPricingPaths(['catalogue/commercial.json', 'public/pricing/manifest.json',
      `public/pricing/catalogue-${'a'.repeat(64)}.json`])).not.toThrow();
    for (const path of ['.github/workflows/ci.yml', 'scripts/deploy.ts', 'tests/ledger.test.ts', 'catalogue/pinned.json',
      'catalogue/../README.md', 'public/pricing/catalogue-abc.json', 'public/pricing/health.json']) {
      expect(() => assertPricingPaths(['catalogue/commercial.json', path])).toThrow('allowlist');
    }
  });

  it.each(['ambiguous', 'expired'])('rejects %s Microsoft evidence before staging', kind => {
    expect(() => assertSafeReview({ ...health, unresolved: [{ ...marker, kind }] })).toThrow('current published catalogue is retained');
    expect(() => assertSafeReview({ ...health, unresolved: [{ ...marker, kind: 'unpriced' }] })).not.toThrow();
  });

  it('requires active protection, current GitHub Actions checks and zero human approval requirements', () => {
    expect(() => assertProtectedMain(protectedRules)).not.toThrow();
    expect(() => assertProtectedMain([])).toThrow('Protection Main');
    expect(() => assertProtectedMain(protectedRules.map(rule => rule.type === 'pull_request'
      ? { ...rule, parameters: { required_approving_review_count: 1 } } : rule))).toThrow('Protection Main');
    expect(() => assertProtectedMain(protectedRules.map(rule => rule.type === 'required_status_checks'
      ? { ...rule, parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: 'checks', integration_id: 7 }] } } : rule)))
      .toThrow('Protection Main');
  });

  it('recognises only the App-owned repository, branch and validated head for a pending or merged PR', () => {
    const pull = { number: 12, state: 'open', user: { login: 'fictional-pricing[bot]' }, base: { ref: 'main' },
      head: { ref: 'automation/verified-pricing', sha: 'a'.repeat(40), repo: { full_name: 'ethan0wens/ai-economics-studio' } } };
    expect(() => assertOwnedPull(pull, 'fictional-pricing[bot]', pull.head.sha)).not.toThrow();
    expect(() => assertOwnedPull(pull, 'unrelated[bot]')).toThrow('identity');
    expect(() => assertOwnedPull(pull, 'fictional-pricing[bot]', 'b'.repeat(40))).toThrow('revision');
    expect(() => assertOwnedPull({ ...pull, head: { ...pull.head, repo: null } }, 'fictional-pricing[bot]')).toThrow('repository');
  });

  it.each([
    [undefined, 'in_progress', 'pending'],
    ['checks', 'in_progress', 'pending'],
    ['checks', 'success', 'passed'],
    ['checks', 'failure', 'failed'],
    ['checks', 'skipped', 'failed'],
    ['checks', 'cancelled', 'retryable'],
    ['checks', 'timed_out', 'retryable'],
  ])('classifies the exact required check %s with %s as %s', (name, result, expected) => {
    expect(requiredJob(name ? [{ name, status: result === 'in_progress' ? result : 'completed', conclusion: result }] : [])).toBe(expected);
  });
});

describe('GitHub transport', () => {
  const token = 'fictional-test-token';
  it('recovers from throttling and temporary network errors without a credential leak or an unbounded wait', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '120' } }))
      .mockRejectedValueOnce(new Error('fictional socket timeout')).mockResolvedValueOnce(Response.json({ merged: false }));
    const wait = vi.fn(async () => {});
    await expect(github(request, wait)('/fixture', token)).resolves.toEqual({ merged: false });
    expect(wait.mock.calls).toEqual([[30_000], [2_000]]);
    expect(request.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error', method: 'GET' });
  });

  it.each([401, 403, 422])('does not retry an expired credential or a permanent permission or merge rejection (%d)', async status => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    const wait = vi.fn(async () => {});
    await expect(github(request, wait)('/fixture', token, status === 422 ? 'PUT' : 'GET')).rejects.toThrow(`HTTP ${status}`);
    expect(request).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });

  it('bounds repeated transient responses', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    const wait = vi.fn(async () => {});
    await expect(github(request, wait)('/fixture', token)).rejects.toThrow('HTTP 503');
    expect(request).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
  });
});

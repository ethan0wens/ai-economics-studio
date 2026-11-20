import { setTimeout as pause } from 'node:timers/promises';
import { requiredJob, withVerifiedPricingApp } from './publish-pricing';

const { GITHUB_EVENT_NAME, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, GITHUB_SHA } = process.env;
const repository = 'ethan0wens/ai-economics-studio';
const origin = `/repos/${repository}`;
const sha = /^[a-f0-9]{40}$/;

try {
  if (GITHUB_EVENT_NAME !== 'workflow_dispatch' || !/^\d+$/.test(GITHUB_RUN_ID ?? '') ||
    !/^\d+$/.test(GITHUB_RUN_ATTEMPT ?? '') || !GITHUB_SHA || !sha.test(GITHUB_SHA)) {
    throw new Error('Use the main-branch manual pricing App integration mode.');
  }
  const baseSha = GITHUB_SHA;
  const suffix = `${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}`;
  const base = `automation/pricing-integration-base-${suffix}`;
  const head = `automation/pricing-integration-head-${suffix}`;
  const marker = 'docs/security/pricing-app-integration-marker.md';

  await withVerifiedPricingApp(async ({ api, token, bot }) => {
    function call<T>(route: string, method = 'GET', body?: object) {
      return api<T>(origin + route, token, method, body);
    }
    const commit = await call<{ tree: { sha: string } }>(`/git/commits/${baseSha}`);
    if (!sha.test(commit.tree.sha)) throw new Error('GitHub did not confirm the integration base tree.');
    const tree = await call<{ sha: string }>('/git/trees', 'POST', { base_tree: commit.tree.sha, tree: [
      { path: marker, mode: '100644', type: 'blob', content: 'Isolated GitHub App integration marker. No catalogue or production changes.\n' },
    ] });
    if (!sha.test(tree.sha)) throw new Error('GitHub did not create the isolated test tree.');
    const candidate = await call<{ sha: string }>('/git/commits', 'POST', {
      message: 'Exercise pricing App on an isolated test branch', parents: [baseSha], tree: tree.sha,
    });
    if (!sha.test(candidate.sha)) throw new Error('GitHub did not create the isolated test commit.');
    await call('/git/refs', 'POST', { ref: `refs/heads/${base}`, sha: baseSha });
    await call('/git/refs', 'POST', { ref: `refs/heads/${head}`, sha: candidate.sha });
    type Pull = { number: number; state: string; user: { login: string }; base: { ref: string; sha: string };
      head: { ref: string; sha: string; repo: { full_name: string } | null } };
    const opened = await call<Pull>('/pulls', 'POST', { base, head, title: 'Isolated pricing App integration check',
      body: 'This test targets a disposable integration branch. It verifies GitHub App PR creation, Actions and squash merging. It contains no Microsoft rates or production changes.' });
    if (!Number.isSafeInteger(opened.number) || opened.number <= 0) throw new Error('GitHub did not confirm the test PR.');
    const pr = `/pulls/${opened.number}`;
    const link = `https://github.com/${repository}${pr.replace('/pulls/', '/pull/')}`;
    console.log(`Isolated integration PR ${link}`);
    const files = await call<Array<{ filename: string; status: string }>>(`${pr}/files?per_page=2`);
    if (files.length !== 1 || files[0].filename !== marker || files[0].status !== 'added') {
      throw new Error('The isolated PR must contain only the synthetic documentation marker.');
    }

    for (let attempt = 0; attempt < 40; attempt++) {
      const pull = await call<Pull>(pr);
      if (pull.state !== 'open' || pull.user.login !== bot || pull.base.ref !== base || pull.base.sha !== baseSha ||
        pull.head.repo?.full_name !== repository || pull.head.ref !== head || pull.head.sha !== candidate.sha) {
        throw new Error('The isolated test PR or branches changed while waiting for checks.');
      }
      const search = new URLSearchParams({ event: 'pull_request', branch: head, head_sha: candidate.sha, per_page: '5' });
      const result = await call<{ workflow_runs: Array<{ id: number; status: string; conclusion: string; head_sha: string }> }>(
        `/actions/workflows/ci.yml/runs?${search}`);
      const run = result.workflow_runs[0];
      if (run?.status === 'completed' && run.head_sha === candidate.sha) {
        const { jobs } = await call<{ jobs: Parameters<typeof requiredJob>[0] }>(`/actions/runs/${run.id}/jobs?filter=latest`);
        if (run.conclusion !== 'success' || requiredJob(jobs) !== 'passed') throw new Error('The isolated PR checks failed.');
        const confirmed = await call<{ object: { sha: string } }>(`/git/ref/heads/${base}`);
        if (confirmed.object.sha !== baseSha) throw new Error('The isolated base changed before merge.');
        const merged = await call<{ merged: boolean; sha: string }>(`${pr}/merge`, 'PUT',
          { sha: candidate.sha, merge_method: 'squash' });
        if (!merged.merged || !sha.test(merged.sha)) throw new Error('GitHub did not confirm the isolated squash merge.');
        const resultRef = await call<{ object: { sha: string } }>(`/git/ref/heads/${base}`);
        if (resultRef.object.sha !== merged.sha) throw new Error('The isolated ref did not advance to the confirmed merge.');
        console.log(`::notice title=Isolated App integration::${link} passed GitHub Actions checks and squash-merged at ${merged.sha} into ${base}. This PR exercised no catalogue or production change.`);
        return;
      }
      await pause(20_000);
    }
    throw new Error('Timed out waiting for the isolated PR checks. The test PR was left open for inspection.');
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Pricing App integration failed.');
  process.exitCode = 1;
}

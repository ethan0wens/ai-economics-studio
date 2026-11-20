import { appendFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { manifestSchema } from '../src/catalogue';
import { git } from './pricing-candidate';
import { github } from './publish-pricing';
import { observeProductionSecurity, reportSecurityVerification } from './security-http';

export function recoveryDecision(live: { application?: string; catalogueId: string | null },
  checked: { head: string; deployable: string; catalogueId: string | null }, failedRetries: number) {
  if (live.catalogueId === checked.catalogueId && (live.application === checked.head || live.application === checked.deployable)) {
    return 'current';
  }
  return failedRetries >= 2 ? 'exhausted' : 'deploy';
}

async function main() {
  const { GITHUB_OUTPUT: output, GITHUB_REPOSITORY: repository, GITHUB_TOKEN: token } = process.env;
  if (!output || repository !== 'ethan0wens/ai-economics-studio' || !token) throw new Error('Production recovery requires the scoped workflow token and output.');
  const head = git(['rev-parse', 'HEAD']);
  const deployable = git(['log', '-1', '--format=%H', '--', '.', ':(exclude)docs/security/public-release.json']);
  const manifest = manifestSchema.parse(JSON.parse(await readFile('public/pricing/manifest.json', 'utf8')));
  const checked = { head, deployable, catalogueId: manifest.catalogueId };
  const live = await observeProductionSecurity();
  await reportSecurityVerification(live);
  let decision = recoveryDecision(live.https, checked, 0);
  if (decision === 'deploy') {
    const filter = new URLSearchParams({ event: 'schedule', status: 'failure', head_sha: head, per_page: '2' });
    const failures = await github()<{ total_count: number }>(`/repos/${repository}/actions/workflows/deploy.yml/runs?${filter}`, token);
    if (!Number.isSafeInteger(failures.total_count) || failures.total_count < 0) throw new Error('Could not establish the production recovery retry budget.');
    decision = recoveryDecision(live.https, checked, failures.total_count);
  }
  console.log(decision === 'deploy'
    ? `Repository main at ${head} is ahead of or differs from the verified production receipt. Retrying only this checked revision.`
    : decision === 'exhausted'
      ? `::warning title=Production recovery limit::Two automatic recovery runs failed for ${head}. Review the failed deployments and latest live receipt.`
      : 'Live production matches the checked application and catalogue. No deployment is needed.');
  await appendFile(output, `deploy=${decision === 'deploy'}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();

import { appendFile, readFile } from 'node:fs/promises';
import { maintenanceHealthSchema } from '../src/catalogue-health';

const repository = process.env.GITHUB_REPOSITORY;
const run = process.env.GITHUB_RUN_ID;
const token = process.env.GITHUB_TOKEN;
if (!repository || !run || !token) throw new Error('Exception notifications require the workflow repository, run and scoped GitHub token.');
const base = `https://api.github.com/repos/${repository}`;
const links = `[Latest maintenance run](https://github.com/${repository}/actions/runs/${run})`;
async function api(path: string, method = 'GET', body?: object): Promise<unknown> {
  const response = await fetch(base + path, { method, redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body) });
  if (!response.ok) throw new Error(`GitHub exception report API returned HTTP ${response.status} (${method} ${path}).`);
  return response.json();
}

type Exception = { title: string; detail: string; active: boolean | undefined };
const cases = new Map<string, Exception>();
const add = (id: string, title: string, active: Exception['active'], detail: string) => cases.set(id, { title, active, detail });
const refresh = process.env.STUDIO_REFRESH_OUTCOME;
const regression = process.env.STUDIO_REGRESSION_OUTCOME;
const publication = process.env.STUDIO_PUBLISH_OUTCOME;
const preparation = process.env.STUDIO_PREPARE_OUTCOME;
const reviewed = process.env.STUDIO_REVIEW_OUTCOME === 'success';
const prev = (await api('/actions/workflows/refresh-pricing.yml/runs?status=completed&per_page=5')) as {
  workflow_runs: Array<{ id: number; conclusion: string }>;
};
const last = prev.workflow_runs.find(item => String(item.id) !== run);
add('persistent-ingestion', 'Repeated catalogue ingestion failure', refresh === 'failure' || process.env.STUDIO_REVIEW_OUTCOME === 'failure'
  ? last?.conclusion === 'failure' ? true : undefined : refresh === 'success' ? false : undefined,
'Two consecutive maintenance runs failed to reconcile evidence or validate the pricing refresh. Inspect the source and mapping diagnostics.');
add('financial-regression', 'Catalogue validation or financial regression failed', regression === 'success' ? false : regression === 'failure' ? true : undefined,
  'A staged catalogue failed the required validation, financial or browser regression gates. The candidate was not uploaded.');
add('pricing-publication', 'Protected catalogue publication failed', publication === 'failure' || preparation === 'failure' ? true
  : publication === 'success' || preparation === 'success' ? false : undefined,
  'The prepared catalogue was rejected or its protected merge did not complete. Inspect the refresh, candidate validation and publishing diagnostics. Production can only change in the main deployment workflow.');
if (reviewed) {
  const health = maintenanceHealthSchema.parse(JSON.parse(await readFile(new URL('../catalogue/maintenance.json', import.meta.url), 'utf8')));
  const rows = (kind: 'expired' | 'ambiguous') => health.unresolved.filter(item => item.kind === kind);
  const details = (items: ReturnType<typeof rows>) => items.slice(0, 18).map(row => `- ${row.group} · ${row.id} · ${row.detail}`).join('\n');
  const expired = rows('expired');
  const disagreement = rows('ambiguous');
  add('expired-evidence', 'Critical catalogue evidence expired', expired.length > 0,
    `${expired.length} observations expired without exact re-verification.\n\n${details(expired)}`);
  add('contradictory-evidence', 'Contradictory or breaking catalogue evidence', disagreement.length > 0,
    `${disagreement.length} exact records have contradictions or identity changes.\n\n${details(disagreement)}`);
}
const summary: string[] = [];
type Issue = { number: number; state: string; body: string | null; pull_request?: unknown };
const issues: Issue[] = [];
for (let page = 1; page <= 5; page++) {
  const batch = await api(`/issues?state=all&creator=github-actions%5Bbot%5D&per_page=100&page=${page}`) as Issue[];
  issues.push(...batch.filter(item => !item.pull_request));
  if (batch.length < 100) break;
}
for (const [id, condition] of cases) {
  if (condition.active === undefined) continue;
  const marker = `<!-- ai-economics-studio:catalogue-maintenance:${id} -->`;
  const issue = issues.find(item => item.body?.includes(marker));
  if (condition.active) {
    const body = `${marker}\n\n${condition.detail}\n\n${links}\n`;
    if (!issue) await api('/issues', 'POST', { title: condition.title, body });
    else if (issue.body !== body || issue.state !== 'open') await api(`/issues/${issue.number}`, 'PATCH', { body, state: 'open' });
    summary.push(`- Open exception · ${condition.title}`);
  } else if (issue?.state === 'open') {
    await api(`/issues/${issue.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
    summary.push(`- Resolved exception · ${condition.title}`);
  }
}
if (process.env.GITHUB_STEP_SUMMARY && summary.length) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, '\n### Catalogue exceptions\n\n' + summary.join('\n') + '\n');
}

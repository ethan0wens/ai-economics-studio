import { appendFile, readFile } from 'node:fs/promises';
import { manifestSchema } from '../src/catalogue';
import { git } from './pricing-candidate';
import { observeProductionSecurity, reportSecurityVerification } from './security-http';

const output = process.env.GITHUB_OUTPUT;
if (!output) throw new Error('Production recovery requires a workflow output.');
const head = git(['rev-parse', 'HEAD']);
const application = git(['log', '-1', '--format=%H', '--', '.', ':(exclude)docs/security/public-release.json']);
const expected = manifestSchema.parse(JSON.parse(await readFile('public/pricing/manifest.json', 'utf8')));
const live = await observeProductionSecurity();
await reportSecurityVerification(live);
const drift = live.https.catalogueId !== expected.catalogueId || ![head, application].includes(live.https.application ?? '');
console.log(drift
  ? `Repository main at ${head} is ahead of or differs from the verified production receipt. Retrying only this checked revision.`
  : 'Live production matches the checked application and catalogue. No deployment is needed.');
await appendFile(output, `deploy=${drift}\n`);

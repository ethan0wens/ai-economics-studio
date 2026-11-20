import { assertPricingIndex, assertPricingPaths, git } from './pricing-candidate';

const patch = process.argv[2];
if (!patch || process.argv.length !== 3) throw new Error('Provide the staged pricing patch.');
const entries = git(['apply', '--numstat', '-z', '--', patch]).split('\0').filter(Boolean);
const paths = entries.map(entry => {
  const match = /^\d+\t\d+\t([^\t]+)$/.exec(entry);
  if (!match) throw new Error('Pricing patches may contain only ordinary text files.');
  return match[1];
});
if (!paths.length) throw new Error('Pricing patch is empty.');
assertPricingPaths(paths);
git(['apply', '--index', '--', patch]);
assertPricingIndex(git(['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean));

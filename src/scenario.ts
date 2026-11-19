import Decimal from 'decimal.js';
import type { Catalogue } from './catalogue';
import type { Environment } from './domain';
import { ledger, type Ledger } from './ledger';

const Amount = Decimal.clone({ precision: 80 });

export function compareCosts(current: Ledger, proposed: Ledger, basis: keyof Ledger['summary'] = 'current') {
  const before = current.summary.current;
  const after = proposed.summary[basis];
  const knownBefore = current.lines.some(line => line.amounts.current !== null);
  const knownAfter = proposed.lines.some(line => line.amounts[basis] !== null);
  const comparable = knownBefore && knownAfter && !before.incomplete && !after.incomplete;
  return {
    current: knownBefore ? before.known : null,
    proposed: knownAfter ? after.known : null,
    unresolvedBefore: before.incomplete,
    unresolvedAfter: after.incomplete,
    monthlyDifference: comparable ? new Amount(after.known).minus(before.known).toFixed() : null,
    annualDifference: comparable ? new Amount(after.annual).minus(before.annual).toFixed() : null,
  };
}

export function pricePreview(env: Environment, current: Ledger, catalogue: Catalogue, percent?: number) {
  if (percent === undefined || !Number.isFinite(percent) || percent < -100 || percent > 10_000) return;
  const proposed = ledger({ ...env, forecast: { percent, applyToFixed: false, exceptions: [] } },
    catalogue.records, current.assessedAt, catalogue.inventory);
  return compareCosts(current, proposed, 'forecast');
}

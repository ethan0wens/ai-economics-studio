import { formatMoney } from './ledger';
import type { compareCosts } from './scenario';

export function CostComparison({ change, currency, proposedLabel }: {
  change: ReturnType<typeof compareCosts>; currency: string; proposedLabel: string;
}) {
  const monthly = (value: string | null, unresolved: number) =>
    formatMoney(value, currency) + (unresolved ? ` · ${unresolved} unresolved ${unresolved === 1 ? 'charge' : 'charges'}` : '');
  const delta = (value: string) => (Number(value) > 0 ? '+' : '') + formatMoney(value, currency);
  return <div className="inset-editor">
    <dl className="usage-values">
      <div><dt>Current monthly estimate</dt><dd>{monthly(change.current, change.unresolvedBefore)}</dd></div>
      <div><dt>{proposedLabel}</dt><dd>{monthly(change.proposed, change.unresolvedAfter)}</dd></div>
      <div><dt>Unresolved charges</dt><dd>{change.unresolvedBefore} current · {change.unresolvedAfter} proposed</dd></div>
      {change.monthlyDifference !== null && <div><dt>Monthly difference</dt><dd>{delta(change.monthlyDifference)}</dd></div>}
      {change.annualDifference !== null && <div><dt>Annualised difference</dt><dd>{delta(change.annualDifference)}</dd></div>}
    </dl>
    {change.monthlyDifference === null && <p className="field-hint">Both estimates need complete pricing and quantities to show a whole-environment difference. The amounts shown are known-cost subtotals where charges are unresolved.</p>}
  </div>;
}

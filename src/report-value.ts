import type { AdoptionComparison } from './adoption';
import { formatMoney, type Ledger } from './ledger';
import { formatQuantity } from './presentation';
import { colour, type ReportLayout } from './report-layout';
import { assumptionSources, estimateValue, valueFields, valueKeys, type ValuePlan } from './value';

function valueRows(plan: ValuePlan) {
  const value = estimateValue(plan);
  const currency = plan.currency;
  const hours = (quantity: string | null) => quantity === null ? 'Unknown' : formatQuantity(quantity) + ' hours';
  return [
    { label: 'Potential productivity capacity', pair: value.grossHours, show: hours },
    { label: 'Realised productivity capacity', pair: value.realisedHours, show: hours },
    { label: 'Assumed economic equivalent', pair: value.economicEquivalent, show: (quantity: string | null) => formatMoney(quantity, currency) },
    { label: 'Declared cashable savings', pair: value.cashableSavings, show: (quantity: string | null) => formatMoney(quantity, currency) },
  ].filter(row => row.pair.monthly !== null).map(({ label, pair, show }) => [label, show(pair.monthly), show(pair.annual)]);
}

export function valueSummary(layout: ReportLayout, plan: ValuePlan, result: Ledger, currency: string) {
  const hasKnown = result.lines.some(line => line.amounts.current !== null);
  const current = result.summary.current;
  const rows = valueRows(plan);
  layout.subhead('Potential Business Value');
  layout.paragraph(`Accepted customer assumptions describe potential outcomes. Modelled AI expenditure is ${formatMoney(hasKnown ? current.known : null, currency)} monthly${current.incomplete ? ` with ${current.incomplete} unresolved ${current.incomplete === 1 ? 'charge' : 'charges'}` : ''}.`,
    { size: 9.4, color: colour.muted });
  if (rows.length) layout.table([
    { title: 'Potential outcome', width: .48 }, { title: 'Monthly', width: .26, align: 'right' }, { title: 'Annualised', width: .26, align: 'right' },
  ], rows, { caption: 'Potential Business Value' });
  else layout.paragraph('Accepted assumptions are incomplete. More inputs are needed to calculate potential hours or economic value.');
  layout.paragraph('Economic equivalent represents usable time. Cashable savings require a separate declaration. Additional costs and benefits stay outside AI expenditure.',
    { size: 8.8, color: colour.muted });
}

export function valueAssumptions(layout: ReportLayout, plan: ValuePlan, illustration?: AdoptionComparison) {
  const value = estimateValue(plan);
  const moneyKeys = ['hourlyValue', 'cashableSavings', 'implementation', 'ongoing'];
  layout.table([{ title: 'Accepted assumption', width: .30 }, { title: 'Value', width: .19, align: 'right' },
    { title: 'Provenance and note', width: .51 }], valueKeys.flatMap(key => {
    const input = plan.assumptions[key];
    return input ? [[valueFields[key], `${formatQuantity(input.value)}${moneyKeys.includes(key) ? ` ${plan.currency}` : ''}`,
      [assumptionSources[input.source], input.note].filter(Boolean).join('\n')]] : [];
  }), { caption: 'Value assumptions', heading: 'Accepted value assumptions' });
  layout.paragraph('Active users are audience times adoption, rounded to a whole user. Gross hours multiply active users, monthly tasks and minutes saved, then divide by 60. Realised hours apply the declared factor. Economic equivalent uses realised hours and the declared hourly value. Annualised values apply 12 months at the same activity.', { size: 9.3, color: colour.muted });
  layout.paragraph(`One-off implementation costs ${formatMoney(value.implementation, plan.currency)}. Additional monthly operating costs ${formatMoney(value.additionalOngoing.monthly, plan.currency)}. Both scopes are separate from the modelled AI ledger.`, { size: 9.3 });
  if (!illustration) return;

  const scope = illustration.link && illustration.rows.some(row => row.volume)
    ? `Customer-assumed workload relationship for ${illustration.link.name}. Each active user contributes ${illustration.link.perUser} ${illustration.rows.find(row => row.volume)?.volume?.unit} per month. ${illustration.link.note}`
    : 'Costs are unknown in this comparison because no usable workload relationship was declared.';
  layout.table([
    { title: 'Adoption', width: .16 }, { title: 'Active users and workload', width: .20 },
    { title: 'Known AI cost', width: .145, align: 'right' }, { title: 'Potential hours', width: .145, align: 'right' },
    { title: 'Economic equivalent', width: .175, align: 'right' }, { title: 'Cashable savings', width: .175, align: 'right' },
  ], illustration.rows.map(row => [
    [row.label, row.adoption === undefined ? 'Unknown' : `${row.adoption}%`].join('\n'),
    [row.activeUsers ?? 'Unknown', row.volume ? `${formatQuantity(row.volume.value)} ${row.volume.unit}` : 'Workload unknown'].join('\n'),
    [formatMoney(row.knownCost, illustration.currency), `${row.unresolved ?? 'Unknown'} unresolved`].join('\n'),
    row.grossHours === null ? 'Unknown' : formatQuantity(row.grossHours),
    formatMoney(row.economicEquivalent, illustration.valueCurrency), formatMoney(row.cashableSavings, illustration.valueCurrency),
  ]), { caption: 'Illustrative adoption comparison', heading: 'Illustrative adoption comparison',
    intro: 'Explicitly included for illustration. The values are monthly and stay outside the accepted environment and its cost estimate.' });
  layout.paragraph(scope, { size: 9.3, color: colour.muted });
}

import Decimal from 'decimal.js';
import { retailDocs, type Catalogue, type RetailRecord } from './catalogue';
import { compatibilityLabels } from './compatibility';
import { creditCategories, type Environment } from './domain';
import { bases, formatMoney, type governance, type Ledger } from './ledger';
import { costExplanation, formatQuantity, regionName } from './presentation';
import { colour, type ReportLayout } from './report-layout';

export const basisLabels = { retail: 'Retail baseline', current: 'Current estimate', forecast: 'Price forecast' };
export const agreementLabels = { retail: 'Retail', discount: 'Retail discount', fixed: 'Fixed customer rate', 'intentional-zero': 'Declared zero' };
export const unresolvedLabel = (count: number) => `${count} unresolved ${count === 1 ? 'charge' : 'charges'}`;
const quantity = (value: string | number | null | undefined) => value === null || value === undefined ? 'Unknown' : formatQuantity(value);
const amount = (value: string | null, currency: string) => formatMoney(value, currency);
function mainRate(line: Ledger['lines'][number]) {
  const rate = line.rates.current;
  if (!line.source?.tiers || rate === null || rate.length <= 13) return quantity(rate);
  return `≈${quantity(new Decimal(rate).toSignificantDigits(8).toFixed())}\nBlended`;
}
export function chargeBasis(line: Ledger['lines'][number]) {
  if (line.amounts.current === null) return line.status;
  if (line.status !== 'Microsoft retail' && line.status !== 'User agreement' && line.status !== 'Intentional zero') return line.status;
  if (line.agreement && line.agreement.mode !== 'retail') return agreementLabels[line.agreement.mode];
  return line.source ? 'Verified Microsoft retail' : line.status;
}

export class ReportSources {
  #references = new Map<string, string>();
  ref(url?: string) {
    if (!url) return '';
    const existing = this.#references.get(url);
    if (existing) return existing;
    const label = `S${this.#references.size + 1}`;
    this.#references.set(url, label);
    return label;
  }
  rows() { return [...this.#references].map(([url, id]) => [id, url]); }
}

function priceEvidence(record: RetailRecord, sources: ReportSources) {
  const label = sources.ref(record.source);
  const review = record.review && `Reviewed ${record.review.checkedAt} · valid through ${record.review.expiresAt}\n${record.review.terms}`;
  return [`${label} · ${record.verification === 'azure-retail-api' ? 'Azure retail' : 'Reviewed Microsoft commercial price'}`,
    `${record.product} · effective ${record.effectiveAt}`, review,
    ...(record.review?.corroboration ?? []).map(url => `Corroboration ${sources.ref(url)}`),
  ].filter(Boolean).join('\n');
}

export function capacityComparisons(layout: ReportLayout, result: Ledger, currency: string, sources?: ReportSources) {
  if (!result.capacityComparisons.length) return;
  layout.subhead('Provisioned and PAYG costs');
  layout.paragraph('Monthly financial comparison. Throughput suitability and technical feasibility require separate validation.', { size: 9.4, color: colour.muted });
  layout.table([
    { title: 'Deployment and PAYG offer', width: .44 }, { title: 'Provisioned', width: .18, align: 'right' },
    { title: 'PAYG retail', width: .18, align: 'right' }, { title: 'Provisioned minus PAYG', width: .2, align: 'right' },
  ], result.capacityComparisons.map(row => [
    [row.name, row.offering, row.reason].filter(Boolean).join('\n'),
    amount(row.current, currency), amount(row.payg, currency), amount(row.difference, currency),
  ]), { caption: 'Provisioned and PAYG costs' });
  if (sources) {
    layout.table([{ title: 'Deployment', width: .25 }, { title: 'Workload basis and evidence', width: .75 }],
      result.capacityComparisons.map(row => [row.name, [row.detail, ...row.sources.map(source =>
        `${source.component} · ${source.currency} ${source.price} per ${source.unit}\n${priceEvidence(source, sources)}`)].filter(Boolean).join('\n') || 'Unknown']),
      { caption: 'Provisioned and PAYG evidence' });
  }
}

export function reviewFindings(layout: ReportLayout, env: Environment, result: Ledger, advice: ReturnType<typeof governance>, sources: ReportSources) {
  const names = new Map([[env.id, env.name], ...env.objects.map(object => [object.id, object.name] as const)]);
  layout.section('Items requiring review', 'Check financial gaps and incompatible configurations first. Licensing and governance findings describe the scope and evidence of the modelled assessment.');
  layout.subhead('Financial uncertainty');
  const missing = result.lines.filter(line => line.amounts.current === null);
  if (!missing.length) layout.paragraph(result.lines.length ? 'Every current ledger charge has a calculated amount in the modelled scope.' : 'There are no calculable charges in the declared scope.');
  else layout.table([{ title: 'Charge and object', width: .38 }, { title: 'Unresolved reason', width: .62 }],
    missing.map(line => [`${line.component}\n${line.object}`, costExplanation(line) ?? 'Enter usage and confirm the billing configuration and rate.']),
    { caption: 'Unresolved charges' });
  const declarations = result.lines.filter(line => line.agreement && line.agreement.mode !== 'retail');
  if (declarations.length) layout.callout('Customer pricing assumptions', `${declarations.length} charges use a customer agreement or declaration. Review the agreement scope, reason and effective dates in the financial appendix.`);
  const linkedIssues = result.issues.filter(issue => !missing.some(line => line.objectId === issue.id && line.reason === issue.message));
  if (linkedIssues.length) {
    layout.table([{ title: 'Object', width: .34 }, { title: 'Review', width: .66 }],
      linkedIssues.map(issue => [names.get(issue.id) ?? 'Workspace', issue.message]),
      { caption: 'Configuration and usage gaps', heading: 'Configuration and usage gaps' });
  }
  layout.subhead('Technical compatibility and licensing evidence');
  const rank = { incompatible: 0, unverified: 1, conditional: 2, compatible: 3 };
  if (result.technicalFindings.length) layout.table([
    { title: 'Object and check', width: .30 }, { title: 'Finding and evidence', width: .70 },
  ], [...result.technicalFindings].sort((a, b) => rank[a.status] - rank[b.status]).map(item => [
    [names.get(item.id), item.title, item.related && `Related · ${names.get(item.related)}`].filter(Boolean).join('\n'),
    [compatibilityLabels[item.status], item.detail, [item.source && sources.ref(item.source), item.verifiedOn && `Reviewed ${item.verifiedOn}`].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),
  ]), { caption: 'Technical compatibility' });
  else layout.paragraph('No technical compatibility findings apply.');
  layout.subhead('Licensing');
  layout.paragraph('Eligibility depends on the exact product and reviewed evidence. Customer declarations retain their stated scope.', { size: 9.4, color: colour.muted });
  const licenceOrder = { 'Action required': 0, Unverified: 1, Conditional: 2, Verified: 3 };
  if (result.licensingFindings.length) layout.table([
    { title: 'Object and check', width: .30 }, { title: 'Finding and evidence', width: .70 },
  ], [...result.licensingFindings].sort((a, b) => licenceOrder[a.status] - licenceOrder[b.status]).map(item => [
    [names.get(item.id), item.title].filter(Boolean).join('\n'),
    [item.status, item.detail, [item.source && sources.ref(item.source), item.verifiedOn && `Reviewed ${item.verifiedOn}`].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),
  ]), { caption: 'Licensing' });
  else layout.paragraph('No licensing findings apply.');
  const governanceIntro = 'Ruleset 1.0.0 uses modelled declarations and Microsoft guidance. Validate actual controls independently.';
  if (advice.length) layout.table([{ title: 'Agent and advisory', width: .34 }, { title: 'Declared status', width: .16 },
    { title: 'Rationale and source', width: .50 }],
    [...advice].sort((a, b) => Number(b.critical) - Number(a.critical)).map(item => [
      `${item.object}\n${item.title}`, item.status, `${item.why} ${sources.ref(item.source)}`,
    ]), { caption: 'Governance advisory findings', heading: 'Governance advisory findings', intro: governanceIntro });
  else {
    layout.subhead('Governance advisory findings');
    layout.paragraph('No applicable governance checks.');
  }
}

export function financialAppendix(layout: ReportLayout, env: Environment, result: Ledger, sources: ReportSources) {
  layout.section('Itemised monthly costs', `One row per ledger charge in ${env.currency}. Quantities are base units. Applied rates are expressed per billed unit. Match each reference with its detail record.`, true);
  if (!result.lines.length) layout.paragraph('There are no itemised charges in this environment.');
  else {
    const chargeRef = (index: number) => `L${String(index + 1).padStart(3, '0')}`;
    layout.table([
      { title: 'Ref. / Category', width: .122 }, { title: 'Environment object', width: .151 }, { title: 'Charge component', width: .152 },
      { title: 'Quantity', width: .096, align: 'right' }, { title: 'Billing unit', width: .135 },
      { title: 'Applied rate', width: .11, align: 'right' }, { title: 'Current monthly', width: .114, align: 'right' },
      { title: 'Pricing status', width: .12 },
    ], result.lines.map((line, index) => [
      `${chargeRef(index)}\n${line.category}`, line.object, line.component, quantity(line.quantity),
      line.meter ? `${line.meter.unit}\n${quantity(line.meter.quantityPerUnit)} base units` : 'Unknown',
      mainRate(line), { text: amount(line.amounts.current, line.currency), bold: true,
        color: line.amounts.current === null ? colour.amber : undefined }, chargeBasis(line),
    ]), { caption: 'Itemised monthly costs' });
    const objects = new Map(env.objects.map(object => [object.id, object]));
    const names = (id: string) => objects.get(id)?.name ?? id;
    layout.table([
      { title: 'Charge reference', width: .105 }, { title: 'Monthly amount and unit rate', width: .25 },
      { title: 'Billing configuration and source', width: .27 }, { title: 'Agreements, coverage and allocation', width: .375 },
    ], result.lines.map((line, index) => {
      const owner = objects.get(line.pricingOwner);
      const reservation = owner?.kind === 'model-deployment' && owner.reservation;
      const reserved = line.component.toLowerCase().includes('reservation') && reservation ? [
        `Customer reservation · ${[
          reservation.term && `${reservation.term} months`, reservation.ptus !== undefined && `${reservation.ptus} PTUs`,
          reservation.coveredHours !== undefined && `${reservation.coveredHours} covered hours`,
          reservation.total && `${reservation.currency ?? env.currency} ${reservation.total} term total`,
          reservation.start && `starts ${reservation.start}`, reservation.reference,
        ].filter(Boolean).join(' · ')}`,
      ] : [];
      const conditions = [
        line.reason && (costExplanation(line) ?? line.reason),
        line.retailQuantity && `Retail comparison quantity without reservation: ${line.retailQuantity} PTU-hours.`,
        line.agreement && `Agreement · ${agreementLabels[line.agreement.mode]}${line.agreement.mode === 'discount' ? ` (${line.agreement.value}%)` : ''}\n${line.agreement.reason}\nEffective ${line.agreement.effectiveAt ?? 'undated'}`,
        line.source?.tiers && `Graduated bands, base-unit threshold → rate\n${line.source.tiers.map(tier => `${quantity(tier.from)} → ${quantity(tier.price)}`).join('\n')}\nDisplayed retail rates are blended at this usage.`,
        line.includedCredits && `${quantity(line.includedCredits)} Copilot Credits covered by linked packs.`,
        line.entitledCredits && `${quantity(line.entitledCredits)} credits offset by a customer-declared allowance before pack allocation.`,
        ...reserved,
        line.allocatesTo.length && (line.allocation
          ? `Shared allocation by input tokens\n${line.allocation.map(share => `${names(share.agentId)} · ${amount(share.amount, line.currency)}`).join('\n')}`
          : `Shared charge counted once. Allocation unassigned. Linked agents · ${line.allocatesTo.map(names).join(', ')}`),
        `Price forecast adjustment · ${line.scenario}%`,
      ].filter(Boolean).join('\n');
      return [
        { text: chargeRef(index), bold: true },
        bases.map(basis => `${basisLabels[basis]}\n${amount(line.amounts[basis], line.currency)} · rate ${quantity(line.rates[basis])}`).join('\n'),
        [line.meter && `${line.meter.sku} · ${regionName(line.meter.region)}\n${line.meter.meterId}`,
          line.fixed ? 'Fixed charge' : 'Usage-dependent charge', line.source && priceEvidence(line.source, sources)].filter(Boolean).join('\n'),
        conditions,
      ];
    }), { caption: 'Charge details', heading: 'Charge details' });
  }
  capacityComparisons(layout, result, env.currency, sources);
}

export function assumptions(layout: ReportLayout, env: Environment, result: Ledger, catalogue: Catalogue, generated: Date, sources: ReportSources, disclaimer: string) {
  layout.section('Assumptions and sources', 'The assessment uses the applied workspace and its pricing evidence at the assessment time.');
  layout.table([{ title: 'Basis', width: .27 }, { title: 'Recorded value or method', width: .73 }], [
    ['Generated', generated.toISOString()], ['Ledger assessed', result.assessedAt], ['Currency and default region', `${env.currency} · ${regionName(env.region)}`],
    ['Applied catalogue', catalogue.manifest.catalogueId ?? 'Unpublished'],
    ['Last successful catalogue check', catalogue.manifest.lastCheckedAt ?? 'Unavailable'],
    ['Records in the applied catalogue', String(catalogue.records.length)],
    ['Price forecast', `Global adjustment ${env.forecast.percent}%. Fixed agreements are ${env.forecast.applyToFixed ? 'included in' : 'excluded from'} the global adjustment. ${env.forecast.exceptions.length} meter-level exceptions. Forecast varies prices at the same usage.`],
    ['Rate precedence', 'Use the matching customer agreement if applicable. A fixed rate uses that amount. A percentage discount requires verified retail. Intentional zero requires a declaration. Otherwise use the exact verified retail meter.'],
    ['Cost and rounding', 'Divide quantity by the billing unit and multiply by the decimal rate. For graduated tariffs apply the band rate to units in that band. Each ledger line rounds half up to the currency minor unit.'],
    ['Annualisation and uncertainty', 'Annualised figures apply the same monthly usage and pricing for 12 months. Known-cost subtotals exclude unresolved charges. Tax, contractual currency conversion and usage growth are outside this estimate.'],
    ['Sharing and licences', 'Fixed shared capacity counts once. Allocations divide the rounded fixed charge. Existing licence expenditure is tracked separately. Proposed environment spend adds retained licences where declared.'],
    ['Scope of usage', 'The assessment uses applied quantities. Temporary usage previews are excluded. The environment description can record the origin of usage assumptions.'],
  ], { caption: 'Assumptions and method' });
  if (env.description) {
    layout.subhead('Environment notes');
    layout.paragraph(env.description);
  }
  const usage = env.objects.flatMap(object => {
    if (object.kind === 'usage-profile') return [[object.name, 'Workload profile', [
      `Monthly executions · ${quantity(object.executions)}`, `Calls per execution · ${quantity(object.calls)}`,
      `Input / output tokens per call · ${quantity(object.input)} / ${quantity(object.output)}`,
      `Cached input per call · ${quantity(object.cachedInput)}`, `Retry allowance · ${object.retries === undefined ? 'Unknown' : object.retries + '%'}`,
      `Tool calls · ${quantity(object.toolCalls)}`,
    ].join('\n')]];
    if (object.kind === 'agent' && object.platform === 'copilot-studio') return [[object.name, 'Copilot Studio', [
      `Declared monthly credits · ${quantity(object.credits)}`,
      ...Object.entries(object.creditBreakdown ?? {}).map(([key, value]) => `${creditCategories[key as keyof typeof creditCategories]} · ${quantity(value)} credits`),
      object.includedUsage && `Declared allowance · ${quantity(object.includedUsage.credits)} credits · ${object.includedUsage.basis ?? 'Basis unknown'} · expires ${object.includedUsage.expiresOn ?? 'Unknown'}`,
    ].filter(Boolean).join('\n')]];
    if (object.kind === 'model-deployment' && object.mode === 'provisioned') return [[object.name, 'Provisioned workload',
      `Capacity · ${quantity(object.capacity)} PTUs\nMonthly hours · ${quantity(object.billableHours)}\nPeak input / output tokens per minute · ${quantity(object.peakInputTpm)} / ${quantity(object.peakOutputTpm)}`]];
    if (object.kind === 'user-group') return [[object.name, 'User group', [
      `Population · ${quantity(object.population)}`, `Intended · ${quantity(object.intended)}`, `Active · ${quantity(object.active)}`,
      `Monthly interactions · ${quantity(object.interactions)}`,
    ].join('\n')]];
    if (object.kind === 'licence-entitlement') return [[object.name, 'Licence declaration', [
      object.product, `Procurement · ${object.procurement ?? 'Unknown'}`, `Declared seats · ${quantity(object.seats)}`,
      `Existing monthly expenditure · ${object.existingMonthly === undefined ? 'Unknown' : amount(String(object.existingMonthly), env.currency)}`,
      object.seatScope,
    ].filter(Boolean).join('\n')]];
    return [];
  });
  if (usage.length) {
    layout.table([{ title: 'Object', width: .31 }, { title: 'Scope', width: .18 }, { title: 'Applied declarations', width: .51 }], usage,
      { caption: 'Declared assumptions', heading: 'Declared usage and licence assumptions' });
  }
  sources.ref(retailDocs);
  layout.subhead('Numbered source register');
  layout.paragraph('References identify the published evidence used in this document. The catalogue check and evidence review dates may differ from report generation time.', { size: 9, color: colour.muted });
  layout.table([{ title: 'Reference', width: .15 }, { title: 'Source address', width: .85 }], sources.rows(), { caption: 'Numbered source register' });
  layout.callout('Independent-product disclaimer', disclaimer);
}

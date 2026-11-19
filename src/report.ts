import fontkit from '@pdf-lib/fontkit';
import Decimal from 'decimal.js';
import { PDFDocument, type PDFFont } from 'pdf-lib';
import tokens from '../design/tokens.json';
import type { Catalogue } from './catalogue';
import { environmentCompleteness } from './coverage';
import { disclaimer, kindLabels, type Environment } from './domain';
import { bases, categories, formatMoney, summarize, type governance, type Ledger } from './ledger';
import { costExplanation, regionName } from './presentation';
import { architecture } from './report-architecture';
import { assumptions, basisLabels, capacityComparisons, chargeBasis, financialAppendix, ReportSources, reviewFindings, unresolvedLabel } from './report-appendices';
import regularAsset from './report-fonts/Inter-Regular.ttf?inline';
import boldAsset from './report-fonts/Inter-Semibold.ttf?inline';
import { colour, ink, margin, ReportLayout, safeText, type ReportFonts } from './report-layout';

export type ReportFormat = 'executive' | 'full';
const formatLabels = { executive: 'Executive Summary', full: 'Full Report' } as const;
const palette = [tokens.colors.categoryInference, tokens.colors.categoryOrchestration, tokens.colors.categoryLicensing,
  tokens.colors.categoryInfrastructure, tokens.colors.categoryGovernance];
const categoryNames = { Inference: 'Model inference', Orchestration: 'Copilot Studio', Licensing: 'Licensing',
  Infrastructure: 'Azure services', Governance: 'Governance' };
const proportion = (known: string, total: Decimal) => total.gt(0) ? new Decimal(known).div(total) : null;
const shareLabel = (part: Decimal | null) => part === null ? '—' : `${part.times(100).toFixed(1)}%`;
const londonDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'long' });

async function loadFonts(doc: PDFDocument, environment: Environment): Promise<ReportFonts> {
  doc.registerFontkit(fontkit);
  const options = { features: { liga: false, clig: false, kern: false, tnum: true } };
  const wrap = (pdf: PDFFont) => ({ pdf, supported: new Set(pdf.getCharacterSet()) });
  const regular = wrap(await doc.embedFont(regularAsset, { ...options, customName: 'Inter-Regular' }));
  const bold = wrap(await doc.embedFont(boldAsset, { ...options, customName: 'Inter-Semibold' }));
  if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(JSON.stringify(environment))) return { regular, bold };
  const { default: fallback } = await import('./report-fonts/NotoSansSC-report.ttf?inline');
  return { regular, bold, extra: wrap(await doc.embedFont(fallback, { ...options, customName: 'NotoSansSC-Report' })) };
}

function cover(layout: ReportLayout, env: Environment, generated: Date, format: ReportFormat) {
  layout.newPage('Cover', false, true);
  layout.at('AI Economics Studio', margin, layout.y, layout.width, { size: 14, bold: true, color: colour.blue });
  const heroTop = 729;
  const heroHeight = 430;
  layout.page.drawRectangle({ x: margin, y: heroTop - heroHeight, width: layout.width, height: heroHeight, color: colour.navy });
  layout.page.drawRectangle({ x: margin, y: heroTop - 4, width: layout.width, height: 4, color: colour.blue });
  const left = margin + 28;
  const inside = layout.width - 56;
  layout.at(formatLabels[format], left, heroTop - 35, inside, { size: 11, bold: true, color: colour.paleBlue });
  layout.at('AI Environment\nCost Assessment', left, heroTop - 66, inside, { size: 32, bold: true, color: colour.white, leading: 39 });
  layout.page.drawLine({ start: { x: left, y: heroTop - 162 }, end: { x: left + inside, y: heroTop - 162 }, color: ink('#435B7B'), thickness: .8 });
  const environmentTop = heroTop - 187;
  const nameWidth = inside - 5;
  const name = safeText(env.name).replace(/\s+/gu, ' ').trim();
  let nameSize = 25;
  while (nameSize > 13 && layout.wrap(name, nameWidth, { size: nameSize, bold: true }).length * nameSize * 1.32 > 215) nameSize--;
  layout.at(name, left, environmentTop, nameWidth, { size: nameSize, bold: true, color: colour.white });
  const labels = [
    ['Report date', londonDate.format(generated)], ['Currency', env.currency], ['Primary deployment region', regionName(env.region)],
  ];
  const columnWidth = layout.width / labels.length;
  labels.forEach(([key, value], index) => {
    const x = margin + index * columnWidth;
    layout.at(key, x, 257, columnWidth - 16, { size: 9.4, bold: true, color: colour.muted });
    const style = { size: 13, bold: true };
    const display = layout.wrap(value, columnWidth - 16, style).length > 4 ? 'See modelled environment' : value;
    layout.at(display, x, 237, columnWidth - 16, style);
  });
  layout.at('Independent planning report', margin, 145, layout.width, { size: 11, bold: true, color: colour.navy });
  layout.at('Estimates are for planning and review. The studio is independent of Microsoft.', margin, 122, layout.width, { size: 9.6, color: colour.muted });
}

function executive(layout: ReportLayout, env: Environment, result: Ledger, catalogue: Catalogue, largest: Ledger['lines'][number] | undefined) {
  const current = result.summary.current;
  const money = (value: string | null) => formatMoney(value, env.currency);
  const scope = environmentCompleteness(result);
  const known = result.lines.length - current.incomplete;
  const hasKnown = known > 0;
  const monthlyLabel = current.incomplete ? 'Monthly known-cost subtotal' : 'Estimated monthly cost';
  layout.section('Executive financial summary', 'An estimate for the declared workload, with unresolved charges and the basis of each cost shown separately.');
  layout.cards([
    { label: monthlyLabel, value: money(hasKnown ? current.known : null), note: current.incomplete ? 'Excludes unresolved charges' : hasKnown ? 'Current pricing basis' : 'No calculable charges in scope', warning: !hasKnown },
    { label: 'Annualised estimate', value: money(hasKnown ? current.annual : null), note: current.incomplete ? '12 months of known charges' : '12 months at current usage and rates' },
    { label: 'Unresolved charges', value: String(current.incomplete), note: current.incomplete ? 'Requires quantities, prices or billing evidence' : hasKnown ? 'All current ledger charges have amounts' : 'No ledger charges to resolve yet', warning: current.incomplete > 0 },
    { label: 'Pricing coverage', value: `${scope.fully} of ${scope.groups.length}`, note: 'Objects with all modelled charges priced' },
  ]);
  if (current.incomplete) layout.callout('Known-cost subtotal', 'Unresolved charges are excluded. Confirm the outstanding quantities and prices before treating the estimate as complete.', true);
  const basisNotes = { retail: 'Exact published retail rates', current: 'Applied retail rates and customer agreements', forecast: 'Hypothetical price change at the same usage' };
  layout.table([
    { title: 'Basis', width: .218 }, { title: 'Monthly', width: .177, align: 'right' }, { title: 'Annualised', width: .20, align: 'right' },
    { title: 'Unresolved', width: .139, align: 'right' }, { title: 'Scope', width: .266 },
  ], bases.map(basis => {
    const value = result.summary[basis];
    const resolved = result.lines.length > value.incomplete;
    return [basisLabels[basis], money(resolved ? value.known : null), money(resolved ? value.annual : null),
      String(value.incomplete), value.incomplete && resolved ? `Known subtotal\n${basisNotes[basis]}` : basisNotes[basis]];
  }), { caption: 'Pricing basis', heading: 'Pricing basis' });
  if (largest) layout.paragraph(`Largest known charge is ${largest.component} at ${formatMoney(largest.amounts.current, largest.currency)} per month. See cost drivers and scope for the breakdown.`, { size: 9, color: colour.muted });
  const estate = result.licenceEstate;
  const licences = new Set(env.objects.filter(object => object.kind === 'licence-entitlement').map(object => object.id));
  if (licences.size) {
    const hasExisting = estate.existingLines.some(line => line.amount !== null);
    const hasIncremental = result.lines.some(line => licences.has(line.objectId) && line.amounts.current !== null);
    const hasRetained = estate.owned > estate.proposed.incomplete - estate.incremental.incomplete;
    layout.subhead('Existing and proposed spend');
    layout.table([
      { title: 'Expenditure scope', width: .48 }, { title: 'Monthly', width: .19, align: 'right' },
      { title: 'Annualised', width: .19, align: 'right' }, { title: 'Unresolved', width: .14, align: 'right' },
    ], ([
      ['Existing licence spend', estate.existing, hasExisting],
      ['New licence spend', estate.incremental, hasIncremental],
      ['Proposed licence spend', estate.proposed, hasRetained || hasIncremental],
      ['Proposed environment including retained licences', estate.proposedEnvironment, hasRetained || hasKnown],
    ] as const).map(([label, values, resolved]) => {
      const canReport = resolved || !values.incomplete;
      return [values.incomplete && canReport ? `${label}\nKnown subtotal` : label,
        money(canReport ? values.known : null), money(canReport ? values.annual : null), String(values.incomplete)];
    }), { caption: 'Existing and proposed spend' });
    layout.paragraph('Existing licence expenditure is shown separately. Proposed environment spend includes retained licences where declared.', { size: 8.7, color: colour.muted });
  }
  layout.paragraph('Annualisation applies the same monthly quantities and prices for 12 months. The price forecast models changes in rates at the same usage. Tax and contractual currency conversion are outside scope.', { size: 9, color: colour.muted });
  if (catalogue.fallback) layout.callout('Previous pricing catalogue', 'The active workspace uses a previously verified snapshot. Its current validation date is unavailable.', true);
}

function overview(layout: ReportLayout, env: Environment, result: Ledger, catalogue: Catalogue, format: ReportFormat, ranked: Ledger['lines']) {
  const total = new Decimal(result.summary.current.known);
  const rows = categories.map((category, index) => {
    const lines = result.lines.filter(line => line.category === category);
    const summary = summarize(lines, env.currency).current;
    return { name: categoryNames[category], summary, color: ink(palette[index]), visible: !!lines.length,
      known: lines.length > summary.incomplete, part: proportion(summary.known, total) };
  }).filter(row => row.visible);
  layout.section('Cost drivers and scope', 'Current monthly costs and the scope of the declared plan.');
  layout.subhead('Known monthly spend by category');
  if (!rows.length) layout.paragraph('The modelled scope contains no ledger charges.');
  else {
    layout.paragraph(total.gt(0) ? 'Shares use known charges only. Unresolved charges are excluded.'
      : 'No positive known subtotal is available. Percentage bars are omitted.', { size: 9, color: colour.muted });
    layout.bars(rows.map(row => ({
      name: row.name, amount: formatMoney(row.known ? row.summary.known : null, env.currency),
      share: row.known && row.part !== null ? shareLabel(row.part) : '',
      unresolved: row.summary.incomplete ? unresolvedLabel(row.summary.incomplete) : '',
      width: row.known && row.part !== null ? row.part.toNumber() : null, color: row.color,
    })));
  }
  layout.subhead('Largest known monthly charges');
  if (!ranked.length) layout.paragraph('There are no calculated amounts to rank.');
  else layout.table([
    { title: 'Charge', width: .25 }, { title: 'Object', width: .24 }, { title: 'Monthly', width: .165, align: 'right' },
    { title: 'Share', width: .105, align: 'right' }, { title: 'Pricing basis', width: .24 },
  ], ranked.map(line => [
    line.component, line.object, formatMoney(line.amounts.current, line.currency), shareLabel(proportion(line.amounts.current!, total)), chargeBasis(line),
  ]), { caption: 'Largest charges' });
  const largest = rows.filter(row => row.known).sort((a, b) => new Decimal(b.summary.known).cmp(a.summary.known))[0];
  const agreements = result.lines.filter(line => line.agreement && line.agreement.mode !== 'retail').length;
  const shared = result.lines.filter(line => line.fixed && line.allocatesTo.length > 1).length;
  const insights = [
    largest?.part && `${largest.name} has the largest share of known monthly spend at ${shareLabel(largest.part)}.`,
    agreements > 0 && `${agreements} charges have a customer agreement or rate declaration.`,
    shared > 0 && `${shared} fixed charges serve multiple agents and each is counted once.`,
  ].filter(Boolean);
  if (insights.length) layout.paragraph(insights.join(' '), { size: 9.3, color: colour.muted });
  layout.subhead('Modelled environment');
  const count = (kind: keyof typeof kindLabels) => env.objects.filter(object => object.kind === kind).length;
  const copilot = env.objects.filter(object => object.kind === 'agent' && object.platform === 'copilot-studio').length;
  const sharedDeployments = new Map<string, number>();
  for (const edge of env.relationships) {
    if (edge.type === 'agent-uses-deployment' || edge.type === 'agent-uses-prompt-model') sharedDeployments.set(edge.to, (sharedDeployments.get(edge.to) ?? 0) + 1);
  }
  layout.table([
    { title: 'Workspace scope', width: .24 }, { title: 'Objects and assumptions', width: .76 },
  ], [
    ['Billing and links', `${env.currency} · ${regionName(env.region)} · ${env.relationships.length} declared relationships`],
    ['Workload', `${count('agent')} agents (${copilot} Copilot Studio) · ${count('model-deployment')} deployments · ${[...sharedDeployments.values()].filter(value => value > 1).length} shared · ${count('usage-profile')} usage profiles`],
    ['Resources and users', `${count('supporting-resource')} supporting resources · ${count('user-group')} user groups · ${count('licence-entitlement')} licence declarations · ${count('security-policy')} security policies`],
    ['Pricing coverage', (() => {
      const coverage = environmentCompleteness(result);
      return `${coverage.fully} fully priced · ${coverage.partial} partial · ${coverage.unresolved} unresolved · ${coverage.excluded} missing configuration\n${coverage.retail} objects use verified retail · ${coverage.manual} use customer rates`;
    })()],
    ['Catalogue freshness', catalogue.manifest.lastCheckedAt ?? 'No successful check date is available'],
  ], { caption: 'Modelled environment' });
  if (env.description) layout.paragraph(env.description, { size: 9.4 });
  const gaps = result.lines.filter(line => line.amounts.current === null);
  const incompatible = result.technicalFindings.filter(item => item.status === 'incompatible').length;
  const licences = result.licensingFindings.filter(item => item.status === 'Action required' || item.status === 'Unverified').length;
  layout.subhead(format === 'executive' ? 'Items requiring review' : 'Principal uncertainties', gaps.length ? 67 : 25);
  if (gaps.length) layout.callout(unresolvedLabel(gaps.length),
    `${gaps[0].component} · ${gaps[0].object}. ${costExplanation(gaps[0]) ?? 'Confirm quantity, billing configuration and rate.'}`, true);
  if (incompatible || licences || result.issues.length) {
    const checks = [
      incompatible > 0 && `${incompatible} verified incompatible configurations`,
      licences > 0 && `${licences} licensing findings awaiting action or evidence`,
      result.issues.length > 0 && `${result.issues.length} configuration and usage observations`,
    ].filter(Boolean);
    layout.paragraph(`${checks.join(' · ')}. Review the evidence before relying on the plan.`, { color: colour.muted });
  } else if (!gaps.length) layout.paragraph('No outstanding financial gaps or incompatible configurations were found in the declared scope.', { color: colour.muted });
  if (format === 'executive') capacityComparisons(layout, result, env.currency);
  layout.paragraph('The environment is a modelled plan. Cost results and advisory findings depend on the declared workload and reviewed evidence.', { size: 8.8, color: colour.muted });
}

export async function report(env: Environment, result: Ledger, catalogue: Catalogue, assessment: ReturnType<typeof governance>,
  format: ReportFormat = 'full', generated = new Date()) {
  const doc = await PDFDocument.create();
  doc.setTitle(`AI Economics Studio | ${safeText(env.name).replaceAll('\n', ' ')}`);
  doc.setSubject(`AI Environment Cost Assessment · ${formatLabels[format]}`);
  doc.setCreator('AI Economics Studio');
  doc.setLanguage('en-GB');
  doc.setCreationDate(generated);
  doc.setModificationDate(generated);
  const layout = new ReportLayout(doc, await loadFonts(doc, env));
  const ranked = result.lines.filter(line => line.amounts.current !== null)
    .sort((a, b) => new Decimal(b.amounts.current!).cmp(a.amounts.current!)).slice(0, 5);
  cover(layout, env, generated, format);
  executive(layout, env, result, catalogue, ranked[0]);
  overview(layout, env, result, catalogue, format, ranked);
  if (format === 'full') {
    layout.reserveContents();
    const sources = new ReportSources();
    reviewFindings(layout, env, result, assessment, sources);
    architecture(layout, env, result);
    financialAppendix(layout, env, result, sources);
    assumptions(layout, env, result, catalogue, generated, sources, disclaimer);
  } else layout.paragraph(disclaimer, { size: 8.4, color: colour.muted });
  layout.finish();
  return doc.save();
}

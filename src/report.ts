import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { disclaimer, kindLabels, type Environment } from './domain';
import { environmentCompleteness } from './coverage';
import { logicalGraph } from './graph';
import { retailDocs, type Catalogue } from './catalogue';
import { bases, categories, formatMoney, summarize, type Ledger, type governance } from './ledger';

const navy = rgb(.09, .14, .23);
const muted = rgb(.28, .35, .44);
const blue = rgb(.14, .39, .92);
const border = rgb(.88, .92, .96);
const categoryColors = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#475569'];
const labels = { retail: 'Retail baseline', current: 'Current contract', forecast: 'Forecast effective' };
function swatch(hex: string) {
  return rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5), 16) / 255);
}

export async function report(env: Environment, result: Ledger, catalogue: Catalogue, assessment: ReturnType<typeof governance>) {
  const doc = await PDFDocument.create();
  doc.setTitle(`AI Economics Studio | ${env.name}`);
  doc.setSubject('Environment planning, cost ledger and logical architecture');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const charset = new Set(regular.getCharacterSet());
  const safe = (value: string) => Array.from(value, char => charset.has(char.codePointAt(0)!) ? char : char === '→' ? ' > ' : '?').join('');
  const generated = new Date().toISOString();
  const width = 595;
  const height = 842;
  const margin = 44;
  let page: PDFPage;
  let y = 0;

  function newPage() {
    page = doc.addPage([width, height]);
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: blue });
    page.drawText('AI ECONOMICS STUDIO', { x: margin, y: height - 35, size: 9, font: bold, color: blue });
    y = height - 65;
  }

  function reserve(points: number) { if (y - points < 52) newPage(); }

  function lines(value: string, font: PDFFont, size: number, limit: number) {
    const result: string[] = [];
    let current = '';
    for (const word of safe(value).split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= limit) { current = next; continue; }
      if (current) result.push(current);
      current = '';
      for (const char of word) {
        if (font.widthOfTextAtSize(current + char, size) > limit) {
          result.push(current);
          current = '';
        }
        current += char;
      }
    }
    return [...result, current];
  }
  function paragraph(value: string, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number } = {}) {
    const { size = 10, font = regular, color = navy, gap = 5 } = options;
    for (const line of lines(value, font, size, width - margin * 2)) {
      reserve(size + 4);
      page.drawText(line, { x: margin, y, size, font, color });
      y -= size + 4;
    }
    y -= gap;
  }
  function heading(value: string) {
    reserve(65);
    y -= 9;
    paragraph(value, { size: 17, font: bold, color: navy, gap: 7 });
  }
  const money = (value: string | null) => formatMoney(value, env.currency);
  const names = new Map([[env.id, env.name], ...env.objects.map(item => [item.id, item.name] as const)]);
  newPage();
  paragraph(env.name, { size: 27, font: bold });
  paragraph(`Environment economics report | ${generated}`, { color: muted });
  paragraph(disclaimer, { color: muted });
  if (env.description) paragraph(env.description);
  heading('Executive summary');
  for (const basis of bases) {
    const total = result.summary[basis];
    const any = result.lines.length > total.incomplete;
    paragraph(`${labels[basis]}: ${any ? money(total.known) : 'Unknown'} monthly known subtotal | ${any ? money(total.annual) : 'Unknown'} annual run-rate | ${total.incomplete} incomplete`, { font: bold });
  }
  paragraph('Annual figures are steady-state monthly subtotals multiplied by 12. Unknown amounts are excluded from known subtotals. Taxes, contractual FX and usage growth are outside the estimate.', { color: muted });
  heading('Environment and source coverage');
  const completeness = environmentCompleteness(result);
  paragraph(`${completeness.fully} fully priced | ${completeness.partial} partial | ${completeness.unresolved} unresolved | ${completeness.excluded} missing configuration | ${completeness.retail} using verified retail | ${completeness.manual} using customer rates`);
  paragraph(`Currency ${env.currency} | Default region ${env.region} | ${env.objects.length} objects | ${env.relationships.length} declared links`);
  for (const [kind, label] of Object.entries(kindLabels)) {
    const count = env.objects.filter(item => item.kind === kind).length;
    if (count) paragraph(`${label}: ${count}`, { gap: 0 });
  }
  paragraph(`Catalogue ${catalogue.manifest.catalogueId ?? 'unpublished'} | ${catalogue.records.length} retail meters | Last successful check ${catalogue.manifest.lastCheckedAt ?? 'unavailable'}`);
  heading('Financial overview by category');
  categories.forEach((category, index) => {
    const categoryLines = result.lines.filter(line => line.category === category);
    const total = summarize(categoryLines, env.currency).current;
    reserve(22);
    page.drawRectangle({ x: margin - 12, y: y - 1, width: 7, height: 7, color: swatch(categoryColors[index]) });
    paragraph(`${category}: ${categoryLines.length > total.incomplete ? money(total.known) : '—'} | ${total.incomplete} incomplete`);
  });
  const drivers = result.lines.filter(line => line.amounts.current !== null)
    .sort((a, b) => Number(b.amounts.current) - Number(a.amounts.current)).slice(0, 3);
  heading('Drivers and uncertainty');
  if (!drivers.length) paragraph('No priced cost drivers yet.');
  for (const line of drivers) paragraph(`${line.object} / ${line.component}: ${money(line.amounts.current)} per month`);
  paragraph('Flat usage rates scale with declared quantity. Graduated tariffs charge only the units in each band. Shared provisioned capacity scales with capacity and hours. Review input, output, seat and credit assumptions before relying on a forecast.', { color: muted });
  newPage();
  heading('Logical architecture');
  paragraph('Conceptual object relationships for planning. Topology, traffic and security boundaries are outside its scope.', { color: muted });
  const graph = logicalGraph(env, result);
  if (!graph.nodes.length) paragraph('No objects to diagram.');
  if (graph.nodes.length) {
    const scale = Math.min(1, (width - margin * 2) / graph.width, 410 / graph.height);
    reserve(graph.height * scale + 20);
    const diagramPage = page!;
    const top = y;
    for (const edge of graph.edges) {
      edge.points.slice(1).forEach((point, index) => {
        const prior = edge.points[index];
        diagramPage.drawLine({ start: { x: margin + prior.x * scale, y: top - prior.y * scale },
          end: { x: margin + point.x * scale, y: top - point.y * scale }, color: muted, thickness: .8 });
      });
    }
    for (const node of graph.nodes) {
      const x = margin + (node.x - node.width / 2) * scale;
      const y = top - (node.y + node.height / 2) * scale;
      diagramPage.drawRectangle({ x, y, width: node.width * scale, height: node.height * scale, borderColor: swatch(node.color), borderWidth: .8, color: rgb(1, 1, 1) });
      diagramPage.drawText(safe(node.name.slice(0, 25)), { x: x + 8 * scale, y: y + 37 * scale, font: bold, size: 13 * scale, color: navy });
      diagramPage.drawText(safe(`${node.type}${node.shared ? ' / Shared' : ''}${node.incomplete ? ' / Draft' : ''}`),
        { x: x + 8 * scale, y: y + 16 * scale, font: regular, size: 10 * scale, color: muted });
    }
    y -= graph.height * scale + 22;
    heading('Architecture register');
    for (const node of graph.nodes) paragraph(`${node.name} | ${node.type}${node.shared ? ' | Shared' : ''}${node.incomplete ? ' | Needs review' : ''}${node.annotation ? ' | ' + node.annotation : ''}`, { gap: 0 });
    for (const edge of env.relationships) paragraph(`${names.get(edge.from)} → ${names.get(edge.to)} | ${edge.type}`, { size: 9, color: muted, gap: 0 });
  }
  heading('Itemised monthly cost ledger');
  if (!result.lines.length) paragraph('No ledger entries.');
  for (const line of result.lines) {
    reserve(94);
    paragraph(`${line.category} | ${line.object} / ${line.component}`, { font: bold, gap: 1 });
    paragraph(`Quantity: ${line.quantity ?? 'unknown'} | ${line.meter ? `${line.meter.sku} / ${line.meter.region} / ${line.meter.unit} (${line.meter.quantityPerUnit} base units)` : 'Billing unit unresolved'} | ${line.status}`, { gap: 1 });
    paragraph(bases.map(basis => `${labels[basis]}: ${money(line.amounts[basis])} (rate ${line.rates[basis] ?? 'unknown'})`).join(' | '), { gap: 1 });
    if (line.reason) paragraph(line.reason, { color: muted, gap: 1 });
    if (line.agreement) paragraph(`User agreement: ${line.agreement.mode} | ${line.agreement.reason} | ${line.agreement.effectiveAt ?? 'undated'}`, { gap: 1 });
    if (line.source) paragraph(`Retail source: ${line.source.source} | ${line.source.review ? 'Reviewed ' + line.source.review.checkedAt + ' | ' + line.source.review.terms : 'Effective ' + line.source.effectiveAt + ' | Validated ' + (catalogue.manifest.lastCheckedAt ?? 'unknown')}`, { size: 9, color: muted, gap: 1 });
    if (line.source?.tiers) paragraph(`Graduated bands (base units / rate): ${line.source.tiers.map(tier => `${tier.from} / ${tier.price}`).join(' | ')}. Displayed rates are blended at this usage.`, { size: 9, color: muted, gap: 1 });
    if (line.includedCredits) paragraph(`${line.includedCredits} Copilot credits covered by linked packs. Quantity shown is residual billable usage.`, { size: 9, color: muted, gap: 1 });
    if (line.allocatesTo.length) paragraph(line.allocation ? `Shared allocation by input tokens: ${line.allocation.map(share => `${names.get(share.agentId)} ${money(share.amount)}`).join(' / ')}`
      : 'Shared charge counted once. Allocation unassigned.', { gap: 1 });
    paragraph(`Scenario for this line: ${line.scenario}%`, { color: muted });
  }
  heading('Governance advisory findings');
  paragraph('Ruleset 1.0.0. Based on modelled declarations and Microsoft guidance. Independent review is required to validate actual controls.', { color: muted });
  if (!assessment.length) paragraph('No applicable checks yet.');
  for (const item of assessment) {
    reserve(64);
    paragraph(`${item.object} | ${item.title} | ${item.status}`, { font: bold, gap: 0 });
    paragraph(`${item.why} ${item.source}`, { size: 9, color: muted });
  }
  heading('Assumptions and source appendix');
  paragraph(`Global forecast ${env.forecast.percent}% | Fixed contracts ${env.forecast.applyToFixed ? 'included in' : 'excluded from'} global forecast | Meter exceptions ${env.forecast.exceptions.length}`);
  paragraph('Quantity divided by billing unit, multiplied by decimal unit rate for each flat rate or graduated band. Each ledger line rounds half up to the currency minor unit. Allocations reconcile to the rounded fixed charge.');
  paragraph(`Azure Retail Prices API: ${retailDocs}`);
  for (const issue of result.issues) paragraph(`${names.get(issue.id)}: ${issue.message}`, { size: 9, gap: 1 });
  paragraph(disclaimer, { color: muted });
  doc.getPages().forEach((page, index, pages) => {
    page.drawLine({ start: { x: margin, y: 40 }, end: { x: width - margin, y: 40 }, color: border, thickness: 1 });
    page.drawText(`AI Economics Studio | ${index + 1} / ${pages.length}`, { x: margin, y: 25, size: 8, font: regular, color: muted });
  });
  return doc.save();
}

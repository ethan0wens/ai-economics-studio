import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFName } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, it } from 'vitest';
import { enterpriseInventory, referenceAt, scenarios } from '../fixtures/enterprise-scenarios';
import type { Catalogue } from '../src/catalogue';
import { environmentSchema, type Environment } from '../src/domain';
import { formatMoney, governance, ledger } from '../src/ledger';
import { report, type ReportFormat } from '../src/report';

const generated = new Date('2026-11-21T10:30:00Z');
const artifactDirectory = process.env.STUDIO_PDF_ARTIFACTS;
const pricingTime = '2026-11-18T12:00:00Z';

function pick(env: Environment, ids: string[]): Environment {
  return { ...env, objects: env.objects.filter(item => ids.includes(item.id)), relationships: env.relationships.filter(edge =>
    ids.includes(edge.from) && ids.includes(edge.to)) };
}

const base = scenarios[0].env;
const simple = pick(base, ['Assistant deployment', 'Support assistant', 'Enterprise demand']);
const fullName = 'Fictional customer knowledge assistant for distributed support teams and cross-region customer service '.repeat(2).trim();
const large: Environment = {
  ...base, name: 'Fictional dense service network',
  objects: [...base.objects, ...Array.from({ length: 55 }, (_, index) => ({
    id: `group-${index}`, name: `Fictional service desk ${index + 1}`, kind: 'user-group' as const, intended: 150, active: 120, population: 160,
  }))],
  relationships: [...base.relationships, ...Array.from({ length: 55 }, (_, index) => ({
    from: `group-${index}`, to: 'Support assistant', type: 'group-can-access-agent' as const,
  }))],
};

const cases = [
  { key: '01-foundry', env: simple, records: scenarios[0].records },
  { key: '02-copilot', env: pick(scenarios[1].env, ['Agent B']), records: scenarios[1].records },
  { key: '03-shared-capacity', env: scenarios[2].env, records: scenarios[2].records, expected: scenarios[2].expected },
  { key: '04-enterprise', env: base, records: scenarios[0].records, expected: scenarios[0].expected },
  { key: '05-unresolved', env: scenarios[4].env, records: scenarios[4].records, expected: scenarios[4].expected },
  { key: '06-contracts', env: scenarios[5].env, records: scenarios[5].records, expected: scenarios[5].expected },
  { key: '07-long-content', env: { ...simple, name: fullName, description: 'Fictional report assumptions. '.repeat(9).trim(),
    objects: simple.objects.map(object => object.kind === 'agent' ? { ...object, name: fullName } : object) }, records: scenarios[0].records },
  { key: '08-unicode', env: { ...simple, name: 'Fictional · Łódź, Αθήνα, 東京, 中文, Москва 🧪', description: 'Résumé équipe 研发' }, records: scenarios[0].records },
  { key: '09-dense-architecture', env: large, records: scenarios[0].records },
  { key: '10-unknown', env: { ...base, name: 'Fictional unresolved draft',
    objects: [{ id: 'draft', name: 'Fictional service draft', kind: 'supporting-resource' as const }], relationships: [] }, records: [] },
  { key: '11-existing-and-incremental', env: scenarios[3].env, records: scenarios[3].records, expected: scenarios[3].expected },
  { key: '12-accepted-value', env: { ...scenarios[4].env, valuePlan: { currency: 'GBP', assumptions: {
    audience: { value: 200, source: 'fictional' as const }, adoption: { value: 50, source: 'fictional' as const },
    tasks: { value: 20, source: 'fictional' as const }, minutes: { value: 12, source: 'fictional' as const, note: 'Fictional pilot timing' },
    realisation: { value: 60, source: 'fictional' as const }, hourlyValue: { value: 25, source: 'fictional' as const },
  } } }, records: scenarios[4].records, expected: scenarios[4].expected },
];

async function inspect(bytes: Uint8Array, format: ReportFormat) {
  const task = getDocument({ data: bytes.slice() });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    let landscape = 0;
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const bounds = page.getViewport({ scale: 1 });
      if (bounds.width > bounds.height) landscape++;
      const content = await page.getTextContent();
      const items = content.items.filter(item => 'str' in item && item.str.trim()).flatMap(item => 'str' in item ? [item] : []);
      expect(items.length, `blank page ${pageNumber}`).toBeGreaterThan(4);
      const lines: { x: number; y: number; end: number }[] = [];
      for (const item of items) {
        const [, , , , x, y] = item.transform;
        const bound = `page ${pageNumber} item “${item.str}”`;
        expect(x, bound).toBeGreaterThanOrEqual(44.9);
        expect(x + item.width, bound).toBeLessThanOrEqual(bounds.width - 43);
        expect(y, bound).toBeGreaterThanOrEqual(20);
        expect(y + item.height, bound).toBeLessThanOrEqual(bounds.height - 20);
        for (const line of lines) {
          if (Math.abs(line.y - y) < .7) expect(Math.min(line.end, x + item.width) - Math.max(line.x, x), bound).toBeLessThan(.9);
        }
        lines.push({ x, y, end: x + item.width });
      }
      pages.push(items.map(item => item.str).join(' ').replace(/\s+/g, ' '));
      expect(pages.at(-1)).toContain(`Page ${pageNumber} of ${doc.numPages}`);
    }
    if (format === 'full') expect(landscape).toBeGreaterThan(0);
    else expect(landscape).toBe(0);
    return pages;
  } finally {
    await task.destroy();
  }
}

for (const { key, env, records, expected } of cases) {
  it(`${key} renders both report formats with matching ledger values and in-bounds text`, async () => {
    const accepted = environmentSchema.parse(env);
    const result = ledger(accepted, records, referenceAt, enterpriseInventory);
    const catalogueId = records.length ? createHash('sha256').update(JSON.stringify(records)).digest('hex') : null;
    const catalogue: Catalogue = { records, manifest: { schemaVersion: '1.0.0', records: records.length, catalogueId,
      lastCheckedAt: records.length ? pricingTime : null, previous: null } };
    const full = await report(accepted, result, catalogue, governance(accepted), 'full', generated);
    const summary = await report(accepted, result, catalogue, governance(accepted), 'executive', generated);
    if (artifactDirectory) {
      await mkdir(artifactDirectory, { recursive: true });
      await writeFile(join(artifactDirectory, `${key}-full.pdf`), full);
      await writeFile(join(artifactDirectory, `${key}-executive.pdf`), summary);
    }
    const fullPages = await inspect(full, 'full');
    const summaries = await inspect(summary, 'executive');
    const text = fullPages.join(' ');
    const current = result.summary.current;
    const completeCharges = result.lines.length - current.incomplete;
    const monthly = completeCharges ? formatMoney(current.known, env.currency) : 'Unknown';
    const annual = completeCharges ? formatMoney(current.annual, env.currency) : 'Unknown';
    if (expected) expect(current).toMatchObject({ known: expected.monthly, annual: expected.annual, incomplete: expected.missing });
    for (const pages of [fullPages, summaries]) {
      expect(pages[0]).toContain('AI Environment Cost Assessment');
      expect(pages[1]).toContain(`${current.incomplete ? 'Monthly known-cost subtotal' : 'Estimated monthly cost'} ${monthly}`);
      expect(pages[1]).toContain(`Current estimate ${monthly} ${annual} ${current.incomplete}`);
      expect(pages.join(' ')).toContain('Modelled environment');
    }
    expect(text).toContain('Contents');
    expect(text).toContain('Logical architecture');
    expect(text).toContain('Charge component');
    expect(text).toContain('Assumptions and sources');
    expect(text).toContain(generated.toISOString());
    if (records.length) expect(text).toContain(pricingTime);
    expect(summaries.join(' ')).not.toContain('Charge details');
    expect(summaries.join(' ')).toContain('Items requiring review');
    if (key === '01-foundry') {
      expect(summaries.length).toBeGreaterThanOrEqual(2);
      expect(summaries.length).toBeLessThanOrEqual(4);
      expect(text.match(/https:\/\/prices\.azure\.com\/api\/retail\/prices/g)).toHaveLength(1);
    }
    if (key === '03-shared-capacity') expect(text).toContain('Shared allocation by input tokens');
    if (key === '04-enterprise') expect(summaries).toHaveLength(3);
    if (key === '05-unresolved') expect(text).toContain('Known-cost subtotal');
    if (key === '06-contracts') {
      expect(fullPages[1]).toContain('Retail baseline £605.00');
      expect(fullPages[1]).toContain('Price forecast £460.32');
      expect(text).toContain('Fictional fixed contract');
    }
    if (key === '07-long-content') expect(text).toContain(fullName);
    if (key === '08-unicode') {
      for (const label of ['Łódź', 'Αθήνα', '東京', '中文', 'Москва', '研发']) expect(text).toContain(label);
    }
    if (key === '09-dense-architecture') {
      expect(text).toContain('Grouped relationship map');
      expect(text).toContain('R062');
      expect(fullPages.filter(page => page.includes('Full component name')).length).toBeGreaterThan(1);
    }
    if (key === '10-unknown') {
      expect(fullPages[1]).toContain('Monthly known-cost subtotal Unknown');
      expect(fullPages[1]).not.toContain('£0.00');
      expect(text).toContain('Percentage bars are omitted');
    }
    if (key === '11-existing-and-incremental') {
      expect(fullPages[1]).toContain('Existing licence spend £12,000.00');
      expect(fullPages[1]).toContain('Proposed licence spend £15,470.00');
    }
    if (key === '12-accepted-value') {
      for (const pages of [fullPages, summaries]) {
        const all = pages.join(' ');
        expect(all).toContain('Potential Business Value');
        expect(all).toContain('Assumed economic equivalent £6,000.00 £72,000.00');
        expect(all).toContain('with 1 unresolved charge');
        expect(all).not.toContain('Illustrative adoption comparison');
      }
      expect(text).toContain('Fictional pilot timing');
      expect(text).toContain('Accepted value assumptions');
    }
    const doc = await PDFDocument.load(full);
    expect(doc.getTitle()).toContain('AI Economics Studio |');
    expect(doc.getCreationDate()).toEqual(generated);
    expect(doc.context.enumerateIndirectObjects().map(([, object]) => object.toString()).join(' ')).toContain('/FontFile2');
    expect(doc.catalog.has(PDFName.of('OpenAction'))).toBe(false);
    expect(doc.getPages().every(page => (page.node.Annots()?.size() ?? 0) === 0)).toBe(true);
  }, 35_000);
}

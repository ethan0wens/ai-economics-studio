import { compatibilityEvidence } from '../src/compatibility';
import { capacityEvidence } from '../src/provisioned';
import { inventorySchema, type Offering } from '../src/offerings';
import { capabilityCells, exactKey, lifecycleCells, regionalCells, sizingCells, slug } from './microsoft-foundry';
import { capabilitySource, lifecycleSource, regionSource } from './microsoft-source';
import type { MaintenanceHealth, ReviewGroup } from '../src/catalogue-health';

type State = MaintenanceHealth['unresolved'][number]['kind'];
export type RecordIssue = (group: ReviewGroup, id: string, kind: State, source: string, detail: string) => void;
export type RecordChange = (group: ReviewGroup, id: string, kind: 'automatic' | 'conditional', detail: string) => void;
export type Check = (group: ReviewGroup) => void;
export const windowAt = (at: string) => ({
  verifiedOn: at.slice(0, 10),
  reviewBy: new Date(Date.parse(at) + 45 * 86_400_000).toISOString().slice(0, 10),
});
export function renew<T extends { verifiedOn: string; observedSince?: string }>(row: T, at: string) {
  return { ...windowAt(at), observedSince: row.observedSince ?? row.verifiedOn };
}
type Matrix = typeof compatibilityEvidence;
type Region = Matrix['regions'][number];
type RegionalCell = Exclude<ReturnType<typeof regionalCells> extends Map<string, infer V> ? V : never, null>;

type Inputs = {
  regionHtml?: string; capabilitiesHtml?: string; sizingHtml?: string; lifecycleHtml?: string;
  matrix: Matrix; sizing: typeof capacityEvidence; discovered: Offering[]; inventory: Offering[]; at: string;
  issue: RecordIssue; change: RecordChange; check: Check;
};

function positive(status: Region['status']) { return status === 'compatible' || status === 'conditional'; }
const groupKey = (row: Region) => exactKey(row.models[0], row.version, row.sku, row.regions[0]);
const tokenComponents = [
  { id: 'input' as const, label: 'Uncached input tokens', unit: '1M', quantityPerUnit: 1_000_000 },
  { id: 'output' as const, label: 'Output tokens', unit: '1M', quantityPerUnit: 1_000_000 },
];

export function reconcileTechnical(input: Inputs) {
  const { at, issue, change, check } = input;
  const dates = windowAt(at);
  const regions = input.regionHtml ? regionalCells(input.regionHtml) : new Map();
  const capabilities = input.capabilitiesHtml ? capabilityCells(input.capabilitiesHtml) : new Map();
  const sizes = input.sizingHtml ? sizingCells(input.sizingHtml) : new Map();
  const lifecycles = input.lifecycleHtml ? lifecycleCells(input.lifecycleHtml) : new Map();
  const matrix = structuredClone(input.matrix);
  const discovered = [...input.discovered];
  const knownModels = new Set<string>();
  const newModels: MaintenanceHealth['discovered'] = [];
  const activeRegions = new Map<string, RegionalCell>();
  const existingSizing = new Map(input.sizing.map(row => [exactKey(row.models[0], row.version, row.sku), row]));
  const seenRegions = new Set<string>();

  matrix.regions = matrix.regions.flatMap(row => {
    const cells = row.models.flatMap(model => row.regions.map(region => ({ model, region, key: exactKey(model, row.version, row.sku, region) })));
    const matches = cells.map(cell => regions.get(cell.key));
    for (const [index, cell] of cells.entries()) {
      seenRegions.add(cell.key);
      knownModels.add(exactKey(cell.model, row.version));
      const match = matches[index];
      if (!match) {
        issue('compatibility', cell.key, match === null ? 'ambiguous' : 'unmapped', row.source,
          match === null ? 'Microsoft tables give conflicting availability marks for this cell.' : 'The exact model, version, deployment SKU and region were not established in the current source.');
      } else {
        check('compatibility');
        if (positive(match.status)) activeRegions.set(cell.key, match);
      }
    }
    if (matches.every(match => match?.status === row.status)) return [{ ...row, ...renew(row, at) }];
    if (matches.every(match => !match)) return [row];
    return cells.map(({ model, region, key }, index) => {
      const match = matches[index];
      const id = index === 0 ? row.id : `maint-region-${slug(key)}`;
      const base = { ...row, id, models: [model], regions: [region] };
      if (!match) return base;
      if (!positive(match.status) && existingSizing.get(exactKey(model, row.version, row.sku))?.regions?.includes(region)) {
        issue('compatibility', key, 'ambiguous', row.source, 'A new explicit exclusion conflicts with existing region-scoped PTU evidence. Await consistent official evidence.');
        return base;
      }
      if (match.status !== row.status) change('compatibility', id, 'conditional', `${key} changed to ${match.status}.`);
      return { ...base, ...(match.status === row.status ? renew(row, at) : { ...dates, observedSince: undefined }), status: match.status, source: match.source, condition: regionalCondition(match.status) };
    });
  });

  for (const [key, record] of regions) {
    if (seenRegions.has(key)) continue;
    if (!record) {
      issue('compatibility', key, 'ambiguous', regionSource, 'Microsoft tables give conflicting availability marks for this cell.');
      continue;
    }
    if (!positive(record.status) && !knownModels.has(exactKey(record.model, record.version))) continue;
    const id = `maint-region-${slug(key)}`;
    matrix.regions.push({ ...dates, id, models: [record.model.toLowerCase()], version: record.version,
      sku: record.sku, regions: [record.region], status: record.status, source: record.source, condition: regionalCondition(record.status) });
    check('compatibility');
    if (positive(record.status)) activeRegions.set(key, record);
    change('compatibility', id, 'automatic', `${key} added as ${record.status} in the official regional table.`);
  }

  const billed = new Set(input.inventory.flatMap(offer => offer.kind === 'model-deployment'
    ? [exactKey(offer.model.id, offer.model.version, offer.model.sku, offer.region)] : []));
  const ids = new Set(input.inventory.map(offer => offer.id));
  for (const [key, cell] of activeRegions) {
    if (billed.has(key)) continue;
    const modelKey = exactKey(cell.model, cell.version);
    const options = capabilities.get(modelKey) ?? matrix.capabilities.find(row =>
      row.version === cell.version && row.models.includes(cell.model.toLowerCase()) && row.reviewBy >= dates.verifiedOn);
    const lifecycle = lifecycles.get(modelKey);
    if (lifecycle?.timing === 'retirement' && lifecycle.date <= dates.verifiedOn) continue;
    const provisioned = cell.deployment.endsWith('provisioned');
    if (!provisioned && !(options?.input.includes('text') && options.output.includes('text'))) {
      issue('compatibility', key, 'unmapped', capabilitySource, 'Availability is discoverable. The billing dimensions for this exact model version require separate evidence.');
      continue;
    }
    const id = `foundry-${slug(cell.model)}-${slug(cell.version)}-${cell.deployment}-${cell.region}`;
    if (ids.has(id)) {
      issue('compatibility', key, 'ambiguous', cell.source, 'The generated stable offering ID conflicts with an existing offering.');
      continue;
    }
    const candidate = { id, family: 'foundry', kind: 'model-deployment', name: `${cell.model} · ${cell.version}`, currency: 'GBP', region: cell.region,
      model: { id: cell.model, version: cell.version, sku: cell.sku, mode: provisioned ? 'provisioned' : 'payg' },
      components: provisioned ? [{ id: 'capacity', label: 'Provisioned throughput', unit: '1 Hour', quantityPerUnit: 1 }] : tokenComponents,
      deployment: cell.deployment, evidence: cell.source, note: 'Official regional availability. Retail tariff is verified independently.' };
    discovered.push(inventorySchema.parse([candidate])[0]);
    ids.add(id);
    newModels.push({ model: cell.model, version: cell.version, sku: cell.sku, region: cell.region });
    change('compatibility', id, 'automatic', `Added ${key} to the priceable inventory. Exact retail is checked independently.`);
  }

  for (const rule of matrix.capabilities) {
    if (!input.capabilitiesHtml) continue;
    const matches = rule.models.map(model => capabilities.get(exactKey(model, rule.version)));
    if (!matches.every(observed => observed && observed.input.join('|') === [...rule.input].sort().join('|') &&
      observed.output.join('|') === [...rule.output].sort().join('|') && rule.features.every(feature => observed.features.includes(feature)))) {
      issue('compatibility', rule.id, 'unmapped', rule.source, 'Current structured source did not establish every capability in the previous claim.');
      continue;
    }
    Object.assign(rule, renew(rule, at));
    check('compatibility');
  }
  const knownCapabilities = new Set(matrix.capabilities.flatMap(rule => rule.models.map(model => exactKey(model, rule.version))));
  for (const [key, entry] of capabilities) {
    if (!entry || knownCapabilities.has(key) || ![...activeRegions.values()].some(cell => exactKey(cell.model, cell.version) === key)) continue;
    matrix.capabilities.push({ ...dates, id: `maint-capability-${slug(key)}`, models: [entry.model.toLowerCase()], version: entry.version,
      status: 'compatible', input: entry.input, output: entry.output, features: entry.features, source: capabilitySource,
      condition: 'Microsoft lists these model-level capabilities. Check the selected deployment and integration independently.' });
    check('compatibility');
    change('compatibility', `maint-capability-${slug(key)}`, 'automatic', 'Added exact version capabilities from the documented model table.');
  }

  const sizing = input.sizing.map(row => {
    const found = row.models.map(model => sizes.get(exactKey(model, row.version, row.sku)));
    if (!found.every(record => record && (row.regions ?? []).every(region => activeRegions.has(exactKey(record.model, row.version, row.sku, region))))) {
      issue('ptu', row.id, found.includes(null) ? 'ambiguous' : 'unmapped', row.source, 'The sizing values or the exact regional availability could not be reverified.');
      return row;
    }
    const [, ...other] = found;
    const observed = found[0]!;
    const values = ({ minimum, increment, inputTpmPerPtu, outputWeight }: typeof row) => ({ minimum, increment, inputTpmPerPtu, outputWeight });
    const differs = (value: typeof row) => JSON.stringify(values(value)) !== JSON.stringify(values(observed as typeof row));
    if (other.some(record => differs(record as typeof row))) {
      issue('ptu', row.id, 'ambiguous', row.source, 'The reviewed grouped rule contains models with different published PTU requirements.');
      return row;
    }
    check('ptu');
    if (differs(row)) change('ptu', row.id, 'conditional', 'Official minimum, increment or reference throughput changed.');
    const allRegions = [...new Set([...row.regions ?? [], ...[...activeRegions.values()].filter(cell =>
      cell.version === row.version && cell.sku === row.sku && row.models.length === 1 &&
      row.models.includes(cell.model.toLowerCase())).map(cell => cell.region)])].sort();
    return { ...row, ...values(observed as typeof row), ...(differs(row) ? { ...dates, observedSince: undefined } : renew(row, at)), regions: allRegions };
  });
  for (const [key, row] of sizes) {
    if (!row || existingSizing.has(key)) continue;
    const location = [...activeRegions.values()].filter(cell => exactKey(cell.model, cell.version, cell.sku) === key).map(cell => cell.region);
    if (!location.length) continue;
    const { model, ...evidence } = row;
    const id = `maint-sizing-${slug(key)}`;
    sizing.push({ ...dates, ...evidence, id, models: [model.toLowerCase()], regions: [...new Set(location)].sort(),
      condition: 'Published model-version sizing parameters. Capacity and tenant quota require separate confirmation.' });
    check('ptu');
    change('ptu', id, 'automatic', 'Added documented sizing for exact positive regional cells.');
  }

  const lifecycleList: MaintenanceHealth['lifecycle'] = [];
  const processed = new Set<string>();
  matrix.lifecycle = matrix.lifecycle.flatMap(row => {
    if (row.sku) return [row];
    if (!row.models.some(model => lifecycles.get(exactKey(model, row.version)))) {
      for (const model of row.models) {
        const key = exactKey(model, row.version);
        processed.add(key);
        issue('lifecycle', key, lifecycles.get(key) === null ? 'ambiguous' : 'unmapped',
          row.source, 'Current official tables did not establish a single retirement schedule for this model version.');
      }
      return [row];
    }
    return row.models.map((model, index) => {
      const key = exactKey(model, row.version);
      const evidence = lifecycles.get(key);
      processed.add(key);
      const id = index ? `maint-lifecycle-${slug(key)}` : row.id;
      if (!evidence) {
        issue('lifecycle', key, evidence === null ? 'ambiguous' : 'unmapped', row.source, 'Current official tables did not establish a single retirement schedule for this model version.');
        return { ...row, id, models: [model] };
      }
      check('lifecycle');
      if (row.date !== evidence.date || row.timing !== evidence.timing || row.replacement !== evidence.replacement) {
        change('lifecycle', id, 'conditional', 'Published retirement timing or listed replacement changed.');
      }
      lifecycleList.push({ model, version: row.version, date: evidence.date, timing: evidence.timing, replacement: evidence.replacement });
      return { ...row, ...(row.date === evidence.date && row.timing === evidence.timing ? renew(row, at) : { ...dates, observedSince: undefined }), id, models: [model], date: evidence.date, timing: evidence.timing, replacement: evidence.replacement };
    });
  });
  for (const [key, row] of lifecycles) {
    if (!row || processed.has(key) || (!knownModels.has(key) && ![...regions.keys()].some(value => value.startsWith(key + '|')))) continue;
    const id = `maint-lifecycle-${slug(key)}`;
    matrix.lifecycle.push({ ...dates, id, status: 'conditional', models: [row.model.toLowerCase()], version: row.version,
      date: row.date, timing: row.timing, replacement: row.replacement, source: lifecycleSource,
      condition: 'Microsoft publishes this deployment retirement timeline. Verify any regional and customer migration exceptions.' });
    lifecycleList.push({ model: row.model, version: row.version, date: row.date, timing: row.timing, replacement: row.replacement });
    check('lifecycle');
    change('lifecycle', id, 'conditional', 'Added an exact-version retirement observation.');
  }
  for (const row of matrix.lifecycle) for (const model of row.models) {
    if (!lifecycleList.some(entry => exactKey(entry.model, entry.version) === exactKey(model, row.version))) {
      lifecycleList.push({ model, version: row.version, date: row.date, timing: row.timing, replacement: row.replacement });
    }
  }
  matrix.regions.sort((a, b) => groupKey(a).localeCompare(groupKey(b)));
  return { matrix, sizing, discovered, newModels, lifecycleList };
}

function regionalCondition(status: Region['status']) {
  return status === 'incompatible' ? 'Microsoft explicitly marks this exact model version and deployment type unavailable in the selected region.' :
    status === 'conditional' ? 'Microsoft lists this exact regional cell with conditions. Confirm tenant quota, capacity and applicable limitations.' :
    'Microsoft lists this exact model version and deployment type in this region. Check customer quota and processing location separately.';
}

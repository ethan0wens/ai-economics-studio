import { main, normalize, tables, regionSource, sizingSource, lifecycleSource } from './microsoft-source';

export const modes = {
  'Global Standard': ['GlobalStandard', 'global-standard'],
  'Data Zone Standard': ['DataZoneStandard', 'data-zone-standard'],
  'Standard/Regional': ['Standard', 'regional-standard'],
  'Regional Standard': ['Standard', 'regional-standard'],
  'Global Provisioned Managed': ['GlobalProvisionedManaged', 'global-provisioned'],
  'Data Zone Provisioned Managed': ['DataZoneProvisionedManaged', 'data-zone-provisioned'],
  'Regional Provisioned Managed': ['ProvisionedManaged', 'regional-provisioned'],
} as const;
type Mode = typeof modes[keyof typeof modes];
export const scopedRegions = ['uksouth', 'westeurope', 'eastus2'];
const modelPattern = /^([a-z0-9][a-z0-9._-]*)$/i;
const versionPattern = /^(?:\d{4}-\d{2}-\d{2}|\d{1,5}(?:\.\d{1,5}){0,2})$/;
const releasePattern = /^([a-z0-9][a-z0-9._-]*)\s*[(,]\s*(\d{4}-\d{2}-\d{2}|\d{1,5})\)?(?:\s+.*)?$/i;
export const exactKey = (...parts: string[]) => parts.map(item => item.toLowerCase()).join('|');
export const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/g, '');
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

type Observations<T> = Map<string, T | null>;
function observe<T>(result: Observations<T>, key: string, value: T) {
  if (result.has(key) && JSON.stringify(result.get(key)) !== JSON.stringify(value)) result.set(key, null);
  else result.set(key, value);
}

type Cell = { model: string; version: string; sku: Mode[0]; deployment: Mode[1]; region: string;
  status: 'compatible' | 'conditional' | 'incompatible'; source: string };
export function regionalCells(html: string) {
  const observed: Observations<Cell> = new Map();
  for (const table of tables(main(html))) {
    const section = table.headings.findLast(label => Object.hasOwn(modes, label)) as keyof typeof modes | undefined;
    if (!section || table.header[0]?.toLowerCase() !== 'model' || table.header[1]?.toLowerCase() !== 'version') continue;
    const [sku, deployment] = modes[section];
    for (const [model, version, ...locations] of table.rows) {
      if (!modelPattern.test(model) || !versionPattern.test(version) || locations.length !== table.header.length - 2) continue;
      for (const [index, cell] of locations.entries()) {
        const region = table.header[index + 2].toLowerCase();
        if (!scopedRegions.includes(region)) continue;
        const yes = /^✅(?:\s*\d+)?$/.test(cell);
        if (!yes && !/^(?:❌|—|–|-)$/u.test(cell)) continue;
        const status = yes ? deployment.endsWith('provisioned') || cell !== '✅' ? 'conditional' : 'compatible' : 'incompatible';
        observe(observed, exactKey(model, version, sku, region), {
          model, version, sku, deployment, region, status, source: `${regionSource}#${deployment.includes('regional-standard') ? 'regional-standard' : slug(section)}`,
        });
      }
    }
  }
  return observed;
}

type Sizing = { sku: 'GlobalProvisionedManaged' | 'DataZoneProvisionedManaged' | 'ProvisionedManaged';
  model: string; version: string; minimum: number; increment: number; inputTpmPerPtu?: number; outputWeight?: number; source: string };
function positive(value?: string) {
  const exact = (value ?? '').replaceAll(',', '');
  return /^\d+(?:\.\d+)?$/.test(exact) && Number(exact) > 0 ? Number(exact) : undefined;
}
export function sizingCells(html: string) {
  const observed: Observations<Sizing> = new Map();
  for (const table of tables(main(html))) {
    const rows = new Map(table.rows.map(([label, ...values]) => [label?.toLowerCase(), values]));
    for (const [index, label] of table.header.slice(1).entries()) {
      const found = releasePattern.exec(label);
      if (!found) continue;
      const [, model, version] = found;
      for (const [sku, field] of [['GlobalProvisionedManaged', 'global & data zone'], ['DataZoneProvisionedManaged', 'global & data zone'], ['ProvisionedManaged', 'regional']] as const) {
        const minimum = positive(rows.get(`${field} provisioned minimum deployment`)?.[index]);
        const increment = positive(rows.get(`${field} provisioned scale increment`)?.[index]);
        if (!Number.isInteger(minimum) || !Number.isInteger(increment) || !minimum || !increment) continue;
        observe(observed, exactKey(model, version, sku), { model, version, sku, minimum, increment,
          inputTpmPerPtu: positive(rows.get('input tpm per ptu')?.[index]),
          outputWeight: positive(rows.get('output-to-input ratio')?.[index]),
          source: sizingSource + '#deployment-parameters-and-throughput-values-by-model' });
      }
    }
  }
  return observed;
}

type Lifecycle = { model: string; version: string; date: string; timing: 'retirement' | 'no-earlier-than'; replacement?: string; source: string };
export function lifecycleCells(html: string) {
  const observed: Observations<Lifecycle> = new Map();
  for (const table of tables(main(html))) {
    if (exactKey(...table.header) !== 'model|version|lifecycle|retirement date|replacement') continue;
    for (const [model, version, , text, replacement] of table.rows) {
      if (!modelPattern.test(model) || !versionPattern.test(version)) continue;
      const date = /^(no earlier than )?(\d{4}-\d{2}-\d{2})(?:\s+\d+)?$/i.exec(text);
      if (!date || !validDate(date[2])) continue;
      const successor = replacement && (modelPattern.test(replacement) || releasePattern.test(replacement)) ? replacement : undefined;
      observe(observed, exactKey(model, version), {
        model, version, date: date[2], timing: date[1] ? 'no-earlier-than' : 'retirement', source: lifecycleSource,
        replacement: successor,
      });
    }
  }
  return observed;
}

const features = {
  'chat-completions': /\bchat completions api\b/i,
  responses: /\bresponses api\b/i,
  'function-calling': /\bfunction calling\b/i,
  'structured-outputs': /\bstructured outputs\b/i,
} as const;
type Capability = { model: string; version: string; input: string[]; output: string[]; features: string[] };
export function capabilityCells(html: string) {
  const observed: Observations<Capability> = new Map();
  for (const { header, rows } of tables(main(html))) {
    const capability = header.findIndex(label => /^(?:model )?(?:capabilities|features|description)$/i.test(label));
    if (!/^models?$/i.test(header[0]) || capability < 1) continue;
    for (const row of rows) {
      const model = releasePattern.exec(row[0]);
      const text = normalize(row[capability] ?? '');
      if (!model || /\b(?:does not support|not supported|without support)\b/i.test(text)) continue;
      const [, identity, version] = model;
      const modalities = (direction: string) => [...text.matchAll(new RegExp(`\\b((?:text|image|audio|video)(?:\\s*(?:,|and|/)\\s*(?:text|image|audio|video))*) ${direction}\\b`, 'gi'))]
        .flatMap(match => match[1].toLowerCase().match(/text|image|audio|video/g) ?? []);
      const input = [...new Set(modalities('input'))].sort();
      const output = [...new Set(modalities('output'))].sort();
      const supported = Object.entries(features).filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
      if (input.length && output.length) observe(observed, exactKey(identity, version), { model: identity, version, input, output, features: supported });
    }
  }
  return observed;
}

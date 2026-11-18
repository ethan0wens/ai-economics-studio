import type { Meter, StudioObject } from './domain';

export const copilotPack = { offeringId: 'copilot-credit-pack-gb', credits: 25_000 };

export const families = {
  foundry: 'Microsoft Foundry models',
  copilot: 'Copilot Studio',
  licensing: 'Microsoft licensing',
  infrastructure: 'Supporting Azure services',
  security: 'Security and governance',
} as const;
export type Family = keyof typeof families;
export type Component = 'input' | 'output' | 'capacity' | 'credits' | 'seats' | 'usage';
type PriceComponent = { id: Component; label: string; unit: string; quantityPerUnit: number; meterId?: string; sku?: string };
export type Offering = {
  id: string; name: string; family: Family; currency: string; region: string;
  components: readonly PriceComponent[]; note?: string;
} & (
  | { kind: 'model-deployment'; model: { id: string; version: string; sku: string; mode: 'payg' | 'provisioned' } }
  | { kind: 'supporting-resource' }
  | { kind: 'licence-entitlement' }
  | { kind: 'agent' }
);
export const offerings: readonly Offering[] = [
  { id: 'd2s-v3-uk-south', name: 'Azure VM D2s v3 (Linux, standard)', family: 'infrastructure', currency: 'GBP', region: 'uksouth',
    kind: 'supporting-resource', components: [{ id: 'usage', label: 'VM hours', unit: '1 Hour', quantityPerUnit: 1, meterId: 'b0567895-dd0e-4342-8f0b-5fec01296fd4', sku: 'Standard_D2s_v3' }] },
  { id: 'gpt-4o-mini-global-uksouth', name: 'GPT-4o mini · Global Standard', family: 'foundry', currency: 'GBP', region: 'uksouth', kind: 'model-deployment',
    model: { id: 'gpt-4o-mini', version: '2024-07-18', sku: 'GlobalStandard', mode: 'payg' },
    note: 'Uncached text inference. The billing region is UK South. Confirm model availability and deployment eligibility separately.',
    components: [
      { id: 'input', label: 'Input tokens', unit: '1K', quantityPerUnit: 1000, meterId: '2e780e90-134a-5a28-9ae7-c88d60e0991c' },
      { id: 'output', label: 'Output tokens', unit: '1K', quantityPerUnit: 1000, meterId: '0fc389f1-33b6-5613-b3e8-9c98a4e64bef' },
    ] },
  { id: 'gpt-4-1-mini-global-uksouth', name: 'GPT-4.1 mini · Global Standard', family: 'foundry', currency: 'GBP', region: 'uksouth', kind: 'model-deployment',
    model: { id: 'gpt-4.1-mini', version: '2025-04-14', sku: 'GlobalStandard', mode: 'payg' },
    note: 'Uncached text inference. The billing region is UK South. Confirm model availability and deployment eligibility separately.',
    components: [
      { id: 'input', label: 'Input tokens', unit: '1K', quantityPerUnit: 1000, meterId: '42139138-f24c-5191-8375-aeec138b3aaf' },
      { id: 'output', label: 'Output tokens', unit: '1K', quantityPerUnit: 1000, meterId: 'c48433a8-68d4-581f-aafb-2aeb1f039eb3' },
    ] },
  { id: 'search-basic-uksouth', name: 'Azure AI Search Basic', family: 'infrastructure', currency: 'GBP', region: 'uksouth', kind: 'supporting-resource',
    note: 'Enter search-unit hours, including each replica and partition. Model separately charged features separately.',
    components: [{ id: 'usage', label: 'Search-unit hours', unit: '1 Hour', quantityPerUnit: 1, meterId: '0c873ca2-4113-4997-8cf6-ad5df5775599' }] },
  { id: 'search-s1-uksouth', name: 'Azure AI Search Standard S1', family: 'infrastructure', currency: 'GBP', region: 'uksouth', kind: 'supporting-resource',
    note: 'Enter search-unit hours, including each replica and partition. Model separately charged features separately.',
    components: [{ id: 'usage', label: 'Search-unit hours', unit: '1 Hour', quantityPerUnit: 1, meterId: '412d6928-652a-44ec-8bbb-d1dea652b7a6' }] },
  { id: 'blob-hot-lrs-capacity-uksouth', name: 'Azure Blob Storage Hot LRS · capacity', family: 'infrastructure', currency: 'GBP', region: 'uksouth', kind: 'supporting-resource',
    note: 'Enter total average GB-month allocated to this billing scope. Add operations as separate items.',
    components: [{ id: 'usage', label: 'GB-month', unit: '1 GB/Month', quantityPerUnit: 1, meterId: '758b46f1-1579-4490-a54a-9829ff267c51' }] },
  { id: 'blob-hot-lrs-write-uksouth', name: 'Azure Blob Storage Hot LRS · write operations', family: 'infrastructure', currency: 'GBP', region: 'uksouth', kind: 'supporting-resource',
    note: 'Enter individual write operations per month. Microsoft prices blocks of 10,000.',
    components: [{ id: 'usage', label: 'Write operations', unit: '10K', quantityPerUnit: 10000, meterId: '21b293cd-60dc-418f-9b98-2b452ed0de09' }] },
  { id: 'sql-s0-uksouth', name: 'Azure SQL Database Single Standard S0', family: 'infrastructure', currency: 'GBP', region: 'uksouth', kind: 'supporting-resource',
    note: 'Enter total S0 database-days. Backup, replicas and other extras are separate.',
    components: [{ id: 'usage', label: 'Database-days', unit: '1/Day', quantityPerUnit: 1, meterId: '30cf8266-ff5a-4f43-aa52-fa4d080ee691' }] },
  { id: 'bandwidth-internet-out-uksouth', name: 'Azure Internet egress · Internet routing preference', family: 'infrastructure', currency: 'GBP', region: 'uksouth', kind: 'supporting-resource',
    note: 'Enter total monthly GB in the eligible billing scope once. Keep other routing preferences and separately billed traffic outside this line.',
    components: [{ id: 'usage', label: 'GB transferred', unit: '1 GB', quantityPerUnit: 1, meterId: '6bd64e8e-5cb9-49d3-893d-800c9b28dca3' }] },
  { id: 'copilot-credit-pack-gb', name: 'Copilot Studio · 25,000-credit monthly pack', family: 'copilot', currency: 'GBP', region: 'gb',
    kind: 'supporting-resource', note: 'Enter whole packs per month. Link eligible Copilot Studio agents to this resource to allocate the shared pool once.',
    components: [{ id: 'usage', label: 'Monthly 25,000-credit packs', unit: 'pack/month', quantityPerUnit: 1 }] },
  { id: 'm365-standard-copilot-gb', name: 'Microsoft 365 Business Standard with Copilot', family: 'licensing', currency: 'GBP', region: 'gb',
    kind: 'licence-entitlement', note: 'UK annual commitment, expressed per seat per month, excluding VAT. Confirm plan and seat eligibility. No credits are deducted automatically.',
    components: [{ id: 'seats', label: 'Monthly seats', unit: 'seat/month', quantityPerUnit: 1 }] },
  { id: 'entra-suite-gb', name: 'Microsoft Entra Suite', family: 'security', currency: 'GBP', region: 'gb',
    kind: 'licence-entitlement', note: 'UK annual commitment, expressed per seat per month, excluding VAT. Confirm prerequisite licences separately.',
    components: [{ id: 'seats', label: 'Monthly seats', unit: 'seat/month', quantityPerUnit: 1 }] },
  { id: 'openai-global-ptu-uksouth', name: 'Azure OpenAI · Global Provisioned throughput', family: 'foundry', currency: 'GBP', region: 'uksouth',
    kind: 'model-deployment', model: { id: 'azure-openai', version: 'capacity meter', sku: 'GlobalProvisionedManaged', mode: 'provisioned' },
    note: 'The published rate is one PTU-hour. Verify your model eligibility and commitments separately. Reservation prices are excluded.',
    components: [{ id: 'capacity', label: 'Provisioned capacity', unit: '1/Hour', quantityPerUnit: 1, meterId: '0a537cac-4d0f-505d-9d9f-98c8633db139' }] },
  { id: 'sentinel-payg-analysis-uksouth', name: 'Microsoft Sentinel · pay-as-you-go log analysis', family: 'security', currency: 'GBP', region: 'uksouth',
    kind: 'supporting-resource', note: 'Enter GB billed to this Sentinel analysis meter after separately confirmed benefits. Other ingestion, storage or retention charges may apply.',
    components: [{ id: 'usage', label: 'Billable GB analysed', unit: '1 GB', quantityPerUnit: 1, meterId: '0b62436c-89a7-5565-acbd-0b68ce8e6791' }] },
  { id: 'entra-p1-gb', name: 'Microsoft Entra ID P1', family: 'security', currency: 'GBP', region: 'gb',
    kind: 'licence-entitlement', note: 'UK annual commitment, expressed per seat per month, excluding VAT. Check for an existing licence first.',
    components: [{ id: 'seats', label: 'Monthly seats', unit: 'seat/month', quantityPerUnit: 1 }] },
  { id: 'agent-365-gb', name: 'Microsoft Agent 365', family: 'licensing', currency: 'GBP', region: 'gb',
    kind: 'licence-entitlement', note: 'UK annual commitment, expressed per user per month, excluding VAT. Check eligibility, bundles and separate consumption.',
    components: [{ id: 'seats', label: 'Monthly seats', unit: 'seat/month', quantityPerUnit: 1 }] },
  { id: 'copilot-payg-uksouth', name: 'Copilot Studio pay-as-you-go', family: 'copilot', currency: 'GBP', region: 'uksouth',
    kind: 'agent', note: 'Enter credits actually consumed. The estimate deducts eligible credits from one explicitly linked UK pack pool, then prices the balance.',
    components: [{ id: 'credits', label: 'Copilot Credits', unit: '1', quantityPerUnit: 1, meterId: 'b30ef3a7-d378-533e-bc8f-34674fb1ca3e' }] },
];

export function offeringFor(item: StudioObject): Offering | undefined {
  if (!('offeringId' in item)) return;
  const selected = offerings.find(offering => offering.id === item.offeringId && offering.kind === item.kind);
  if (selected?.kind === 'model-deployment' && item.kind === 'model-deployment') {
    const { model } = selected;
    if (model.id !== item.modelId || model.version !== item.modelVersion || model.sku !== item.sku || model.mode !== item.mode) return;
  }
  if (selected?.kind === 'licence-entitlement' && item.kind === 'licence-entitlement' && item.product !== selected.name) return;
  if (selected?.kind === 'agent' && item.kind === 'agent' && (item.platform !== 'copilot-studio' || item.modelSource !== 'platform-managed')) return;
  return selected;
}

export function applicableOffering(object: StudioObject, region: string, code: string) {
  const explicit = offeringFor(object);
  if (explicit) return explicit.region === 'gb' || explicit.region === region ? explicit : undefined;
  if (object.kind === 'agent' && !object.offeringId && object.platform === 'copilot-studio' && object.modelSource === 'platform-managed') {
    return offerings.find(item => item.kind === 'agent' && item.region === region && item.currency === code);
  }
}

export function offeringMeter(offering: Offering, component: Component): Meter | undefined {
  const spec = offering.components.find(item => item.id === component);
  if (!spec) return;
  return {
    meterId: spec.meterId ?? `${offering.id}/${spec.id}`,
    sku: spec.sku ?? (offering.kind === 'model-deployment' ? offering.model.sku : offering.id),
    region: offering.region, unit: spec.unit, quantityPerUnit: spec.quantityPerUnit, priceType: 'Consumption',
  };
}

export const unresolved: readonly { family: Family; name: string; status: 'manual' | 'unsupported'; reason: string }[] = [
  { family: 'foundry', name: 'Foundry agent tools and orchestration', status: 'manual', reason: 'Model separately billed tools or services as supporting resources. The workspace does not assume a per-agent or per-execution fee.' },
  { family: 'foundry', name: 'Other models, deployment modes, regions and tiered rates', status: 'manual', reason: 'These require an exact published meter and operating assumptions. Enter separate input/output rates or an evidenced capacity rate.' },
  { family: 'copilot', name: 'Other prepaid capacity and bundled Copilot Credits', status: 'unsupported', reason: 'The reviewed UK monthly pack can be pooled. Account-specific entitlements and other capacity plans must be reconciled separately.' },
  { family: 'copilot', name: 'External or user-provided model paths', status: 'unsupported', reason: 'Copilot Studio prompt integrations do not establish a primary agent model replacement or a separately billable model deployment.' },
  { family: 'licensing', name: 'Enterprise agreements and Microsoft 365 licence prerequisites', status: 'manual', reason: 'Declare prerequisite and incremental seats explicitly. Eligibility, overlap and discounts depend on the agreement.' },
  { family: 'licensing', name: 'Other unreviewed licence markets or SKUs', status: 'manual', reason: 'Select only reviewed commercial offers or enter an evidenced contract rate per seat.' },
  { family: 'infrastructure', name: 'Other supporting services and usage bands', status: 'manual', reason: 'Enter a matching rate and base unit. Reservations, volume tiers, cross-region networking paths and free thresholds are not inferred.' },
  { family: 'security', name: 'Defender, Purview, Sentinel and Entra coverage', status: 'manual', reason: 'Enter each separately billable service as a resource or licence. A security policy records a declaration and does not imply a charge.' },
];

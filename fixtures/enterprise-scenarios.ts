// Fictional companies, usage, contracts and rate values. This module is test-only.
import { inventoryPlan } from '../scripts/discovery';
import type { RetailRecord } from '../src/catalogue';
import { blankEnvironment, type Environment, type StudioObject } from '../src/domain';
import { offeringMeter, type Component } from '../src/offerings';

export const referenceAt = '2026-11-19T12:00:00Z';
export const enterpriseInventory = inventoryPlan().inventory;
const getOffer = (id: string) => {
  const offer = enterpriseInventory.find(item => item.id === id);
  if (!offer) throw new Error('Missing scenario catalogue identity ' + id);
  return offer;
};
function meter(id: string, component: Component) {
  const result = offeringMeter(getOffer(id), component);
  if (!result) throw new Error('Missing scenario billing component ' + component);
  return result;
}
function tariff(id: string, component: Component, price: string, tiers?: RetailRecord['tiers']): RetailRecord {
  return { ...meter(id, component), price, tiers, product: 'Fictional enterprise QA rate', currency: 'GBP', offeringId: id,
    component, verification: 'azure-retail-api', source: 'https://prices.azure.com/api/retail/prices', effectiveAt: '2026-01-01T00:00:00Z' };
}
function tokenRates(id: string, input: string, output: string, cached?: string) {
  return [tariff(id, 'input', input), tariff(id, 'output', output), ...(cached ? [tariff(id, 'cached', cached)] : [])];
}
type Model = Extract<StudioObject, { kind: 'model-deployment' }>;
const model = (id: string, offerId: string, details?: Partial<Model>): Model => {
  const offer = getOffer(offerId);
  if (offer.kind !== 'model-deployment') throw new Error('Expected a model deployment');
  return {
    id, name: id, kind: 'model-deployment', offeringId: offerId, modelId: offer.model.id, modelVersion: offer.model.version,
    mode: offer.model.mode, sku: offer.model.sku, region: offer.region, deploymentRegion: offer.region, ...details,
  };
};
const agent = (id: string): StudioObject => ({ id, name: id, kind: 'agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref', agentSetup: 'current' });
const creditAgent = (id: string, credits: number): Extract<StudioObject, { kind: 'agent' }> => ({
  id, name: id, kind: 'agent', platform: 'copilot-studio', modelSource: 'platform-managed', credits,
});
const usage = (id: string, executions: number, calls: number, input: number, output: number, cachedInput?: number, retries?: number): StudioObject =>
  ({ id, name: id, kind: 'usage-profile', executions, calls, input, output, cachedInput, retries });
const resource = (id: string, offeringId: string, monthlyQuantity: number): StudioObject => ({
  id, name: id, kind: 'supporting-resource', offeringId, region: getOffer(offeringId).region, monthlyQuantity,
});
const licence = (id: string, offeringId: string, seats?: number, procurement: 'existing' | 'incremental' = 'incremental'): Extract<StudioObject, { kind: 'licence-entitlement' }> =>
  ({ id, name: id, kind: 'licence-entitlement', product: getOffer(offeringId).name, offeringId, procurement, seats });
const group = (id: string, population: number): StudioObject => ({
  id, name: id, kind: 'user-group', population, intended: population, active: Math.floor(population / 2),
});
const edge = (type: Environment['relationships'][number]['type'], from: string, to: string, extras?: Partial<Environment['relationships'][number]>) => ({
  type, from, to, ...extras,
});
function scenario(title: string, objects: StudioObject[], relationships: Environment['relationships'], records: RetailRecord[],
  expected: { monthly: string; annual: string; missing: number; forecast?: string; retail?: string; existing?: string; proposed?: string },
  changes?: Pick<Environment, 'pricingOverrides' | 'forecast'>) {
  return { env: { ...blankEnvironment(), ...changes, name: title, objects, relationships }, records, expected };
}
const assistant = 'gpt-4-1-global-standard-uksouth';
const mini = 'gpt-4-1-mini-global-uksouth';
const search = 'search-s1-uksouth';
const blob = 'blob-hot-lrs-capacity-uksouth';
const sentinel = 'sentinel-payg-analysis-uksouth';
const entra = 'entra-p1-gb';
const pack = 'copilot-credit-pack-gb';
const credit = 'copilot-payg-uksouth';
const copilot = 'm365-copilot-enterprise-gb';
const e3 = 'm365-e3-gb';
const e7 = 'm365-e7-gb';
const agent365 = 'agent-365-gb';
const vault = 'key-vault-standard-operations-uksouth';
const provisioned = 'openai-global-ptu-uksouth';
const vm = 'vm-d2s-v5-linux-uksouth';
const egress = 'bandwidth-internet-out-uksouth';
const europeSearch = 'search-standard-s1-westeurope';
const nonMeteredTransfer = { meterId: 'supporting-usage', sku: 'Customer inter-region path', region: 'westeurope',
  unit: 'declared usage unit', quantityPerUnit: 1, priceType: 'Consumption' } as const;

export const scenarios = [
  scenario('A · Foundry enterprise assistant', [
    model('Assistant deployment', assistant, { inputModality: 'image', outputModality: 'text' }), agent('Support assistant'), usage('Enterprise demand', 20_000, 2, 1500, 400, 500, 10),
    group('Operations', 150), group('Service desks', 70), resource('Enterprise search', search, 720),
    resource('Indexed documents', blob, 60_000), resource('Security logs', sentinel, 80), licence('Incremental identity', entra, 30),
  ], [
    edge('agent-uses-deployment', 'Support assistant', 'Assistant deployment'), edge('agent-uses-usage', 'Support assistant', 'Enterprise demand'),
    edge('group-can-access-agent', 'Operations', 'Support assistant'), edge('group-can-access-agent', 'Service desks', 'Support assistant'),
    edge('agent-uses-resource', 'Support assistant', 'Enterprise search', { integration: 'foundry-search' }),
    edge('deployment-uses-resource', 'Assistant deployment', 'Indexed documents'), edge('agent-uses-resource', 'Support assistant', 'Security logs'),
  ], [
    ...tokenRates(assistant, '.002', '.008', '.0005'), ...tokenRates(mini, '.001', '.004', '.00025'),
    tariff(search, 'usage', '.20'), tariff(blob, 'usage', '.02', [{ from: 0, price: '.02' }, { from: 51200, price: '.015' }]),
    tariff(sentinel, 'usage', '2'), tariff(entra, 'seats', '5'),
  ], { monthly: '1893.80', annual: '22725.60', missing: 0 }),

  scenario('B · Copilot Studio and shared capacity', [
    { ...creditAgent('Agent A', 18_000), includedUsage: { credits: 2000, basis: 'Fictional eligible employee channel reconciliation', expiresOn: '2026-12-01' } },
    creditAgent('Agent B', 19_000), { ...creditAgent('Agent C', 5000), promptEndpoint: 'chat-completions' },
    model('External prompt deployment', mini), usage('External prompt demand', 1000, 1, 1000, 500),
    resource('Shared monthly pack', pack, 1), resource('Credentials operations', vault, 20000),
    licence('Copilot seats', copilot, 30), { ...licence('Existing base', e3, 30, 'existing'), existingMonthly: 1000 }, group('Licensed staff', 30),
  ], [
    ...['Agent A', 'Agent B', 'Agent C'].map(id => edge('agent-uses-resource', id, 'Shared monthly pack')),
    edge('agent-uses-prompt-model', 'Agent C', 'External prompt deployment'), edge('agent-uses-usage', 'Agent C', 'External prompt demand'),
    edge('agent-uses-resource', 'Agent C', 'Credentials operations'), edge('agent-has-entitlement', 'Agent A', 'Copilot seats'),
    edge('group-has-entitlement', 'Licensed staff', 'Copilot seats', { seats: 30 }), edge('group-has-entitlement', 'Licensed staff', 'Existing base', { seats: 30 }),
  ], [
    tariff(pack, 'usage', '160'), tariff(credit, 'credits', '.012'), tariff(copilot, 'seats', '23'),
    tariff(e3, 'seats', '34'), tariff(vault, 'usage', '.50'), ...tokenRates(mini, '.001', '.004'),
  ], { monthly: '1034.00', annual: '12408.00', missing: 0 }),

  scenario('C · Shared provisioned deployment', [
    model('Reserved model', provisioned, { deployedModel: 'gpt-4.1', deployedVersion: '2025-04-14', capacity: 45, billableHours: 400, allocationBasis: 'input-tokens' }),
    agent('Dispatch'), agent('Investigation'), agent('Resolution'), usage('Dispatch demand', 1000, 1, 100, 50),
    usage('Investigation demand', 1000, 1, 150, 100, 50), usage('Resolution demand', 1500, 2, 100, 60),
    resource('Shared index', search, 400), resource('Shared compute', vm, 400),
  ], [
    ...['Dispatch', 'Investigation', 'Resolution'].flatMap(id => [
      edge('agent-uses-deployment', id, 'Reserved model'), edge('agent-uses-usage', id, id + ' demand'), edge('agent-uses-resource', id, 'Shared index'),
    ]), edge('agent-invokes-agent', 'Dispatch', 'Investigation'), edge('deployment-uses-resource', 'Reserved model', 'Shared compute'),
  ], [tariff(provisioned, 'capacity', '.40'), tariff(search, 'usage', '.30'), tariff(vm, 'usage', '.20')],
  { monthly: '7400.00', annual: '88800.00', missing: 0 }),

  scenario('D · Existing Microsoft 365 estate', [
    { ...licence('Existing E3 estate', e3, 500, 'existing'), existingMonthly: 12000 },
    { ...licence('New Copilot seats', copilot), overlapSeats: 30 }, licence('Agent 365 seats', agent365, 25),
    licence('Twenty E7 upgrades', e7, 20), group('Product', 80), group('Finance', 50), group('Agent managers', 25), group('E7 architects', 20),
    { ...creditAgent('Service concierge', 10000), includedUsage: { credits: 3000, basis: 'Fictional eligible activity confirmed by the customer', expiresOn: '2026-12-01' } },
  ], [
    ...['Product', 'Finance'].flatMap((id, index) => ['Existing E3 estate', 'New Copilot seats'].map(target =>
      edge('group-has-entitlement', id, target, { seats: index ? 50 : 80 }))),
    edge('group-has-entitlement', 'E7 architects', 'Twenty E7 upgrades', { seats: 20 }),
    edge('group-has-entitlement', 'Agent managers', 'Agent 365 seats', { seats: 25 }),
    edge('licence-replaces-entitlement', 'Twenty E7 upgrades', 'Existing E3 estate', { seats: 20, effectiveOn: '2026-11-01' }),
  ], [tariff(e3, 'seats', '34'), tariff(copilot, 'seats', '22'), tariff(agent365, 'seats', '10'), tariff(e7, 'seats', '75'), tariff(credit, 'credits', '.02')],
  { monthly: '4090.00', annual: '49080.00', missing: 0, existing: '12000.00', proposed: '15470.00' }),

  scenario('E · Multi-region enterprise', [
    model('UK standard', mini), model('EU reserved', 'openai-data-zone-ptu-westeurope',
      { deployedModel: 'gpt-4.1-mini', deployedVersion: '2025-04-14', capacity: 45, billableHours: 250 }),
    model('Incompatible audio output', assistant, { outputModality: 'audio', deploymentRegion: 'eastus2' }),
    agent('UK productivity'), agent('EU productivity'), agent('Audio pilot'), usage('UK demand', 2000, 2, 1000, 500),
    resource('UK AI Search', search, 300), resource('EU AI Search', europeSearch, 300), resource('UK internet egress', egress, 400),
    { id: 'EU data transfer', name: 'EU data transfer', kind: 'supporting-resource', region: 'westeurope', category: 'Customer inter-region path', monthlyQuantity: 500 },
  ], [
    edge('agent-uses-deployment', 'UK productivity', 'UK standard'), edge('agent-uses-deployment', 'EU productivity', 'EU reserved'),
    edge('agent-uses-deployment', 'Audio pilot', 'Incompatible audio output'), edge('agent-uses-usage', 'UK productivity', 'UK demand'),
    edge('agent-uses-resource', 'UK productivity', 'UK AI Search'), edge('agent-uses-resource', 'EU productivity', 'EU AI Search'),
    edge('agent-uses-resource', 'UK productivity', 'UK internet egress'), edge('agent-uses-resource', 'EU productivity', 'EU data transfer'),
  ], [
    ...tokenRates(mini, '.002', '.009'), tariff('openai-data-zone-ptu-westeurope', 'capacity', '.30'),
    tariff(search, 'usage', '.20'), tariff(europeSearch, 'usage', '.25'),
    tariff(egress, 'usage', '0', [{ from: 0, price: '0' }, { from: 100, price: '.11' }]),
  ], { monthly: '3594.00', annual: '43128.00', missing: 1 }, {
    pricingOverrides: [{ mode: 'fixed', objectId: 'EU data transfer', meter: nonMeteredTransfer, value: '0.05', currency: 'GBP', reason: 'Fictional contracted transfer tariff' }],
    forecast: { percent: 0, applyToFixed: false, exceptions: [] },
  }),

  scenario('F · Commercial agreements and forecast', [
    model('Contractual model', mini), agent('Revenue assistant'), usage('Revenue demand', 1000, 1, 800, 300),
    resource('Fixed VM', vm, 720), resource('Discounted search', search, 600), licence('Contract identity', entra, 10),
  ], [
    edge('agent-uses-deployment', 'Revenue assistant', 'Contractual model'), edge('agent-uses-usage', 'Revenue assistant', 'Revenue demand'),
    edge('agent-uses-resource', 'Revenue assistant', 'Fixed VM'), edge('agent-uses-resource', 'Revenue assistant', 'Discounted search'),
  ], [...tokenRates(mini, '.020', '.050'), tariff(vm, 'usage', '.20'), tariff(search, 'usage', '.30'), tariff(entra, 'seats', '25')],
  { monthly: '459.00', annual: '5508.00', missing: 0, forecast: '460.32', retail: '605.00' }, {
    pricingOverrides: [
      { mode: 'discount', meter: meter(mini, 'input'), currency: 'GBP', reason: 'Fictional volume agreement', value: 15 },
      { mode: 'discount', meter: meter(mini, 'output'), currency: 'GBP', reason: 'Fictional volume agreement', value: 15 },
      { mode: 'retail', meter: meter(mini, 'output'), objectId: 'Contractual model', currency: 'GBP', reason: 'Explicit retail exception' },
      { mode: 'fixed', meter: meter(vm, 'usage'), objectId: 'Fixed VM', currency: 'GBP', reason: 'Fictional fixed contract', value: '0.12' },
      { mode: 'discount', meter: meter(search, 'usage'), currency: 'GBP', reason: 'Fictional general agreement', value: 10 },
      { mode: 'discount', meter: meter(search, 'usage'), objectId: 'Discounted search', currency: 'GBP', reason: 'Fictional specific agreement', value: 20 },
      { mode: 'fixed', meter: meter(entra, 'seats'), objectId: 'Contract identity', currency: 'GBP', reason: 'Fictional licence agreement', value: '20' },
    ],
    forecast: { percent: 20, applyToFixed: false, exceptions: [
      { objectId: 'Discounted search', meter: meter(search, 'usage'), percent: -10 },
      { objectId: 'Contract identity', meter: meter(entra, 'seats'), percent: 5, applyToFixed: true },
    ] },
  }),
].map(item => ({
  ...item,
  records: item.records.map(record => ({
    ...record, price: record.price.replace(/^\./, '0.'), tiers: record.tiers?.map(tier => ({ ...tier, price: tier.price.replace(/^\./, '0.') })),
  })),
}));

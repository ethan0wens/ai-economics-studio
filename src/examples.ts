import { blankEnvironment, cloneEnvironment, environmentSchema, type Edge, type Environment, type StudioObject } from './domain';
import { offeringMeter, offerings } from './offerings';

const foundry = (id: string, name: string): StudioObject => ({ id, kind: 'agent', name, platform: 'foundry-agent-service', modelSource: 'deployment-ref' });
const copilot = (name: string, credits: number): StudioObject => ({ id: 'agent', kind: 'agent', name, platform: 'copilot-studio',
  modelSource: 'platform-managed', offeringId: 'copilot-payg-uksouth', credits });
const usage = (id: string, executions: number, input: number, output = 300): StudioObject => ({
  id, kind: 'usage-profile', name: 'Monthly usage', executions, calls: 1, input, output,
});
const link = (type: Edge['type'], from: string, to: string, seats?: number): Edge => ({ type, from, to, seats });
const standard: StudioObject = {
  id: 'model', kind: 'model-deployment', name: 'GPT-4.1 mini deployment', modelId: 'gpt-4.1-mini',
  modelVersion: '2025-04-14', sku: 'GlobalStandard', region: 'uksouth', deploymentRegion: 'uksouth',
  offeringId: 'gpt-4-1-mini-global-uksouth', mode: 'payg',
};

export type Example = { id: string; version: number; article: string; name: string; platform: string; purpose: string;
  assumptions: string[]; explore: string[]; objects: StudioObject[]; links: Edge[]; discount?: boolean };
export const examples: Example[] = [
  {
    id: 'foundry-assistant', version: 1, article: 'example-foundry-assistant', name: 'Basic Foundry Assistant', platform: 'Microsoft Foundry',
    purpose: 'See how one workload turns into separate input and output token charges.',
    assumptions: ['One Foundry agent linked to GPT-4.1 mini, Global Standard, with UK South as the billing and planned deployment region.',
      '1,000 runs per month, one request per run, 1,500 input and 300 output tokens per request.'],
    explore: ['Double monthly executions to 2,000 and compare the billed input and output quantities.',
      'Open each cost line to find the exact pricing unit, rate and source.'],
    objects: [foundry('agent', 'Support assistant'), standard, usage('usage', 1000, 1500)],
    links: [link('agent-uses-deployment', 'agent', 'model'), link('agent-uses-usage', 'agent', 'usage')],
  },
  {
    id: 'copilot-agent', version: 1, article: 'example-copilot-agent', name: 'Copilot Studio Business Agent', platform: 'Copilot Studio',
    purpose: 'Model monthly credits and understand the platform-managed model path.',
    assumptions: ['One platform-managed business agent with 12,000 declared billable credits per month.',
      'Separate licences, prepaid packs and allowances need their own documented eligibility.'],
    explore: ['Change the monthly credits to 15,000 and compare the consumption line.',
      'Open the licensing guide before modelling an included allowance or a licence purchase.'],
    objects: [copilot('Business support agent', 12000)], links: [],
  },
  {
    id: 'enterprise-ai', version: 1, article: 'example-existing-licensing', name: 'Enterprise AI Environment', platform: 'Copilot Studio · Licensing · Azure',
    purpose: 'Separate new charges from existing licences and compare retail with an illustrative agreement.',
    assumptions: ['Support and operations groups have 120 and 80 people with distinct assignments. 40 new Copilot seats are assigned within the fully licensed groups.',
      '200 existing Microsoft 365 E3 seats have £4,000 of declared monthly customer spend. The agent uses 18,000 credits per month.',
      'Azure AI Search uses 240 search-unit-hours with an illustrative 10% contract discount on its verified retail meter.'],
    explore: ['Compare new costs with proposed spend including the retained E3 subscription.',
      'Open the Azure AI Search line and compare its retail and agreement amounts. Review the licence prerequisite before changing assignments.'],
    objects: [
      copilot('Enterprise assistant', 18000),
      { id: 'support', kind: 'user-group', name: 'Support', population: 120, intended: 120, active: 75 },
      { id: 'operations', kind: 'user-group', name: 'Operations', population: 80, intended: 80, active: 45 },
      { id: 'e3', kind: 'licence-entitlement', name: 'Existing Microsoft 365 E3', product: 'Microsoft 365 E3',
        offeringId: 'm365-e3-gb', procurement: 'existing', seats: 200, existingMonthly: 4000, overlapSeats: 0 },
      { id: 'add-on', kind: 'licence-entitlement', name: 'New Microsoft 365 Copilot seats',
        product: 'Microsoft 365 Copilot enterprise add-on', offeringId: 'm365-copilot-enterprise-gb',
        procurement: 'incremental', seats: 40, overlapSeats: 0 },
      { id: 'search', kind: 'supporting-resource', name: 'Azure AI Search', offeringId: 'search-basic-uksouth', monthlyQuantity: 240 },
    ],
    links: [
      link('group-can-access-agent', 'support', 'agent'), link('group-can-access-agent', 'operations', 'agent'),
      link('group-has-entitlement', 'support', 'e3', 120), link('group-has-entitlement', 'operations', 'e3', 80),
      link('group-has-entitlement', 'support', 'add-on', 25), link('group-has-entitlement', 'operations', 'add-on', 15),
      link('agent-uses-resource', 'agent', 'search'),
    ], discount: true,
  },
  {
    id: 'shared-deployment', version: 1, article: 'example-shared-deployment', name: 'Shared Model Deployment', platform: 'Microsoft Foundry · Provisioned',
    purpose: 'See how two agents share a single provisioned charge and allocate it by usage.',
    assumptions: ['One GPT-4.1 deployment, version 2025-04-14, Global Provisioned in UK South. 15 PTUs × 400 hours gives 6,000 PTU-hours.',
      'The two agents have 6,000 and 2,000 runs respectively. Both make one request per run with 1,600 input and 300 output tokens.'],
    explore: ['Find the single capacity line. The input workload split allocates it 75/25 without increasing the total.',
      'Change one workload and review the allocation. Capacity and tenant quota still need customer confirmation.'],
    objects: [
      foundry('alpha', 'Support assistant'), foundry('beta', 'Operations assistant'),
      { id: 'model', kind: 'model-deployment', name: 'Shared provisioned GPT-4.1', modelId: 'azure-openai', modelVersion: 'capacity meter',
        sku: 'GlobalProvisionedManaged', deployedModel: 'gpt-4.1', deployedVersion: '2025-04-14', region: 'uksouth', deploymentRegion: 'uksouth',
        offeringId: 'openai-global-ptu-uksouth', mode: 'provisioned', capacity: 15, billableHours: 400, allocationBasis: 'input-tokens' },
      usage('alpha-usage', 6000, 1600), usage('beta-usage', 2000, 1600),
    ],
    links: [link('agent-uses-deployment', 'alpha', 'model'), link('agent-uses-deployment', 'beta', 'model'),
      link('agent-uses-usage', 'alpha', 'alpha-usage'), link('agent-uses-usage', 'beta', 'beta-usage')],
  },
];

export function openExample(example: Example): Environment {
  const meter = offeringMeter(offerings.find(offer => offer.id === 'search-basic-uksouth')!, 'usage');
  const draft = environmentSchema.parse({
    ...blankEnvironment(), name: example.name,
    description: 'Example environment with fictional planning assumptions. Usage, customer spend and any agreement discounts are illustrative. Retail amounts use the applied Microsoft catalogue.',
    objects: example.objects, relationships: example.links,
    pricingOverrides: example.discount && meter ? [{ mode: 'discount', meter, objectId: 'search', currency: 'GBP', value: 10,
      reason: 'Fictional customer agreement for the example environment.' }] : [],
  });
  return environmentSchema.parse({ ...cloneEnvironment(draft), name: example.name });
}

import type { FieldId } from './field-help';

export const helpTopics = {
  platform: ['choose-platforms', 'choose-a-path'], modelSource: ['agents-and-models', 'reuse'],
  retailOffering: ['agents-and-models', 'choose-a-model'], modelId: ['agents-and-models', 'choose-a-model'],
  billingMode: ['model-evidence', 'deployment-types'], deploymentRegion: ['model-evidence', 'billing-and-deployment'],
  region: ['model-evidence', 'billing-and-deployment'], defaultRegion: ['model-evidence', 'billing-and-deployment'], linkedDeployment: ['agents-and-models', 'reuse'],
  usageLink: ['foundry-usage', 'per-request'], executions: ['foundry-usage', 'per-request'],
  input: ['foundry-usage', 'per-request'], output: ['foundry-usage', 'per-request'],
  cachedInput: ['foundry-usage', 'per-request'], calls: ['foundry-usage', 'per-request'],
  credits: ['copilot-credits', 'monthly-credits'], creditMethod: ['copilot-credits', 'monthly-credits'],
  procurement: ['licences-and-groups', 'distinct-seats'], seats: ['licences-and-groups', 'distinct-seats'],
  existingMonthly: ['existing-and-new-spend', 'replacement'], resourceQuantity: ['supporting-services', 'scope-units'],
  capacity: ['ptu-and-reservations', 'capacity-and-hours'], hours: ['ptu-and-reservations', 'capacity-and-hours'],
  agreement: ['agreements-and-manual-rates', 'precedence'], forecast: ['forecast-scenarios', 'exceptions'],
  importFile: ['save-and-reopen', 'restore'], priceStatus: ['missing-rate-or-volume', 'rate'],
} as const satisfies Partial<Record<FieldId, readonly [string, string]>>;

export const guides = {
  platforms: helpTopics.platform, models: helpTopics.linkedDeployment, deployments: helpTopics.billingMode,
  provisioned: helpTopics.capacity, credits: helpTopics.credits, foundryUsage: helpTopics.executions,
  licences: helpTopics.seats, services: helpTopics.resourceQuantity, agreement: helpTopics.agreement,
  forecast: helpTopics.forecast, missingRate: helpTopics.priceStatus,
  completeness: ['estimate-readiness', 'partial-estimates'],
} as const;

export const startingArticles = ['quickstart', 'estimate-readiness', 'save-and-reopen'] as const;

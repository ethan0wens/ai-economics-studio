import type { FieldId } from './field-help';
import { routeHref, technicalHref } from './navigation';

export type DocumentationLink = { collection: 'guide' | 'technical'; article: string; heading?: string; label?: string };
const guide = (article: string, heading?: string, label?: string): DocumentationLink => ({ collection: 'guide', article, heading, label });
const technical = (article: string, heading?: string, label?: string): DocumentationLink => ({ collection: 'technical', article, heading, label });

export function documentationHref(link: DocumentationLink) {
  return link.collection === 'technical' ? technicalHref(link.article, link.heading) : routeHref('documentation', link.article, link.heading);
}

const tokenUsage = guide('foundry-usage', 'per-request');
const model = guide('agents-and-models', 'choose-a-model');
const geography = guide('model-evidence', 'billing-and-deployment');
const modelTechnical = technical('foundry-and-azure', 'foundry-model-and-deployment-identity');
const ptus = guide('ptu-and-reservations', 'capacity-and-hours');
const reservation = technical('ledger-methodology', 'provisioned-capacity-and-allocation');
const copilot = guide('copilot-credits', 'monthly-credits');
const allowances = guide('copilot-credits', 'allowances');
const agreement = technical('agreements-and-licences', 'price-precedence');
const existingSpend = guide('existing-and-new-spend', 'scopes');
const seats = guide('licences-and-groups', 'distinct-seats');
const seatGroups = guide('licences-and-groups', 'groups');
const replacement = guide('existing-and-new-spend', 'replacement');
const governance = guide('architecture-and-controls', 'governance');
const userGroup = technical('environment-schema', 'user-group');
const links = technical('relationships-and-files', 'relationship-semantics');
const forecast = guide('forecast-scenarios', 'exceptions');
const searchCatalogue = guide('coverage-and-freshness', 'freshness');
const advanced = guide('guided-and-advanced', 'advanced');

export const helpTopics = {
  retailOffering: technical('catalogue-contract', 'exact-price-identity'), objectName: advanced,
  platform: guide('choose-platforms', 'choose-a-path'), modelSource: guide('agents-and-models', 'reuse'),
  linkedDeployment: guide('agents-and-models', 'reuse'), autonomy: governance, sensitivity: governance, identity: governance,
  tools: guide('share-and-connect', 'share'), modelId: model, modelVersion: model, sku: modelTechnical, region: geography,
  deploymentRegion: geography, deployedModel: ptus, deployedVersion: modelTechnical, inputModality: modelTechnical,
  outputModality: modelTechnical, requiredFeature: modelTechnical, agentSetup: modelTechnical,
  promptEndpoint: technical('copilot-and-licensing', 'external-prompt-inference'), billingMode: guide('model-evidence', 'deployment-types'),
  population: userGroup, intended: userGroup, active: userGroup, interactions: userGroup,
  product: guide('licence-evidence', 'prerequisites'), procurement: existingSpend, seats, existingMonthly: existingSpend,
  seatScope: seatGroups, overlapSeats: seatGroups, assignedSeats: seatGroups, replacementSeats: replacement, replacementDate: replacement,
  resourceIntegration: technical('foundry-and-azure', 'supporting-azure-services'), category: guide('supporting-services', 'scope-units'),
  meter: technical('catalogue-contract', 'exact-price-identity'), resourceQuantity: guide('supporting-services', 'scope-units'),
  control: governance, controlStatus: governance, controlNotes: governance,
  executions: tokenUsage, calls: tokenUsage, input: tokenUsage, cachedInput: tokenUsage, output: tokenUsage, retries: tokenUsage,
  toolCalls: tokenUsage, credits: copilot, usesAllowance: allowances, allowanceCredits: allowances, allowanceBasis: allowances,
  allowanceExpiry: allowances, creditMethod: copilot, creditCategory: copilot, usageLink: tokenUsage,
  capacity: ptus, hours: ptus, comparePayg: reservation, peakInput: ptus, peakOutput: ptus,
  useReservation: reservation, reservationPtus: reservation, reservationTerm: reservation, reservationTotal: reservation,
  reservationStart: reservation, reservationHours: reservation, reservationRef: reservation, allocation: reservation,
  relationship: links, relationshipTarget: links, forecast, forecastFixed: forecast,
  scope: agreement, agreement, fixedRate: agreement, discount: agreement, reason: agreement, effective: agreement,
  exception: forecast, exceptionFixed: forecast, ledgerFilter: guide('read-your-estimate', 'ledger'),
  priceStatus: guide('missing-rate-or-volume', 'rate'), inventorySearch: advanced, inventoryType: advanced,
  catalogueSearch: searchCatalogue, catalogueRegion: searchCatalogue,
  environmentName: guide('quickstart', 'start'), description: technical('environment-schema', 'top-level-contract'),
  defaultRegion: geography, currency: technical('catalogue-contract', 'exact-price-identity'), importFile: guide('save-and-reopen', 'restore'),
} satisfies Record<FieldId, DocumentationLink>;

export const guides = {
  platforms: helpTopics.platform, models: helpTopics.linkedDeployment, deployments: helpTopics.billingMode,
  provisioned: ptus, credits: copilot, foundryUsage: tokenUsage,
  licences: seats, services: helpTopics.resourceQuantity, agreement, forecast, missingRate: helpTopics.priceStatus,
  completeness: guide('estimate-readiness', 'partial-estimates'),
  assistedFoundry: guide('foundry-usage', 'assist-usage'),
  assistedCopilot: guide('copilot-credits', 'documented-credit-totals'),
  usageSensitivity: guide('read-your-estimate', 'usage-sensitivity'),
  catalogue: guide('pricing-sources', 'azure', 'How the studio verifies prices'),
  catalogueMaintenance: guide('coverage-and-freshness', 'maintenance', 'How catalogue updates work'),
  privacy: guide('privacy', 'storage', 'Privacy and storage'),
  exports: guide('save-and-reopen', 'save', 'How to keep or share an estimate'),
  calculations: technical('ledger-methodology', 'inputs-and-outputs', 'Understand how this cost is calculated'),
} as const;

export const startingArticles = ['quickstart', 'estimate-readiness', 'save-and-reopen'] as const;

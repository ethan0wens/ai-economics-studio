import { z } from 'zod';
import type { Environment, StudioObject } from './domain';
import { currentEvidence, evidenceWindow } from './entitlements';
import reviewed from '../catalogue/compatibility.json' with { type: 'json' };

export const compatibilityLabels = {
  compatible: 'Verified compatible', conditional: 'Conditionally compatible',
  incompatible: 'Verified incompatible', unverified: 'Unverified',
} as const;
type Status = keyof typeof compatibilityLabels;
export type TechnicalFinding = {
  id: string; related?: string; title: string; status: Status; detail: string; rule?: string; source?: string; verifiedOn?: string;
};
const state = z.enum(['compatible', 'conditional', 'incompatible', 'unverified']);
const record = z.strictObject({ id: z.string(), ...evidenceWindow, status: state });
const matrix = z.strictObject({
  version: z.string(),
  capabilities: z.array(record.extend({
    models: z.array(z.string()).min(1), version: z.string(), input: z.array(z.string()), output: z.array(z.string()),
    features: z.array(z.string()),
  })),
  regions: z.array(record.extend({ models: z.array(z.string()).min(1), version: z.string(), sku: z.string(), regions: z.array(z.string()).min(1) })),
  integrations: z.array(record),
});
export const compatibilityEvidence = matrix.parse(reviewed);
type Rule = z.infer<typeof record>;
type Model = Extract<StudioObject, { kind: 'model-deployment' }>;
type Agent = Extract<StudioObject, { kind: 'agent' }>;
const normalized = (value?: string) => value?.toLowerCase();
const modelName = (model: Model) => normalized(model.modelId === 'azure-openai' ? model.deployedModel : model.modelId);
const modelVersion = (model: Model) => model.deployedVersion ?? (model.modelId === 'azure-openai' ? undefined : model.modelVersion);
const integration = (id: string) => compatibilityEvidence.integrations.find(rule => rule.id === id);

function finding(id: string, title: string, at: string, rule?: Rule, fallback = 'Current authoritative evidence does not cover this exact configuration.', related?: string): TechnicalFinding {
  if (!rule) return { id, title, status: 'unverified', detail: fallback, related };
  const active = currentEvidence(rule, at);
  return {
    id, title, status: active ? rule.status : 'unverified', related, rule: rule.id,
    detail: active ? rule.condition : 'This evidence is outside its review window. Confirm Microsoft’s current requirements.',
    source: rule.source, verifiedOn: rule.verifiedOn,
  };
}

export function deploymentFindings(model: Model, at: string) {
  const name = modelName(model);
  const version = modelVersion(model);
  const scoped = compatibilityEvidence.regions.find(rule => name && rule.models.includes(name) && version === rule.version &&
    normalized(model.sku) === normalized(rule.sku) && model.deploymentRegion && rule.regions.includes(model.deploymentRegion));
  const region = finding(model.id, 'Model deployment and region', at, scoped, !model.deploymentRegion
    ? 'Enter the actual Azure deployment region. The billing region is a separate pricing input.'
    : 'Review availability for this exact model, version, deployment type and location. A verified Azure price only establishes billing.');
  const checks = [region];
  const sku = normalized(model.sku);
  if (sku && model.mode && ['standard', 'globalstandard', 'datazonestandard', 'provisionedmanaged', 'globalprovisionedmanaged', 'datazoneprovisionedmanaged'].includes(sku) &&
    (sku.includes('provisioned') !== (model.mode === 'provisioned'))) {
    checks.push({ id: model.id, title: 'Deployment and billing mode', status: 'incompatible',
      detail: 'The selected Microsoft deployment SKU and billing mode disagree. Choose the billing mode for the deployment.' });
  }
  const capability = compatibilityEvidence.capabilities.find(rule => name && rule.models.includes(name) && rule.version === version);
  for (const [direction, requested] of [['input', model.inputModality], ['output', model.outputModality]] as const) {
    if (!requested) continue;
    const supported = capability?.[direction].includes(requested);
    checks.push(finding(model.id, `Model ${direction} modality`, at, capability && {
      ...capability, status: supported ? 'compatible' : 'incompatible',
      condition: supported ? `Microsoft lists ${requested} ${direction} for this model version.`
        : `Microsoft lists ${capability[direction].join(', ')} ${direction} for this model version. The selected ${requested} ${direction} is unsupported.`,
    }));
  }
  if (model.requiredFeature) {
    const feature = model.requiredFeature;
    checks.push(finding(model.id, 'Required model feature', at, capability && {
      ...capability, status: capability.features.includes(feature) ? 'compatible' : 'unverified',
      condition: capability.features.includes(feature) ? `Microsoft documents ${feature} for this model version.`
        : `Check ${feature} with the required API version and deployment. The reviewed capability list did not establish it.`,
    }));
  }
  if (model.mode === 'provisioned') {
    const capacity = integration('provisioned-constraints');
    checks.push(finding(model.id, 'Provisioned capacity', at, capacity && {
      ...capacity, condition: `${capacity.condition}${model.capacity === undefined ? ' Enter the purchased PTUs.' : ''}`,
    }));
  }
  return checks;
}

function platformFinding(agent: Agent, model: Model | undefined, at: string) {
  if (!agent.platform || !agent.modelSource) return finding(agent.id, 'Agent platform', at, undefined, 'Select an agent platform and model source.');
  if (agent.platform === 'copilot-studio') return finding(agent.id, 'Agent platform', at,
    integration(agent.modelSource === 'deployment-ref' ? 'copilot-primary-replacement' : 'copilot-managed'));
  if (!model) return finding(agent.id, 'Foundry agent model', at, undefined, 'Link a Foundry deployment for a model-specific assessment.');
  const currentModel = modelName(model);
  const capable = compatibilityEvidence.capabilities.some(rule => currentModel && rule.models.includes(currentModel) && rule.version === modelVersion(model) &&
    rule.features.includes('responses') && currentEvidence(rule, at));
  const scope = agent.agentSetup === 'classic-basic' || agent.agentSetup === 'classic-standard'
    ? 'foundry-classic-model' : 'foundry-current-model';
  return finding(agent.id, 'Foundry agent model', at, capable ? integration(scope) : undefined,
    'Confirm that the Foundry project, deployment and selected agent features support this model version.', model.id);
}

export function technical(env: Environment, at: string): TechnicalFinding[] {
  const objects = new Map(env.objects.map(item => [item.id, item]));
  const checks: TechnicalFinding[] = env.objects.flatMap(item => item.kind === 'model-deployment' ? deploymentFindings(item, at) : []);
  for (const agent of env.objects) {
    if (agent.kind !== 'agent') continue;
    const related = env.relationships.filter(edge => edge.from === agent.id);
    const deployment = objects.get(related.find(edge => edge.type === 'agent-uses-deployment')?.to ?? '');
    checks.push(platformFinding(agent, deployment?.kind === 'model-deployment' ? deployment : undefined, at));
    for (const edge of related) {
      const linked = objects.get(edge.to);
      if (edge.type === 'agent-uses-prompt-model') {
        const name = linked?.kind === 'model-deployment' ? modelName(linked) : undefined;
        const rule = agent.platform !== 'copilot-studio' || agent.modelSource !== 'platform-managed' ? undefined
          : agent.promptEndpoint === 'responses' ? integration('copilot-prompt-responses')
          : name && /^gpt-(?:[5-9]|[1-9][0-9])(?:$|[-.])/.test(name) ? integration('copilot-prompt-gpt5')
          : agent.promptEndpoint === 'chat-completions' ? integration('copilot-prompt') : undefined;
        checks.push(finding(agent.id, 'External prompt model', at, rule,
          'Use a Copilot Studio platform-managed agent and verify the external prompt model, endpoint and project permissions.', edge.to));
      }
      if (edge.type === 'agent-uses-resource' && edge.integration) {
        const networkId = edge.integration === 'foundry-private-search' ? agent.agentSetup === 'classic-basic' ? 'search-classic-private-basic'
          : agent.agentSetup === 'classic-standard' ? 'search-classic-private-standard' : 'search-current-private'
          : agent.agentSetup === 'classic-basic' || agent.agentSetup === 'classic-standard' ? 'search-classic' : 'search-current';
        const isSearch = linked?.kind === 'supporting-resource' && /^(search-|azure ai search)/i.test(linked.offeringId ?? linked.category ?? '');
        checks.push(finding(agent.id, 'Azure AI Search integration', at,
          agent.platform === 'foundry-agent-service' && isSearch ? integration(networkId) : undefined,
          'Confirm the resource is Azure AI Search and check project identity, network reachability and index permissions.', edge.to));
        if (isSearch && linked?.kind === 'supporting-resource') {
          checks.push(finding(linked.id, 'Azure AI Search resource availability', at, undefined,
            'Confirm Azure AI Search and the chosen tier or features are available in the actual resource region.', agent.id));
        }
      }
      if (edge.type === 'agent-uses-resource' && !edge.integration && linked?.kind === 'supporting-resource' &&
        /storage|blob|sentinel|monitor/i.test(linked.offeringId ?? linked.category ?? '')) {
        checks.push(finding(agent.id, 'Supporting resource configuration', at, undefined,
          'Confirm the service tier, actual resource region, network path and identity permissions for this workload.', edge.to));
      }
    }
  }
  return checks;
}

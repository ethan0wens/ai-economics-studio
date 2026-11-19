import { removeObject, type Edge, type Environment, type StudioObject } from './domain';
import type { Offering } from './offerings';

export type Platform = 'foundry-agent-service' | 'copilot-studio';
export type Intent = Platform | 'both';
export type Agent = Extract<StudioObject, { kind: 'agent' }>;
export type Model = Extract<StudioObject, { kind: 'model-deployment' }>;
export type Usage = Extract<StudioObject, { kind: 'usage-profile' }>;
export type Service = Extract<StudioObject, { kind: 'licence-entitlement' | 'supporting-resource' }>;
export const platforms: Record<Platform, string> = {
  'foundry-agent-service': 'Microsoft Foundry', 'copilot-studio': 'Copilot Studio',
};
export const presets = [
  { id: 'low', name: 'Low', executions: 250, calls: 1, input: 1500, output: 300, credits: 3000 },
  { id: 'typical', name: 'Typical scenario', executions: 1000, calls: 1, input: 1500, output: 300, credits: 12000 },
  { id: 'high', name: 'High', executions: 5000, calls: 2, input: 2500, output: 500, credits: 60000 },
] as const;

export function linkedObject<K extends StudioObject['kind']>(env: Environment, id: string, type: Edge['type'], kind: K) {
  const target = env.relationships.find(edge => edge.type === type && edge.from === id)?.to;
  return env.objects.find((object): object is Extract<StudioObject, { kind: K }> => object.id === target && object.kind === kind);
}
export const updateObject = (env: Environment, object: StudioObject): Environment => ({
  ...env, objects: env.objects.map(current => current.id === object.id ? object : current),
});
export function assignLink(env: Environment, id: string, type: Edge['type'], to?: string): Environment {
  return {
    ...env, relationships: [...env.relationships.filter(edge => edge.from !== id || edge.type !== type), ...(to ? [{ from: id, type, to }] : [])],
  };
}

export function bindModel(deployment: Model, offer: Extract<Offering, { kind: 'model-deployment' }>): Model {
  if (deployment.offeringId === offer.id) return deployment;
  return { ...deployment, offeringId: offer.id, modelId: offer.model.id, modelVersion: offer.model.version,
    mode: offer.model.mode, sku: offer.model.sku, region: offer.region, inputMeter: undefined, outputMeter: undefined, capacityMeter: undefined };
}

export function addSolution(env: Environment, name: string, platform: Platform, existing?: Model) {
  const agent: Agent = { id: crypto.randomUUID(), name, kind: 'agent', platform,
    modelSource: platform === 'copilot-studio' ? 'platform-managed' : 'deployment-ref' };
  const objects: StudioObject[] = [agent];
  const links: Edge[] = [];
  if (platform === 'foundry-agent-service') {
    const model: Model = existing ?? { id: crypto.randomUUID(), name: (name + ' model').slice(0, 300), kind: 'model-deployment' };
    const usage: Usage = { id: crypto.randomUUID(), name: (name + ' usage').slice(0, 300), kind: 'usage-profile' };
    objects.push(usage);
    if (!existing) objects.push(model);
    links.push({ from: agent.id, to: model.id, type: 'agent-uses-deployment' }, { from: agent.id, to: usage.id, type: 'agent-uses-usage' });
  }
  const draft = objects.find((item): item is Model => item.kind === 'model-deployment');
  return { agent, draft, env: { ...env, objects: [...env.objects, ...objects], relationships: [...env.relationships, ...links] } };
}

export function ownUsage(env: Environment, agent: Agent, original?: Usage) {
  const usage: Usage = { ...original, id: crypto.randomUUID(), kind: 'usage-profile', name: (agent.name + ' usage').slice(0, 300) };
  return assignLink({ ...env, objects: [...env.objects, usage] }, agent.id, 'agent-uses-usage', usage.id);
}

export function bindService(item: Service, offer: Offering | undefined): Service {
  if (item.kind === 'licence-entitlement') return { ...item, offeringId: offer?.id, product: offer?.name ?? item.product, meter: undefined };
  return { ...item, offeringId: offer?.id, category: offer?.name ?? item.category,
    region: offer?.region === 'gb' ? item.region : offer?.region ?? item.region, meter: undefined };
}

export function reuseDeployment(env: Environment, agent: Agent, chosen: string, generated: ReadonlySet<string>) {
  if (!env.objects.some(item => item.kind === 'model-deployment' && item.id === chosen)) return env;
  const previous = linkedObject(env, agent.id, 'agent-uses-deployment', 'model-deployment');
  if (previous?.id === chosen) return env;
  const next = assignLink(env, agent.id, 'agent-uses-deployment', chosen);
  if (!previous || !generated.has(previous.id) || Object.keys(previous).some(key => !['id', 'kind', 'name'].includes(key)) ||
    previous.name !== (agent.name + ' model').slice(0, 300) ||
    next.relationships.some(edge => edge.from === previous.id || edge.to === previous.id) ||
    env.pricingOverrides.some(rule => rule.objectId === previous.id) || env.forecast.exceptions.some(rule => rule.objectId === previous.id)) return next;
  return removeObject(next, previous.id);
}

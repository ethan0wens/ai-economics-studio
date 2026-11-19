import { z } from 'zod';
import { parseBoundedJson } from './untrusted-data';

export const disclaimer = 'Independent community project. Not affiliated with or endorsed by Microsoft. Estimates depend on assumptions and are not invoices, quotes, licensing advice or compliance certifications.';
export const version = '1.0.0';
export const maxObjects = 300;
export const maxBytes = 2_000_000;
const text = z.string().trim().max(300);
const id = text.min(1);
const name = text.min(1);
const datetime = z.iso.datetime({ offset: true });
export const currency = z.string().regex(/^[A-Z]{3}$/);
const quantity = z.number().min(0).max(1e15);
const count = quantity.int();
const percent = z.number().min(-100).max(10000);
const decimal = z.string().regex(/^\d{1,16}(\.\d{1,15})?$/);
const moneySnapshot = z.string().regex(/^\d{1,70}(\.\d{1,4})?$/);
const scopeSnapshot = z.strictObject({ known: moneySnapshot, annual: moneySnapshot, incomplete: count });
const common = { id, name };
const region = text.regex(/^[a-z0-9-]+$/);
const modality = z.enum(['text', 'image', 'audio', 'video', 'embedding']);
const meter = z.strictObject({
  meterId: id, sku: id, unit: name, quantityPerUnit: quantity.gt(0), region,
  priceType: z.literal('Consumption'),
});
export type Meter = z.infer<typeof meter>;
export const creditCategories = { classic: 'Classic answers', generative: 'Generative answers', actions: 'Agent actions and tools', flows: 'Agent flows', other: 'Other billable activity' } as const;
export type CreditCategory = keyof typeof creditCategories;
const parts = {
  'model-deployment': z.strictObject({
    ...common, kind: z.literal('model-deployment'), offeringId: id.optional(), modelId: text.optional(), modelVersion: text.optional(),
    region: region.optional(), sku: text.optional(), mode: z.enum(['payg', 'provisioned']).optional(),
    deploymentRegion: region.optional(), inputModality: modality.optional(), outputModality: modality.optional(),
    requiredFeature: z.enum(['function-calling', 'structured-outputs', 'responses']).optional(),
    deployedModel: text.optional(), deployedVersion: text.optional(),
    inputMeter: meter.optional(), outputMeter: meter.optional(), capacityMeter: meter.optional(),
    capacity: quantity.optional(), billableHours: quantity.max(744).optional(), allocationBasis: z.literal('input-tokens').optional(),
    comparisonOfferingId: id.optional(), peakInputTpm: count.optional(), peakOutputTpm: count.optional(),
    reservation: z.strictObject({
      sku: text.optional(), region: region.optional(), currency: currency.optional(), ptus: count.positive().optional(),
      term: z.enum(['1', '12']).optional(), total: decimal.refine(value => Number(value) > 0).optional(),
      start: z.iso.date().optional(), coveredHours: quantity.max(744).optional(), reference: text.optional(),
    }).optional(),
  }),
  agent: z.strictObject({
    ...common, kind: z.literal('agent'), offeringId: id.optional(),
    platform: z.enum(['foundry-agent-service', 'copilot-studio']).optional(),
    modelSource: z.enum(['platform-managed', 'deployment-ref']).optional(),
    autonomy: z.enum(['read-only', 'approved-writes', 'autonomous-writes']).optional(),
    sensitivity: z.enum(['public', 'internal', 'confidential', 'regulated']).optional(),
    identity: z.enum(['delegated', 'application']).optional(),
    tools: text.optional(), credits: quantity.optional(), platformMeter: meter.optional(),
    agentSetup: z.enum(['current', 'classic-basic', 'classic-standard']).optional(),
    promptEndpoint: z.enum(['chat-completions', 'responses']).optional(),
    creditMethod: z.literal('breakdown').optional(),
    creditBreakdown: z.partialRecord(z.enum(Object.keys(creditCategories) as CreditCategory[]), quantity).optional(),
    includedUsage: z.strictObject({ credits: quantity.optional(), basis: text.optional(), expiresOn: z.iso.date().optional() }).optional(),
  }),
  'usage-profile': z.strictObject({
    ...common, kind: z.literal('usage-profile'),
    executions: count.optional(), calls: quantity.optional(), input: count.optional(), output: count.optional(), cachedInput: count.optional(),
    retries: quantity.max(100).optional(), toolCalls: quantity.optional(),
  }),
  'user-group': z.strictObject({
    ...common, kind: z.literal('user-group'),
    population: count.optional(), intended: count.optional(), active: count.optional(), interactions: count.optional(),
  }),
  'licence-entitlement': z.strictObject({
    ...common, kind: z.literal('licence-entitlement'), offeringId: id.optional(),
    product: text.optional(), procurement: z.enum(['existing', 'incremental', 'unknown']).optional(),
    seats: count.optional(), meter: meter.optional(), existingMonthly: quantity.optional(),
    overlapSeats: count.optional(), seatScope: text.optional(),
  }),
  'supporting-resource': z.strictObject({
    ...common, kind: z.literal('supporting-resource'), offeringId: id.optional(), category: text.optional(), region: region.optional(),
    monthlyQuantity: quantity.optional(), meter: meter.optional(), deploymentRegion: region.optional(),
  }),
  'security-policy': z.strictObject({
    ...common, kind: z.literal('security-policy'), control: z.enum(['identity', 'approval', 'audit', 'dlp', 'budget']).optional(),
    status: z.enum(['implemented', 'planned', 'absent', 'unknown']).optional(), detail: text.optional(),
  }),
};

export const objectSchema = z.discriminatedUnion('kind', [
  parts['model-deployment'], parts.agent, parts['usage-profile'], parts['user-group'],
  parts['licence-entitlement'], parts['supporting-resource'], parts['security-policy'],
]);
export type StudioObject = z.infer<typeof objectSchema>;
export function declaredCopilotCredits(agent: Extract<StudioObject, { kind: 'agent' }>) {
  if (agent.creditMethod !== 'breakdown') return agent.credits === undefined ? [] : [agent.credits];
  return Object.values(agent.creditBreakdown ?? {});
}
export type Kind = StudioObject['kind'];
export const kindLabels: Record<Kind, string> = {
  'model-deployment': 'Model deployment', agent: 'Agent', 'usage-profile': 'Usage profile',
  'user-group': 'User group', 'licence-entitlement': 'Licence entitlement',
  'supporting-resource': 'Supporting resource', 'security-policy': 'Security policy',
};
export const edgeKinds = {
  'agent-uses-deployment': ['agent', 'model-deployment'],
  'agent-uses-usage': ['agent', 'usage-profile'],
  'group-can-access-agent': ['user-group', 'agent'],
  'group-has-entitlement': ['user-group', 'licence-entitlement'],
  'agent-has-entitlement': ['agent', 'licence-entitlement'],
  'licence-replaces-entitlement': ['licence-entitlement', 'licence-entitlement'],
  'agent-uses-prompt-model': ['agent', 'model-deployment'],
  'agent-invokes-agent': ['agent', 'agent'],
  'agent-uses-resource': ['agent', 'supporting-resource'],
  'policy-applies-to-agent': ['security-policy', 'agent'],
  'policy-applies-to-group': ['security-policy', 'user-group'],
  'policy-applies-to-environment': ['security-policy', 'environment'],
  'deployment-uses-resource': ['model-deployment', 'supporting-resource'],
} as const;
export type EdgeType = keyof typeof edgeKinds;
const edgeSchema = z.strictObject({
  type: z.enum(Object.keys(edgeKinds) as EdgeType[]), from: id, to: id,
  seats: count.optional(), effectiveOn: z.iso.date().optional(),
  integration: z.enum(['foundry-search', 'foundry-private-search']).optional(),
}).superRefine((edge, ctx) => {
  if ((edge.seats !== undefined && !['group-has-entitlement', 'licence-replaces-entitlement'].includes(edge.type)) ||
      (edge.effectiveOn && edge.type !== 'licence-replaces-entitlement') ||
      (edge.integration && edge.type !== 'agent-uses-resource')) {
    ctx.addIssue({ code: 'custom', message: 'Relationship details must match the relationship type.' });
  }
});
export type Edge = z.infer<typeof edgeSchema>;
const scope = { objectId: id.optional(), meter };
export const overrideSchema = z.discriminatedUnion('mode', [
  z.strictObject({ ...scope, currency, reason: name, effectiveAt: datetime.optional(), mode: z.literal('retail') }),
  z.strictObject({ ...scope, currency, reason: name, effectiveAt: datetime.optional(), mode: z.literal('fixed'), value: decimal.refine(value => Number(value) > 0) }),
  z.strictObject({ ...scope, currency, reason: name, effectiveAt: datetime.optional(), mode: z.literal('discount'), value: quantity.max(100) }),
  z.strictObject({ ...scope, currency, reason: name, effectiveAt: datetime.optional(), mode: z.literal('intentional-zero') }),
]);
export type Override = z.infer<typeof overrideSchema>;
export const forecastException = z.strictObject({ ...scope, percent, applyToFixed: z.boolean().optional() });
export type ForecastException = z.infer<typeof forecastException>;

export function meterKey(value: Meter) {
  return JSON.stringify([value.meterId, value.sku, value.region, value.unit, value.quantityPerUnit, value.priceType]);
}
export function scopeKey(item: { objectId?: string; meter: Meter }) {
  return JSON.stringify([item.objectId, meterKey(item.meter)]);
}

const baseEnvironment = z.strictObject({
  schemaVersion: z.literal(version), id, name, description: text.optional(), createdAt: datetime, updatedAt: datetime,
  region, currency, objects: z.array(objectSchema).max(maxObjects), relationships: z.array(edgeSchema).max(1500),
  pricingOverrides: z.array(overrideSchema).max(1500),
  forecast: z.strictObject({ percent, applyToFixed: z.boolean(), exceptions: z.array(forecastException).max(1500) }),
  sourceSnapshot: z.strictObject({
    catalogueId: id.nullable(), checkedAt: datetime.nullable(), current: moneySnapshot.nullable(), incomplete: count,
    currentKnown: moneySnapshot.optional(), annualKnown: moneySnapshot.optional(), forecastKnown: moneySnapshot.optional(),
    licenceEstate: z.strictObject({ existing: scopeSnapshot, proposed: scopeSnapshot }).optional(),
  }).optional(),
  disclaimer: z.literal(disclaimer),
});
export type Environment = z.infer<typeof baseEnvironment>;

export function graphErrors(env: Environment) {
  const errors: string[] = [];
  const objects = new Map(env.objects.map(item => [item.id, item.kind]));
  if (objects.size !== env.objects.length || objects.has(env.id)) errors.push('Object and environment IDs must be unique.');
  const links = new Set<string>();
  const invocations = new Map<string, string[]>();
  for (const { type, from, to } of env.relationships) {
    const [source, target] = edgeKinds[type];
    if (from === to || objects.get(from) !== source || (target === 'environment' ? to !== env.id : objects.get(to) !== target)) {
      errors.push('A relationship has a missing target, a self-link, or an incompatible object type.');
      continue;
    }
    const key = JSON.stringify([type, from, ['agent-uses-deployment', 'agent-uses-prompt-model', 'agent-uses-usage'].includes(type) ? null : to]);
    if (links.has(key)) errors.push('Duplicate relationship or more than one model or usage profile per agent.');
    links.add(key);
    if (type === 'agent-invokes-agent') invocations.set(from, [...(invocations.get(from) ?? []), to]);
  }
  const active = new Set<string>();
  const visited = new Set<string>();
  function cycle(value: string): boolean {
    if (active.has(value)) return true;
    if (visited.has(value)) return false;
    active.add(value);
    const found = (invocations.get(value) ?? []).some(cycle);
    active.delete(value);
    visited.add(value);
    return found;
  }
  if ([...invocations.keys()].some(cycle)) errors.push('Agent invocation links must be acyclic.');
  for (const entries of [env.pricingOverrides, env.forecast.exceptions]) {
    const scopes = entries.map(item => 'currency' in item ? JSON.stringify([scopeKey(item), item.currency]) : scopeKey(item));
    if (new Set(scopes).size !== scopes.length) errors.push('Duplicate pricing rule for one scope.');
    if (entries.some(item => item.objectId !== undefined && !objects.has(item.objectId))) errors.push('A pricing rule refers to a missing object.');
  }
  return [...new Set(errors)];
}
export const environmentSchema = baseEnvironment.superRefine((env, ctx) => {
  for (const message of graphErrors(env)) ctx.addIssue({ code: 'custom', message });
});

export function blankEnvironment(): Environment {
  const now = new Date().toISOString();
  return {
    schemaVersion: version, id: crypto.randomUUID(), name: 'Untitled environment', createdAt: now, updatedAt: now,
    region: 'uksouth', currency: 'GBP', objects: [], relationships: [], pricingOverrides: [],
    forecast: { percent: 0, applyToFixed: false, exceptions: [] }, disclaimer,
  };
}

export function importEnvironment(input: string): Environment {
  if (new TextEncoder().encode(input).length > maxBytes) throw new Error('Environment files must be 2 MB or smaller.');
  const value = parseBoundedJson(input, 55_000, 'Environment file');
  const result = environmentSchema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues.slice(0, 4).map(issue => {
    const location = issue.path.join('.');
    const message = issue.code === 'unrecognized_keys' ? 'Contains unsupported properties.' : 'Invalid value or configuration.';
    return issue.code === 'custom' ? issue.message : [location, message].filter(Boolean).join(' ');
  }).join(' · '));
  const env = result.data;
  function bindVersion<T extends { objectId?: string; meter: Meter }>(rules: T[], key: (rule: T) => string) {
    const occupied = new Set(rules.map(key));
    return rules.map(rule => {
      const model = env.objects.find(item => item.id === rule.objectId);
      if (model?.kind !== 'model-deployment' || !model.modelVersion || model.offeringId ||
        !['model-input', 'model-output', 'model-capacity'].includes(rule.meter.meterId) ||
        (rule.meter.meterId === 'model-capacity' ? model.mode !== 'provisioned' : model.mode !== 'payg') ||
        rule.meter.region !== (model.region ?? env.region) || rule.meter.sku !== (model.sku || model.modelId)) return rule;
      const bound = { ...rule, meter: { ...rule.meter, meterId: `${rule.meter.meterId}:${model.modelVersion}` } };
      return occupied.has(key(bound)) ? rule : bound;
    });
  }
  return {
    ...env, pricingOverrides: bindVersion(env.pricingOverrides, rule => JSON.stringify([scopeKey(rule), rule.currency])),
    forecast: { ...env.forecast, exceptions: bindVersion(env.forecast.exceptions, scopeKey) },
  };
}

export function cloneEnvironment(env: Environment): Environment {
  const fresh = blankEnvironment();
  const ids = new Map([[env.id, fresh.id], ...env.objects.map(item => [item.id, crypto.randomUUID()] as const)]);
  const remap = (key: string) => ids.get(key)!;
  return {
    ...env, id: fresh.id, name: `${env.name.slice(0, 290)} (copy)`, createdAt: fresh.createdAt, updatedAt: fresh.updatedAt,
    objects: env.objects.map(item => ({ ...item, id: remap(item.id) })),
    relationships: env.relationships.map(edge => ({ ...edge, from: remap(edge.from), to: remap(edge.to) })),
    pricingOverrides: env.pricingOverrides.map(rule => ({ ...rule, objectId: rule.objectId && remap(rule.objectId) })),
    forecast: { ...env.forecast, exceptions: env.forecast.exceptions.map(rule => ({ ...rule, objectId: rule.objectId && remap(rule.objectId) })) },
  };
}

export function removeObject(env: Environment, objectId: string): Environment {
  return {
    ...env, objects: env.objects.filter(item => item.id !== objectId),
    relationships: env.relationships.filter(edge => edge.from !== objectId && edge.to !== objectId),
    pricingOverrides: env.pricingOverrides.filter(item => item.objectId !== objectId),
    forecast: { ...env.forecast, exceptions: env.forecast.exceptions.filter(item => item.objectId !== objectId) },
  };
}

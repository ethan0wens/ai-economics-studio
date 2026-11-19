import Decimal from 'decimal.js';
import { creditCategories, objectSchema, type CreditCategory, type Environment } from './domain';
import { linkedObject, updateObject, type Agent, type Usage } from './guided-state';

const Quantity = Decimal.clone({ precision: 50 });
const maximum = 1e15;
export const workloadFields = {
  executions: 'Monthly executions',
  calls: 'Model calls per execution',
  input: 'Input tokens per call',
  output: 'Output tokens per call',
} as const;
type WorkloadField = keyof typeof workloadFields;
export const foundryInputs = {
  users: 'Monthly active users',
  interactions: 'Interactions per active user per month',
  calls: 'Average model calls per interaction',
  input: 'Average uncached input tokens per call',
  output: 'Average output tokens per call',
} as const;
export const foundryKeys = Object.keys(foundryInputs) as (keyof typeof foundryInputs)[];
export const creditKeys = Object.keys(creditCategories) as CreditCategory[];

type FoundryInputs = Partial<Record<keyof typeof foundryInputs, number>>;
type Missing = { kind: 'unresolved'; message: string };
type Invalid = { kind: 'invalid'; message: string };
const unresolved = (message: string): Missing => ({ kind: 'unresolved', message });
const invalid = (message: string): Invalid => ({ kind: 'invalid', message });

export function validQuantity(value: number, whole = false) {
  return Number.isFinite(value) && value >= 0 && value <= maximum && (!whole || Number.isInteger(value));
}

export function estimateFoundry(input: FoundryInputs, profile: Usage) {
  const { users, interactions, calls, input: tokensIn, output } = input;
  if (users === undefined || interactions === undefined || calls === undefined || tokensIn === undefined || output === undefined) {
    return unresolved('Enter all five assumptions. Leave the estimate unresolved if a quantity is unknown.');
  }
  for (const key of foundryKeys) {
    const whole = key !== 'interactions' && key !== 'calls';
    if (!validQuantity(input[key]!, whole)) return invalid(`${foundryInputs[key]} must be a non-negative ${whole ? 'whole number' : 'number'} up to 1,000,000,000,000,000.`);
  }
  const executions = new Quantity(users).times(interactions);
  if (!executions.isInteger() || executions.gt(maximum)) {
    return invalid('Monthly active users × interactions must give a whole monthly execution count up to 1,000,000,000,000,000.');
  }
  const values = { executions: executions.toNumber(), calls, input: tokensIn, output };
  const requests = executions.times(calls);
  const withRetries = requests.times(new Quantity(profile.retries ?? 0).div(100).plus(1));
  return {
    kind: 'ready' as const, values, requests: requests.toFixed(), withRetries: withRetries.toFixed(),
    inputTokens: withRetries.times(tokensIn).toFixed(), outputTokens: withRetries.times(output).toFixed(),
    cachedTokens: profile.cachedInput ? withRetries.times(profile.cachedInput).toFixed() : undefined,
  };
}

export function estimateCopilot(input: Partial<Record<CreditCategory, number>>, unit: 'credits' | 'activity', agent: Agent) {
  if (unit === 'activity') return unresolved('A verified conversion for these activity counts is unavailable in the studio. Use a measured or documented monthly credit total.');
  const entries = creditKeys.flatMap(category => input[category] === undefined ? [] : [[category, input[category]!] as const]);
  if (!entries.length) return unresolved('Enter monthly credits for at least one activity. Use zero only for a known zero.');
  if (entries.some(([, value]) => !validQuantity(value))) return invalid('Enter non-negative credits up to 1,000,000,000,000,000 per activity.');
  const total = Quantity.sum(...entries.map(([, value]) => value));
  const credits = total.toNumber();
  if (agent.creditMethod !== 'breakdown' && (!validQuantity(credits) || !total.eq(credits))) {
    return invalid('The total cannot be saved at this precision. Use credits by activity in Advanced, or enter a supported monthly total.');
  }
  const changes = agent.creditMethod === 'breakdown' ? { creditBreakdown: Object.fromEntries(entries) } : { credits };
  return { kind: 'ready' as const, total: total.toFixed(), changes };
}

export type SensitivityField = WorkloadField | 'credits';
export type SensitivityTarget = { agent: Agent; object: Usage | Agent; fields: readonly SensitivityField[] };

export function sensitivityTargets(env: Environment): SensitivityTarget[] {
  const targets: SensitivityTarget[] = [];
  for (const agent of env.objects) {
    if (agent.kind !== 'agent') continue;
    if (agent.platform === 'copilot-studio' && agent.modelSource === 'platform-managed' && agent.creditMethod !== 'breakdown') {
      targets.push({ agent, object: agent, fields: ['credits'] });
    }
    if (agent.platform !== 'foundry-agent-service' || agent.modelSource !== 'deployment-ref') continue;
    const model = linkedObject(env, agent.id, 'agent-uses-deployment', 'model-deployment');
    const profile = linkedObject(env, agent.id, 'agent-uses-usage', 'usage-profile');
    if (model?.mode === 'payg' && profile && env.relationships.filter(edge => edge.type === 'agent-uses-usage' && edge.to === profile.id).length === 1) {
      targets.push({ agent, object: profile, fields: Object.keys(workloadFields) as WorkloadField[] });
    }
  }
  return targets;
}

export function sensitivityValue(target: SensitivityTarget, field: SensitivityField) {
  return field === 'credits' ? (target.object.kind === 'agent' ? target.object.credits : undefined)
    : target.object.kind === 'usage-profile' ? target.object[field] : undefined;
}

export function usageSensitivity(env: Environment, agentId: string, field: SensitivityField, value: number) {
  const target = sensitivityTargets(env).find(({ agent }) => agent.id === agentId);
  if (!target?.fields.includes(field)) return invalid('Choose an eligible workload and usage input.');
  if (!validQuantity(value, field !== 'calls' && field !== 'credits')) return invalid('Enter a valid non-negative quantity for this input.');
  const changed = objectSchema.safeParse({ ...target.object, [field]: value });
  return changed.success ? { kind: 'ready' as const, env: updateObject(env, changed.data) } : invalid('This usage quantity could not be validated.');
}

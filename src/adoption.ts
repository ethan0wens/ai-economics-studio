import Decimal from 'decimal.js';
import type { Catalogue } from './catalogue';
import type { Environment } from './domain';
import { ledger, type Ledger } from './ledger';
import { compareCosts } from './scenario';
import { estimateFoundry, sensitivityTargets, usageSensitivity, validQuantity } from './usage-estimation';
import { estimateValue, type ValuePlan } from './value';

const Quantity = Decimal.clone({ precision: 80 });
export type AdoptionLink = { agentId: string; perUser?: number; note: string };
const cases = { lower: 'Lower adoption', expected: 'Expected adoption', higher: 'Higher adoption' } as const;
export type AdoptionRates = Partial<Record<keyof typeof cases, number>>;

function projectWorkload(env: Environment, activeUsers: string, link: AdoptionLink) {
  const target = sensitivityTargets(env).find(item => item.agent.id === link.agentId);
  if (!target || link.perUser === undefined || !validQuantity(link.perUser)) return;
  const users = Number(activeUsers);
  if (target.object.kind === 'usage-profile') {
    const profile = target.object;
    const projected = estimateFoundry({ users, interactions: link.perUser, calls: profile.calls, input: profile.input, output: profile.output }, profile);
    if (projected.kind !== 'ready') return;
    const executions = projected.values.executions;
    const change = usageSensitivity(env, link.agentId, 'executions', executions);
    if (change.kind === 'ready') return { env: change.env, volume: String(executions), unit: 'executions' };
  } else if (link.note.trim()) {
    const credits = new Quantity(users).times(link.perUser);
    const quantity = credits.toNumber();
    if (!validQuantity(quantity) || !credits.eq(quantity)) return;
    const change = usageSensitivity(env, link.agentId, 'credits', quantity);
    if (change.kind === 'ready') return { env: change.env, volume: credits.toFixed(), unit: 'Copilot Credits' };
  }
}

export function compareAdoption(env: Environment, current: Ledger, catalogue: Catalogue, plan: ValuePlan, rates: AdoptionRates, link?: AdoptionLink) {
  const rows = Object.entries(cases).flatMap(([key, label]) => {
    const rate = rates[key as keyof AdoptionRates];
    if (key !== 'expected' && rate === undefined) return [];
    const adoption = rate !== undefined && Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : undefined;
    const value = estimateValue({ ...plan, assumptions: { ...plan.assumptions, adoption: adoption === undefined ? undefined : { value: adoption, source: 'entered' } } });
    const workload = link && value.activeUsers !== null ? projectWorkload(env, value.activeUsers, link) : undefined;
    const proposed = workload ? ledger(workload.env, catalogue.records, current.assessedAt, catalogue.inventory) : undefined;
    const costs = proposed ? compareCosts(current, proposed) : undefined;
    return [{
      label, adoption, activeUsers: value.activeUsers, grossHours: value.grossHours.monthly,
      economicEquivalent: value.economicEquivalent.monthly, cashableSavings: value.cashableSavings.monthly,
      volume: workload ? { value: workload.volume, unit: workload.unit } : undefined,
      knownCost: costs?.proposed ?? null, unresolved: costs?.unresolvedAfter,
    }];
  });
  return {
    currency: env.currency, valueCurrency: plan.currency, rows,
    current: compareCosts(current, current).current, unresolved: current.summary.current.incomplete,
    link: link && { ...link, name: env.objects.find(item => item.id === link.agentId)?.name ?? 'Selected workload' },
  };
}

export type AdoptionComparison = ReturnType<typeof compareAdoption>;

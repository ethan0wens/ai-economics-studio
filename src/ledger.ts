import Decimal from 'decimal.js';
import { findRetail, resolveOffering, type RetailRecord } from './catalogue';
import { meterKey, type Environment, type Meter, type Override, type StudioObject } from './domain';
import { applicableOffering, copilotPack, offeringMeter, offerings, type Component, type Offering } from './offerings';
import { compatibility, microsoft } from './microsoft';

const Money = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const zero = () => new Money(0);
export const categories = ['Inference', 'Orchestration', 'Licensing', 'Infrastructure', 'Governance'] as const;
type Category = typeof categories[number];
export function financialRates(retail: string | undefined, agreement: Override | undefined, scenario: number, inflate: boolean) {
  const baseline = retail === undefined ? null : new Money(retail);
  const factor = new Money(scenario).div(100).plus(1);
  const current = agreement?.mode === 'intentional-zero' ? zero()
    : agreement?.mode === 'fixed' ? new Money(agreement.value)
    : agreement?.mode === 'discount' ? baseline?.times(new Money(1).minus(new Money(agreement.value).div(100))) ?? null
    : baseline;
  const future = agreement?.mode === 'intentional-zero' || (agreement?.mode === 'fixed' && !inflate) ? current : current?.times(factor) ?? null;
  return { baseline, current, future };
}

export function graduatedAmount(quantity: Decimal.Value, record: Pick<RetailRecord, 'tiers' | 'price' | 'quantityPerUnit'>) {
  const usage = new Money(quantity);
  if (!record.tiers) return usage.div(record.quantityPerUnit).times(record.price);
  return record.tiers.reduce((amount, tier, index) => {
    const upper = record.tiers?.[index + 1]?.from;
    const end = upper === undefined ? usage : Money.min(usage, upper);
    return amount.plus(Money.max(0, end.minus(tier.from)).div(record.quantityPerUnit).times(tier.price));
  }, zero());
}

export function assumedMeter(meterId: string, sku: string, region: string, unit: string, quantityPerUnit = 1): Meter {
  return { meterId, sku, region, unit, quantityPerUnit, priceType: 'Consumption' };
}
type Basis = 'retail' | 'current' | 'forecast';
type Values = Record<Basis, string | null>;
const bases: Basis[] = ['retail', 'current', 'forecast'];
export type Line = {
  id: string; objectId: string; pricingOwner: string; object: string; category: Category; component: string; fixed: boolean;
  meter?: Meter; quantity: string | null; currency: string; amounts: Values; rates: Values;
  source?: RetailRecord; status: string; reason?: string; agreement?: Override; scenario: number;
  allocatesTo: string[]; includedCredits?: string; allocation?: { agentId: string; amount: string }[];
};

export function summarize(lines: Line[], code = 'GBP') {
  const digits = new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  function basis(key: Basis) {
    const known = lines.reduce((sum, line) => line.amounts[key] === null ? sum : sum.plus(line.amounts[key]), zero());
    return { known: known.toFixed(digits), annual: known.times(12).toFixed(digits), incomplete: lines.filter(line => line.amounts[key] === null).length };
  }
  return { retail: basis('retail'), current: basis('current'), forecast: basis('forecast') };
}
export function formatMoney(value: string | null, currency: string) {
  if (value === null) return 'Unknown';
  const [whole, fraction] = value.split('.');
  if (whole.length < 13) return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value));
  return `${currency} ${new Intl.NumberFormat('en-GB').format(BigInt(whole))}${fraction ? `.${fraction}` : ''}`;
}

export function ledger(env: Environment, records: RetailRecord[], at = new Date().toISOString(), inventory: readonly Offering[] = offerings) {
  const lines: Line[] = [];
  const issues: { id: string; message: string }[] = [];
  const objects = new Map(env.objects.map(item => [item.id, item]));
  const code = env.currency;
  const digits = new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  type EdgeType = Environment['relationships'][number]['type'];
  const outgoing = (id: string, type: EdgeType) => env.relationships.filter(edge => edge.from === id && edge.type === type);
  const note = (id: string, message: string) => issues.push({ id, message });
  const bill = (object: StudioObject, category: Category, component: string, options: {
    meter?: Meter; quantity?: Decimal | number; reason?: string; fixed?: boolean; existing?: boolean;
    owner?: string; allocatesTo?: string[]; allowRetail?: boolean;
    offer?: Offering; componentId?: Component; includedCredits?: Decimal;
  } = {}) => {
    const { meter, quantity, reason, fixed = false, existing, owner = object.id, allocatesTo = [], allowRetail = false, offer, componentId, includedCredits } = options;
    const matches = (rule: {meter: Meter}) => meter && meterKey(rule.meter) === meterKey(meter);
    const compatibleLegacyCopilot = (rule: { meter: Meter }) => componentId === 'credits' && offer &&
      meterKey(rule.meter) === meterKey(assumedMeter('copilot-credits', 'Copilot Studio', env.region, 'credit'));
    const inForce = (rule: Override) => rule.currency === code && (matches(rule) || compatibleLegacyCopilot(rule)) && (!rule.effectiveAt || Date.parse(rule.effectiveAt) <= Date.parse(at));
    const overrides = env.pricingOverrides.filter(inForce);
    const agreement = overrides.find(rule => rule.objectId === owner && matches(rule)) ?? overrides.find(rule => rule.objectId === owner)
      ?? overrides.find(rule => !rule.objectId && matches(rule)) ?? overrides.find(rule => !rule.objectId);
    const exceptions = env.forecast.exceptions.filter(rule => matches(rule) || compatibleLegacyCopilot(rule));
    const exception = exceptions.find(rule => rule.objectId === owner && matches(rule)) ?? exceptions.find(rule => rule.objectId === owner)
      ?? exceptions.find(rule => !rule.objectId && matches(rule)) ?? exceptions.find(rule => !rule.objectId);
    const scenario = exception?.percent ?? env.forecast.percent;
    const source = offer && componentId ? resolveOffering(records, offer, componentId, code, at)
      : meter && allowRetail ? findRetail(records.filter(record => !record.component || record.component === 'usage'), meter, code, at) : undefined;
    const blended = source?.tiers && quantity !== undefined && new Money(quantity).gt(0)
      ? graduatedAmount(quantity, source).times(source.quantityPerUnit).div(quantity).toFixed() : source?.price;
    const rate = financialRates(blended, agreement, scenario, exception?.applyToFixed ?? env.forecast.applyToFixed);
    const fullyCovered = includedCredits?.gt(0) && quantity !== undefined && new Money(quantity).isZero();
    const amounts = (value: Decimal | null) => value === null || quantity === undefined || !meter ? null : new Money(quantity).div(meter.quantityPerUnit).times(value).toFixed(digits);
    const retail = amounts(rate.baseline);
    const current = existing || fullyCovered ? zero().toFixed(digits) : amounts(rate.current);
    const forecast = existing || fullyCovered ? zero().toFixed(digits) : amounts(rate.future);
    lines.push({
      id: `${object.id}:${component}`, objectId: object.id, pricingOwner: owner, object: object.name, category, component, meter, fixed,
      quantity: quantity?.toString() ?? null, currency: code, amounts: { retail, current, forecast },
      rates: { retail: rate.baseline?.toFixed() ?? null, current: existing ? '0' : rate.current?.toFixed() ?? null, forecast: existing ? '0' : rate.future?.toFixed() ?? null },
      status: existing ? 'Already owned' : fullyCovered ? 'Covered by linked packs' : current === null ? 'Unknown' : agreement?.mode === 'intentional-zero' ? 'Intentional zero' : agreement?.mode && agreement.mode !== 'retail' ? 'User agreement' : 'Microsoft retail',
      reason: reason ?? (current === null ? (quantity === undefined ? 'Enter monthly usage.' : 'No current verified rate matches this configuration. Review the catalogue or enter an evidenced contract amount.') : undefined),
      source, agreement, scenario, allocatesTo, includedCredits: includedCredits?.toFixed(),
    });
  };
  function selection(object: StudioObject) {
    return applicableOffering(object, 'region' in object ? object.region ?? env.region : env.region, code, inventory);
  }
  const tariffScopes = new Map<string, number>();
  for (const object of env.objects) {
    if (object.kind !== 'supporting-resource') continue;
    const offer = selection(object);
    if (offer && resolveOffering(records, offer, 'usage', code, at)?.tiers) {
      tariffScopes.set(offer.id, (tariffScopes.get(offer.id) ?? 0) + 1);
    }
  }
  const poolLinks = new Map<string, string[]>();
  const remaining = new Map<string, Decimal>();
  for (const resource of env.objects) {
    if (resource.kind === 'supporting-resource' && selection(resource)?.id === copilotPack.offeringId &&
      code === 'GBP' && resource.monthlyQuantity !== undefined && Number.isInteger(resource.monthlyQuantity)) {
      remaining.set(resource.id, new Money(resource.monthlyQuantity).times(copilotPack.credits));
    }
  }
  for (const edge of env.relationships) {
    if (edge.type === 'agent-uses-resource' && remaining.has(edge.to)) {
      poolLinks.set(edge.from, [...(poolLinks.get(edge.from) ?? []), edge.to]);
    }
  }
  // Stable order makes responsibility for any residual credits reproducible.
  const creditAllocations = new Map<string, Decimal>();
  for (const [id, links] of [...poolLinks].sort(([a], [b]) => a.localeCompare(b))) {
    const agent = objects.get(id);
    if (agent?.kind !== 'agent' || agent.platform !== 'copilot-studio' || agent.modelSource !== 'platform-managed' || agent.credits === undefined) continue;
    if (links.length !== 1) {
      note(id, 'Multiple credit packs are linked. Link one pooled resource per agent to allocate credits.');
      continue;
    }
    const pool = remaining.get(links[0])!;
    const used = Money.min(pool, agent.credits);
    creditAllocations.set(id, used);
    remaining.set(links[0], pool.minus(used));
  }

  for (const object of env.objects) {
    switch (object.kind) {
      case 'agent': {
        const target = objects.get(outgoing(object.id, 'agent-uses-deployment')[0]?.to ?? '');
        const model = target?.kind === 'model-deployment' ? target : undefined;
        const assessment = compatibility(object, model);
        if (assessment.status !== 'verified-supported') note(object.id, assessment.reason);
        if (outgoing(object.id, 'agent-invokes-agent').length) note(object.id, 'Invocation links are descriptive. Include downstream volume once in the downstream usage profile.');
        if (object.platform === 'copilot-studio') {
          const offer = selection(object);
          const included = creditAllocations.get(object.id) ?? zero();
          bill(object, 'Orchestration', 'Copilot Studio credits', {
            meter: (offer && offeringMeter(offer, 'credits')) ?? (object.platformMeter?.region === env.region ? object.platformMeter : undefined) ?? assumedMeter('copilot-credits', 'Copilot Studio', env.region, 'credit'),
            quantity: assessment.status === 'verified-supported' && object.credits !== undefined ? new Money(object.credits).minus(included) : undefined,
            offer: assessment.status === 'verified-supported' ? offer : undefined, componentId: 'credits', includedCredits: included.gt(0) ? included : undefined,
            reason: assessment.status === 'verified-supported' ? undefined : assessment.reason,
          });
          break;
        }
        if (object.platform !== 'foundry-agent-service' || object.modelSource !== 'deployment-ref' || !model?.mode || !model.modelId) {
          bill(object, 'Inference', 'Agent inference', { reason: assessment.reason });
          break;
        }
        if (model.mode === 'provisioned') break;
        const usage = objects.get(outgoing(object.id, 'agent-uses-usage')[0]?.to ?? '');
        const profile = usage?.kind === 'usage-profile' ? usage : undefined;
        const calls = profile?.executions === undefined || profile.calls === undefined ? undefined
          : new Money(profile.executions).times(profile.calls).times(new Money(profile.retries ?? 0).div(100).plus(1));
        const region = model.region ?? env.region;
        const sku = model.sku || model.modelId;
        const offer = selection(model);
        const modelMeter = (part: 'input' | 'output') => {
          const manual = part === 'input' ? model.inputMeter : model.outputMeter;
          const custom = assumedMeter(`model-${part}${model.modelVersion ? ':' + model.modelVersion : ''}`, sku, region, `million ${part} tokens`, 1_000_000);
          return (offer && offeringMeter(offer, part)) ?? (manual?.sku === sku && manual.region === region && !model.offeringId ? manual : custom);
        };
        const input = profile?.input === undefined ? undefined : calls?.times(profile.input);
        bill(object, 'Inference', 'Input tokens', {
          meter: modelMeter('input'),
          quantity: input, owner: model.id, offer, componentId: 'input',
        });
        bill(object, 'Inference', 'Output tokens', {
          meter: modelMeter('output'),
          quantity: profile?.output === undefined ? undefined : calls?.times(profile.output), owner: model.id, offer, componentId: 'output',
        });
        break;
      }
      case 'model-deployment': {
        if (!object.modelId || !object.mode) {
          note(object.id, 'Enter model identity and deployment billing mode.');
          bill(object, 'Inference', 'Deployment billing', { reason: 'Deployment billing mode is incomplete.' });
        }
        if (object.mode === 'provisioned') {
          const shares = new Map<string, Decimal>();
          const linked = env.relationships.filter(edge => edge.type === 'agent-uses-deployment' && edge.to === object.id && objects.get(edge.from)?.kind === 'agent');
          const agents = linked.flatMap(edge => {
            const agent = objects.get(edge.from);
            if (agent?.kind !== 'agent' || agent.platform !== 'foundry-agent-service' || agent.modelSource !== 'deployment-ref') return [];
            const usage = objects.get(outgoing(agent.id, 'agent-uses-usage')[0]?.to ?? '');
            if (usage?.kind === 'usage-profile' && usage.executions !== undefined && usage.calls !== undefined && usage.input !== undefined) {
              shares.set(agent.id, new Money(usage.executions).times(usage.calls).times(usage.input).times(new Money(usage.retries ?? 0).div(100).plus(1)));
            }
            return [agent.id];
          });
          const offer = selection(object);
          const sku = object.sku || object.modelId || 'Unspecified model';
          const region = object.region ?? env.region;
          const custom = assumedMeter(`model-capacity${object.modelVersion ? ':' + object.modelVersion : ''}`, sku, region, 'capacity-unit hour');
          const manual = object.capacityMeter;
          bill(object, 'Inference', 'Shared provisioned capacity', {
            meter: (offer && offeringMeter(offer, 'capacity')) ?? (manual?.sku === sku && manual.region === region && !object.offeringId ? manual : custom),
            quantity: object.capacity === undefined || object.billableHours === undefined ? undefined : new Money(object.capacity).times(object.billableHours),
            fixed: true, allocatesTo: agents, offer, componentId: 'capacity',
          });
          const line = lines.at(-1)!;
          const total = agents.reduce((sum, agent) => sum.plus(shares.get(agent) ?? 0), zero());
          if (object.allocationBasis && line.amounts.current !== null && agents.every(agent => shares.has(agent)) && total.gt(0)) {
            let cumulative = zero();
            let allocated = zero();
            line.allocation = agents.map(agentId => {
              cumulative = cumulative.plus(shares.get(agentId)!);
              const rounded = new Money(line.amounts.current!).times(cumulative).div(total).toDecimalPlaces(digits);
              const amount = rounded.minus(allocated).toFixed(digits);
              allocated = rounded;
              return { agentId, amount };
            });
          }
        }
        break;
      }
      case 'supporting-resource':
        if (!env.relationships.some(edge => edge.to === object.id)) note(object.id, 'Unattached resource. Any configured cost remains in environment totals.');
        {
          const region = object.region ?? env.region;
          const offer = selection(object);
          const configured = !object.offeringId && object.meter?.region === region ? object.meter : undefined;
          const reason = (object.offeringId && !offer || object.meter && !configured && !offer) ? 'The selected retail meter is for another region. Select its regional equivalent or enter a manual rate.' : undefined;
          if (reason) note(object.id, reason);
          const isPack = offer?.id === copilotPack.offeringId;
          const invalidPacks = isPack && object.monthlyQuantity !== undefined && !Number.isInteger(object.monthlyQuantity);
          const duplicateTariff = offer && (tariffScopes.get(offer.id) ?? 0) > 1;
          if (duplicateTariff) note(object.id, 'Consolidate this graduated tariff into one monthly resource so shared bands are counted once.');
          const category = offer?.family === 'security' ? 'Governance' : isPack ? 'Orchestration' : 'Infrastructure';
          bill(object, category, isPack ? 'Shared Copilot credit packs' : 'Supporting usage', {
            meter: (offer && offeringMeter(offer, 'usage')) ?? configured ?? assumedMeter('supporting-usage', object.category || 'Unspecified resource', region, 'declared usage unit'),
            quantity: invalidPacks || duplicateTariff ? undefined : object.monthlyQuantity,
            reason: invalidPacks ? 'Enter a whole number of monthly credit packs.'
              : duplicateTariff ? 'Multiple resources use these graduated bands. Enter consolidated monthly usage on one resource.' : reason,
            offer, componentId: 'usage', allowRetail: Boolean(configured), fixed: isPack,
          });
        }
        break;
      case 'licence-entitlement': {
        const assignments = env.relationships.filter(edge => edge.type === 'group-has-entitlement' && edge.to === object.id);
        if (assignments.length > 1) note(object.id, 'Verify group overlap. Enter one deduplicated billable seat count for this entitlement.');
        if (env.objects.some(other => other.id !== object.id && other.kind === 'licence-entitlement' && other.product && other.product === object.product)) {
          note(object.id, 'Multiple entitlements use this SKU. Verify they do not cover the same seats.');
        }
        const offer = selection(object);
        const manual = object.meter && object.meter.sku === object.product && object.meter.region === env.region ? object.meter : undefined;
        bill(object, offer?.family === 'security' ? 'Governance' : 'Licensing', 'Monthly seats', {
          meter: (offer && offeringMeter(offer, 'seats')) ?? manual ?? assumedMeter('licence-seats', object.product || 'Unspecified licence', env.region, 'seat/month'),
          quantity: object.procurement === 'incremental' || object.procurement === 'existing' ? object.seats : undefined,
          existing: object.procurement === 'existing', fixed: true, offer, componentId: 'seats',
          reason: object.procurement === 'existing' ? 'Declared already owned. Incremental cost is zero; existing spend may be unknown.'
            : object.procurement !== 'incremental' ? 'Confirm whether seats are owned or incremental.' : undefined,
        });
        break;
      }
      case 'user-group':
        if (object.intended === undefined || object.active === undefined) note(object.id, 'Enter intended and active users.');
        if ((object.active ?? 0) > (object.intended ?? Infinity) || (object.intended ?? 0) > (object.population ?? Infinity)) note(object.id, 'Active users must fit within the intended audience and declared population.');
        break;
      case 'usage-profile':
        if (object.executions === undefined || object.calls === undefined || object.input === undefined || object.output === undefined) note(object.id, 'Enter executions, calls and separate input/output token estimates.');
        break;
      case 'security-policy':
        if (!object.control || !object.status) note(object.id, 'Declare a control and implementation status.');
        break;
    }
  }
  return { lines, summary: summarize(lines, code), issues };
}
export type Ledger = ReturnType<typeof ledger>;

export function governance(env: Environment) {
  const rules = [
    { control: 'identity', title: 'Identity and least privilege', why: 'Review the agent identity and scope its tool and data permissions.', critical: false, source: microsoft.governance },
    { control: 'approval', title: 'Human approval for writes', why: 'Require review before consequential or autonomous writes.', critical: true, source: microsoft.governance },
    { control: 'audit', title: 'Logs and retention', why: 'Define audit events, retention and incident ownership.', critical: false, source: microsoft.governance },
    { control: 'dlp', title: 'Sensitive data and connector boundaries', why: 'Confirm how sensitive data and connector policies apply to this platform.', critical: true, source: microsoft.dlp },
    { control: 'budget', title: 'Usage caps and budget alerts', why: 'Set alerts and review runaway consumption and retries.', critical: false, source: microsoft.budget },
  ] as const;
  return env.objects.flatMap(agent => agent.kind !== 'agent' ? [] : rules.filter(rule => {
    if (rule.control === 'approval') return agent.autonomy !== 'read-only';
    if (rule.control === 'dlp') return agent.sensitivity !== 'public';
    return true;
  }).map(rule => {
    const groups = new Set(env.relationships.filter(edge => edge.type === 'group-can-access-agent' && edge.to === agent.id).map(edge => edge.from));
    const policies = env.objects.filter(policy => policy.kind === 'security-policy' && policy.control === rule.control &&
      env.relationships.some(edge => edge.from === policy.id && ((edge.type === 'policy-applies-to-agent' && edge.to === agent.id) ||
      (edge.type === 'policy-applies-to-group' && groups.has(edge.to)) ||
      (edge.type === 'policy-applies-to-environment' && edge.to === env.id))));
    const statuses = new Set(policies.map(policy => policy.kind === 'security-policy' ? policy.status : undefined));
    const status = statuses.size > 1 ? 'Conflicting declarations' : statuses.has('implemented') ? 'Modelled control' : statuses.has('planned')
      ? 'Planned' : statuses.has('absent') ? 'Requires validation' : 'Unknown';
    return { ...rule, id: agent.id, object: agent.name, status, version: '1.0.0', confidence: 'Declared inputs only' };
  }));
}

export { bases };

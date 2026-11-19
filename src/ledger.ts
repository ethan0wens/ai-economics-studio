import Decimal from 'decimal.js';
import { findRetail, resolveOffering, type RetailRecord } from './catalogue';
import { declaredCopilotCredits, meterKey, type Environment, type Meter, type Override, type StudioObject } from './domain';
import { applicableOffering, copilotPack, offeringMeter, offerings, type Component, type Offering } from './offerings';
import { microsoft } from './microsoft';
import { technical } from './compatibility';
import { licensing, type LicensingFinding } from './entitlements';

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
  allocatesTo: string[]; includedCredits?: string; entitledCredits?: string; allocation?: { agentId: string; amount: string }[];
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
  const technicalFindings = technical(env, at);
  const licencePlan = licensing(env, inventory, at);
  const licensingFindings: LicensingFinding[] = [...licencePlan.findings];
  const digits = new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  type EdgeType = Environment['relationships'][number]['type'];
  const outgoing = (id: string, type: EdgeType) => env.relationships.filter(edge => edge.from === id && edge.type === type);
  const note = (id: string, message: string) => issues.push({ id, message });
  const bill = (object: StudioObject, category: Category, component: string, options: {
    meter?: Meter; quantity?: Decimal | number; reason?: string; fixed?: boolean; existing?: boolean;
    owner?: string; allocatesTo?: string[]; allowRetail?: boolean;
    offer?: Offering; componentId?: Component; includedCredits?: Decimal; entitledCredits?: Decimal;
  } = {}) => {
    const { meter, quantity, reason, fixed = false, existing, owner = object.id, allocatesTo = [], allowRetail = false, offer, componentId, includedCredits, entitledCredits } = options;
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
    const fullyCovered = ((includedCredits?.gt(0) || entitledCredits?.gt(0)) ?? false) && quantity !== undefined && new Money(quantity).isZero();
    const amounts = (value: Decimal | null) => value === null || quantity === undefined || !meter ? null : new Money(quantity).div(meter.quantityPerUnit).times(value).toFixed(digits);
    const retail = existing ? zero().toFixed(digits) : amounts(rate.baseline);
    const current = existing || fullyCovered ? zero().toFixed(digits) : amounts(rate.current);
    const forecast = existing || fullyCovered ? zero().toFixed(digits) : amounts(rate.future);
    lines.push({
      id: `${object.id}:${component}`, objectId: object.id, pricingOwner: owner, object: object.name, category, component, meter, fixed,
      quantity: quantity?.toString() ?? null, currency: code, amounts: { retail, current, forecast },
      rates: { retail: rate.baseline?.toFixed() ?? null, current: existing ? '0' : rate.current?.toFixed() ?? null, forecast: existing ? '0' : rate.future?.toFixed() ?? null },
      status: existing ? 'Already owned' : fullyCovered ? entitledCredits?.gt(0) ? 'Covered by declared entitlement or packs' : 'Covered by linked packs' : current === null ? 'Unknown' : agreement?.mode === 'intentional-zero' ? 'Intentional zero' : agreement?.mode && agreement.mode !== 'retail' ? 'User agreement' : 'Microsoft retail',
      reason: reason ?? (current === null ? (quantity === undefined ? 'Enter monthly usage.' : 'No current verified rate matches this configuration. Review the catalogue or enter an evidenced contract amount.') : undefined),
      source, agreement, scenario, allocatesTo, includedCredits: includedCredits?.toFixed(), entitledCredits: entitledCredits?.toFixed(),
    });
  };
  function selection(object: StudioObject) {
    return applicableOffering(object, 'region' in object ? object.region ?? env.region : env.region, code, inventory);
  }
  const declaredCredits = new Map<string, { remaining?: Decimal; included?: Decimal; reason?: string }>();
  for (const agent of env.objects) {
    if (agent.kind !== 'agent' || agent.platform !== 'copilot-studio' || agent.modelSource !== 'platform-managed') continue;
    const amounts = declaredCopilotCredits(agent);
    const total = amounts.length ? Money.sum(...amounts) : undefined;
    const grant = agent.includedUsage;
    if (!grant) declaredCredits.set(agent.id, { remaining: total });
    else if (grant.credits === undefined || !grant.basis || !grant.expiresOn) {
      declaredCredits.set(agent.id, { reason: 'Complete the customer allowance amount, basis and expiry or remove the allowance.' });
      licensingFindings.push({ id: agent.id, title: 'Declared included usage', status: 'Unverified',
        detail: 'The declared allowance is incomplete. Confirm the usage scope and expiry before applying the deduction.' });
    }
    else if (grant.expiresOn < at.slice(0, 10)) {
      declaredCredits.set(agent.id, { remaining: total });
      licensingFindings.push({ id: agent.id, title: 'Declared included usage', status: 'Action required',
        detail: 'The customer-declared allowance expired. The estimate uses the declared gross usage without this reduction.' });
    } else if (total === undefined || total.lt(grant.credits)) {
      declaredCredits.set(agent.id, { reason: 'Enter gross credits at least equal to the customer-declared included usage.' });
    } else {
      declaredCredits.set(agent.id, { remaining: total.minus(grant.credits), included: new Money(grant.credits) });
      licensingFindings.push({ id: agent.id, title: 'Declared included usage', status: 'Conditional',
        detail: `Customer declaration through ${grant.expiresOn}. ${grant.basis}` });
    }
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
  // Preserve inventory order across JSON round trips and duplication, including when per-agent rates differ.
  const creditAllocations = new Map<string, Decimal>();
  const ambiguousPools = new Set<string>();
  for (const agent of env.objects) {
    const id = agent.id;
    const links = poolLinks.get(id);
    if (!links || agent.kind !== 'agent' || agent.platform !== 'copilot-studio' || agent.modelSource !== 'platform-managed') continue;
    const credits = declaredCredits.get(id)?.remaining;
    if (credits === undefined) continue;
    if (links.length !== 1) {
      ambiguousPools.add(id);
      note(id, 'Multiple credit pools apply. Link exactly one eligible pooled resource per agent to resolve PAYG overage.');
      licensingFindings.push({ id, title: 'Prepaid credit allocation', status: 'Action required',
        detail: 'Multiple linked pools could cover these credits. The residual PAYG cost is unresolved.' });
      continue;
    }
    const pool = remaining.get(links[0])!;
    const used = Money.min(pool, credits);
    creditAllocations.set(id, used);
    remaining.set(links[0], pool.minus(used));
  }

  const deploymentBlocked = (id: string) => technicalFindings.some(finding => finding.id === id && finding.status === 'incompatible');
  const usageReferences = new Map<string, number>();
  for (const edge of env.relationships) {
    if (edge.type === 'agent-uses-usage') usageReferences.set(edge.to, (usageReferences.get(edge.to) ?? 0) + 1);
  }
  function usageFor(id: string) {
    const profileId = outgoing(id, 'agent-uses-usage')[0]?.to;
    const duplicate = !!profileId && (usageReferences.get(profileId) ?? 0) > 1;
    const item = objects.get(profileId ?? '');
    return { profile: !duplicate && item?.kind === 'usage-profile' ? item : undefined, duplicate };
  }
  function modelTokens(object: StudioObject, model: Extract<StudioObject, { kind: 'model-deployment' }>, prompt = false) {
    const { profile, duplicate } = usageFor(object.id);
    const reason = duplicate ? 'This usage profile is linked to several agents. Provide a distinct monthly workload for each agent to avoid counting demand twice.' : undefined;
    if (reason) note(object.id, reason);
    const calls = profile?.executions === undefined || profile.calls === undefined ? undefined
      : new Money(profile.executions).times(profile.calls).times(new Money(profile.retries ?? 0).div(100).plus(1));
    const region = model.region ?? env.region;
    const sku = model.sku || model.modelId || 'Unspecified model';
    const offer = selection(model);
    const modelMeter = (part: 'input' | 'output') => {
      const manual = part === 'input' ? model.inputMeter : model.outputMeter;
      const custom = assumedMeter(`model-${part}${model.modelVersion ? ':' + model.modelVersion : ''}`, sku, region, `million ${part} tokens`, 1_000_000);
      return (offer && offeringMeter(offer, part)) ?? (manual?.sku === sku && manual.region === region && !model.offeringId ? manual : custom);
    };
    const input = profile?.input === undefined ? undefined : calls?.times(profile.input);
    bill(object, 'Inference', prompt ? 'Prompt input tokens' : 'Input tokens', {
      meter: modelMeter('input'),
      quantity: input, owner: model.id, offer, componentId: 'input', reason,
    });
    if (profile?.cachedInput) {
      const cached = (offer && offeringMeter(offer, 'cached')) ?? assumedMeter(
        `model-cached${model.modelVersion ? ':' + model.modelVersion : ''}`, sku, region, 'million cached input tokens', 1_000_000);
      bill(object, 'Inference', prompt ? 'Prompt cached input tokens' : 'Cached input tokens', {
        meter: cached, quantity: calls?.times(profile.cachedInput), owner: model.id, offer, componentId: 'cached',
      });
    }
    bill(object, 'Inference', prompt ? 'Prompt output tokens' : 'Output tokens', {
      meter: modelMeter('output'),
      quantity: profile?.output === undefined ? undefined : calls?.times(profile.output), owner: model.id, offer, componentId: 'output', reason,
    });
  }

  for (const object of env.objects) {
    switch (object.kind) {
      case 'agent': {
        const target = objects.get(outgoing(object.id, 'agent-uses-deployment')[0]?.to ?? '');
        const model = target?.kind === 'model-deployment' ? target : undefined;
        const assessment = technicalFindings.find(finding => finding.id === object.id && !finding.related);
        const managed = object.platform === 'copilot-studio' && object.modelSource === 'platform-managed';
        if (outgoing(object.id, 'agent-invokes-agent').length) note(object.id, 'Invocation links are descriptive. Include downstream volume once in the downstream usage profile.');
        if (object.platform === 'copilot-studio') {
          const offer = selection(object);
          const included = creditAllocations.get(object.id) ?? zero();
          const credits = declaredCredits.get(object.id);
          bill(object, 'Orchestration', 'Copilot Studio credits', {
            meter: (offer && offeringMeter(offer, 'credits')) ?? (object.platformMeter?.region === env.region ? object.platformMeter : undefined) ?? assumedMeter('copilot-credits', 'Copilot Studio', env.region, 'credit'),
            quantity: managed && !ambiguousPools.has(object.id) ? credits?.remaining?.minus(included) : undefined,
            offer: managed ? offer : undefined, componentId: 'credits', includedCredits: included.gt(0) ? included : undefined,
            entitledCredits: credits?.included?.gt(0) ? credits.included : undefined,
            reason: !managed ? assessment?.detail : ambiguousPools.has(object.id) ? 'Resolve the eligible prepaid pool before pricing PAYG overage.' : credits?.reason,
          });
          const prompt = objects.get(outgoing(object.id, 'agent-uses-prompt-model')[0]?.to ?? '');
          if (prompt?.kind === 'model-deployment') {
            const connection = technicalFindings.find(finding => finding.id === object.id && finding.related === prompt.id && finding.title === 'External prompt model');
            if (!managed || connection?.status === 'incompatible' || deploymentBlocked(prompt.id) || !prompt.modelId || !prompt.mode) {
              bill(object, 'Inference', 'External prompt model', { reason: 'Resolve the external prompt compatibility or deployment details.' });
            } else if (prompt.mode === 'payg') modelTokens(object, prompt, true);
          }
          break;
        }
        if (object.platform !== 'foundry-agent-service' || object.modelSource !== 'deployment-ref' || !model?.mode || !model.modelId) {
          bill(object, 'Inference', 'Agent inference', { reason: assessment?.detail });
          break;
        }
        if (model.mode === 'provisioned') break;
        if (deploymentBlocked(model.id)) bill(object, 'Inference', 'Agent inference', { reason: 'The linked deployment has a verified incompatible selection.' });
        else modelTokens(object, model);
        break;
      }
      case 'model-deployment': {
        if (!object.modelId || !object.mode) {
          note(object.id, 'Enter model identity and deployment billing mode.');
          bill(object, 'Inference', 'Deployment billing', { reason: 'Deployment billing mode is incomplete.' });
        }
        if (object.mode === 'provisioned') {
          const shares = new Map<string, Decimal>();
          const linked = env.relationships.filter(edge => ['agent-uses-deployment', 'agent-uses-prompt-model'].includes(edge.type) &&
            edge.to === object.id && objects.get(edge.from)?.kind === 'agent');
          const agents = linked.flatMap(edge => {
            const agent = objects.get(edge.from);
            if (agent?.kind !== 'agent' || deploymentBlocked(object.id)) return [];
            const foundry = edge.type === 'agent-uses-deployment' && agent.platform === 'foundry-agent-service' && agent.modelSource === 'deployment-ref';
            const prompt = edge.type === 'agent-uses-prompt-model' && agent.platform === 'copilot-studio' && agent.modelSource === 'platform-managed' &&
              !technicalFindings.some(finding => finding.id === agent.id && finding.related === object.id && finding.status === 'incompatible');
            if (!foundry && !prompt) return [];
            const { profile: usage, duplicate } = usageFor(agent.id);
            if (duplicate && object.allocationBasis) note(agent.id, 'Use one profile per agent to allocate shared provisioned cost by input tokens.');
            if (usage && usage.executions !== undefined && usage.calls !== undefined && usage.input !== undefined) {
              shares.set(agent.id, new Money(usage.executions).times(usage.calls).times(Money.sum(usage.input, usage.cachedInput ?? 0)).times(new Money(usage.retries ?? 0).div(100).plus(1)));
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
        const offer = selection(object);
        const manual = object.meter && object.meter.sku === object.product && object.meter.region === env.region ? object.meter : undefined;
        bill(object, offer?.family === 'security' ? 'Governance' : 'Licensing', 'Monthly seats', {
          meter: (offer && offeringMeter(offer, 'seats')) ?? manual ?? assumedMeter('licence-seats', object.product || 'Unspecified licence', env.region, 'seat/month'),
          quantity: !licencePlan.blocked.has(object.id) && (object.procurement === 'incremental' || object.procurement === 'existing') ? licencePlan.seats.get(object.id) : undefined,
          existing: object.procurement === 'existing', fixed: true, offer, componentId: 'seats',
          reason: licencePlan.blocked.has(object.id) ? 'Resolve duplicate or inconsistent licence seats.' : object.procurement === 'existing' ? 'Already owned. Declared existing spend is shown separately.'
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
  const summary = summarize(lines, code);
  const licenceLines = lines.filter(line => objects.get(line.objectId)?.kind === 'licence-entitlement');
  const incremental = summarize(licenceLines, code).current;
  const retained = new Money(licencePlan.retainedKnown);
  const asTotal = (known: Decimal, incomplete: number) => ({
    known: known.toFixed(digits), annual: known.times(12).toFixed(digits), incomplete,
  });
  const licenceEstate = {
    owned: licencePlan.owned, existingLines: licencePlan.existing,
    existing: asTotal(new Money(licencePlan.existingKnown), licencePlan.existingMissing), incremental,
    proposed: asTotal(retained.plus(incremental.known), licencePlan.retainedMissing + incremental.incomplete),
    proposedEnvironment: asTotal(retained.plus(summary.current.known), licencePlan.retainedMissing + summary.current.incomplete),
  };
  return { lines, summary, issues, technicalFindings, licensingFindings, licenceEstate, assessedAt: at };
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

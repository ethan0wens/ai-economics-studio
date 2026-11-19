import Decimal from 'decimal.js';
import { z } from 'zod';
import type { Edge, Environment, StudioObject } from './domain';
import { offeringFor, type Offering } from './offerings';
import reviewed from '../catalogue/entitlements.json' with { type: 'json' };

export const evidenceWindow = {
  source: z.url().refine(url => URL.canParse(url) && ['learn.microsoft.com', 'www.microsoft.com', 'azure.microsoft.com'].includes(new URL(url).hostname)),
  verifiedOn: z.iso.date(), observedSince: z.iso.date().optional(), reviewBy: z.iso.date(), condition: z.string().min(1),
};
const ruleSchema = z.strictObject({
  id: z.string(), products: z.array(z.string()).min(1), market: z.literal('GB'),
  kind: z.enum(['requirement', 'included', 'conditional', 'unverified']),
  capability: z.string().min(1), eligible: z.array(z.string()).optional(), possible: z.array(z.string()).optional(),
  qualifyingBundles: z.array(z.array(z.string()).min(2)).optional(), ...evidenceWindow,
});
export const entitlementRules = z.array(ruleSchema).parse(reviewed);
export function currentEvidence(rule: { verifiedOn: string; observedSince?: string; reviewBy: string }, at: string) {
  const date = at.slice(0, 10);
  return (rule.observedSince ?? rule.verifiedOn) <= date && date <= rule.reviewBy;
}
type Licence = Extract<StudioObject, { kind: 'licence-entitlement' }>;
export type LicensingFinding = {
  id: string; title: string; status: 'Verified' | 'Conditional' | 'Action required' | 'Unverified'; detail: string;
  source?: string; verifiedOn?: string; rule?: string;
};
const money = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const scopeKey = (value?: string) => value?.trim().toLowerCase() || undefined;
export function assignedSeatCount(licence: Licence, groups: Edge[]) {
  if (licence.seats !== undefined) return licence.seats;
  if (!groups.length || groups.some(link => link.seats === undefined) || (groups.length > 1 && licence.overlapSeats === undefined)) return;
  const sum = groups.reduce((total, link) => total.plus(link.seats!), new money(0));
  const distinct = sum.minus(groups.length > 1 ? licence.overlapSeats ?? 0 : 0);
  if (distinct.gte(Math.max(...groups.map(link => link.seats!))) && distinct.lte(1e15)) return distinct.toNumber();
}

export function licensing(env: Environment, inventory: readonly Offering[], at: string) {
  const licences = env.objects.filter((item): item is Licence => item.kind === 'licence-entitlement');
  const findings: LicensingFinding[] = [];
  const objects = new Map(env.objects.map(object => [object.id, object]));
  const offers = new Map(licences.map(licence => [licence.id, offeringFor(licence, inventory)?.id]));
  const byId = new Map(licences.map(item => [item.id, item]));
  const seats = new Map<string, number>();
  const blocked = new Set<string>();
  const assignments = env.relationships.filter(edge => edge.type === 'group-has-entitlement');
  const assigned = (id: string) => assignments.filter(edge => edge.to === id);
  const add = (id: string, title: string, status: LicensingFinding['status'], detail: string) =>
    findings.push({ id, title, status, detail });

  for (const licence of licences) {
    const groups = assigned(licence.id);
    const allKnown = groups.length > 0 && groups.every(link => link.seats !== undefined);
    const declared = assignedSeatCount(licence, groups);
    if (declared !== undefined) seats.set(licence.id, declared);
    else if (allKnown && (groups.length === 1 || licence.overlapSeats !== undefined)) {
      add(licence.id, 'Seat overlap', 'Action required', 'Check shared memberships. Distinct seats must cover the largest assignment and fit the supported seat limit.');
    } else if (groups.length > 1) {
      add(licence.id, 'Seat overlap', 'Conditional', 'Enter a deduplicated total, or record seats for every linked group and the number of repeated assignments.');
    }
    if (groups.length > 1 && licence.seats !== undefined && !allKnown) {
      add(licence.id, 'Seat overlap', 'Conditional', 'Confirm the explicit total deduplicates people who appear in more than one group.');
    }
    if (groups.some(link => {
      const group = objects.get(link.from);
      return group?.kind === 'user-group' && group.population !== undefined && link.seats !== undefined && link.seats > group.population;
    })) {
      add(licence.id, 'Group assignment', 'Action required', 'An assignment exceeds the declared group population. Check its seat count.');
      blocked.add(licence.id);
    }
    if (licence.seats !== undefined && groups.some(link => (link.seats ?? 0) > licence.seats!)) {
      add(licence.id, 'Group assignment', 'Action required', 'The deduplicated seat total is smaller than one linked group assignment.');
      blocked.add(licence.id);
    }
  }
  function sku(licence: Licence) {
    return scopeKey(licence.product);
  }
  for (const licence of licences) {
    const scope = scopeKey(licence.seatScope);
    if (sku(licence) && licences.some(other => other.id !== licence.id && sku(other) === sku(licence) &&
      (other.procurement === licence.procurement || scope && scope === scopeKey(other.seatScope)) &&
      (!scope || !scopeKey(other.seatScope) || scope === scopeKey(other.seatScope)))) {
      blocked.add(licence.id);
      add(licence.id, 'Potential duplicate seats', 'Action required', 'Consolidate duplicate product lines or identify separate, non-overlapping purchase pools. Ambiguous seats are excluded from the known cost.');
    }
  }
  for (const licence of licences) {
    const scope = scopeKey(licence.seatScope);
    if (env.relationships.some(edge => edge.type === 'agent-has-entitlement' && edge.to === licence.id)) {
      add(licence.id, 'Agent applicability', 'Conditional', 'This link records the agent using the entitlement. A per-user tariff still requires deduplicated user seats.');
    }
    const rules = entitlementRules.filter(rule => offers.get(licence.id) && rule.products.includes(offers.get(licence.id)!));
    if (!rules.length) add(licence.id, 'Commercial entitlement', 'Unverified', 'Review the exact product and customer terms for prerequisites and included use.');
    for (const rule of rules) {
      const dateValid = currentEvidence(rule, at);
      const groups = assigned(licence.id);
      const eligibleIds = new Set([...(rule.eligible ?? []), ...entitlementRules.filter(candidate => candidate.kind === 'included' &&
        candidate.capability === rule.capability && currentEvidence(candidate, at)).flatMap(candidate => candidate.products)]);
      const eligible = licences.filter(other => other.id !== licence.id && eligibleIds.has(offers.get(other.id) ?? '') &&
        !blocked.has(other.id) && (other.procurement === 'existing' || other.procurement === 'incremental'));
      const potential = licences.some(other => other.id !== licence.id && rule.possible?.includes(offers.get(other.id) ?? '') &&
        !blocked.has(other.id) && (other.procurement === 'existing' || other.procurement === 'incremental'));
      const assignedProducts = licences.filter(other => other.id !== licence.id && !blocked.has(other.id) &&
        (other.procurement === 'existing' || other.procurement === 'incremental'));
      const partialBundle = assignedProducts.some(other => rule.qualifyingBundles?.some(bundle => bundle.includes(offers.get(other.id) ?? '')));
      const allGroupsCovered = groups.length > 0 && groups.every(group => {
        const object = objects.get(group.from);
        const fullyAssigned = (base: Licence) => object?.kind === 'user-group' && object.population !== undefined &&
          (seats.get(base.id) ?? 0) >= object.population && assigned(base.id).some(link => link.from === group.from && link.seats === object.population);
        return object?.kind === 'user-group' && object.population !== undefined &&
          group.seats !== undefined && group.seats <= object.population &&
          (eligible.some(fullyAssigned) || rule.qualifyingBundles?.some(bundle =>
            bundle.every(product => assignedProducts.some(base => offers.get(base.id) === product && fullyAssigned(base)))));
      });
      const status = !dateValid || rule.kind === 'unverified' ? 'Unverified'
        : rule.kind === 'included' ? 'Verified'
        : rule.kind === 'requirement' ? allGroupsCovered ? 'Verified' : (eligible.length || potential || partialBundle) ? 'Conditional' : 'Action required'
        : 'Conditional';
      const assignment = rule.kind === 'requirement'
        ? allGroupsCovered ? ' A qualifying base licence covers each assigned group in the plan.'
        : eligible.length || partialBundle ? ' Confirm that the same users hold every required subscription, or model a fully covered group.'
        : potential ? ' The selected plan can have different eligibility or commercial terms. Confirm them before adding another licence.'
        : ' Add an eligible base entitlement or confirm coverage in the customer agreement.' : '';
      findings.push({
        id: licence.id, rule: rule.id, title: rule.capability, status, source: rule.source, verifiedOn: rule.verifiedOn,
        detail: dateValid ? rule.condition + assignment : 'The evidence review is outside its validity window. Confirm the current terms before relying on it.',
      });
      if (rule.kind === 'included' && dateValid && rule.eligible?.length) {
        const duplicate = licences.some(other => other.id !== licence.id && rule.eligible!.includes(offers.get(other.id) ?? '') &&
          (scope && scope === scopeKey(other.seatScope) || assigned(other.id).some(link => groups.some(group => group.from === link.from))));
        if (duplicate) add(licence.id, 'Potentially redundant purchase', 'Conditional', 'The bundle and a separately selected product share a group or seat pool. Confirm matching users, conditions and cancellation terms.');
      }
    }
  }

  const digits = new Intl.NumberFormat('en-GB', { style: 'currency', currency: env.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const facts = licences.filter(item => item.procurement === 'existing');
  const existing = facts.map(item => ({
    id: item.id, amount: item.existingMonthly === undefined || blocked.has(item.id) ? null : new money(item.existingMonthly).toFixed(digits),
  }));
  const retired = new Map<string, Decimal>();
  const uncertain = new Set<string>();
  for (const old of facts) {
    const edges = env.relationships.filter(edge => edge.type === 'licence-replaces-entitlement' && edge.to === old.id &&
      (!edge.effectiveOn || edge.effectiveOn <= at.slice(0, 10)));
    if (!edges.length) continue;
    const oldSeats = seats.get(old.id);
    const sum = edges.reduce((total, edge) => total.plus(edge.seats ?? 0), new money(0));
    const valid = !blocked.has(old.id) && !!oldSeats && old.existingMonthly !== undefined && sum.lte(oldSeats) && edges.every(edge => {
      const replacement = byId.get(edge.from);
      const claimed = env.relationships.filter(link => link.type === 'licence-replaces-entitlement' && link.from === edge.from &&
        (!link.effectiveOn || link.effectiveOn <= at.slice(0, 10))).reduce((total, link) => total.plus(link.seats ?? 0), new money(0));
      return edge.effectiveOn && edge.seats && replacement?.procurement === 'incremental' && !blocked.has(edge.from) &&
        claimed.lte(seats.get(edge.from) ?? 0);
    });
    if (valid) {
      retired.set(old.id, new money(existing.find(item => item.id === old.id)!.amount!).times(sum).div(oldSeats!).toDecimalPlaces(digits));
      add(old.id, 'Contract replacement', 'Conditional', 'The estimate uses your declared cancellation date and replacement seats. Confirm the contract permits the corresponding saving.');
    } else {
      uncertain.add(old.id);
      add(old.id, 'Contract replacement', 'Action required', 'Confirm existing spend, replacement seat counts and an effective cancellation date. The proposed retained cost is unresolved.');
    }
  }
  for (const edge of env.relationships.filter(edge => edge.type === 'licence-replaces-entitlement' && byId.get(edge.to)?.procurement !== 'existing')) {
    add(edge.from, 'Contract replacement', 'Action required', 'A replacement target must be an already-owned entitlement.');
  }
  const existingKnown = existing.reduce((sum, item) => sum.plus(item.amount ?? 0), new money(0));
  const retainedKnown = existing.reduce((sum, item) => uncertain.has(item.id) ? sum : sum.plus(new money(item.amount ?? 0).minus(retired.get(item.id) ?? 0)), new money(0));
  return {
    seats, blocked, findings, existing, owned: facts.length, digits,
    existingKnown: existingKnown.toFixed(digits), retainedKnown: retainedKnown.toFixed(digits),
    existingMissing: existing.filter(item => item.amount === null).length,
    retainedMissing: existing.filter(item => item.amount === null || uncertain.has(item.id)).length,
  };
}

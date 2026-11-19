import Decimal from 'decimal.js';
import { z } from 'zod';
import { currentEvidence, evidenceWindow } from './entitlements';
import type { StudioObject } from './domain';
import data from '../catalogue/provisioned.json' with { type: 'json' };

const requirement = z.strictObject({
  id: z.string(), models: z.array(z.string()).min(1), version: z.string(),
  sku: z.enum(['GlobalProvisionedManaged', 'DataZoneProvisionedManaged', 'ProvisionedManaged']),
  regions: z.array(z.string()).min(1).optional(),
  minimum: z.number().int().positive().optional(), increment: z.number().int().positive().optional(),
  inputTpmPerPtu: z.number().positive().optional(), outputWeight: z.number().positive().optional(), ...evidenceWindow,
});
export const capacityEvidence = z.array(requirement).parse(data);
export type Deployment = Extract<StudioObject, { kind: 'model-deployment' }>;
export type Usage = Extract<StudioObject, { kind: 'usage-profile' }>;
export const reservationSource = 'https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput-billing';
export const calculatorSource = 'https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/provisioned-throughput-sizing';

export function deployedIdentity(model: Deployment) {
  return {
    model: (model.modelId === 'azure-openai' ? model.deployedModel : model.modelId)?.toLowerCase(),
    version: model.deployedVersion ?? (model.modelId === 'azure-openai' ? undefined : model.modelVersion),
  };
}
export function capacityRequirement(model: Deployment, at: string) {
  const identity = deployedIdentity(model);
  const matching = capacityEvidence.filter(row => identity.model && row.models.includes(identity.model) &&
    row.version === identity.version && row.sku.toLowerCase() === model.sku?.toLowerCase() &&
    (!row.regions || (model.deploymentRegion && row.regions.includes(model.deploymentRegion))) && currentEvidence(row, at));
  return matching.length === 1 ? matching[0] : undefined;
}
export function capacityIssue(model: Deployment, rule: ReturnType<typeof capacityRequirement>) {
  const count = model.capacity;
  if (count === undefined) return;
  if (!Number.isInteger(count) || count <= 0) return 'Enter a positive whole number of PTUs.';
  if (rule?.minimum !== undefined && count < rule.minimum) return `The documented minimum is ${rule.minimum} PTUs for this model version and deployment mode.`;
  if (rule?.increment !== undefined && (count - (rule.minimum ?? 0)) % rule.increment !== 0) {
    return `Use increments of ${rule.increment} PTUs${rule.minimum ? ` from the minimum of ${rule.minimum}` : ''}.`;
  }
}

const Cash = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
export function estimatedPeak(model: Deployment, rule: ReturnType<typeof capacityRequirement>) {
  if (!rule?.inputTpmPerPtu || !rule.outputWeight || model.capacity === undefined ||
      model.peakInputTpm === undefined || model.peakOutputTpm === undefined) return;
  const demand = new Cash(model.peakInputTpm).plus(new Cash(model.peakOutputTpm).times(rule.outputWeight));
  const capacity = new Cash(model.capacity).times(rule.inputTpmPerPtu);
  return { demand: demand.toFixed(), capacity: capacity.toFixed(), exceeds: demand.gt(capacity) };
}
function endOfTerm(start: string, months: number) {
  const date = new Date(start);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const endOfMonth = new Date(date);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);
  endOfMonth.setUTCDate(0);
  date.setUTCDate(Math.min(day, endOfMonth.getUTCDate()));
  return date.toISOString().slice(0, 10);
}
export function reservationPlan(model: Deployment, region: string, currency: string, at: string) {
  const reservation = model.reservation;
  if (!reservation) return { state: 'none' } as const;
  const { sku, start, term, total, ptus, coveredHours, reference } = reservation;
  if (!sku || !start || !term || !total || !ptus || coveredHours === undefined || !reference) {
    return { state: 'unresolved', reason: 'Enter the exact customer reservation amount, scope, term and covered hours.' } as const;
  }
  if (sku !== model.sku || reservation.region !== region || reservation.currency !== currency) {
    return { state: 'unresolved', reason: 'The reservation scope differs from the selected billing SKU, region or currency. Reconfirm the quote.' } as const;
  }
  const end = endOfTerm(start, Number(term));
  const day = at.slice(0, 10);
  if (day < start || day >= end) {
    return { state: 'inactive', reason: `The reservation is outside its declared term (${start} through before ${end}). Hourly retail or contract terms apply.` } as const;
  }
  if (model.billableHours === undefined || coveredHours > model.billableHours || model.capacity === undefined) {
    return { state: 'unresolved', reason: 'Enter capacity and covered hours no greater than the deployment’s billable hours.' } as const;
  }
  return {
    state: 'active',
    monthly: new Cash(total).div(term), covered: new Cash(Math.min(ptus, model.capacity)).times(coveredHours),
    detail: `Customer quote ${reference}. ${ptus} reserved PTUs, ${term}-month term, ${coveredHours} covered hours in the modelled month. Ends before ${end}.`,
  } as const;
}

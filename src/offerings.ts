import { z } from 'zod';
import { microsoftEvidenceUrl } from './untrusted-data';
import type { Meter, StudioObject } from './domain';
import retained from '../catalogue/retained.json' with { type: 'json' };
import gaps from '../catalogue/gaps.json' with { type: 'json' };

export const copilotPack = { offeringId: 'copilot-credit-pack-gb', credits: 25_000 };

export const families = {
  foundry: 'Microsoft Foundry models',
  copilot: 'Copilot Studio',
  licensing: 'Microsoft licensing',
  infrastructure: 'Supporting Azure services',
  security: 'Security and governance',
} as const;
export type Family = keyof typeof families;
export const componentId = z.enum(['input', 'output', 'cached', 'capacity', 'credits', 'seats', 'usage']);
export type Component = z.infer<typeof componentId>;
export const priceComponentSchema = z.strictObject({
  id: componentId, label: z.string().min(1), unit: z.string().min(1), quantityPerUnit: z.number().min(1).max(1e15),
  meterId: z.string().min(1).optional(), sku: z.string().min(1).optional(),
});
const shared = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/), name: z.string().min(1).max(300),
  family: z.enum(['foundry', 'copilot', 'licensing', 'infrastructure', 'security']),
  currency: z.string().regex(/^[A-Z]{3}$/), region: z.string().regex(/^[a-z0-9-]+$/),
  components: z.array(priceComponentSchema).min(1).max(5), note: z.string().optional(),
  selectable: z.literal(false).optional(), evidence: z.url().max(4096).refine(microsoftEvidenceUrl).optional(),
  deployment: z.enum(['global-standard', 'regional-standard', 'data-zone-standard', 'global-provisioned', 'regional-provisioned', 'data-zone-provisioned']).optional(),
};
export const offeringSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...shared, kind: z.literal('model-deployment'), model: z.strictObject({
    id: z.string().min(1), version: z.string().min(1), sku: z.string().min(1), mode: z.enum(['payg', 'provisioned']),
  }) }),
  z.strictObject({ ...shared, kind: z.literal('supporting-resource') }),
  z.strictObject({ ...shared, kind: z.literal('licence-entitlement') }),
  z.strictObject({ ...shared, kind: z.literal('agent') }),
]).superRefine((offer, ctx) => {
  const keys = offer.components.map(item => item.id);
  const expected = offer.kind === 'model-deployment'
    ? offer.model.mode === 'provisioned' ? ['capacity'] : ['input', 'output']
    : [offer.kind === 'agent' ? 'credits' : offer.kind === 'licence-entitlement' ? 'seats' : 'usage'];
  const allowed = [...expected, ...(offer.kind === 'model-deployment' && offer.model.mode === 'payg' ? ['cached'] : [])];
  if (new Set(keys).size !== keys.length || keys.some(key => !allowed.includes(key)) || expected.some(key => !keys.includes(key as Component))) {
    ctx.addIssue({ code: 'custom', message: 'Invalid component set for the billing configuration' });
  }
});
export const inventorySchema = z.array(offeringSchema).max(2500).refine(
  items => new Set(items.map(item => item.id)).size === items.length, 'Duplicate catalogue configuration'
);
export type Offering = z.infer<typeof offeringSchema>;
export const offerings = inventorySchema.parse(retained);
export const unresolved = z.array(z.strictObject({
  family: shared.family, name: z.string(), status: z.enum(['manual', 'unsupported']), reason: z.string(),
})).parse(gaps);

export function offeringFor(item: StudioObject, inventory: readonly Offering[] = offerings): Offering | undefined {
  if (!('offeringId' in item)) return;
  const selected = inventory.find(offering => offering.id === item.offeringId && offering.kind === item.kind);
  if (selected?.selectable === false) return;
  if (selected?.kind === 'model-deployment' && item.kind === 'model-deployment') {
    const { model } = selected;
    if (model.id !== item.modelId || model.version !== item.modelVersion || model.sku !== item.sku || model.mode !== item.mode) return;
  }
  if (selected?.kind === 'licence-entitlement' && item.kind === 'licence-entitlement' && item.product !== selected.name) return;
  if (selected?.kind === 'agent' && item.kind === 'agent' && (item.platform !== 'copilot-studio' || item.modelSource !== 'platform-managed')) return;
  return selected;
}

export function applicableOffering(object: StudioObject, region: string, code: string, inventory: readonly Offering[] = offerings) {
  const explicit = offeringFor(object, inventory);
  if (explicit) return explicit.region === 'gb' || explicit.region === region ? explicit : undefined;
  if (object.kind === 'agent' && !object.offeringId && object.platform === 'copilot-studio' && object.modelSource === 'platform-managed') {
    return inventory.find(item => item.selectable !== false && item.kind === 'agent' && item.region === region && item.currency === code);
  }
}

export function offeringMeter(offering: Offering, component: Component): Meter | undefined {
  const spec = offering.components.find(item => item.id === component);
  if (!spec) return;
  return {
    meterId: spec.meterId ?? `${offering.id}/${spec.id}`,
    sku: spec.sku ?? (offering.kind === 'model-deployment' ? offering.model.sku : offering.id),
    region: offering.region, unit: spec.unit, quantityPerUnit: spec.quantityPerUnit, priceType: 'Consumption',
  };
}

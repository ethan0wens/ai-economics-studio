import { inventoryPlan } from './discovery';
import { curatedPrices } from './commercial-pricing';
import { compatibilityEvidence } from '../src/compatibility';
import { entitlementRules } from '../src/entitlements';
import { capacityEvidence } from '../src/provisioned';
import { catalogueSchema } from '../src/catalogue';
import { version } from '../src/domain';

const { inventory } = inventoryPlan();
catalogueSchema.parse({ schemaVersion: version, records: curatedPrices, inventory });
const offers = new Set(inventory.filter(item => item.kind === 'licence-entitlement').map(item => item.id));
const allRules = [...entitlementRules, ...compatibilityEvidence.regions, ...compatibilityEvidence.integrations,
  ...compatibilityEvidence.capabilities, ...compatibilityEvidence.lifecycle, ...capacityEvidence];
if (new Set(allRules.map(rule => rule.id)).size !== allRules.length) throw new Error('Evidence rule IDs must be unique.');
for (const rule of allRules) {
  if (rule.verifiedOn >= rule.reviewBy) throw new Error(`Invalid review window for ${rule.id}.`);
}
for (const rule of entitlementRules) {
  const linked = [...rule.products, ...(rule.eligible ?? []), ...(rule.possible ?? []), ...(rule.qualifyingBundles ?? []).flat()];
  if (linked.some(id => !offers.has(id))) throw new Error(`Unscoped licence in ${rule.id}.`);
}
const availability = new Map<string, string>();
for (const rule of compatibilityEvidence.regions) for (const model of rule.models) for (const region of rule.regions) {
  const key = JSON.stringify([model, rule.version, rule.sku, region]);
  if (availability.has(key)) throw new Error(`Duplicate regional evidence for ${key}.`);
  availability.set(key, rule.status);
}
const sized = new Set<string>();
for (const rule of capacityEvidence) for (const model of rule.models) for (const region of rule.regions ?? []) {
  const key = JSON.stringify([model, rule.version, rule.sku, region]);
  if (sized.has(key)) throw new Error(`Duplicate capacity evidence for ${key}.`);
  if (!['compatible', 'conditional'].includes(availability.get(key) ?? '')) throw new Error(`Sizing without positive availability for ${key}.`);
  sized.add(key);
}
console.log(`Validated ${offers.size} UK seat offerings, ${curatedPrices.filter(rate => rate.component === 'seats').length} observed seat tariffs, ${entitlementRules.length} entitlement rules, ${availability.size} exact regional records and ${sized.size} model/mode/region sizing records.`);

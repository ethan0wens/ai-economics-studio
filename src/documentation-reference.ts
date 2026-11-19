import { catalogueCoverage } from './coverage';
import { compatibilityEvidence, compatibilityLabels } from './compatibility';
import { capacityEvidence } from './provisioned';
import { currentEvidence } from './entitlements';
import type { Catalogue } from './catalogue';

export function documentationReference(catalogue: Catalogue, at = new Date().toISOString()) {
  const coverage = catalogueCoverage(catalogue, at);
  const regional = compatibilityEvidence.regions.flatMap(rule => rule.models.flatMap(model => rule.regions.map(region => ({
    model, version: rule.version, sku: rule.sku, region, status: currentEvidence(rule, at) ? rule.status : 'unverified' as const,
    source: rule.source, reviewed: rule.verifiedOn,
  }))));
  const models = coverage.flatMap(group => group.configurations.flatMap(offer => offer.kind === 'model-deployment' ? [{
    id: offer.id, label: offer.name, model: offer.model.id, version: offer.model.version, mode: offer.model.sku, region: offer.region,
    price: offer.status === 'verified' ? 'Fully priced' : offer.status === 'partial' ? 'Partially priced' : 'No current verified rate',
  }] : []));
  const units = [...new Set(coverage.flatMap(group => group.configurations.flatMap(offer => offer.components.map(part =>
    `${part.unit} · ${part.quantityPerUnit.toLocaleString('en-GB')} base units`))))].sort();
  return {
    id: catalogue.manifest.catalogueId, checkedAt: catalogue.manifest.lastCheckedAt, records: catalogue.records.length,
    coverage: coverage.map(row => ({ family: row.name, scoped: row.discovered, complete: row.fully, partial: row.partial, unknown: row.manual, unsupported: row.unsupported })),
    models, regional, units,
    evidenceCounts: Object.entries(compatibilityLabels).map(([key, name]) => ({ name, total: regional.filter(rule => rule.status === key).length })),
    activeSizing: capacityEvidence.filter(rule => currentEvidence(rule, at)).length,
  };
}

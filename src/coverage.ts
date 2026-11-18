import { isCurrentRate, resolveOffering, type Catalogue } from './catalogue';
import type { Ledger } from './ledger';
import { families, offerings, unresolved, type Family } from './offerings';

export function catalogueCoverage(catalogue: Catalogue, at = new Date().toISOString()) {
  const records = catalogue.records.filter(record => isCurrentRate(record, at));
  return (Object.keys(families) as Family[]).map(family => {
    const configurations = offerings.filter(offer => offer.family === family).map(offer => {
      const components = offer.components.map(component => ({ ...component,
        rate: resolveOffering(records, offer, component.id, offer.currency, at),
      }));
      const found = components.filter(component => component.rate).length;
      return { ...offer, components, status: found === components.length ? 'verified' : found ? 'partial' : 'manual' };
    });
    const gaps = unresolved.filter(item => item.family === family);
    const fully = configurations.filter(item => item.status === 'verified').length;
    const partial = configurations.filter(item => item.status === 'partial').length;
    const automated = configurations.filter(item => item.status === 'verified' && item.components.every(part => part.rate?.verification === 'azure-retail-api')).length;
    const curated = configurations.filter(item => item.status === 'verified' && item.components.every(part => part.rate?.verification === 'microsoft-commercial')).length;
    const checkedAt = configurations.flatMap(item => item.components.flatMap(part => {
      const date = part.rate && (part.rate.verification === 'azure-retail-api' ? catalogue.manifest.lastCheckedAt : part.rate.review?.checkedAt);
      return date ? [date] : [];
    })).sort().at(-1);
    return {
      family, name: families[family], configurations, gaps, supported: configurations.length, fully, partial,
      manual: configurations.length - fully - partial, automated, curated, mixed: fully - automated - curated,
      unsupported: gaps.filter(item => item.status === 'unsupported').length,
      percent: configurations.length ? 100 * fully / configurations.length : null, checkedAt,
    };
  });
}

export function environmentCompleteness(result: Ledger) {
  const objects = new Map<string, Ledger['lines']>();
  for (const line of result.lines) objects.set(line.objectId, [...(objects.get(line.objectId) ?? []), line]);
  const groups = [...objects].map(([id, lines]) => {
    const resolved = lines.filter(line => line.amounts.current !== null).length;
    const status = resolved === lines.length ? 'complete' : resolved ? 'partial'
      : lines.every(line => line.quantity === null) ? 'excluded' : 'unresolved';
    return {
      id, name: lines[0].object, lines, status,
      retail: lines.some(line => line.source && line.amounts.current !== null &&
        (!line.agreement || ['retail', 'discount'].includes(line.agreement.mode)) && !['Already owned', 'Covered by linked packs'].includes(line.status)),
      manual: lines.some(line => line.amounts.current !== null && !['Already owned', 'Covered by linked packs'].includes(line.status) &&
        (line.agreement?.mode === 'fixed' || line.agreement?.mode === 'intentional-zero')),
    };
  });
  return {
    groups, fully: groups.filter(item => item.status === 'complete').length, partial: groups.filter(item => item.status === 'partial').length,
    unresolved: groups.filter(item => item.status === 'unresolved').length, excluded: groups.filter(item => item.status === 'excluded').length,
    retail: groups.filter(item => item.retail).length, manual: groups.filter(item => item.manual).length,
  };
}

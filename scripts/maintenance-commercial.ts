import Decimal from 'decimal.js';
import type { RetailRecord } from '../src/catalogue';
import { offeringMeter, type Offering } from '../src/offerings';
import { inspectUkOffer, type UKOffer } from './microsoft-commercial';
import type { Source } from './microsoft-source';

const aliases: Record<string, string[]> = {
  'm365-copilot-enterprise-gb': ['Microsoft 365 Copilot', 'Microsoft 365 Copilot (add-on)'],
  'm365-business-copilot-gb': ['Microsoft 365 Copilot Business', 'Microsoft 365 Copilot (Business)', 'Microsoft 365 Copilot Business (add-on)'],
  'm365-standard-copilot-gb': ['Microsoft 365 Business Standard and Microsoft 365 Copilot', 'Microsoft 365 Business Standard and Microsoft 365 Copilot Business'],
  'm365-premium-copilot-gb': ['Microsoft 365 Business Premium and Microsoft 365 Copilot', 'Microsoft 365 Business Premium and Microsoft 365 Copilot Business'],
  'defender-o365-p1-gb': ['Microsoft Defender for Office 365 (Plan 1)'],
  'defender-o365-p2-gb': ['Microsoft Defender for Office 365 (Plan 2)'],
  'copilot-credit-pack-gb': ['Copilot Studio', 'Copilot Studio prepaid capacity', 'Copilot Credits'],
};
const additional: Record<string, string> = {
  'defender-endpoint-p1-gb': 'https://www.microsoft.com/en-gb/security/business/endpoint-security/microsoft-defender-endpoint',
  'defender-endpoint-p2-gb': 'https://www.microsoft.com/en-gb/security/business/endpoint-security/microsoft-defender-endpoint',
  'defender-identity-gb': 'https://www.microsoft.com/en-gb/security/business/identity-access/microsoft-defender-identity',
  'defender-cloud-apps-gb': 'https://www.microsoft.com/en-gb/security/business/siem-and-xdr/microsoft-defender-cloud-apps',
  'purview-suite-gb': 'https://www.microsoft.com/en-gb/security/business/microsoft-purview',
  'o365-f3-gb': 'https://www.microsoft.com/en-gb/microsoft-365/enterprise/office-365-plans-and-pricing',
};
const termDescription = { annual: 'Annual commitment', monthly: 'Monthly commitment', 'monthly-pack': 'Monthly pack of 25,000 Copilot Credits' } as const;
const later = (at: string, days: number) => new Date(Date.parse(at) + days * 86_400_000).toISOString();

export function offerSource(offer: Offering, previous?: RetailRecord) {
  return previous?.source ?? additional[offer.id] ?? offer.evidence;
}
export function offerNames(offer: Offering, previous?: RetailRecord) {
  return [offer.name, ...(previous ? [previous.product] : []), ...(aliases[offer.id] ?? [])];
}

export function reconcileOffer(offer: Offering, page: Source, at: string, previous?: RetailRecord) {
  if (new URL(page.url).hostname !== 'www.microsoft.com' || !new URL(page.url).pathname.startsWith('/en-gb/')) {
    return { issue: 'Source did not return the public UK offer page.' };
  }
  const component = offer.components.find(item => item.id === 'seats' || (offer.id === 'copilot-credit-pack-gb' && item.id === 'usage'));
  if (!component || !page.html) return { issue: 'The exact offer source is unavailable.' };
  const meter = offeringMeter(offer, component.id)!;
  const term: UKOffer['term'] = previous?.review?.term ?? (component.id === 'usage' ? 'monthly-pack' :
    /monthly subscription/i.test(previous?.review?.terms ?? '') ? 'monthly' : 'annual');
  const names = offerNames(offer, previous);
  const type = component.id === 'seats' ? 'seats' : 'pack';
  const exact = inspectUkOffer(page.html, names, type, term);
  const anyTerm = exact.issue === 'missing-terms' && previous?.review?.identity ? inspectUkOffer(page.html, names, type) : undefined;
  const observed = exact.offer ?? anyTerm?.offer;
  if (!observed) return { issue: exact.issue === 'conflicting-offer' ? 'Contradictory public rates or purchase SKUs match this exact offer.' :
    'No exact standard GBP offer with the expected unit, term and VAT treatment was established.' };
  if (previous?.review?.identity && previous.review.identity !== observed.identity) return { issue: 'Microsoft purchase SKU changed or is unavailable.' };
  if (observed.term !== term && (!observed.identity || previous?.review?.identity !== observed.identity)) {
    return { issue: 'The commitment changed without a stable Microsoft purchase SKU.' };
  }
  const movement = previous ? new Decimal(observed.price).div(previous.price) : undefined;
  if (movement && (movement.greaterThan(1.5) || movement.lessThan(0.5))) {
    return { issue: 'A public commercial rate moved by more than 50%. An independent exact offer source is required.' };
  }
  const changedPrice = previous?.price !== observed.price;
  const changedTerm = observed.term !== term;
  const baseTerms = previous?.review?.terms;
  const reviewTerms = changedTerm || !baseTerms
    ? `UK public standard rate, excluding VAT. ${termDescription[observed.term]}. ${observed.term === 'monthly-pack' ? 'Per pack.' : 'Per user per month. Check exact eligibility and purchase terms.'}`
    : baseTerms;
  const record: RetailRecord = {
    ...meter, currency: 'GBP', price: observed.price, effectiveAt: changedPrice || changedTerm ? at : previous?.effectiveAt ?? at,
    verification: 'microsoft-commercial', product: previous?.product ?? offer.name, source: previous?.source ?? page.url,
    offeringId: offer.id, component: component.id, review: {
      checkedAt: at, expiresAt: later(at, 45), terms: reviewTerms, term: observed.term, identity: observed.identity,
    },
  };
  return { record, change: changedTerm ? 'Verified commitment changed for the same purchase SKU.' :
    changedPrice ? previous ? `Standard UK rate changed from £${previous.price} to £${observed.price}.` : `Verified UK rate of £${observed.price}.` : undefined,
  conditional: changedTerm };
}

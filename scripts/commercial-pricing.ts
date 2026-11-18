import type { RetailRecord } from '../src/catalogue';
import { offeringMeter, offerings, type Component } from '../src/offerings';

// Reviewed against the linked UK public offers on 18 November 2026. Review before expiry.
const checkedAt = '2026-11-18T00:00:00Z';
const expiresAt = '2027-01-17T23:59:59Z';
function commercial(id: string, component: Component, price: string, source: string, terms: string): RetailRecord {
  const offering = offerings.find(item => item.id === id);
  const meter = offering && offeringMeter(offering, component);
  if (!offering || !meter) throw new Error(`Unbound commercial price ${id}/${component}`);
  return {
    ...meter, currency: offering.currency, product: offering.name, price, source, offeringId: id, component,
    effectiveAt: checkedAt, verification: 'microsoft-commercial', review: { checkedAt, expiresAt, terms },
  };
}

export const curatedPrices = [
  commercial('entra-p1-gb', 'seats', '5.40',
    'https://www.microsoft.com/en-gb/security/business/microsoft-entra-pricing',
    'UK per user per month paid yearly, excluding VAT. Verify whether P1 is already included in a declared licence.'),
  commercial('agent-365-gb', 'seats', '11.50',
    'https://www.microsoft.com/en-gb/microsoft-agent-365',
    'UK per user per month, annual commitment, excluding VAT. Do not infer prerequisite eligibility or consumption allowances.'),
  commercial('copilot-credit-pack-gb', 'usage', '153.80',
    'https://www.microsoft.com/en-gb/microsoft-365-copilot/microsoft-copilot-studio#Pricing',
    'UK public prepaid monthly pack. 25,000 credits per pack. The pack price is separate from pay-as-you-go overage and other licences.'),
  commercial('m365-standard-copilot-gb', 'seats', '18.10',
    'https://www.microsoft.com/en-gb/microsoft-365-copilot/pricing',
    'Microsoft 365 Business Standard with Copilot. UK per user per month paid yearly, excluding VAT. Bundle, not the standalone Copilot add-on.'),
  commercial('entra-suite-gb', 'seats', '9.20',
    'https://www.microsoft.com/en-gb/security/business/microsoft-entra-pricing',
    'UK per user per month paid yearly, excluding VAT. Prerequisite eligibility and overlapping licences are separate.'),
];

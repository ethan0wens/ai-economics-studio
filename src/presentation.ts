import type { Line } from './ledger';

export const unavailablePrice = 'Pricing not currently available';

const regions: Record<string, string> = {
  gb: 'UK commercial market',
  uksouth: 'UK South',
  ukwest: 'UK West',
  westeurope: 'West Europe',
  northeurope: 'North Europe',
  eastus: 'East US',
  eastus2: 'East US 2',
  westus: 'West US',
  westus2: 'West US 2',
  westus3: 'West US 3',
  swedencentral: 'Sweden Central',
};

export function regionName(code: string) {
  return Object.hasOwn(regions, code) ? regions[code] : code;
}

export function costExplanation(line: Pick<Line, 'reason' | 'meter'>) {
  switch (line.reason) {
    case 'No current verified rate matches this configuration. Review the catalogue or enter an evidenced contract amount.':
      return line.meter
        ? 'Pricing is not currently available for this configuration. Enter a customer-specific rate if you have one, or leave this cost unresolved.'
        : 'Pricing is not currently available for this configuration. Check the billing details so the studio can identify the charge.';
    case 'Enter monthly usage.':
      return 'Enter the expected monthly usage so the charge can be calculated.';
    case 'Resolve the eligible prepaid pool before pricing PAYG overage.':
      return 'Confirm which linked credit pack covers this agent so the studio can price any usage above that allowance.';
    default:
      return line.reason;
  }
}

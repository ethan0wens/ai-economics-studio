import { describe, expect, it } from 'vitest';
import { enterpriseInventory, referenceAt, scenarios } from '../fixtures/enterprise-scenarios';
import { emptyCatalogue } from '../src/catalogue';
import { ledger } from '../src/ledger';
import { compareCosts, pricePreview } from '../src/scenario';

describe('temporary cost comparisons', () => {
  it('changes eligible priced lines and keeps fixed rates and saved exceptions intact', () => {
    const { env, records } = scenarios[5];
    const original = JSON.stringify(env);
    const current = ledger(env, records, referenceAt, enterpriseInventory);
    const catalogue = { ...emptyCatalogue, records, inventory: enterpriseInventory };
    const comparison = pricePreview(env, current, catalogue, 20);
    // £286.40 fixed and £172.60 adjustable. A 20% change adds £34.52 per month.
    expect(comparison).toEqual({ current: '459.00', proposed: '493.52', unresolvedBefore: 0, unresolvedAfter: 0,
      monthlyDifference: '34.52', annualDifference: '414.24' });
    expect(current.summary.forecast.known).toBe('460.32');
    expect(JSON.stringify(env)).toBe(original);
  });

  it('keeps known amounts and unresolved counts without implying a difference', () => {
    const { env, records } = scenarios[4];
    const current = ledger(env, records, referenceAt, enterpriseInventory);
    const incomplete = compareCosts(current, current);
    expect(incomplete).toMatchObject({ current: '3594.00', proposed: '3594.00', unresolvedBefore: 1,
      unresolvedAfter: 1, monthlyDifference: null, annualDifference: null });
    const noRates = ledger(env, [], referenceAt, enterpriseInventory);
    expect(compareCosts(noRates, noRates)).toMatchObject({ monthlyDifference: null, annualDifference: null });
  });
});

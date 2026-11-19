import { describe, expect, it } from 'vitest';
import { enterpriseInventory, referenceAt, scenarios } from '../fixtures/enterprise-scenarios';
import { blankEnvironment, importEnvironment } from '../src/domain';
import { ledger } from '../src/ledger';
import { estimateValue, valuePlanSchema, type ValuePlan } from '../src/value';

const entered = (value: number) => ({ value, source: 'entered' as const });
const fictionalPlan: ValuePlan = {
  currency: 'GBP', assumptions: { audience: entered(200), adoption: entered(37.5), tasks: entered(20), minutes: entered(12),
    realisation: entered(60), hourlyValue: entered(25), implementation: entered(1200), ongoing: entered(49.95) },
};

describe('optional value assumptions', () => {
  it('reconciles monthly and annualised capacity and economic equivalent independently', () => {
    const next = estimateValue(fictionalPlan);
    expect(next).toEqual({
      activeUsers: '75', grossHours: { monthly: '300.00', annual: '3600.00' },
      realisedHours: { monthly: '180.00', annual: '2160.00' },
      economicEquivalent: { monthly: '4500.00', annual: '54000.00' },
      cashableSavings: { monthly: null, annual: null }, implementation: '1200.00',
      additionalOngoing: { monthly: '49.95', annual: '599.40' },
    });
  });

  it('keeps absent assumptions unknown and treats zero as a declaration', () => {
    const { audience, adoption, tasks, minutes, hourlyValue } = fictionalPlan.assumptions;
    const gross = estimateValue({ currency: 'GBP', assumptions: { audience, adoption, tasks, minutes, hourlyValue } });
    expect(gross.grossHours.monthly).toBe('300.00');
    expect(gross.realisedHours.monthly).toBeNull();
    expect(gross.economicEquivalent.monthly).toBeNull();
    const explicit = estimateValue({ currency: 'GBP', assumptions: { ...fictionalPlan.assumptions,
      adoption: entered(0), cashableSavings: entered(1000) } });
    expect(explicit).toMatchObject({ activeUsers: '0', realisedHours: { monthly: '0.00' },
      cashableSavings: { monthly: '1000.00', annual: '12000.00' } });
    expect(estimateValue({ currency: 'GBP', assumptions: { audience, adoption } }).grossHours.monthly).toBeNull();
  });

  it('supports strict optional import and preserves explicit fictional provenance', () => {
    const old = blankEnvironment();
    expect(importEnvironment(JSON.stringify(old))).toEqual(old);
    const fictional = { value: 12, source: 'fictional', note: 'Fictional time study' };
    const file = JSON.stringify({ ...old, valuePlan: { ...fictionalPlan, assumptions: { ...fictionalPlan.assumptions, minutes: fictional } } });
    expect(importEnvironment(file).valuePlan?.assumptions).toMatchObject({ adoption: { value: 37.5, source: 'imported' }, minutes: fictional });
    expect(valuePlanSchema.safeParse({ ...fictionalPlan, assumptions: { adoption: entered(101) } }).success).toBe(false);
    expect(valuePlanSchema.safeParse({ ...fictionalPlan, assumptions: { audience: entered(1.25) } }).success).toBe(false);
    expect(() => importEnvironment(JSON.stringify({ ...old, valuePlan: { ...fictionalPlan, roi: 99 } }))).toThrow('unsupported properties');
  });

  it('leaves known costs, licence scopes and readiness exactly as before', () => {
    const { env, records } = scenarios[0];
    expect(ledger({ ...env, valuePlan: fictionalPlan }, records, referenceAt, enterpriseInventory))
      .toEqual(ledger(env, records, referenceAt, enterpriseInventory));
  });
});

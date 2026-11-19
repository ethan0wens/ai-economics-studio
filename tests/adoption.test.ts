import { describe, expect, it } from 'vitest';
import { enterpriseInventory, referenceAt, scenarios } from '../fixtures/enterprise-scenarios';
import { compareAdoption } from '../src/adoption';
import { emptyCatalogue } from '../src/catalogue';
import { ledger } from '../src/ledger';
import type { ValuePlan } from '../src/value';

const assumption = (value: number) => ({ value, source: 'fictional' as const });
const plan: ValuePlan = { currency: 'GBP', assumptions: { audience: assumption(200), adoption: assumption(50),
  tasks: assumption(20), minutes: assumption(12), realisation: assumption(60), hourlyValue: assumption(25), cashableSavings: assumption(200) } };

function sample(index: number) {
  const { env, records } = scenarios[index];
  const catalogue = { ...emptyCatalogue, records, inventory: enterpriseInventory };
  return { env, catalogue, current: ledger(env, records, referenceAt, enterpriseInventory) };
}

describe('adoption and cost alongside the accepted plan', () => {
  it('keeps productivity separate until an explicit usable workload link exists', () => {
    const { env, current, catalogue } = sample(0);
    const results = compareAdoption(env, current, catalogue, plan, { expected: 25, higher: 75 });
    expect(results.current).toBe('1893.80');
    expect(results.rows).toMatchObject([
      { label: 'Expected adoption', activeUsers: '50', grossHours: '200.00', economicEquivalent: '3000.00',
        knownCost: null, unresolved: undefined, cashableSavings: '200.00' },
      { label: 'Higher adoption', activeUsers: '150', grossHours: '600.00', economicEquivalent: '9000.00',
        knownCost: null, unresolved: undefined, cashableSavings: '200.00' },
    ]);
  });

  it('projects just the chosen Foundry workload through the existing ledger without changing inputs', () => {
    const { env, current, catalogue } = sample(0);
    const before = JSON.stringify({ env, plan, current });
    const results = compareAdoption(env, current, catalogue, plan, { lower: 25, expected: 75 }, {
      agentId: 'Support assistant', perUser: 10, note: 'Fictional monthly service interactions',
    });
    // The unchanged resources and licences total £1,610. Per-line rounded inference adds £7.10 and £21.29.
    expect(results.rows).toMatchObject([
      { activeUsers: '50', volume: { value: '500', unit: 'executions' }, knownCost: '1617.10', unresolved: 0 },
      { activeUsers: '150', volume: { value: '1500', unit: 'executions' }, knownCost: '1631.29', unresolved: 0 },
    ]);
    expect(JSON.stringify({ env, plan, current })).toBe(before);
  });

  it('requires customer credit provenance and preserves allowance and prepaid pack treatment', () => {
    const { env, current, catalogue } = sample(1);
    const link = { agentId: 'Agent A', perUser: 240, note: '' };
    const rates = { expected: 25 };
    expect(compareAdoption(env, current, catalogue, plan, rates, link).rows[0].knownCost).toBeNull();
    const results = compareAdoption(env, current, catalogue, plan, rates, { ...link, note: 'Fictional measured pilot credit average' });
    // 12,000 gross less 2,000 allowance, plus 19,000 other credits, less 25,000 pack credits.
    expect(results.rows[0]).toMatchObject({ volume: { value: '12000', unit: 'Copilot Credits' }, knownCost: '962.00', unresolved: 0 });
  });

  it('holds shared provisioned capacity at its accepted scope', () => {
    const { env, current, catalogue } = sample(2);
    const projection = compareAdoption(env, current, catalogue, plan, { expected: 75 }, { agentId: 'Dispatch', perUser: 10, note: '' });
    expect(projection).toMatchObject({ current: '7400.00', rows: [{ knownCost: null }] });
    expect(current.lines.filter(line => line.component === 'Shared provisioned capacity')).toHaveLength(1);
  });
});

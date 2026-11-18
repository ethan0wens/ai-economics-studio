import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/price-cases.json';
import { blankEnvironment, importEnvironment, type Environment } from '../src/domain';
import { assumedMeter, financialRates, governance, ledger, summarize } from '../src/ledger';
import type { RetailRecord } from '../src/catalogue';

const now = '2026-11-18T13:00:00Z';
const meter = assumedMeter('test-storage', 'Fictional SKU', 'uksouth', '100 GB', 100);
const record: RetailRecord = {
  ...meter, price: '1000', currency: 'GBP', product: 'Fictional test-only SKU',
  verification: 'azure-retail-api', effectiveAt: '2026-01-01T00:00:00Z', source: 'https://prices.azure.com/api/retail/prices',
};
const terms = { currency: 'GBP', meter, reason: 'Fictional test-only agreement' };

describe('financial rules', () => {
  it('matches handover test-only cases for discount, forecast, fixed prices, unknowns and included rates', () => {
    for (const example of fixture.cases) {
      const agreement = example.agreement.mode === 'retail-discount-percent'
        ? { ...terms, mode: 'discount' as const, value: example.agreement.discountPercent! }
        : example.agreement.mode === 'fixed-price' ? { ...terms, mode: 'fixed' as const, value: example.agreement.fixedPrice! }
        : example.agreement.mode === 'intentional-zero' ? { ...terms, mode: 'intentional-zero' as const } : undefined;
      const resolved = financialRates(example.retailMonthly ?? undefined, agreement,
        example.globalForecastPercent ?? 0, example.applyToFixedContract ?? false);
      expect(resolved.current?.toFixed(2) ?? null, example.id).toBe(example.expectedCurrentContract ?? (example.agreement.mode === 'fixed-price' ? example.agreement.fixedPrice : null));
      if (example.expectedProjectedContract) expect(resolved.future?.toFixed(2), example.id).toBe(example.expectedProjectedContract);
    }
  });

  it('qualifies rates by exact identity, region, currency, unit and effective date', () => {
    const env: Environment = {
      ...blankEnvironment(), objects: [{ id: 'usage', kind: 'supporting-resource', name: 'Test usage', monthlyQuantity: 250, meter }],
    };
    expect(ledger(env, [record], now).summary.current.known).toBe('2500.00');
    for (const invalid of [
      { ...record, currency: 'USD' }, { ...record, region: 'westus' }, { ...record, unit: 'GB' },
      { ...record, quantityPerUnit: 1 }, { ...record, sku: 'near match' }, { ...record, effectiveAt: '2027-01-01T00:00:00Z' },
    ]) expect(ledger(env, [invalid], now).lines[0].amounts.current).toBeNull();
    expect(ledger(env, [record, record], now).lines[0].amounts.retail).toBeNull();
  });

  it('replaces global forecasts, applies object specificity and preserves contractual terms across refresh and JSON import', () => {
    const env: Environment = { ...blankEnvironment(), objects: [
      { id: 'first', kind: 'supporting-resource', name: 'Fictional first', meter, monthlyQuantity: 100 },
      { id: 'second', kind: 'supporting-resource', name: 'Fictional second', meter, monthlyQuantity: 100 },
    ], pricingOverrides: [{ ...terms, mode: 'discount', value: 15 }, { ...terms, objectId: 'first', mode: 'fixed', value: '700' }],
    forecast: { percent: 20, applyToFixed: false, exceptions: [{ objectId: 'first', meter, percent: 10, applyToFixed: true }] } };
    const result = ledger(importEnvironment(JSON.stringify(env)), [{ ...record, price: '1200' }], now);
    expect(result.lines.map(line => line.amounts)).toEqual([
      { retail: '1200.00', current: '700.00', forecast: '770.00' },
      { retail: '1200.00', current: '1020.00', forecast: '1224.00' },
    ]);
    expect(summarize(result.lines).current).toEqual({ known: '1720.00', annual: '20640.00', incomplete: 0 });
  });

  function shared(mode: 'payg' | 'provisioned'): Environment {
    const env = blankEnvironment();
    const model = { kind: 'model-deployment', id: 'model', modelId: 'Fictional test model', name: 'Shared test deployment',
      mode, capacity: 2, billableHours: 5, allocationBasis: 'input-tokens' } as const;
    env.objects.push(model);
    for (const [id, executions] of [['a', 100], ['b', 200]] as const) {
      env.objects.push({ id, name: id, kind: 'agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' },
        { id: id + '-usage', name: 'Fictional usage', kind: 'usage-profile', executions, calls: 2, input: 10_000, output: 5_000 });
      env.relationships.push({ from: id, to: model.id, type: 'agent-uses-deployment' },
        { from: id, to: id + '-usage', type: 'agent-uses-usage' });
    }
    return env;
  }

  it('counts shared capacity once, suppresses duplicate token charges and reconciles allocation at minor-unit precision', () => {
    const env = shared('provisioned');
    const capacity = assumedMeter('model-capacity', 'Fictional test model', 'uksouth', 'capacity-unit hour');
    env.pricingOverrides = [{ ...terms, meter: capacity, objectId: 'model', mode: 'fixed', value: '5.001' }];
    const result = ledger(env, []);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].allocation).toEqual([{ agentId: 'a', amount: '16.67' }, { agentId: 'b', amount: '33.34' }]);
    expect(result.summary.current.known).toBe('50.01');
  });

  it('computes separate input and output quantities and updates both agents using a shared meter', () => {
    const env = shared('payg');
    env.pricingOverrides = [
      { ...terms, meter: assumedMeter('model-input', 'Fictional test model', 'uksouth', 'million input tokens', 1e6), objectId: 'model', mode: 'fixed', value: '2' },
      { ...terms, meter: assumedMeter('model-output', 'Fictional test model', 'uksouth', 'million output tokens', 1e6), objectId: 'model', mode: 'fixed', value: '8' },
    ];
    expect(ledger(env, []).lines.map(line => [line.quantity, line.amounts.current])).toEqual([
      ['2000000', '4.00'], ['1000000', '8.00'], ['4000000', '8.00'], ['2000000', '16.00'],
    ]);
    const input = env.pricingOverrides[0];
    if (input.mode === 'fixed') input.value = '3';
    expect(ledger(env, []).lines.map(line => line.amounts.current)).toEqual(['6.00', '8.00', '12.00', '16.00']);
  });

  it('keeps licence overlap advisory, treats declared existing seats as owned and avoids Copilot inference duplication', () => {
    const env = shared('payg');
    env.objects = env.objects.map(object => object.kind === 'agent' ? { ...object, platform: 'copilot-studio', credits: 20 } : object);
    env.objects.push({ id: 'seat', kind: 'licence-entitlement', name: 'Test seats', procurement: 'existing', seats: 50 },
      { id: 'group1', kind: 'user-group', name: 'A' }, { id: 'group2', kind: 'user-group', name: 'B' });
    for (const from of ['group1', 'group2']) env.relationships.push({ type: 'group-has-entitlement', from, to: 'seat' });
    const output = ledger(env, []);
    expect(output.lines.filter(line => line.category === 'Inference')).toHaveLength(0);
    expect(output.lines.find(line => line.objectId === 'seat')?.amounts.current).toBe('0.00');
    expect(output.issues.some(issue => issue.message.includes('overlap'))).toBe(true);
    expect(governance(env).every(item => item.status === 'Unknown')).toBe(true);
  });
});

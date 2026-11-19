import { describe, expect, it } from 'vitest';
import { inventoryPlan } from '../scripts/discovery';
import { emptyCatalogue, resolveOffering, sourceRecord, type RetailRecord } from '../src/catalogue';
import { catalogueCoverage, environmentCompleteness } from '../src/coverage';
import { blankEnvironment, importEnvironment, type Environment } from '../src/domain';
import { ledger } from '../src/ledger';
import { offeringMeter, offerings, type Component } from '../src/offerings';

const now = '2026-11-20T10:00:00Z';
const offer = (id: string) => offerings.find(item => item.id === id)!;
function price(id: string, component: Component, value: string): RetailRecord {
  const selected = offer(id);
  return {
    ...offeringMeter(selected, component)!, offeringId: id, component, currency: selected.currency, price: value,
    effectiveAt: '2026-01-01T00:00:00Z', source: 'https://prices.azure.com/api/retail/prices', product: 'Fictional test-only rate',
    verification: 'azure-retail-api',
  };
}
function commercial(id: string, component: Component, value: string): RetailRecord {
  return {
    ...price(id, component, value), verification: 'microsoft-commercial', source: 'https://www.microsoft.com/en-gb/',
    review: { checkedAt: '2026-11-18T00:00:00Z', expiresAt: '2026-12-18T00:00:00Z', terms: 'Fictional test-only offer' },
  };
}

const modelId = 'gpt-4-1-mini-global-uksouth';
const model = offer(modelId);
if (model.kind !== 'model-deployment') throw new Error('Missing test model');
const base = {
  ...blankEnvironment(), objects: [
    { kind: 'model-deployment', id: 'model', name: 'Fictional model', offeringId: modelId, modelId: model.model.id,
      sku: model.model.sku, modelVersion: model.model.version, mode: 'payg', region: model.region },
    { kind: 'agent', id: 'agent', name: 'Fictional agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' },
    { kind: 'usage-profile', id: 'usage', name: 'Fictional usage', executions: 500, calls: 2, input: 3000, output: 1000 },
  ], relationships: [
    { from: 'agent', to: 'model', type: 'agent-uses-deployment' },
    { from: 'agent', to: 'usage', type: 'agent-uses-usage' },
  ],
} satisfies Environment;

describe('retail-first pricing and completeness', () => {
  it('resolves only the exact reviewed scope, meter, unit, date and currency', () => {
    const input = price(modelId, 'input', '0.20');
    expect(resolveOffering([input], model, 'input', 'GBP', now)).toEqual(input);
    expect(resolveOffering([input], model, 'output', 'GBP', now)).toBeUndefined();
    expect(resolveOffering([input], model, 'input', 'USD', now)).toBeUndefined();
    for (const variation of [{ region: 'ukwest' }, { sku: 'different' }, { meterId: 'different' }, { unit: '1M' },
      { effectiveAt: '2027-01-01T00:00:00Z' }]) {
      expect(resolveOffering([{ ...input, ...variation }], model, 'input', 'GBP', now)).toBeUndefined();
    }
    expect(resolveOffering([input, input], model, 'input', 'GBP', now)).toBeUndefined();
  });

  it('prices separate token directions and clears both when the deployment identity changes', () => {
    // 3m input at 0.20/1,000 + 1m output at 0.50/1,000 = 1,100.
    const rates = [price(modelId, 'input', '0.20'), price(modelId, 'output', '0.50')];
    expect(ledger(base, rates, now).lines.map(line => line.amounts.current)).toEqual(['600.00', '500.00']);
    expect(ledger(base, rates, now).summary.current.known).toBe('1100.00');
    for (const change of [{ modelVersion: 'new-version' }, { region: 'ukwest' }, { sku: 'RegionalStandard' }]) {
      const changed = { ...base, objects: base.objects.map(item => item.kind === 'model-deployment' ? { ...item, ...change } : item) };
      expect(ledger(changed, rates, now).summary.current.incomplete).toBe(2);
    }
  });

  it('costs declared cached tokens separately and preserves their contract override in JSON', () => {
    const { inventory } = inventoryPlan();
    const offering = inventory.find(item => item.id === modelId)!;
    const meter = offeringMeter(offering, 'cached')!;
    const data = importEnvironment(JSON.stringify({ ...base, objects: base.objects.map(item => item.kind === 'usage-profile'
      ? { ...item, cachedInput: 1000 } : item) }));
    const uncached = [price(modelId, 'input', '0.20'), price(modelId, 'output', '0.50')];
    expect(ledger(data, uncached, now, inventory).summary.current).toMatchObject({ known: '1100.00', incomplete: 1 });
    const cached = { ...price(modelId, 'input', '0.05'), ...meter, component: 'cached' as const };
    expect(ledger(data, [...uncached, cached], now, inventory).summary.current.known).toBe('1150.00');
    const override = importEnvironment(JSON.stringify({ ...data, pricingOverrides: [{
      objectId: 'model', meter, mode: 'fixed', value: '0.04', currency: 'GBP', reason: 'Fictional test agreement',
    }] }));
    expect(ledger(override, uncached, now, inventory).summary.current).toMatchObject({ known: '1140.00', incomplete: 0 });
  });

  it('counts a provisioned deployment once and ignores agent token usage for its capacity bill', () => {
    const id = 'openai-global-ptu-uksouth';
    const selected = offer(id);
    if (selected.kind !== 'model-deployment') throw new Error('Missing test capacity offering');
    const capacity = { ...base, objects: [...base.objects.map(item => item.kind === 'model-deployment' ? {
      ...item, offeringId: id, modelId: selected.model.id, modelVersion: selected.model.version, sku: selected.model.sku,
      mode: selected.model.mode, capacity: 4, billableHours: 100,
    } : item), { ...base.objects[1], id: 'agent-b' }],
    relationships: [...base.relationships, { from: 'agent-b', to: 'model', type: 'agent-uses-deployment' as const }] };
    const result = ledger(capacity, [price(id, 'capacity', '0.25')], now);
    expect(result.lines).toHaveLength(1);
    expect(result.summary.current.known).toBe('100.00');
    expect(result.lines[0].allocatesTo).toEqual(['agent', 'agent-b']);
  });

  it('charges only graduated units, applies a discount once, and restores retail for one object', () => {
    const id = 'bandwidth-internet-out-uksouth';
    const retail = { ...price(id, 'usage', '0'), tiers: [{ from: 0, price: '0' }, { from: 100, price: '0.10' }, { from: 300, price: '0.04' }] };
    const meter = offeringMeter(offer(id), 'usage')!;
    const data: Environment = {
      ...blankEnvironment(), objects: [{ kind: 'supporting-resource', name: 'Fictional egress', id: 'line', monthlyQuantity: 400, offeringId: id }],
      pricingOverrides: [{ mode: 'discount', value: 20, reason: 'Fixture', meter, currency: 'GBP' }],
      forecast: { percent: -25, applyToFixed: false, exceptions: [{ meter, objectId: 'line', percent: 10 }] },
    };
    // 100 free + 200 × .10 + 100 × .04 = 24.00. Discount gives 19.20; exception gives 21.12.
    expect(ledger(data, [retail], now).lines[0].amounts).toEqual({ retail: '24.00', current: '19.20', forecast: '21.12' });
    const restored = importEnvironment(JSON.stringify({ ...data, pricingOverrides: [...data.pricingOverrides,
      { mode: 'retail', meter, currency: 'GBP', objectId: 'line', reason: 'Use retail here' }] }));
    expect(ledger(restored, [retail], now).lines[0].amounts).toEqual({ retail: '24.00', current: '24.00', forecast: '26.40' });
    expect(sourceRecord.safeParse({ ...retail, tiers: undefined }).success).toBe(false);
  });

  it('leaves duplicated graduated allowances unresolved until usage is consolidated', () => {
    const id = 'bandwidth-internet-out-uksouth';
    const rate = { ...price(id, 'usage', '0'), tiers: [{ from: 0, price: '0' }, { from: 100, price: '0.10' }] };
    const data: Environment = { ...blankEnvironment(), objects: ['a', 'b'].map(idValue => ({
      kind: 'supporting-resource', name: idValue, id: idValue, offeringId: id, monthlyQuantity: 100,
    })) };
    const result = ledger(data, [rate], now);
    expect(result.summary.current.incomplete).toBe(2);
    expect(result.lines.every(line => line.amounts.current === null && line.reason?.includes('consolidated'))).toBe(true);
  });

  it('deducts one linked pack once across eligible agents and keeps owned seats separate', () => {
    const pack = 'copilot-credit-pack-gb';
    const credit = 'copilot-payg-uksouth';
    const licence = 'agent-365-gb';
    const data: Environment = {
      ...blankEnvironment(),
      objects: [
        { id: 'pack', name: 'Fictional pack', kind: 'supporting-resource', offeringId: pack, monthlyQuantity: 1 },
        ...['a', 'b'].map(id => ({ id, name: id, kind: 'agent' as const, platform: 'copilot-studio' as const, modelSource: 'platform-managed' as const, credits: 15000 })),
        { id: 'owned', name: 'Existing seats', kind: 'licence-entitlement', product: offer(licence).name, offeringId: licence, procurement: 'existing', seats: 5 },
        { id: 'incremental', name: 'New seats', kind: 'licence-entitlement', product: offer(licence).name, offeringId: licence, procurement: 'incremental', seats: 5 },
      ],
      relationships: ['a', 'b'].map(from => ({ from, to: 'pack', type: 'agent-uses-resource' })),
    };
    const rates = [commercial(pack, 'usage', '100'), price(credit, 'credits', '0.01'), commercial(licence, 'seats', '10')];
    // 1 pack (100) + 5,000 residual credits (50) + five new seats (50).
    const result = ledger(data, rates, now);
    expect(result.summary.current.known).toBe('200.00');
    expect(result.lines.filter(line => line.includedCredits).map(line => [line.quantity, line.includedCredits])).toEqual([['0', '15000'], ['5000', '10000']]);
    expect(result.lines.find(line => line.objectId === 'owned')?.amounts).toEqual({ retail: '0.00', current: '0.00', forecast: '0.00' });
    expect(ledger(data, rates, '2027-01-01T00:00:00Z').summary.current.incomplete).toBe(2);
  });

  it('sums declared Copilot activity credits once instead of adding a saved monthly total or a second tariff', () => {
    const copilot = 'copilot-payg-uksouth';
    const agent = {
      id: 'agent', name: 'Fictional credit breakdown', kind: 'agent', platform: 'copilot-studio', modelSource: 'platform-managed',
      creditMethod: 'breakdown', credits: 100_000, creditBreakdown: { generative: 13_000, actions: 12_500, classic: 0 },
    };
    const pack = 'copilot-credit-pack-gb';
    const data = importEnvironment(JSON.stringify({ ...blankEnvironment(), objects: [agent, {
      kind: 'supporting-resource', name: 'Fictional pack', id: 'pack', monthlyQuantity: 1, offeringId: pack,
    }], relationships: [{ from: 'agent', to: 'pack', type: 'agent-uses-resource' }] }));
    const result = ledger(data, [price(copilot, 'credits', '0.01'), commercial(pack, 'usage', '100')], now);
    expect(result.lines).toHaveLength(2);
    expect(result.lines.find(line => line.objectId === 'agent')).toMatchObject({ quantity: '500', includedCredits: '25000', amounts: { current: '5.00' } });
    expect(result.summary.current.known).toBe('105.00');
  });

  it('separates finite coverage from partial environment pricing and customer rates', () => {
    const records = [price(modelId, 'input', '0.20')];
    const summary = catalogueCoverage({ ...emptyCatalogue, records }, now).find(family => family.family === 'foundry')!;
    expect(summary).toMatchObject({ supported: 3, fully: 0, partial: 1, manual: 2, percent: 0 });
    expect(environmentCompleteness(ledger(base, records, now))).toMatchObject({ fully: 0, partial: 1, retail: 1, manual: 0 });
    const onlyManual: Environment = { ...base, pricingOverrides: [{ mode: 'fixed', value: '0.50', reason: 'Fixture',
      objectId: 'model', currency: 'GBP', meter: offeringMeter(model, 'output')! }] };
    expect(environmentCompleteness(ledger(importEnvironment(JSON.stringify(onlyManual)), records, now))).toMatchObject({ fully: 1, partial: 0, retail: 1, manual: 1 });
  });
});

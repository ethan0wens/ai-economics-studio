import { expect, it } from 'vitest';
import { businessCase } from '../fixtures/adoption-business-case';
import { enterpriseInventory, referenceAt } from '../fixtures/enterprise-scenarios';
import { compareAdoption } from '../src/adoption';
import { emptyCatalogue, type RetailRecord } from '../src/catalogue';
import { importEnvironment } from '../src/domain';
import { examples, openExample } from '../src/examples';
import { ledger } from '../src/ledger';
import { offeringMeter } from '../src/offerings';
import { usageSensitivity } from '../src/usage-estimation';
import { estimateValue } from '../src/value';

it('reconciles the fictional business case against the independently pinned fixture', () => {
  const records = businessCase.rateSpecs.map(([id, component, price]): RetailRecord => ({
    ...offeringMeter(enterpriseInventory.find(offer => offer.id === id)!, component)!,
    offeringId: id, component, price, product: 'Fictional business case regression rate', currency: 'GBP',
    effectiveAt: '2026-01-01T00:00:00Z', verification: 'azure-retail-api', source: 'https://prices.azure.com/api/retail/prices',
  }));
  const inventory = enterpriseInventory;
  const catalogue = { ...emptyCatalogue, records, inventory };
  const env = openExample(examples.find(example => example.id === businessCase.id)!);
  const plan = env.valuePlan!;
  const agent = env.objects.find(item => item.kind === 'agent')!;
  const accepted = businessCase.cases[1];
  const acceptedJson = JSON.stringify(env);
  const current = ledger(env, records, referenceAt, inventory);
  expect(current.lines.map(line => ({ quantity: line.quantity, unit: line.meter?.quantityPerUnit, amount: line.amounts.current }))).toEqual([
    { quantity: accepted.input, unit: 1000, amount: '300.00' },
    { quantity: accepted.output, unit: 1000, amount: '150.00' },
  ]);
  expect(current.summary.current).toMatchObject({ known: accepted.monthlySpend, annual: accepted.annualSpend, incomplete: 0 });
  expect(ledger({ ...env, valuePlan: undefined }, records, referenceAt, inventory)).toEqual(current);
  expect(ledger(env, records.slice(0, 1), referenceAt, inventory).summary.current).toMatchObject({ known: '300.00', incomplete: 1 });
  expect(estimateValue(plan)).toMatchObject({
    activeUsers: accepted.active, grossHours: { monthly: accepted.gross }, realisedHours: { monthly: accepted.realised },
    economicEquivalent: { monthly: accepted.monthlyValue, annual: accepted.annualValue },
    cashableSavings: { monthly: null, annual: null }, implementation: null, additionalOngoing: { monthly: null, annual: null },
  });
  const rates = { lower: 25, expected: 50, higher: 75 };
  const unlinked = compareAdoption(env, current, catalogue, plan, rates);
  const linked = compareAdoption(env, current, catalogue, plan, rates, { agentId: agent.id, perUser: 10, note: 'Fictional workload' });
  expect(linked.current).toBe(accepted.monthlySpend);
  businessCase.cases.forEach((row, index) => {
    expect(unlinked.rows[index]).toMatchObject({ adoption: row.adoption, economicEquivalent: row.monthlyValue, knownCost: null, cashableSavings: null });
    expect(linked.rows[index]).toMatchObject({
      adoption: row.adoption, activeUsers: row.active, grossHours: row.gross, economicEquivalent: row.monthlyValue,
      volume: { value: row.executions, unit: 'executions' }, knownCost: row.monthlySpend, unresolved: 0, cashableSavings: null,
    });
    const scenario = usageSensitivity(env, agent.id, 'executions', Number(row.executions));
    if (scenario.kind !== 'ready') throw new Error(scenario.message);
    const projectedLedger = ledger(scenario.env, records, referenceAt, inventory);
    expect(projectedLedger.lines.map(line => line.quantity)).toEqual([row.input, row.output]);
    expect(projectedLedger.summary.current.annual).toBe(row.annualSpend);
  });
  expect(JSON.stringify(env)).toBe(acceptedJson);
  const restored = importEnvironment(acceptedJson);
  expect(restored.valuePlan).toEqual(plan);
  expect(Object.values(restored.valuePlan!.assumptions).every(input => input.source === 'fictional')).toBe(true);
  expect(restored.objects.find(item => item.kind === 'usage-profile')?.executions).toBe(1000);
  expect(restored.relationships).toEqual(env.relationships);
});

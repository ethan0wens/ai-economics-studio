import { expect, it } from 'vitest';
import { enterpriseInventory, referenceAt, scenarios } from '../fixtures/enterprise-scenarios';
import { importEnvironment, type Environment } from '../src/domain';
import { deploymentFindings } from '../src/compatibility';
import { licensing } from '../src/entitlements';
import { ledger } from '../src/ledger';
import { logicalGraph } from '../src/graph';
import { capacityEvidence, capacityRequirement, type Deployment } from '../src/provisioned';

const shared = scenarios[2];
const named = shared.env.objects.find((object): object is Deployment => object.kind === 'model-deployment')!;
const alternative = 'gpt-4-1-global-standard-uksouth';
const compareRates = scenarios[0].records.filter(record => record.offeringId === alternative);
const reserve = {
  sku: 'GlobalProvisionedManaged', region: 'uksouth', currency: 'GBP', ptus: 30, term: '12',
  total: '36000.00', start: '2026-11-01', coveredHours: 400, reference: 'Fictional exclusive allocation',
} as const;
function workspace(changes: Partial<Deployment>): Environment {
  return importEnvironment(JSON.stringify({ ...shared.env,
    objects: shared.env.objects.map(object => object.id === named.id ? { ...named, ...changes } : object) }));
}
function evaluate(changes: Partial<Deployment>, records = shared.records, at = referenceAt) {
  return ledger(workspace(changes), records, at, enterpriseInventory);
}

it('uses exact version, SKU and geography separately from billing and rejects invalid verified PTUs', () => {
  expect(capacityRequirement(named, referenceAt)).toMatchObject({ minimum: 15, increment: 5, inputTpmPerPtu: 3000 });
  for (const [ptus, reason] of [[10, /minimum is 15/], [17, /increments of 5/], [15.5, /whole number/]] as const) {
    const result = evaluate({ capacity: ptus });
    expect(result.lines.find(line => line.component === 'Shared provisioned capacity')).toMatchObject({ quantity: null, reason: expect.stringMatching(reason) });
    expect(result.summary.current).toMatchObject({ known: '200.00', incomplete: 1 });
  }
  expect(evaluate({ capacity: 20 }).summary.current).toMatchObject({ known: '3400.00', incomplete: 0 });
  expect(deploymentFindings({ ...named, deployedVersion: 'unreviewed' }, referenceAt))
    .toContainEqual(expect.objectContaining({ title: 'Provisioned capacity', status: 'unverified' }));
  const afterEvidence = new Date(Date.parse(capacityEvidence.map(row => row.reviewBy).sort().at(-1)!) + 86_400_000).toISOString();
  expect(deploymentFindings(named, afterEvidence))
    .toContainEqual(expect.objectContaining({ title: 'Provisioned capacity', status: 'unverified' }));
  expect(capacityRequirement({ ...named, deploymentRegion: undefined }, referenceAt)).toBeUndefined();
});

it('checks regional capacity requirements and selects a distinct hourly tariff', () => {
  const regional = 'openai-regional-ptu-uksouth';
  const offer = enterpriseInventory.find(item => item.id === regional)!;
  const sku = 'ProvisionedManaged';
  const rate = { ...shared.records[0], offeringId: regional, meterId: regional + '/capacity', sku: offer.kind === 'model-deployment' ? offer.model.sku : sku, price: '0.60' };
  const result = evaluate({ sku, offeringId: regional, capacity: 50 }, [...shared.records, rate]);
  // 50 PTUs × 400 hours × £0.60 plus £200 shared resources.
  expect(result.summary.current).toMatchObject({ known: '12200.00', annual: '146400.00', incomplete: 0 });
  expect(evaluate({ sku, offeringId: regional, capacity: 45 }, [...shared.records, rate]).summary.current.incomplete).toBe(1);
});

it('prices an active allocation once, keeps the hourly baseline, and compares independently priced token demand', () => {
  const env = workspace({ reservation: reserve, comparisonOfferingId: alternative, peakInputTpm: 90_000, peakOutputTpm: 20_000 });
  const result = ledger(env, [...shared.records, ...compareRates], referenceAt, enterpriseInventory);
  // £36,000/12 plus (45-30) × 400 × £0.40, plus £200 shared resources.
  expect(result.summary.current).toMatchObject({ known: '5600.00', annual: '67200.00', incomplete: 0 });
  expect(result.summary.retail.known).toBe('7400.00');
  expect(result.lines.find(line => line.component === 'Shared provisioned capacity')).toMatchObject({ quantity: '6000', retailQuantity: '18000' });
  expect(result.lines.find(line => line.component === 'Provisioned reservation commitment')?.amounts.current).toBe('3000.00');
  // 550,000 uncached input, 50,000 cached and 330,000 output. £1.10 + £0.03 + £2.64.
  expect(result.capacityComparisons[0]).toMatchObject({ current: '5400.00', payg: '3.77', difference: '5396.23' });
  expect(logicalGraph(env, result).nodes.find(node => node.id === named.id)?.annotation).toContain('PAYG comparison £3.77');
  expect(result.technicalFindings).toContainEqual(expect.objectContaining({ title: 'Throughput feasibility', status: 'conditional',
    detail: expect.stringContaining('170000 TPM exceeds the 135000 TPM') }));
});

it('distinguishes invalid reservation scope, expiry, missing alt rates and duplicate allocations', () => {
  expect(evaluate({ reservation: { ...reserve, region: 'westeurope' } }).summary.current).toMatchObject({ known: '200.00', incomplete: 2 });
  expect(evaluate({ reservation: reserve }, shared.records, '2027-12-01T00:00:00Z').summary.current.known).toBe('7400.00');
  expect(evaluate({ comparisonOfferingId: alternative }).capacityComparisons[0]).toMatchObject({ current: '7200.00', payg: null });
  const env = workspace({ reservation: reserve });
  const duplicate = { ...named, id: 'duplicate', reservation: reserve };
  const result = ledger({ ...env, objects: [...env.objects, duplicate] }, shared.records, referenceAt, enterpriseInventory);
  expect(result.lines.filter(line => line.reason?.includes('multiple deployments'))).toHaveLength(4);
  expect(result.summary.current.known).toBe('200.00');
  expect(evaluate({}).technicalFindings).toContainEqual(expect.objectContaining({ title: 'Throughput feasibility', status: 'unverified' }));
});

it('requires both qualifying Defender subscriptions to cover the same group', () => {
  const env = workspace({});
  const licences = ['o365-e3', 'ems-e3', 'defender-suite'].map(id => {
    const offer = enterpriseInventory.find(item => item.id === id + '-gb')!;
    return { id, name: offer.name, product: offer.name, kind: 'licence-entitlement', offeringId: offer.id, procurement: 'existing', seats: 10 } as const;
  });
  const plan: Environment = { ...env, objects: [...licences, { id: 'users', name: 'Users', kind: 'user-group', population: 10 }],
    relationships: licences.map(item => ({ from: 'users', to: item.id, type: 'group-has-entitlement', seats: 10 })) };
  expect(licensing(plan, enterpriseInventory, referenceAt).findings).toContainEqual(expect.objectContaining({ rule: 'defender-suite-base', status: 'Verified' }));
  expect(licensing({ ...plan, relationships: plan.relationships.filter(edge => edge.to !== 'ems-e3') }, enterpriseInventory, referenceAt).findings)
    .toContainEqual(expect.objectContaining({ rule: 'defender-suite-base', status: 'Conditional' }));
  const plan2 = enterpriseInventory.find(item => item.id === 'defender-o365-p2-gb')!;
  expect(licensing({ ...plan, objects: [...plan.objects, { ...licences[0], id: 'p2', product: plan2.name, offeringId: plan2.id }] },
    enterpriseInventory, referenceAt).findings).toContainEqual(expect.objectContaining({ rule: 'defender-office-plan2', status: 'Verified' }));
});

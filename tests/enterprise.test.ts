import { describe, expect, it } from 'vitest';
import { enterpriseInventory, referenceAt, scenarios } from '../fixtures/enterprise-scenarios';
import { catalogueSchema } from '../src/catalogue';
import { compatibilityEvidence, technical } from '../src/compatibility';
import { blankEnvironment, cloneEnvironment, importEnvironment, type Environment } from '../src/domain';
import { entitlementRules, licensing } from '../src/entitlements';
import { ledger } from '../src/ledger';

const calculate = (index: number, env = scenarios[index].env, records = scenarios[index].records, at = referenceAt) =>
  ledger(env, records, at, enterpriseInventory);

describe('independent fictional enterprise reconciliations', () => {
  for (const [index, scenario] of scenarios.entries()) {
    it(scenario.env.name, () => {
      const env = importEnvironment(JSON.stringify(scenario.env));
      expect(catalogueSchema.safeParse({ schemaVersion: '1.0.0', records: scenario.records, inventory: enterpriseInventory }).success).toBe(true);
      const result = calculate(index, env);
      const expected = scenario.expected;
      expect(result.summary.current).toEqual({ known: expected.monthly, annual: expected.annual, incomplete: expected.missing });
      if (expected.retail) expect(result.summary.retail.known).toBe(expected.retail);
      if (expected.forecast) expect(result.summary.forecast).toMatchObject({ known: expected.forecast, annual: '5523.84' });
      if (expected.existing) expect(result.licenceEstate.existing.known).toBe(expected.existing);
      if (expected.proposed) expect(result.licenceEstate.proposed.known).toBe(expected.proposed);
      expect(calculate(index, cloneEnvironment(env)).summary).toEqual(result.summary);
    });
  }

  it('A reconciles alternative models, doubled demand and missing cache prices independently', () => {
    const env = scenarios[0].env;
    const doubled = { ...env, objects: env.objects.map(item => item.kind === 'usage-profile' ? { ...item, executions: 40000 } : item) };
    expect(calculate(0, doubled).summary.current.known).toBe('2177.60');
    const offer = enterpriseInventory.find(item => item.id === 'gpt-4-1-mini-global-uksouth')!;
    if (offer.kind !== 'model-deployment') throw new Error('Fixture must resolve to a model');
    const alternative = { ...env, objects: env.objects.map(item => item.kind === 'model-deployment'
      ? { ...item, offeringId: offer.id, modelId: offer.model.id, sku: offer.model.sku, modelVersion: offer.model.version } : item) };
    expect(calculate(0, alternative).summary.current.known).toBe('1751.90');
    expect(calculate(0, env, scenarios[0].records.filter(record => record.component !== 'cached')).summary.current)
      .toMatchObject({ known: '1882.80', incomplete: 1 });
  });

  it('B deducts eligible allowances, then applies one pool, and prices prompt usage separately', () => {
    const b = calculate(1);
    expect(b.lines.filter(line => line.component === 'Copilot Studio credits').map(line => [line.quantity, line.includedCredits, line.entitledCredits]))
      .toEqual([['0', '16000', '2000'], ['10000', '9000', undefined], ['5000', undefined, undefined]]);
    expect(b.lines.filter(line => line.component.startsWith('Prompt')).map(line => line.amounts.current)).toEqual(['1.00', '2.00']);
    expect(calculate(1, undefined, undefined, '2026-12-02T00:00:00Z').summary.current.known).toBe('1058.00');
    const env = scenarios[1].env;
    const pack = env.objects.find(item => item.id === 'Shared monthly pack')!;
    const ambiguous = calculate(1, { ...env, objects: [...env.objects, { ...pack, id: 'Other pool' }],
      relationships: [...env.relationships, { type: 'agent-uses-resource', from: 'Agent B', to: 'Other pool' }] });
    expect(ambiguous.lines.find(line => line.objectId === 'Agent B')?.amounts.current).toBeNull();
    expect(ambiguous.licensingFindings).toContainEqual(expect.objectContaining({ id: 'Agent B', status: 'Action required' }));
  });

  it('C reconciles one capacity charge and 1:2:3 allocation with downstream calls declared once', () => {
    const lines = calculate(2).lines;
    expect(lines.filter(line => line.component === 'Shared provisioned capacity')).toHaveLength(1);
    expect(lines.find(line => line.component === 'Shared provisioned capacity')?.allocation)
      .toEqual([{ agentId: 'Dispatch', amount: '1200.00' }, { agentId: 'Investigation', amount: '2400.00' }, { agentId: 'Resolution', amount: '3600.00' }]);
    expect(lines.filter(line => line.objectId === 'Shared index')).toHaveLength(1);
  });

  it('does not multiply one declared demand profile across several linked agents', () => {
    const env = scenarios[0].env;
    const other = { id: 'Second agent', name: 'Second agent', kind: 'agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' } as const;
    const shared = { ...env, objects: [...env.objects, other], relationships: [...env.relationships,
      { type: 'agent-uses-deployment' as const, from: other.id, to: 'Assistant deployment' },
      { type: 'agent-uses-usage' as const, from: other.id, to: 'Enterprise demand' }] };
    const result = calculate(0, shared);
    expect(result.summary.current).toMatchObject({ known: '1610.00', incomplete: 4 });
    expect(result.lines.filter(line => line.reason?.includes('avoid counting demand twice'))).toHaveLength(4);
  });

  it('D keeps 500 owned seats outside incremental cost, deduplicates groups and applies only confirmed replacements', () => {
    const result = calculate(3);
    expect(result.lines.find(line => line.objectId === 'New Copilot seats')?.quantity).toBe('100');
    expect(result.licenceEstate.proposedEnvironment).toEqual({ known: '15610.00', annual: '187320.00', incomplete: 0 });
    expect(result.licensingFindings).toContainEqual(expect.objectContaining({ id: 'New Copilot seats', rule: 'copilot-enterprise-base', status: 'Verified' }));
    const env = scenarios[3].env;
    const uncertain = calculate(3, { ...env, relationships: env.relationships.map(link =>
      link.type === 'licence-replaces-entitlement' ? { ...link, effectiveOn: undefined } : link) });
    expect(uncertain.licenceEstate.proposed).toMatchObject({ known: '3950.00', incomplete: 1 });
    const noBase = calculate(3, { ...env, objects: env.objects.filter(item => item.id !== 'Existing E3 estate'),
      relationships: env.relationships.filter(link => link.to !== 'Existing E3 estate') });
    expect(noBase.licensingFindings).toContainEqual(expect.objectContaining({ rule: 'copilot-enterprise-base', status: 'Action required' }));
    expect(noBase.summary.current.known).toBe('4090.00');
    const duplicate = env.objects.find(item => item.id === 'New Copilot seats')!;
    const collision = calculate(3, { ...env, objects: [...env.objects, { ...duplicate, id: 'Duplicate', ...(duplicate.kind === 'licence-entitlement' && { seats: 10 }) }] });
    expect(collision.summary.current.incomplete).toBe(2);
    expect(collision.licensingFindings.filter(finding => finding.title === 'Potential duplicate seats')).toHaveLength(2);
  });

  it('E keeps the deployed location independent and does not carry a fixed rate to a new billing region', () => {
    const e = calculate(4);
    expect(e.technicalFindings).toContainEqual(expect.objectContaining({ id: 'Incompatible audio output', status: 'incompatible' }));
    expect(e.lines.find(line => line.objectId === 'EU AI Search')?.amounts.current).toBe('75.00');
    expect(e.lines.find(line => line.objectId === 'UK internet egress')?.amounts.current).toBe('33.00');
    const regionChanged = { ...scenarios[4].env, objects: scenarios[4].env.objects.map(item =>
      item.kind === 'supporting-resource' && item.id === 'EU data transfer' ? { ...item, region: 'uksouth' } : item) };
    expect(calculate(4, regionChanged).summary.current).toMatchObject({ known: '3569.00', incomplete: 2 });
    const deploymentChanged = { ...scenarios[0].env, objects: scenarios[0].env.objects.map(item =>
      item.kind === 'model-deployment' ? { ...item, deploymentRegion: 'antarctica' } : item) };
    expect(calculate(0, deploymentChanged).summary.current.known).toBe('1893.80');
    expect(calculate(0, deploymentChanged).technicalFindings).toContainEqual(expect.objectContaining({ title: 'Model deployment and region', status: 'unverified' }));
  });

  it('keeps zero usage distinct, preserves precision at high volumes and expires commercial evidence', () => {
    const env = scenarios[0].env;
    const change = (executions: number) => ({ ...env, objects: env.objects.map(item => item.kind === 'usage-profile' ? { ...item, executions } : item) });
    expect(calculate(0, change(0)).summary.current.known).toBe('1610.00');
    // 50 billion times the baseline inference volume, plus unchanged non-inference charges.
    expect(calculate(0, change(1e15)).summary.current.known).toBe('14190000001610.00');
    const rate = scenarios[3].records.find(record => record.offeringId === 'm365-copilot-enterprise-gb')!;
    const expiring = { ...rate, verification: 'microsoft-commercial' as const, review: {
      checkedAt: referenceAt, expiresAt: '2026-11-30T00:00:00Z', terms: 'Fictional expiring commercial test',
    }, source: 'https://www.microsoft.com/en-gb/' };
    expect(calculate(3, undefined, [...scenarios[3].records.filter(record => record !== rate), expiring], '2026-12-01T00:00:00Z').summary.current)
      .toMatchObject({ known: '1890.00', incomplete: 1 });
  });
});

describe('evidence boundaries', () => {
  it('matches exact deployment evidence and keeps missing or expired evidence unverified', () => {
    const a = scenarios[0].env;
    expect(technical(a, referenceAt).map(item => item.status)).toContain('compatible');
    expect(technical(a, referenceAt).map(item => item.status)).toContain('conditional');
    expect(technical(a, '2027-02-01T00:00:00Z').every(item => item.status === 'unverified')).toBe(true);
    expect(licensing(scenarios[3].env, enterpriseInventory, '2027-02-01T00:00:00Z').findings)
      .toContainEqual(expect.objectContaining({ rule: 'copilot-enterprise-base', status: 'Unverified' }));
    const model = a.objects.find(item => item.kind === 'model-deployment')!;
    expect(technical({ ...a, objects: [{ ...model, sku: 'Standard', deploymentRegion: 'westeurope' }] }, referenceAt))
      .toContainEqual(expect.objectContaining({ rule: 'gpt41-regional-europe', status: 'incompatible' }));
  });

  it('keeps invalid external prompt endpoints and unsupported private Search distinct', () => {
    const b = scenarios[1].env;
    const invalid = { ...b, objects: b.objects.map(item => item.kind === 'agent' && item.id === 'Agent C'
      ? { ...item, promptEndpoint: 'responses' as const } : item) };
    expect(calculate(1, invalid).summary.current).toMatchObject({ known: '1031.00', incomplete: 1 });
    const a = scenarios[0].env;
    const privateBasic: Environment = { ...a,
      objects: a.objects.map(item => item.kind === 'agent' ? { ...item, agentSetup: 'classic-basic' } : item),
      relationships: a.relationships.map(link => link.integration === 'foundry-search' ? { ...link, integration: 'foundry-private-search' } : link),
    };
    expect(technical(privateBasic, referenceAt)).toContainEqual(expect.objectContaining({ rule: 'search-classic-private-basic', status: 'incompatible' }));
  });

  it('validates catalogue references, date windows and old JSON', () => {
    expect(new Set(entitlementRules.map(rule => rule.id)).size).toBe(entitlementRules.length);
    expect(entitlementRules.flatMap(rule => [...rule.products, ...(rule.eligible ?? []), ...(rule.possible ?? [])])
      .every(id => enterpriseInventory.some(offer => offer.id === id))).toBe(true);
    expect([...entitlementRules, ...compatibilityEvidence.regions, ...compatibilityEvidence.integrations, ...compatibilityEvidence.capabilities]
      .every(rule => rule.verifiedOn < rule.reviewBy)).toBe(true);
    const combinations = compatibilityEvidence.regions.flatMap(rule => rule.models.flatMap(model =>
      rule.regions.map(region => [model, rule.version, rule.sku, region].join('/'))));
    expect(new Set(combinations).size).toBe(combinations.length);
    const older = blankEnvironment();
    expect(importEnvironment(JSON.stringify(older))).toEqual(older);
  });

  it('flags plan-dependent Entra eligibility without claiming an extra P1 purchase', () => {
    const env: Environment = { ...blankEnvironment(), objects: [
      { id: 'p2', name: 'Existing identity', kind: 'licence-entitlement', offeringId: 'entra-p2-gb', product: 'Microsoft Entra ID P2',
        procurement: 'existing', seats: 50 },
      { id: 'suite', name: 'New governance', kind: 'licence-entitlement', offeringId: 'entra-suite-gb', product: 'Microsoft Entra Suite',
        procurement: 'incremental', seats: 25 },
    ] };
    expect(licensing(env, enterpriseInventory, referenceAt).findings).toContainEqual(expect.objectContaining({
      rule: 'entra-suite-base', status: 'Conditional', detail: expect.stringContaining('Confirm them before adding another licence.'),
    }));
  });
});

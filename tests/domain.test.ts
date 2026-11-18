import { describe, expect, it } from 'vitest';
import { blankEnvironment, cloneEnvironment, graphErrors, importEnvironment, maxBytes, overrideSchema, removeObject, type Environment } from '../src/domain';
import { assumedMeter, ledger } from '../src/ledger';

const agent = (id: string) => ({ id, kind: 'agent', name: id } as const);
const resource = { id: 'storage', kind: 'supporting-resource', name: 'Fictional storage', category: 'storage', monthlyQuantity: 2 } as const;

describe('versioned environment', () => {
  it('round-trips a draft graph and recalculates a copy with remapped IDs', () => {
    const env: Environment = {
      ...blankEnvironment(), objects: [agent('a'), resource],
      relationships: [{ from: 'a', to: resource.id, type: 'agent-uses-resource' }],
      pricingOverrides: [{ mode: 'fixed', reason: 'Fictional test agreement', currency: 'GBP', objectId: resource.id,
        meter: assumedMeter('supporting-usage', 'storage', 'uksouth', 'declared usage unit'), value: '3.75' }],
    };
    env.forecast.exceptions.push({ meter: env.pricingOverrides[0].meter, objectId: resource.id, percent: 22 });
    const restored = importEnvironment(JSON.stringify(env));
    expect(restored).toEqual(env);
    const copy = cloneEnvironment(restored);
    expect(copy.id).not.toEqual(env.id);
    expect(copy.objects.map(object => object.id)).not.toEqual(env.objects.map(object => object.id));
    expect(graphErrors(copy)).toEqual([]);
    expect(ledger(copy, []).summary).toEqual(ledger(env, []).summary);
    expect(ledger(copy, []).summary.current).toMatchObject({ known: '7.50', incomplete: 1 });
  });

  it('rejects malformed, unsupported, deep, oversized and structurally invalid imports', () => {
    const env = blankEnvironment();
    for (const invalid of [
      '{', JSON.stringify({ ...env, schemaVersion: '2.0.0' }), JSON.stringify({ ...env, credentials: 'no' }),
      ' '.repeat(maxBytes + 1), '['.repeat(14) + '0' + ']'.repeat(14),
      JSON.stringify({ ...env, objects: [agent('a')], relationships: [{ type: 'agent-uses-resource', from: 'a', to: 'missing' }] }),
      JSON.stringify({ ...env, objects: [{ ...agent('a'), monthlyExecutions: -4 }] }),
    ]) expect(() => importEnvironment(invalid)).toThrow();
  });

  it('blocks wrong endpoint types, duplicate single assignments, self-links and invocation cycles', () => {
    const env = { ...blankEnvironment(), objects: [agent('a'), agent('b'), resource,
      { id: 'use', name: 'Fictional usage', kind: 'usage-profile' }] } satisfies Environment;
    expect(graphErrors({ ...env, relationships: [{ type: 'agent-invokes-agent', from: 'a', to: 'a' }] })[0]).toMatch(/self-link/);
    expect(graphErrors({ ...env, relationships: [{ type: 'agent-uses-deployment', from: 'a', to: resource.id }] })[0]).toMatch(/incompatible/);
    const edge = { type: 'agent-uses-usage', from: 'a', to: 'use' } as const;
    expect(graphErrors({ ...env, relationships: [edge, edge] })[0]).toMatch(/Duplicate/);
    expect(graphErrors({ ...env, relationships: [
      { type: 'agent-invokes-agent', from: 'a', to: 'b' }, { type: 'agent-invokes-agent', from: 'b', to: 'a' },
    ] })[0]).toMatch(/acyclic/);
    const detached = removeObject({ ...env, relationships: [edge] }, 'use');
    expect(detached.objects).toContainEqual(agent('a'));
    expect(detached.relationships).toEqual([]);
  });

  it('admits explicit zero only with a rationale and rejects unusable override values', () => {
    const common = { currency: 'GBP', meter: assumedMeter('test', 'fictional', 'uksouth', 'hour') };
    expect(overrideSchema.safeParse({ ...common, mode: 'intentional-zero', reason: '  ' }).success).toBe(false);
    expect(overrideSchema.safeParse({ ...common, mode: 'intentional-zero', reason: 'Included in test entitlement' }).success).toBe(true);
    for (const value of ['', 'NaN', 0, '0', '-1', 'Infinity']) {
      expect(overrideSchema.safeParse({ ...common, mode: 'fixed', value, reason: 'Test' }).success).toBe(false);
    }
  });
});

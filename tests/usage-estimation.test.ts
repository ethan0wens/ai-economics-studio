import { describe, expect, it } from 'vitest';
import { blankEnvironment, importEnvironment, type Environment } from '../src/domain';
import type { Agent, Usage } from '../src/guided-state';
import { updateObject } from '../src/guided-state';
import { assumedMeter, ledger } from '../src/ledger';
import { estimateCopilot, estimateFoundry, usageSensitivity } from '../src/usage-estimation';

const plan = { users: 200, interactions: 10, calls: 2, input: 1500, output: 300 };
const usage: Usage = { name: 'Fictional usage', id: 'usage', kind: 'usage-profile', executions: 50, cachedInput: 100, retries: 10, toolCalls: 3 };
const foundry: Agent = { name: 'Fictional Foundry agent', id: 'foundry', kind: 'agent', platform: 'foundry-agent-service', modelSource: 'deployment-ref' };
const copilot: Agent = { name: 'Fictional Copilot agent', id: 'copilot', kind: 'agent', platform: 'copilot-studio', modelSource: 'platform-managed', credits: 800 };
const now = '2026-11-19T13:00:00Z';

function fictionalEnvironment(): Environment {
  const sku = 'Fictional model';
  const meters = [
    assumedMeter('model-input', sku, 'uksouth', 'million input tokens', 1e6),
    assumedMeter('model-cached', sku, 'uksouth', 'million cached input tokens', 1e6),
    assumedMeter('model-output', sku, 'uksouth', 'million output tokens', 1e6),
  ];
  return {
    ...blankEnvironment(),
    objects: [usage, foundry, { id: 'model', name: sku, modelId: sku, kind: 'model-deployment', mode: 'payg' },
      { id: 'licence', name: 'Fictional owned licence', kind: 'licence-entitlement', procurement: 'existing', seats: 3, existingMonthly: 200 }],
    relationships: [
      { from: foundry.id, to: 'model', type: 'agent-uses-deployment' },
      { from: foundry.id, to: usage.id, type: 'agent-uses-usage' },
    ],
    pricingOverrides: meters.map((meter, index) => ({ currency: 'GBP', objectId: 'model', meter, mode: 'fixed',
      value: ['2', '0.5', '5'][index], reason: 'Fictional rate for reconciliation' })),
    forecast: { percent: 20, applyToFixed: true, exceptions: [] },
  };
}

describe('assisted usage estimation', () => {
  it('converts people to executions, calls and monthly token quantities with no defaults', () => {
    expect(estimateFoundry(plan, { ...usage, retries: undefined, cachedInput: undefined })).toEqual({
      kind: 'ready', values: { executions: 2000, calls: 2, input: 1500, output: 300 },
      requests: '4000', withRetries: '4000', inputTokens: '6000000', outputTokens: '1200000', cachedTokens: undefined,
    });
    expect(estimateFoundry(plan, usage)).toMatchObject({
      kind: 'ready', requests: '4000', withRetries: '4400', inputTokens: '6600000', outputTokens: '1320000', cachedTokens: '440000',
    });
    expect(usage).toMatchObject({ executions: 50, retries: 10, cachedInput: 100, toolCalls: 3 });
  });

  it('preserves explicit zero and distinguishes it from missing assumptions', () => {
    expect(estimateFoundry({ ...plan, users: 0 }, usage)).toMatchObject({ kind: 'ready', values: { executions: 0 }, outputTokens: '0' });
    expect(estimateFoundry({ ...plan, input: undefined }, usage)).toMatchObject({ kind: 'unresolved' });
    expect(estimateCopilot({ classic: 0 }, 'credits', copilot)).toMatchObject({ kind: 'ready', total: '0', changes: { credits: 0 } });
    expect(estimateCopilot({}, 'credits', copilot)).toMatchObject({ kind: 'unresolved' });
  });

  it('accepts decimal averages while validating whole inputs and bounds without rounding', () => {
    expect(estimateFoundry({ ...plan, users: 20, interactions: 0.1, calls: 1.5 }, usage)).toMatchObject({
      kind: 'ready', values: { executions: 2, calls: 1.5 }, requests: '3', withRetries: '3.3',
    });
    for (const invalid of [{ users: 0.5 }, { input: 1.5 }, { users: 3, interactions: 1.5 }, { output: -1 },
      { calls: NaN }, { calls: Infinity }, { users: 1e15, interactions: 2 }]) {
      expect(estimateFoundry({ ...plan, ...invalid }, usage)).toMatchObject({ kind: 'invalid' });
    }
    expect(estimateFoundry({ users: 1e15, interactions: 1, calls: 100, input: 1e15, output: 1e15 }, usage)).toMatchObject({
      kind: 'ready', requests: '100000000000000000', inputTokens: '110000000000000000000000000000000',
    });
  });

  it('adds declared credits exactly and leaves unsupported activity conversion unresolved', () => {
    const breakdown = { ...copilot, creditMethod: 'breakdown' as const, creditBreakdown: { classic: 35 } };
    expect(estimateCopilot({ classic: 0.1, actions: 0.2 }, 'credits', copilot)).toEqual({ kind: 'ready', total: '0.3', changes: { credits: 0.3 } });
    expect(estimateCopilot({ generative: 10000, actions: 5000 }, 'credits', breakdown)).toEqual({
      kind: 'ready', total: '15000', changes: { creditBreakdown: { generative: 10000, actions: 5000 } },
    });
    expect(estimateCopilot({ classic: 10 }, 'activity', copilot)).toMatchObject({ kind: 'unresolved' });
    expect(estimateCopilot({ other: -1 }, 'credits', copilot)).toMatchObject({ kind: 'invalid' });
    expect(estimateCopilot({ classic: 1e15, other: 1 }, 'credits', copilot)).toMatchObject({ kind: 'invalid' });
    expect(breakdown).toMatchObject({ credits: 800, creditBreakdown: { classic: 35 } });
  });

  it('reconciles applied and manual input, existing spend, fixed contracts and the separate forecast', () => {
    const env = fictionalEnvironment();
    const preview = estimateFoundry(plan, usage);
    if (preview.kind !== 'ready') throw new Error(preview.message);
    const applied = updateObject(env, { ...usage, ...preview.values });
    const manual = updateObject(env, { ...usage, executions: 2000, calls: 2, input: 1500, output: 300 });
    const output = ledger(importEnvironment(JSON.stringify(applied)), [], now);
    expect(output).toEqual(ledger(manual, [], now));
    expect(output.lines.filter(line => line.category === 'Inference').map(line => [line.quantity, line.amounts.current, line.amounts.retail])).toEqual([
      ['6600000', '13.20', null], ['440000', '0.22', null], ['1320000', '6.60', null],
    ]);
    expect(output.summary.current).toEqual({ known: '20.02', annual: '240.24', incomplete: 0 });
    expect(output.summary.forecast.known).toBe('24.02');
    expect(output.licenceEstate.proposedEnvironment.known).toBe('220.02');
    expect(env.objects.find(item => item.id === usage.id)).toEqual(usage);
  });

  it('applies declared Copilot credits without a duplicate inference line and preserves the allowance', () => {
    const agent = { ...copilot, includedUsage: { credits: 500, basis: 'Fictional eligibility', expiresOn: '2026-12-31' } };
    const change = estimateCopilot({ classic: 10000, actions: 5000 }, 'credits', agent);
    if (change.kind !== 'ready') throw new Error(change.message);
    const env = { ...blankEnvironment(), objects: [{ ...agent, ...change.changes }] };
    const comparison = ledger(env, [], now);
    expect(comparison.lines).toHaveLength(1);
    expect(comparison.lines[0]).toMatchObject({ quantity: '14500', entitledCredits: '500', amounts: { current: null } });
    expect(agent.credits).toBe(800);
  });

  it('evaluates one disposable usage change and leaves agreements and exported inputs intact', () => {
    const env = updateObject(fictionalEnvironment(), { ...usage, executions: 2000, calls: 2, input: 1500, output: 300 });
    const change = usageSensitivity(env, foundry.id, 'executions', 4000);
    if (change.kind !== 'ready') throw new Error(change.message);
    expect(ledger(change.env, [], now).summary.current).toMatchObject({ known: '40.04' });
    expect(ledger(env, [], now).summary.current).toMatchObject({ known: '20.02' });
    expect(change.env.forecast).toEqual(env.forecast);
    expect(change.env.pricingOverrides).toEqual(env.pricingOverrides);
    expect(usageSensitivity(env, foundry.id, 'credits', 25)).toMatchObject({ kind: 'invalid' });
    expect(usageSensitivity(env, foundry.id, 'executions', 1.5)).toMatchObject({ kind: 'invalid' });
  });
});

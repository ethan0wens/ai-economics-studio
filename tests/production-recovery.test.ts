import { describe, expect, it } from 'vitest';
import { recoveryDecision } from '../scripts/production-recovery';

const digest = 'a'.repeat(64);
const checked = { head: 'next-main', deployable: 'last-substantive-main', catalogueId: digest };

describe('scheduled production reconciliation', () => {
  it('skips an already live candidate and an approval-only update with the same catalogue', () => {
    for (const application of [checked.head, checked.deployable]) {
      expect(recoveryDecision({ application, catalogueId: digest }, checked, 0)).toBe('current');
    }
  });

  it('requires a matching live digest and application before skipping recovery', () => {
    expect(recoveryDecision({ application: 'prior', catalogueId: digest }, checked, 0)).toBe('deploy');
    expect(recoveryDecision({ application: checked.head, catalogueId: 'b'.repeat(64) }, checked, 1)).toBe('deploy');
  });

  it('stops automated recovery after two unsuccessful runs for the exact checked revision', () => {
    expect(recoveryDecision({ application: 'prior', catalogueId: digest }, checked, 2)).toBe('exhausted');
    expect(recoveryDecision({ application: checked.head, catalogueId: digest }, checked, 2)).toBe('current');
  });
});

import { describe, expect, it } from 'vitest';

import { MIN_GOVERNANCE_SCORE } from '@/lib/governance-eligibility';
import { resolveGovernanceExecutionThresholdRule } from '@/lib/governance-execution-thresholds';
import {
  formatApprovalShare,
  getGovernanceEligibilityPolicy,
  listGovernanceVotingPolicies,
} from '@/lib/governance-policy-catalog';

describe('governance policy catalog', () => {
  it('lists the three decision classes in escalating order of strictness', () => {
    const { decisionClasses } = listGovernanceVotingPolicies();

    expect(decisionClasses.map((row) => row.key)).toEqual(['ordinary', 'elevated', 'constitutional']);
    const shares = decisionClasses.map((row) => row.minApprovalShare);
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
  });

  it('shows exactly what the resolver applies to a proposal', () => {
    const { decisionClasses, actionOverrides } = listGovernanceVotingPolicies();

    for (const row of decisionClasses) {
      const resolved = resolveGovernanceExecutionThresholdRule({
        actionType: 'manual_follow_through_none' as never,
        decisionClass: row.key as 'ordinary',
      });
      // An unknown action has no override, so the class baseline must be what is applied.
      expect(resolved.minApprovalShare).toBe(row.minApprovalShare);
      expect(resolved.minQuorum).toBe(row.minQuorum);
    }

    expect(actionOverrides.length).toBeGreaterThan(0);
    for (const row of actionOverrides) {
      const resolved = resolveGovernanceExecutionThresholdRule({ actionType: row.key as never, decisionClass: 'ordinary' });
      expect(resolved.approvalClass).toBe(row.approvalClass);
      expect(resolved.minQuorum).toBe(row.minQuorum);
    }
  });

  it('reports the voting eligibility rules the vote context enforces', () => {
    expect(getGovernanceEligibilityPolicy()).toMatchObject({
      minGovernanceScore: MIN_GOVERNANCE_SCORE,
      requiresVerifiedIdentity: true,
      requiresNativeApp: true,
      votingWindowHours: 72,
    });
  });

  it('formats shares as whole percentages', () => {
    expect(formatApprovalShare(0.67)).toBe('67%');
    expect(formatApprovalShare(0.5)).toBe('50%');
  });
});

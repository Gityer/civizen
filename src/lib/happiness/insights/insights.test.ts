// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { mayAutoPublish } from '@/lib/happiness/aggregate/systemic';
import type { AggregateInsightResult, AggregateSuppressedResult, QualifyingScope, SystemicIssueCandidate } from '@/lib/happiness/aggregate/types';
import { classifyProblemKind } from './classify';
import { toCiviInsightContext, civiMayReconstructSuppressed } from './civi';
import { INSIGHTS_COPY } from './copy';
import { matchExistingEfforts } from './efforts';
import { wellbeingHandoffFromPattern, takeWellbeingHandoff, storeWellbeingHandoff } from './handoff';
import { presentOverview, presentDomainInsight } from './present';

const SCOPE: QualifyingScope = {
  id: 'scope-org-1',
  kind: 'organization',
  enabled: true,
  viewerProfileIds: ['viewer-1'],
  label: 'Demo organization',
};

function insight(partial: Partial<AggregateInsightResult> & Pick<AggregateInsightResult, 'domain' | 'topic' | 'periodStart'>): AggregateInsightResult {
  return {
    kind: 'insight',
    scopeId: SCOPE.id,
    timeBucket: 'quarter',
    summary: partial.summary ?? 'Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.',
    sufficiency: 'sufficient',
    confidence: 'moderate',
    sourceTypes: ['structured_domain_state'],
    privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
    aggregationModelVersion: 'wellbeing-aggregate-v1',
    suppression: null,
    participation: 'sufficient',
    groupedDistribution: { struggling: 'shown', flourishing: 'grouped' },
    ...partial,
  };
}

const suppressed: AggregateSuppressedResult = {
  kind: 'suppressed',
  reason: 'cohort_too_small',
  privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
  aggregationModelVersion: 'wellbeing-aggregate-v1',
  summary: 'This insight is unavailable because the privacy requirements for this group are not currently met.',
};

const established: SystemicIssueCandidate = {
  scopeId: SCOPE.id,
  domain: 'time_life_balance',
  factorCategory: 'transportation',
  status: 'established_pattern',
  evidencePeriods: 3,
  summary: 'Time & Life Balance appears as a recurring pattern across several qualifying periods. This is a candidate for review, not a published Challenge or Governance item.',
  privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
  patternModelVersion: 'systemic-pattern-v1',
  publishesChallenge: false,
  publishesGovernance: false,
};

describe('wellbeing insights presentation', () => {
  it('selects going well and needs attention without an institutional score', () => {
    const overview = presentOverview({
      scope: SCOPE,
      candidates: [established],
      results: [
        insight({
          domain: 'relationships_belonging',
          topic: 'domain_state',
          periodStart: '2026-04-01',
          summary: 'Relationships & Belonging appears generally strong among participating members in this qualifying group.',
          groupedDistribution: { flourishing: 'shown', thriving: 'shown' },
        }),
        insight({ domain: 'time_life_balance', topic: 'domain_state', periodStart: '2026-04-01' }),
        insight({
          domain: 'time_life_balance',
          topic: 'factor_category',
          periodStart: '2026-04-01',
          summary: 'Transportation is frequently selected as a factor associated with Time & Life Balance concerns among participating members in this qualifying group.',
        }),
      ],
    });
    expect(overview.goingWell.map((row) => row.domain)).toContain('relationships_belonging');
    expect(overview.needsAttention.map((row) => row.domain)).toContain('time_life_balance');
    expect(overview.established[0]?.status).toBe('established_pattern');
    expect(JSON.stringify(overview)).not.toMatch(/Happiness Score|league table|rank/);
    expect(INSIGHTS_COPY.title).not.toMatch(/score/i);
  });

  it('keeps suppression as a calm unavailable state', () => {
    const overview = presentOverview({
      scope: SCOPE,
      results: [suppressed],
      candidates: [],
    });
    expect(overview.suppressed?.reason).toBe('cohort_too_small');
    expect(overview.goingWell).toEqual([]);
    expect(overview.suppressed?.summary).not.toMatch(/\b\d+\b/);
  });

  it('uses non-causal helpfulness wording and cautious problem kinds', () => {
    const domain = presentDomainInsight('time_life_balance', [
      insight({ domain: 'time_life_balance', topic: 'domain_state', periodStart: '2026-01-01' }),
      insight({
        domain: 'time_life_balance',
        topic: 'factor_category',
        periodStart: '2026-04-01',
        summary: 'Transportation is frequently selected as a factor associated with Time & Life Balance concerns among participating members in this qualifying group.',
      }),
      insight({
        domain: 'time_life_balance',
        topic: 'intervention_helpfulness',
        periodStart: '2026-04-01',
        summary: 'Flexible scheduling actions were commonly reported as helpful among qualifying participants who tried this type of change.',
      }),
    ]);
    expect(domain?.helpfulness).toMatch(/commonly reported as helpful/i);
    expect(domain?.caveats.join(' ')).toMatch(/not proof that the action caused/i);
    expect(domain?.caveats.join(' ')).not.toMatch(/27%|scientifically proven/i);
    expect(domain?.problemKind).toBe('community_system');
    expect(classifyProblemKind({ factors: ['workload'], scopeKind: 'organization' })).toBe('institutional_condition');
    expect(classifyProblemKind({ domain: 'environment_community', scopeKind: 'community' })).toBe('community_system');
  });

  it('matches existing efforts and never auto-publishes a handoff', () => {
    expect(mayAutoPublish(established)).toBe(false);
    const matched = matchExistingEfforts({
      candidate: established,
      efforts: [{ entityType: 'challenge', entityId: 'c1', title: 'Local Transit Access Challenge', path: '/contribute/challenges/c1' }],
    });
    expect(matched[0]?.title).toMatch(/Transit/i);
    const handoff = wellbeingHandoffFromPattern({ candidate: established });
    expect(handoff.autoPublish).toBe(false);
    expect(JSON.stringify(handoff)).not.toMatch(/member-|profile_id|privateNote/);
    storeWellbeingHandoff(handoff);
    expect(takeWellbeingHandoff()?.title).toMatch(/Time Life Balance/i);
    expect(takeWellbeingHandoff()).toBeNull();
  });

  it('gives Civi only safe aggregate context and cannot reconstruct suppression', () => {
    const overview = presentOverview({ scope: SCOPE, results: [suppressed], candidates: [] });
    const context = toCiviInsightContext({ overview, focus: suppressed });
    expect(context.scopeId).toBeNull();
    expect(context.goingWell).toEqual([]);
    expect(context.needsAttention).toEqual([]);
    expect(context.summary).toMatch(/privacy requirements/i);
    expect(civiMayReconstructSuppressed()).toBe(false);
    expect(JSON.stringify(context)).not.toMatch(/member-|check-in note|work joy/i);
  });
});

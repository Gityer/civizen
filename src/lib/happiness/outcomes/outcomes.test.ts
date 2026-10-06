// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { AggregateInsightResult, AggregateSuppressedResult } from '@/lib/happiness/aggregate/types';
import {
  civiMayClaimCausation,
  civiMustPreserveNegativeResults,
  civiSummaryIsHonest,
  compareHumanOutcomeEvidence,
  interpretationHasCausalClaim,
  matchSimilarLessons,
  toCiviOutcomeContext,
  toPublicLessonDraft,
} from '@/lib/happiness/outcomes';
import type { HumanOutcomeReview, PublicOutcomeLesson, SnapshotRecord } from '@/lib/happiness/outcomes/types';

function snap(partial: Partial<SnapshotRecord> & { domain?: 'time_life_balance'; periodStart: string; struggling?: boolean; suppressed?: boolean }): SnapshotRecord {
  const result: AggregateInsightResult | AggregateSuppressedResult = partial.suppressed
    ? {
        kind: 'suppressed',
        reason: 'cohort_too_small',
        privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
        aggregationModelVersion: 'wellbeing-aggregate-v1',
        summary: 'This insight is unavailable because the privacy requirements for this group are not currently met.',
      }
    : {
        kind: 'insight',
        scopeId: 'scope-1',
        topic: 'domain_state',
        domain: partial.domain ?? 'time_life_balance',
        timeBucket: 'quarter',
        periodStart: partial.periodStart,
        summary: partial.struggling === false
          ? 'Time & Life Balance concerns were less prominent among participating members in this qualifying group.'
          : 'Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.',
        sufficiency: 'sufficient',
        confidence: 'moderate',
        sourceTypes: ['structured_domain_state'],
        privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
        aggregationModelVersion: 'wellbeing-aggregate-v1',
        suppression: null,
        participation: 'sufficient',
        groupedDistribution: partial.struggling === false
          ? { flourishing: 'shown', thriving: 'shown' }
          : { struggling: 'shown', flourishing: 'grouped' },
      };
  return {
    id: partial.id ?? `snap-${partial.periodStart}`,
    periodStart: partial.periodStart,
    timeBucket: 'quarter',
    topic: 'domain_state',
    privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
    aggregationModelVersion: 'wellbeing-aggregate-v1',
    result,
  };
}

const review: HumanOutcomeReview = {
  id: 'rev-1',
  scopeId: 'scope-1',
  candidateId: 'cand-1',
  challengeId: 'ch-1',
  projectId: 'proj-1',
  governanceSolutionId: null,
  solutionRecordId: 'sol-1',
  createdBy: 'viewer-1',
  targetDomain: 'time_life_balance',
  targetFactor: 'transportation',
  objective: 'Reduce the recurring transportation-related Time & Life Balance concern.',
  interventionTitle: 'Evening Shuttle Pilot',
  operationalOutcome: 'Three new shuttle routes launched.',
  interpretation: null,
  uncertaintyNote: null,
  status: 'awaiting_evidence',
  evidenceStrength: 'observation',
  evidenceModelVersion: 'human-outcome-evidence-v1',
  comparisonModelVersion: 'human-outcome-compare-v1',
  interventionStartedAt: '2026-04-15T00:00:00.000Z',
  nextReviewWindow: 'quarter',
  overlappingInterventions: false,
  compositionCaveat: false,
  evaluationPlanned: false,
  researchReference: null,
  publishedPublic: false,
  closedAt: null,
  closedReason: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

describe('human outcome comparison', () => {
  it('classifies repeated improvement without claiming causality or a numeric Happiness change', () => {
    const comparison = compareHumanOutcomeEvidence({
      baseline: snap({ periodStart: '2026-01-01', struggling: true }),
      followups: [
        snap({ periodStart: '2026-04-01', struggling: false }),
        snap({ periodStart: '2026-07-01', struggling: false }),
      ],
    });
    expect(comparison.status).toBe('improvement_observed');
    expect(comparison.evidenceStrength).toBe('repeated_association');
    expect(comparison.causalityEstablished).toBe(false);
    expect(JSON.stringify(comparison)).not.toMatch(/\+|%|Happiness impact|caused/i);
  });

  it('keeps a null result when operational delivery is separate from human evidence', () => {
    const comparison = compareHumanOutcomeEvidence({
      baseline: snap({ periodStart: '2026-01-01', struggling: true }),
      followups: [snap({ periodStart: '2026-04-01', struggling: true })],
    });
    expect(comparison.status).toBe('no_clear_change');
    expect(comparison.direction).toBe('stable');
    expect(comparison.causalityEstablished).toBe(false);
  });

  it('treats a suppressed follow-up as insufficient evidence', () => {
    const comparison = compareHumanOutcomeEvidence({
      baseline: snap({ periodStart: '2026-01-01', struggling: true }),
      followups: [snap({ periodStart: '2026-04-01', suppressed: true })],
    });
    expect(comparison.status).toBe('insufficient_evidence');
    expect(comparison.warnings).toContain('followup_suppressed');
  });

  it('does not fabricate a baseline', () => {
    const comparison = compareHumanOutcomeEvidence({
      baseline: null,
      followups: [snap({ periodStart: '2026-04-01', struggling: false })],
    });
    expect(comparison.warnings).toContain('no_qualifying_baseline');
    expect(comparison.baselineSummary).toBeNull();
  });

  it('flags incompatible slices and overlapping interventions', () => {
    const other: SnapshotRecord = {
      ...snap({ periodStart: '2026-04-01', struggling: false }),
      result: {
        ...(snap({ periodStart: '2026-04-01', struggling: false }).result as AggregateInsightResult),
        domain: 'work_fulfillment',
      },
    };
    const comparison = compareHumanOutcomeEvidence({
      baseline: snap({ periodStart: '2026-01-01', struggling: true }),
      followups: [other],
      overlappingInterventions: true,
    });
    expect(comparison.direction).toBe('not_comparable');
    expect(comparison.warnings).toContain('scope_or_domain_mismatch');
    expect(comparison.warnings).toContain('overlapping_interventions');
  });

  it('rejects causal interpretation wording', () => {
    expect(interpretationHasCausalClaim('The transit pilot improved Happiness.')).toBe(true);
    expect(interpretationHasCausalClaim('Concerns were less prominent later. Causation is not established.')).toBe(false);
  });
});

describe('Civi outcome guardrails', () => {
  it('does not claim the Project made people happier and preserves a null result', () => {
    const comparison = compareHumanOutcomeEvidence({
      baseline: snap({ periodStart: '2026-01-01', struggling: true }),
      followups: [snap({ periodStart: '2026-04-01', struggling: true })],
    });
    const context = toCiviOutcomeContext({ review, comparison });
    expect(civiMayClaimCausation()).toBe(false);
    expect(civiMustPreserveNegativeResults()).toBe(true);
    expect(civiSummaryIsHonest(context, comparison.status)).toBe(true);
    expect(context.summary).toMatch(/No clear change/i);
    expect(context.summary).not.toMatch(/made people happier|improved Happiness/i);
    expect(context.operationalOutcome).toMatch(/shuttle/i);
  });

  it('throws if private member material is introduced', () => {
    const comparison = compareHumanOutcomeEvidence({
      baseline: snap({ periodStart: '2026-01-01' }),
      followups: [snap({ periodStart: '2026-04-01', struggling: false })],
    });
    expect(() =>
      toCiviOutcomeContext({
        review: { ...review, uncertaintyNote: 'member-12 privateNote work joy' },
        comparison,
      }),
    ).toThrow(/private records or causal claims/i);
  });
});

describe('similar lessons', () => {
  it('surfaces both improvement and null results for a similar transportation issue', () => {
    const lessons: PublicOutcomeLesson[] = [
      {
        id: 'l1',
        reviewId: 'r2',
        solutionRecordId: 's2',
        domain: 'time_life_balance',
        factorCategory: 'transportation',
        interventionCategory: 'shuttle',
        title: 'Evening Shuttle Pilot',
        problem: 'Commute-related Time Balance',
        intervention: 'Evening shuttle',
        operationalOutcome: 'Routes launched.',
        humanOutcome: 'Repeated improvement observed.',
        evidenceStrength: 'repeated_association',
        status: 'improvement_observed',
        limitations: 'Causality is not established.',
        replicationNotes: null,
      },
      {
        id: 'l2',
        reviewId: 'r3',
        solutionRecordId: 's3',
        domain: 'time_life_balance',
        factorCategory: 'transportation',
        interventionCategory: 'shuttle',
        title: 'Weekend Shuttle Trial',
        problem: 'Commute-related Time Balance',
        intervention: 'Weekend shuttle',
        operationalOutcome: 'Routes launched.',
        humanOutcome: 'No clear change.',
        evidenceStrength: 'early_association',
        status: 'no_clear_change',
        limitations: 'Causality is not established.',
        replicationNotes: null,
      },
    ];
    const matched = matchSimilarLessons({ domain: 'time_life_balance', factor: 'transportation', lessons, excludeReviewId: 'rev-1' });
    expect(matched.map((row) => row.status)).toEqual(expect.arrayContaining(['improvement_observed', 'no_clear_change']));
    const draft = toPublicLessonDraft(review, compareHumanOutcomeEvidence({
      baseline: snap({ periodStart: '2026-01-01' }),
      followups: [snap({ periodStart: '2026-04-01' })],
    }));
    expect(draft.humanOutcome).toMatch(/No clear change/i);
    expect(draft.limitations).toMatch(/does not establish causation/i);
    expect(draft).not.toHaveProperty('snapshotId');
    expect(JSON.stringify(draft)).not.toMatch(/memberKey|groupedDistribution|fingerprint/i);
  });
});

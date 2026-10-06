// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { applyLiveEvaluatorWeights } from '@/lib/civizen-contribution-evaluator-live';
import {
  mergeEvidenceIntoEvents,
  type ContributionEvidenceRecord,
} from '@/lib/civizen-contribution-evidence';
import { summarizeContributionEvidenceConfidence } from '@/lib/civizen-contribution-confidence';
import { explainScoreChange } from '@/lib/civizen-contribution-explain';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import { scoreContributionsFromEvents, type ContributionEvent } from '@/lib/civizen-contributions';
import { contributorFunctionFromRoles } from '@/lib/civizen-contributor-function';
import { buildCivizenContext } from '@/lib/civizen-context-model';
import {
  contributionEventsFromDevelopmentStories,
  planDevelopmentOutcomeStories,
} from '@/lib/civizen-development-capture';
import { recoverUnlinkedSurvivingOutcomes } from '@/lib/civizen-historical-reconstruction-recall';
import { SCORE_CALCULATION_VERSION } from '@/lib/civizen-score-model';
import { assessContributionImpact } from '@/lib/civizen-contribution-impact';
import { deriveEvaluatorReputation } from '@/lib/civizen-evaluator-reputation';

function event(overrides: Partial<ContributionEvent> = {}): ContributionEvent {
  return {
    profileId: 'p1',
    sourceTable: 'development_stories',
    sourceId: overrides.sourceId ?? 'root-1',
    eventType: overrides.eventType ?? 'development_story',
    title: overrides.title ?? 'Score V2 evidence architecture',
    summary: null,
    capacityEstimate: 78,
    impactEstimate: 78,
    collaborationEstimate: 35,
    beneficiaryEstimate: 75,
    verified: overrides.verified ?? true,
    occurredAt: overrides.occurredAt ?? '2026-08-04T12:00:00.000Z',
    rawMeta: overrides.rawMeta ?? { eligibility: 'system_verified', testsPassed: true },
  };
}

function evidence(overrides: Partial<ContributionEvidenceRecord> & Pick<ContributionEvidenceRecord, 'id' | 'kind'>): ContributionEvidenceRecord {
  return {
    contributionSourceTable: 'development_stories',
    contributionSourceId: 'root-1',
    evaluatorProfileId: 'eval-1',
    evaluatorRole: 'peer',
    ratings: { quality: 70 },
    reason: 'documented review',
    relationshipContext: null,
    affected: false,
    conflictType: null,
    conflictDisclosed: false,
    payload: {},
    validationStatus: null,
    reweightReason: null,
    occurredAt: '2026-08-13T12:00:00.000Z',
    ...overrides,
  };
}

describe('operational contribution lifecycle', () => {
  it('A: system-verified contribution with no feedback still evaluates immediately', () => {
    const view = evaluateContributionLifecycle(event());
    expect(view.stage).toBe('verified_evaluation');
    expect(view.verificationKind).toBe('system_verified');
    expect(view.realizedImpact).toBe('unknown');
    expect(scoreContributionsFromEvents([event()])?.score).not.toBeNull();
  });

  it('B: affected-user positive feedback updates impact evidence', () => {
    const [updated] = mergeEvidenceIntoEvents([event()], [evidence({
      id: 'fb-1',
      kind: 'beneficiary_feedback',
      evaluatorRole: 'affected_user',
      affected: true,
      ratings: { realized_effect: 82, usefulness: 80 },
      reason: 'This resolved the access problem for our clinic.',
    })]);
    const view = evaluateContributionLifecycle(updated!);
    expect(view.realizedImpact).not.toBe('unknown');
    expect(Number(view.realizedImpact)).toBeGreaterThan(0);
  });

  it('C: general popularity feedback cannot create realized impact by itself', () => {
    const [updated] = mergeEvidenceIntoEvents([event()], [evidence({
      id: 'like-1',
      kind: 'observer_feedback',
      evaluatorRole: 'general_observer',
      ratings: { usefulness: 99 },
      reason: null,
      affected: false,
    })]);
    const view = evaluateContributionLifecycle(updated!);
    expect(view.realizedImpact).toBe('unknown');
  });

  it('D: national verified reach is broader than local when depth is comparable', () => {
    const local = assessContributionImpact({
      realizedReach: 'local', depth: 'substantial', outcomeMetric: 80, affectedPopulation: 40,
    });
    const national = assessContributionImpact({
      realizedReach: 'national', depth: 'substantial', outcomeMetric: 80, affectedPopulation: 4_000_000,
    });
    expect(national.realizedImpact!).toBeGreaterThan(local.realizedImpact!);
  });

  it('E: global claimed scope without adoption remains potential', () => {
    const claimed = assessContributionImpact({ claimedScope: 'global', breadth: 'global' });
    expect(claimed.realizedImpact).toBeNull();
    expect(claimed.claimedScope).toBe('global');
    expect(claimed.realizedReach).toBe('unknown');
  });

  it('F: later negative verified outcomes decrease realized impact', () => {
    const positive = evaluateContributionLifecycle(event({
      rawMeta: { eligibility: 'system_verified', impactEvidence: { realizedReach: 'community', depth: 'substantial', outcomeMetric: 80, affectedPopulation: 2000 } },
    }));
    const reversed = evaluateContributionLifecycle(event({
      rawMeta: { eligibility: 'system_verified', impactEvidence: { realizedReach: 'community', depth: 'modest', outcomeMetric: 22, affectedPopulation: 2000, reversal: true } },
    }));
    expect(Number(reversed.realizedImpact)).toBeLessThan(Number(positive.realizedImpact));
  });

  it('G: one hostile rater has a bounded effect', () => {
    const base = Array.from({ length: 12 }, (_, i) => event({ sourceId: `r-${i}` }));
    const hostile = evidence({
      id: 'h1',
      kind: 'observer_feedback',
      contributionSourceId: 'r-0',
      evaluatorProfileId: 'hostile',
      ratings: { quality: 1 },
      reason: 'unsupported attack',
    });
    const after = applyLiveEvaluatorWeights(mergeEvidenceIntoEvents(base, [hostile]), [hostile]);
    const beforeScore = scoreContributionsFromEvents(base)!;
    const afterScore = scoreContributionsFromEvents(after)!;
    expect(Math.abs(afterScore.score! - beforeScore.score!)).toBeLessThan(8);
  });

  it('H: many independent affected-user reports have a meaningful effect', () => {
    const records = Array.from({ length: 8 }, (_, i) => evidence({
      id: `b${i}`,
      kind: 'beneficiary_feedback',
      evaluatorProfileId: `user-${i}`,
      evaluatorRole: 'affected_user',
      affected: true,
      ratings: { realized_effect: 84 },
      reason: 'Sustained benefit in daily use.',
    }));
    const [updated] = mergeEvidenceIntoEvents([event()], records);
    expect(evaluateContributionLifecycle(updated!).realizedImpact).not.toBe('unknown');
  });

  it('I: fair minority/dissenting evaluator is not penalized for disagreement', () => {
    const ratings = [
      evidence({ id: 'a', evaluatorProfileId: 'maj-a', kind: 'observer_feedback', ratings: { quality: 80 }, reason: 'ok' }),
      evidence({ id: 'b', evaluatorProfileId: 'maj-b', kind: 'observer_feedback', contributionSourceId: 'root-1', ratings: { quality: 82 }, reason: 'ok' }),
      evidence({ id: 'c', evaluatorProfileId: 'dissent', kind: 'observer_feedback', ratings: { quality: 48 }, reason: 'documented disagreement' }),
    ].flatMap((item) => {
      const immutable = {
        id: item.id,
        raterId: item.evaluatorProfileId,
        subjectRootId: 'development_stories:root-1',
        value: Object.values(item.ratings)[0] ?? 0,
        occurredAt: item.occurredAt,
        role: 'peer' as const,
        evidenceSupplied: true,
        affected: false,
        originalWeight: 1,
      };
      return [immutable];
    });
    const dissent = deriveEvaluatorReputation('dissent', ratings);
    expect(dissent.dissentPenalized).toBe(false);
    expect(dissent.fairness).toBeGreaterThan(60);
  });

  it('J: collusion evidence decreases evaluator reliability and recomputes weights', () => {
    const records: ContributionEvidenceRecord[] = [];
    for (let i = 0; i < 6; i += 1) {
      records.push(evidence({ id: `a${i}`, kind: 'observer_feedback', contributionSourceId: `s${i}`, evaluatorProfileId: 'collude-a', ratings: { quality: 97 }, reason: 'lockstep' }));
      records.push(evidence({ id: `b${i}`, kind: 'observer_feedback', contributionSourceId: `s${i}`, evaluatorProfileId: 'collude-b', ratings: { quality: 96 }, reason: 'lockstep' }));
    }
    const events = Array.from({ length: 6 }, (_, i) => event({ sourceId: `s${i}` }));
    const weighted = applyLiveEvaluatorWeights(mergeEvidenceIntoEvents(events, records), records);
    expect((weighted[0]?.rawMeta.evaluatorReliability as number) < 1).toBe(true);
    expect(weighted[0]?.rawMeta.evaluatorReweightReason).toBeTruthy();
  });

  it('K: independent validator stays on the same root and raises validation confidence', () => {
    const [updated] = mergeEvidenceIntoEvents([event()], [evidence({
      id: 'v1',
      kind: 'independent_validation',
      evaluatorRole: 'institutional_evaluator',
      validationStatus: 'accepted',
      ratings: { quality: 74 },
      reason: 'Institutional review of the surviving implementation.',
    })]);
    const view = evaluateContributionLifecycle(updated!);
    expect(updated?.sourceId).toBe('root-1');
    expect(view.verificationKind).toBe('independently_validated');
    expect(view.evidenceConfidence).toBe('high');
  });

  it('L: contribution history preserves previous lifecycle states', () => {
    const [updated] = mergeEvidenceIntoEvents([event()], [evidence({
      id: 'imp-1',
      kind: 'impact_outcome',
      payload: { realizedReach: 'community', depth: 'meaningful', outcomeMetric: 70, affectedPopulation: 800 },
      ratings: {},
    })]);
    const view = evaluateContributionLifecycle(updated!);
    expect(view.evidenceEvents.some((item) => item.kind === 'initial_evaluation')).toBe(true);
    expect(view.evidenceEvents.some((item) => item.kind === 'verification' || item.kind === 'independent_validation')).toBe(true);
    expect(view.evidenceEvents.some((item) => item.kind === 'realized_outcome')).toBe(true);
  });

  it('M: score history records cause and model version', () => {
    const explanation = explainScoreChange({
      previousScore: 76.7,
      newScore: 74.1,
      previousConfidence: 'low',
      newConfidence: 'low',
      cause: 'adverse_outcome',
    });
    expect(explanation.title).toMatch(/decreased/i);
    expect(SCORE_CALCULATION_VERSION).toBe('civizen-score-v2.0');
  });

  it('N: declared interests do not change score', () => {
    const events = [event()];
    const before = scoreContributionsFromEvents(events)!;
    const context = buildCivizenContext({ events, declared: { interests: ['Education'], contributionInterests: ['Health'] } });
    expect(context.scoringBonusApplied).toBe(false);
    expect(scoreContributionsFromEvents(events)!.score).toBe(before.score);
  });

  it('O: context correction updates declared context without changing score', () => {
    const events = [event()];
    const before = scoreContributionsFromEvents(events)!;
    const corrected = buildCivizenContext({
      events,
      declared: { interests: ['Governance'], goals: ['Improve verification'], contributionInterests: [] },
    });
    expect(corrected.declared.interests).toEqual(['Governance']);
    expect(scoreContributionsFromEvents(events)!.score).toBe(before.score);
  });

  it('P: historical recall recovery persists a missed outcome without prompt-count inflation', () => {
    const recovered = recoverUnlinkedSurvivingOutcomes({
      stories: [{
        id: 'chat-missed',
        originalInstruction: 'Define Score V2 evidence-maturity architecture so activity evaluation stays distinct from accumulated reputation.',
        title: 'Score evidence architecture',
        testsPassed: true,
      }],
      outcomes: [],
      survivingPaths: [
        'src/lib/civizen-score.ts',
        'src/lib/civizen-score-model.ts',
        'src/lib/civizen-score-maturity.ts',
        'src/lib/civizen-contribution-score.ts',
      ],
    });
    expect(recovered).toHaveLength(1);
    expect(recovered[0]?.result).toBe('reconstructed_with_uncertainty');
  });

  it('Q: live development outcome enters the contribution ledger and recomputes profile', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'lifecycle-ops',
      title: 'Operational contribution lifecycle',
      instruction: 'Define a new architecture that separates activity evaluation from accumulated reputation.',
      createdFeatures: ['Live contribution evidence workflow'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/lib/civizen-contribution-evidence.ts'],
      roles: ['founder', 'system_architect', 'requirements', 'review'],
      implementationAssisted: true,
    });
    const events = contributionEventsFromDevelopmentStories('p1', planned.stories);
    expect(events).toHaveLength(1);
    expect(events[0]?.verified).toBe(true);
    expect(scoreContributionsFromEvents(events)?.score).not.toBeNull();
    expect(contributorFunctionFromRoles(['founder', 'system_architect', 'review'], { implementationAssisted: true })).toBe('system_architecture');
  });

  it('does not classify assisted architecture work as Implementation because files changed', () => {
    const view = evaluateContributionLifecycle(event({
      rawMeta: {
        eligibility: 'system_verified',
        testsPassed: true,
        affectedPaths: ['src/pages/Home.tsx', 'src/components/layout/AppLayout.tsx'],
        contributionRoles: ['system_architect', 'requirements', 'review'],
        implementationAssisted: true,
        contributionFunction: 'implementation',
      },
    }));
    expect(view.contributionFunction).toBe('system_architecture');
    expect(view.artifactFunction).toBe('implementation');
    expect(view.roles).toContain('system_architect');
  });

  it('keeps overall evidence confidence Low despite many system-verified roots', () => {
    const events = Array.from({ length: 86 }, (_, i) => event({ sourceId: `root-${i}` }));
    const confidence = summarizeContributionEvidenceConfidence(events);
    expect(confidence.overall).toBe('low');
    expect(confidence.factors.find((item) => item.id === 'verified_quantity')?.level).toBe('high');
    expect(confidence.factors.find((item) => item.id === 'independent_validators')?.level).toBe('none');
  });
});

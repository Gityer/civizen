// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  SCORE_CALCULATION_VERSION,
  SCORE_MODEL_VERSION_UNVERSIONED,
  buildScoreFromProfileActivity,
  calculateCivizenScoreModel,
  computeWeightedOverall,
  resolveScoreModelVersion,
} from '@/lib/civizen-score';
import {
  blendActivityEvaluation,
  computeConfidence,
  computeCoverage,
  observationWeight,
  reputationFromObservations,
  shrinkReputation,
  type CategoryObservation,
} from '@/lib/civizen-score-model';
import { scoreContributionsFromEvents } from '@/lib/civizen-contributions';
import { deriveSystemRating, scorePerformanceFromEvents } from '@/lib/civizen-performance';
import { scoreCoverageCaption, scoreEvidenceEstimateCaption, scorePublicSubtitle } from '@/lib/civizen-score-caption';

import { daysAgo, opportunityEvent } from '@/lib/civizen-score-v2-fixtures';

describe('Civizen Score V2 architecture', () => {
  it('1. zero activities stay unknown, not fake zeros or a prior of 50', () => {
    expect(shrinkReputation([])).toBeNull();
    expect(scoreContributionsFromEvents([])).toBeNull();
    expect(scorePerformanceFromEvents([])).toBeNull();
    const result = calculateCivizenScoreModel({ userId: 'empty' });
    expect(result.overall.score).toBeNull();
    expect(result.overall.provisionalEstimate).toBeNull();
    expect(result.overall.confidence).toBe('insufficient');
    expect(result.overall.status).toBe('not_established');
    expect(result.categories.every((category) => category.score === null)).toBe(true);
    expect(result.tier.finalTier).toBe('explorer');
    expect(result.validation.verifiedEvidenceCount).toBe(0);
  });

  it('2. one excellent small contribution keeps activity ratings and shrinks reputation', () => {
    const event = opportunityEvent({
      sourceId: 'part-1',
      quality: 80,
      impact: 70,
      collaboration: 40,
      durationMinutes: 15,
    });
    expect(event.capacityEstimate).toBe(80);
    expect(event.impactEstimate).toBe(70);
    expect(deriveSystemRating(event)).toBe(
      Math.round((blendActivityEvaluation({ quality: 80, impact: 70, collaboration: 40 }) ?? 0) * 10) / 10,
    );

    const contributions = scoreContributionsFromEvents([event]);
    const performance = scorePerformanceFromEvents([event]);
    expect(contributions).not.toBeNull();
    expect(performance).not.toBeNull();
    expect(contributions!.metrics?.find((metric) => metric.id === 'impact')?.value).toBe(70);
    expect(contributions!.independentEvidenceCount).toBe(1);
    expect(contributions!.verifiedSourceCount).toBe(1);
    expect(contributions!.score!).toBeGreaterThan(48);
    expect(contributions!.score!).toBeLessThan(62);
    expect(contributions!.score!).toBeLessThan(event.impactEstimate);
    expect(performance!.score!).toBeLessThan(deriveSystemRating(event));
    expect(contributions!.confidence).toBe('low');

    const result = buildScoreFromProfileActivity({
      contributions,
      performance,
    });
    expect(result.overall.calculationVersion).toBe(SCORE_CALCULATION_VERSION);
    expect(result.overall.confidence).toMatch(/insufficient|low/);
    expect(result.validation.verifiedEvidenceCount).toBe(1);
    expect(result.independentEvidenceCount).toBe(1);
    expect(result.coverage?.limited).toBe(true);
    expect(result.overall.status).toBe('provisional');
    expect(result.overall.score).toBeNull();
    expect(result.overall.provisionalEstimate).not.toBeNull();
    expect(result.overall.provisionalEstimate!).toBeGreaterThan(48);
    expect(result.overall.provisionalEstimate!).toBeLessThan(62);
    expect(result.tier.finalTier).toBe('explorer');
    expect(result.tier.readiness?.emphasizePointsToNext).toBe(false);
  });

  it('3. one poor contribution has bounded effect and does not crater reputation', () => {
    const event = opportunityEvent({
      sourceId: 'poor-1',
      quality: 20,
      impact: 15,
      collaboration: 10,
    });
    const contributions = scoreContributionsFromEvents([event]);
    expect(event.impactEstimate).toBe(15);
    expect(contributions!.score!).toBeGreaterThan(35);
    expect(contributions!.score!).toBeLessThan(50);
    expect(contributions!.confidence).toBe('low');
  });

  it('4. repeated independent good activities reduce shrinkage toward observed quality', () => {
    const make = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        opportunityEvent({
          sourceId: `p-${index}`,
          quality: 80,
          impact: 72,
          occurredAt: daysAgo(index * 10),
          evaluatorIds: [`eval-${index % 3}`],
        }),
      );
    const one = scoreContributionsFromEvents(make(1))!.score!;
    const three = scoreContributionsFromEvents(make(3))!.score!;
    const ten = scoreContributionsFromEvents(make(10))!.score!;
    expect(three).toBeGreaterThan(one);
    expect(ten).toBeGreaterThan(three);
    expect(ten).toBeGreaterThan(62);
    expect(scoreContributionsFromEvents(make(3))!.effectiveEvidenceVolume).toBeGreaterThan(
      scoreContributionsFromEvents(make(1))!.effectiveEvidenceVolume!,
    );
  });

  it('5. diverse independent evidence creates more maturity than duplicated projections', () => {
    const independent = Array.from({ length: 4 }, (_, index) =>
      opportunityEvent({
        sourceId: `ind-${index}`,
        quality: 78,
        impact: 70,
        occurredAt: daysAgo(index * 12),
      }),
    );
    const duplicated = [
      opportunityEvent({ sourceId: 'same', quality: 78, impact: 70 }),
      opportunityEvent({ sourceId: 'same', quality: 78, impact: 70 }),
      opportunityEvent({ sourceId: 'same', quality: 78, impact: 70 }),
      opportunityEvent({ sourceId: 'same', quality: 78, impact: 70 }),
    ];
    const independentScored = scoreContributionsFromEvents(independent)!;
    const duplicatedScored = scoreContributionsFromEvents(duplicated)!;
    expect(independentScored.independentEvidenceCount).toBe(4);
    expect(duplicatedScored.independentEvidenceCount).toBe(1);
    expect(independentScored.effectiveEvidenceVolume!).toBeGreaterThan(
      duplicatedScored.effectiveEvidenceVolume!,
    );
  });

  it('6. multiple evaluations of the same activity stay one evidence root', () => {
    const event = opportunityEvent({
      sourceId: 'part-9',
      quality: 80,
      impact: 70,
      evaluationCount: 3,
      evaluatorIds: ['a', 'b', 'c'],
    });
    const scored = scoreContributionsFromEvents([event])!;
    expect(scored.independentEvidenceCount).toBe(1);
    expect(scored.verifiedSourceCount).toBe(1);
    expect(scored.evidenceRootRefs?.[0]?.evaluationCount).toBe(3);
  });

  it('7. missing categories stay unknown and coverage stays limited', () => {
    const contributions = scoreContributionsFromEvents([
      opportunityEvent({ sourceId: 'only', quality: 80, impact: 70 }),
    ]);
    const result = buildScoreFromProfileActivity({ contributions });
    const learning = result.categories.find((category) => category.id === 'learning')!;
    expect(learning.score).toBeNull();
    expect(result.coverage?.missingCategoryIds).toEqual(
      expect.arrayContaining(['learning', 'skills', 'experience', 'performance']),
    );
    expect(result.coverage?.limited).toBe(true);
    expect(result.overall.status).toBe('provisional');
    expect(result.explanation.excludedCategories.length).toBeGreaterThan(0);
  });

  it('high scores in one or two categories are not a mature Civizen Score', () => {
    const result = calculateCivizenScoreModel({
      userId: 'sparse-high',
      categories: {
        contributions: {
          score: 85,
          sourceCount: 2,
          verifiedSourceCount: 2,
          confidence: 'low',
        },
        performance: {
          score: 90,
          sourceCount: 2,
          verifiedSourceCount: 2,
          confidence: 'low',
        },
      },
      validation: { evidenceCount: 2, verifiedEvidenceCount: 2 },
    });
    const estimate = computeWeightedOverall({
      learning: null,
      experience: null,
      skills: null,
      performance: 90,
      contributions: 85,
    });
    expect(result.coverage?.limited).toBe(true);
    expect(result.coverage?.scoredCount).toBe(2);
    expect(result.overall.status).toBe('provisional');
    expect(result.overall.score).toBeNull();
    expect(result.overall.provisionalEstimate).toBe(estimate.overall);
    expect(result.overall.provisionalEstimate).toBeGreaterThan(80);
    expect(result.tier.finalTier).toBe('explorer');
    expect(result.tier.readiness?.emphasizePointsToNext).toBe(false);
    const t = (key: string, vars?: Record<string, string | number>) => {
      const labels: Record<string, string> = {
        'score.notEstablishedYet': 'Not established yet',
        'score.currentEvidenceEstimate': 'Current evidence estimate: {score}',
        'score.coverageSummary': '{confidence} confidence · {scored} of {total} areas covered',
        'score.confidence.low': 'Low',
      };
      return (labels[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''));
    };
    const subtitle = scorePublicSubtitle(result, t);
    expect(subtitle).toContain('Current evidence estimate:');
    expect(subtitle).not.toMatch(/^\d/);
    expect(scoreEvidenceEstimateCaption(result, t)).toMatch(/Current evidence estimate: 8/);
    expect(scoreCoverageCaption(result, t)).toContain('2 of 5');
  });

  it('duplicate projections of one root match a single representation; extra evaluators stay one activity', () => {
    const now = daysAgo(1);
    const once = reputationFromObservations([
      {
        evidenceRootId: 'opportunity_participations:same',
        value: 70,
        verified: true,
        occurredAt: now,
        evaluatorIds: ['org-1'],
        evaluationCount: 1,
        durationMinutes: 15,
      },
    ]);
    const duplicated = reputationFromObservations([
      {
        evidenceRootId: 'opportunity_participations:same',
        value: 70,
        verified: true,
        occurredAt: now,
        evaluatorIds: ['org-1'],
        evaluationCount: 1,
        durationMinutes: 15,
      },
      {
        evidenceRootId: 'opportunity_participations:same',
        value: 70,
        verified: true,
        occurredAt: now,
        evaluatorIds: ['org-1'],
        evaluationCount: 1,
        durationMinutes: 15,
      },
    ]);
    const multiEvaluator = reputationFromObservations([
      {
        evidenceRootId: 'opportunity_participations:same',
        value: 70,
        verified: true,
        occurredAt: now,
        evaluatorIds: ['org-1', 'peer-2', 'peer-3'],
        evaluationCount: 3,
        durationMinutes: 15,
      },
    ]);
    expect(once.independentEvidenceCount).toBe(1);
    expect(duplicated.independentEvidenceCount).toBe(1);
    expect(multiEvaluator.independentEvidenceCount).toBe(1);
    expect(duplicated.score).toBe(once.score);
    expect(duplicated.effectiveEvidenceVolume).toBe(once.effectiveEvidenceVolume);
    expect(duplicated.evaluationCount).toBe(once.evaluationCount);
    expect(multiEvaluator.evaluationCount).toBe(3);
    expect(multiEvaluator.effectiveEvidenceVolume).toBeGreaterThan(once.effectiveEvidenceVolume);
    expect(multiEvaluator.effectiveEvidenceVolume).toBeLessThan(once.effectiveEvidenceVolume * 2);
  });
});

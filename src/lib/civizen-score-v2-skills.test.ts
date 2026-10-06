// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  SCORE_CALCULATION_VERSION,
  SCORE_MODEL_VERSION_UNVERSIONED,
  buildScoreFromProfileActivity,
  resolveScoreModelVersion,
} from '@/lib/civizen-score';
import {
  blendActivityEvaluation,
  computeConfidence,
  computeCoverage,
  mergeCanonicalSkills,
  observationWeight,
  projectSupportForExperience,
  reputationFromObservations,
  uniqueProjectRoots,
  type CategoryObservation,
} from '@/lib/civizen-score-model';
import { estimateContributionEvent, scoreContributionsFromEvents } from '@/lib/civizen-contributions';
import { deriveSystemRating, scorePerformanceFromEvents } from '@/lib/civizen-performance';
import { determineFinalTier } from '@/lib/civizen-score-tiers';
import { daysAgo, opportunityEvent } from '@/lib/civizen-score-v2-fixtures';

describe('Civizen Score V2 skills, experience, and gates', () => {
  it('8. demonstrated skills do not double-count matching declared skills', () => {
    const skills = mergeCanonicalSkills({
      declaredNames: ['Research'],
      demonstrated: [
        {
          skillName: 'Research',
          evidenceRootId: 'opportunity_participations:p1',
          verified: true,
          demonstratedAt: daysAgo(3),
        },
        {
          skillName: 'research',
          evidenceRootId: 'opportunity_participations:p1',
          verified: true,
          demonstratedAt: daysAgo(3),
        },
        {
          skillName: 'Research',
          evidenceRootId: 'opportunity_participations:p2',
          verified: true,
          demonstratedAt: daysAgo(10),
        },
      ],
    });
    expect(skills).toHaveLength(1);
    expect(skills[0]?.declared).toBe(true);
    expect(skills[0]?.demonstrated).toBe(true);
    expect(skills[0]?.verifiedDemonstrations).toBe(2);

    const byStableId = mergeCanonicalSkills({
      declaredNames: [],
      demonstrated: [
        {
          skillName: 'Research',
          skillId: 'skill.research',
          evidenceRootId: 'opportunity_participations:p1',
          verified: true,
        },
        {
          skillName: 'Research Methods',
          skillId: 'skill.research',
          evidenceRootId: 'opportunity_participations:p2',
          verified: true,
        },
      ],
    });
    expect(byStableId).toHaveLength(1);
    expect(byStableId[0]?.id).toBe('skill.research');

    const declaredOnly = buildScoreFromProfileActivity({
      declaredSkillNames: ['Research'],
    });
    const demonstratedOnly = buildScoreFromProfileActivity({
      demonstratedSkills: [
        { skillName: 'Facilitation', participationId: 'p1', verified: true, demonstratedAt: daysAgo(2) },
      ],
    });
    const both = buildScoreFromProfileActivity({
      declaredSkillNames: ['Research'],
      demonstratedSkills: [
        { skillName: 'Research', participationId: 'p1', verified: true, demonstratedAt: daysAgo(2) },
        { skillName: 'Research', participationId: 'p1', verified: true, demonstratedAt: daysAgo(2) },
      ],
    });
    expect(declaredOnly.categories.find((c) => c.id === 'skills')!.verifiedSourceCount).toBe(0);
    expect(demonstratedOnly.categories.find((c) => c.id === 'skills')!.verifiedSourceCount).toBe(1);
    const bothSkills = both.categories.find((c) => c.id === 'skills')!;
    expect(bothSkills.verifiedSourceCount).toBe(1);
    expect(bothSkills.metrics.find((m) => m.id === 'verified')?.sourceCount).toBe(1);
    expect(both.nextSteps.some((step) => /demonstrate this skill/i.test(step.label))).toBe(false);
  });

  it('9. project evidence supports Experience without manufacturing tenure', () => {
    const durationOnly = buildScoreFromProfileActivity({
      experienceCount: 1,
      experienceMonths: 24,
    });
    const withProjects = buildScoreFromProfileActivity({
      experienceCount: 1,
      experienceMonths: 24,
      demonstratedProjects: [
        { participationId: 'p1', opportunityId: 'o1' },
        { participationId: 'p1', opportunityId: 'o1' },
        { participationId: 'p2', opportunityId: 'o2' },
      ],
    });
    const durationScore = durationOnly.categories.find((c) => c.id === 'experience')!.score!;
    const supported = withProjects.categories.find((c) => c.id === 'experience')!;
    expect(supported.metrics.find((m) => m.id === 'projects')?.sourceCount).toBe(2);
    expect(supported.score!).toBeGreaterThan(durationScore);
    expect(supported.score! - durationScore).toBeLessThanOrEqual(12);
    expect(uniqueProjectRoots([{ opportunityId: 'o1' }, { opportunityId: 'o1' }])).toHaveLength(1);
  });

  it('project support is shrunk evidence, not manufactured tenure', () => {
    const tiny = {
      participationId: 'tiny-1',
      durationMinutes: 15,
      quality: 80,
      impact: 70,
      verified: true,
    };
    const severalTinyProjects = Array.from({ length: 8 }, (_, index) => ({
      participationId: `tiny-${index}`,
      durationMinutes: 15,
      quality: 80,
      impact: 70,
      verified: true as const,
    }));
    const severalSubstantiveProjects = Array.from({ length: 4 }, (_, index) => ({
      participationId: `long-${index}`,
      durationMinutes: 8 * 60,
      quality: 80,
      impact: 70,
      verified: true as const,
    }));
    const oneTiny = projectSupportForExperience([tiny]);
    const severalTiny = projectSupportForExperience(severalTinyProjects);
    const severalSubstantive = projectSupportForExperience(severalSubstantiveProjects);
    const oneTinyCategory = buildScoreFromProfileActivity({ demonstratedProjects: [tiny] });
    const longHistory = buildScoreFromProfileActivity({
      experienceCount: 2,
      experienceMonths: 120,
    });
    const longPlusProjects = buildScoreFromProfileActivity({
      experienceCount: 2,
      experienceMonths: 120,
      demonstratedProjects: severalSubstantiveProjects.slice(0, 2),
    });
    const longScore = longHistory.categories.find((c) => c.id === 'experience')!.score!;
    const longPlusScore = longPlusProjects.categories.find((c) => c.id === 'experience')!.score!;

    expect(oneTinyCategory.categories.find((c) => c.id === 'experience')!.score).toBeNull();
    expect(oneTiny.support).toBeGreaterThan(0);
    expect(oneTiny.support).toBeLessThan(8);
    expect(severalTiny.support).toBeGreaterThan(oneTiny.support);
    expect(severalTiny.support).toBeLessThan(oneTiny.support * 8);
    expect(severalTiny.support).toBeLessThanOrEqual(12);
    expect(severalSubstantive.support).toBeGreaterThan(severalTiny.support);
    expect(severalSubstantive.support).toBeLessThanOrEqual(12);
    expect(longScore).toBeGreaterThan(severalSubstantive.support);
    expect(longPlusScore).toBeGreaterThan(longScore);
    expect(longPlusScore - longScore).toBeLessThanOrEqual(12);
    expect(longScore).toBeGreaterThan(longPlusScore - longScore);
  });

  it('10. tier gating requires score, evidence, coverage, history, and confidence', () => {
    const highScoreSparse = determineFinalTier({
      overallScore: 62,
      performanceScore: 58,
      contributionsScore: 61,
      confidence: 'low',
      hasVerifiedActivity: true,
      hasSustainedActivity: false,
      hasSubstantialImpact: false,
      hasUnresolvedSeriousIntegrityIssue: false,
      independentVerifiedEvidenceCount: 1,
      scoredCategoryCount: 2,
    });
    expect(highScoreSparse.finalTier).toBe('explorer');

    const enoughEvidenceLowScore = determineFinalTier({
      overallScore: 28,
      performanceScore: 40,
      contributionsScore: 40,
      confidence: 'moderate',
      hasVerifiedActivity: true,
      hasSustainedActivity: true,
      hasSubstantialImpact: false,
      hasUnresolvedSeriousIntegrityIssue: false,
      independentVerifiedEvidenceCount: 8,
      scoredCategoryCount: 3,
      hasRecurrence: true,
      timeSpanDays: 40,
    });
    expect(enoughEvidenceLowScore.finalTier).toBe('explorer');

    const ready = determineFinalTier({
      overallScore: 62,
      performanceScore: 55,
      contributionsScore: 58,
      confidence: 'moderate',
      hasVerifiedActivity: true,
      hasSustainedActivity: false,
      hasSubstantialImpact: false,
      hasUnresolvedSeriousIntegrityIssue: false,
      independentVerifiedEvidenceCount: 6,
      scoredCategoryCount: 2,
      hasRecurrence: true,
      timeSpanDays: 30,
    });
    expect(ready.finalTier).toBe('contributor');
  });

  it('11. one participation feeding several projections still counts once', () => {
    const event = opportunityEvent({
      sourceId: 'shared',
      quality: 80,
      impact: 70,
      skills: ['Research', 'Documentation'],
      opportunityId: 'opp-shared',
    });
    const contributions = scoreContributionsFromEvents([event]);
    const performance = scorePerformanceFromEvents([event]);
    const result = buildScoreFromProfileActivity({
      contributions,
      performance,
      demonstratedSkills: [
        { skillName: 'Research', participationId: 'shared', opportunityId: 'opp-shared' },
        { skillName: 'Documentation', participationId: 'shared', opportunityId: 'opp-shared' },
      ],
      demonstratedProjects: [{ participationId: 'shared', opportunityId: 'opp-shared' }],
    });
    expect(result.validation.verifiedEvidenceCount).toBe(1);
    expect(result.independentEvidenceCount).toBe(1);
    expect(result.categories.find((c) => c.id === 'contributions')?.score).not.toBeNull();
    expect(result.categories.find((c) => c.id === 'performance')?.score).not.toBeNull();
    expect(result.categories.find((c) => c.id === 'skills')?.verifiedSourceCount).toBe(2);
    expect(result.categories.find((c) => c.id === 'experience')?.metrics.find((m) => m.id === 'projects')?.sourceCount).toBe(1);
  });

  it('12. recomputation is deterministic and records the V2 model version', () => {
    const events = [
      opportunityEvent({ sourceId: 'b', quality: 74, impact: 68, occurredAt: daysAgo(8) }),
      opportunityEvent({ sourceId: 'a', quality: 81, impact: 70, occurredAt: daysAgo(2) }),
    ];
    const first = scoreContributionsFromEvents(events)!;
    const reversed = scoreContributionsFromEvents([...events].reverse())!;
    const again = scoreContributionsFromEvents(events)!;
    expect(first.score).toBe(reversed.score);
    expect(first.score).toBe(again.score);
    expect(first.evidenceRoots).toEqual(reversed.evidenceRoots);
    const scored = buildScoreFromProfileActivity({ contributions: first });
    expect(scored.overall.calculationVersion).toBe('civizen-score-v2.0');
    expect(scored.overall.modelVersion).toBe('civizen-score-v2.0');
    expect(resolveScoreModelVersion(null)).toBe(SCORE_MODEL_VERSION_UNVERSIONED);
    expect(resolveScoreModelVersion('')).toBe(SCORE_MODEL_VERSION_UNVERSIONED);
    expect(resolveScoreModelVersion('civizen-score-v1.2')).toBe('civizen-score-v1.2');
  });

  it('verification does not improve the semantic activity rating', () => {
    const unverified = estimateContributionEvent({
      profileId: 'p',
      sourceTable: 'opportunity_participations',
      sourceId: 'x',
      eventType: 'opportunity_participation',
      verified: false,
      capacityOverride: 80,
      impactOverride: 70,
    });
    const verified = estimateContributionEvent({
      profileId: 'p',
      sourceTable: 'opportunity_participations',
      sourceId: 'y',
      eventType: 'opportunity_participation',
      verified: true,
      capacityOverride: 80,
      impactOverride: 70,
    });
    expect(verified.impactEstimate).toBe(70);
    expect(verified.capacityEstimate).toBe(80);
    expect(verified.impactEstimate).toBe(unverified.impactEstimate);
    expect(observationWeight({ evidenceRootId: 'a', value: 70, verified: true })).toBeGreaterThan(
      observationWeight({ evidenceRootId: 'a', value: 70, verified: false }),
    );
  });

  it('one activity never reaches moderate confidence', () => {
    const confidence = computeConfidence({
      independentEvidenceCount: 1,
      independentVerifiedCount: 1,
      evaluationCount: 4,
      evaluatorCount: 4,
      effectiveEvidenceVolume: 1.25,
      scoredCategoryCount: 2,
      establishedCategoryCount: 2,
      hasRecurrence: false,
      timeSpanDays: 0,
      recentVerifiedRootCount: 1,
      evidenceRoots: ['opportunity_participations:p1'],
    });
    expect(confidence.confidence).toBe('low');
  });

  it('coverage does not treat missing categories as zero', () => {
    const coverage = computeCoverage(
      {
        learning: 80,
        skills: null,
        performance: null,
        contributions: 52,
        experience: null,
      },
      ['learning', 'skills', 'performance', 'contributions', 'experience'],
    );
    expect(coverage.scoredCount).toBe(2);
    expect(coverage.limited).toBe(true);
    expect(coverage.missingCategoryIds).toContain('skills');
  });

  it('activity evaluation blend is separate from shrunk reputation', () => {
    const evaluation = blendActivityEvaluation({ quality: 80, impact: 70, collaboration: 40 });
    expect(evaluation).toBeCloseTo(70 * 0.45 + 80 * 0.4 + 40 * 0.15, 5);
    const observations: CategoryObservation[] = [
      { evidenceRootId: 'r1', value: evaluation!, verified: true, occurredAt: daysAgo(1) },
    ];
    const reputation = reputationFromObservations(observations);
    expect(reputation.score).not.toBeNull();
    expect(reputation.score!).toBeLessThan(evaluation!);
    expect(reputation.status).toBe('provisional');
  });
});

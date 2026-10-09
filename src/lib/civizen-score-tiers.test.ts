import { describe, expect, it } from 'vitest';

import {
  calculateTierStatus,
  determineFinalTier,
  getBaseTier,
  getDevelopmentalScoreColor,
} from '@/lib/civizen-score-tiers';
import type { ScoreConfidence } from '@/lib/civizen-score';

function input(partial: {
  overallScore: number | null;
  performanceScore?: number | null;
  contributionsScore?: number | null;
  confidence?: ScoreConfidence;
  hasVerifiedActivity?: boolean;
  hasSustainedActivity?: boolean;
  hasSubstantialImpact?: boolean;
  hasUnresolvedSeriousIntegrityIssue?: boolean;
  independentVerifiedEvidenceCount?: number;
  scoredCategoryCount?: number;
  hasRecurrence?: boolean;
  timeSpanDays?: number;
}) {
  return {
    overallScore: partial.overallScore,
    performanceScore: partial.performanceScore ?? null,
    contributionsScore: partial.contributionsScore ?? null,
    confidence: partial.confidence ?? 'insufficient',
    hasVerifiedActivity: partial.hasVerifiedActivity ?? false,
    hasSustainedActivity: partial.hasSustainedActivity ?? false,
    hasSubstantialImpact: partial.hasSubstantialImpact ?? false,
    hasUnresolvedSeriousIntegrityIssue: partial.hasUnresolvedSeriousIntegrityIssue ?? false,
    independentVerifiedEvidenceCount: partial.independentVerifiedEvidenceCount,
    scoredCategoryCount: partial.scoredCategoryCount,
    hasRecurrence: partial.hasRecurrence,
    timeSpanDays: partial.timeSpanDays,
  };
}

const builderReady = {
  hasVerifiedActivity: true,
  independentVerifiedEvidenceCount: 3,
  scoredCategoryCount: 1,
  confidence: 'low' as const,
};

const contributorReady = {
  ...builderReady,
  performanceScore: 50,
  contributionsScore: 50,
  confidence: 'moderate' as const,
  independentVerifiedEvidenceCount: 5,
  scoredCategoryCount: 2,
  hasRecurrence: true,
  timeSpanDays: 30,
};

const catalystReady = {
  ...contributorReady,
  performanceScore: 65,
  contributionsScore: 65,
  confidence: 'high' as const,
  independentVerifiedEvidenceCount: 12,
  scoredCategoryCount: 3,
  hasSustainedActivity: true,
  timeSpanDays: 90,
};

const stewardReady = {
  ...catalystReady,
  performanceScore: 75,
  contributionsScore: 75,
  independentVerifiedEvidenceCount: 20,
  scoredCategoryCount: 4,
  hasSubstantialImpact: true,
  timeSpanDays: 180,
};

describe('civizen score tiers', () => {
  it('Test 1: not yet scored still displays Explorer', () => {
    const status = calculateTierStatus(input({ overallScore: null }));
    expect(status.scoreState).toBe('not_scored');
    expect(status.finalTier).toBe('explorer');
    expect(status.baseTier).toBe('explorer');
    expect(status.nextTier).toBe('builder');
    expect(status.pointsToNextTier).toBe(30);
  });

  it('Test 2: Explorer with points to Builder', () => {
    const status = calculateTierStatus(
      input({ overallScore: 8.4, confidence: 'low' }),
    );
    expect(status.finalTier).toBe('explorer');
    expect(status.nextTier).toBe('builder');
    expect(status.pointsToNextTier).toBe(21.6);
  });

  it('Test 3: Builder threshold with verified activity and enough independent evidence', () => {
    const result = determineFinalTier(
      input({ overallScore: 30, ...builderReady }),
    );
    expect(result.finalTier).toBe('builder');
  });

  it('Test 4: Builder score without verified activity stays Explorer', () => {
    const result = determineFinalTier(
      input({ overallScore: 42, hasVerifiedActivity: false, confidence: 'low' }),
    );
    expect(result.baseTier).toBe('builder');
    expect(result.finalTier).toBe('explorer');
    expect(result.unmetRequirements.some((r) => r.id === 'verified_activity')).toBe(true);
  });

  it('does not award Builder from a high score with only one verified activity', () => {
    const result = determineFinalTier(
      input({
        overallScore: 55,
        hasVerifiedActivity: true,
        confidence: 'low',
        independentVerifiedEvidenceCount: 1,
        scoredCategoryCount: 2,
      }),
    );
    expect(result.finalTier).toBe('explorer');
    expect(result.unmetRequirements.some((r) => r.id === 'independent_evidence')).toBe(true);
  });

  it('does not unlock a tier from a provisional estimate alone', () => {
    const result = determineFinalTier({
      ...input({
        overallScore: 87.5,
        ...builderReady,
      }),
      overallStatus: 'provisional',
    });
    expect(result.finalTier).toBe('explorer');
    expect(result.unmetRequirements.some((r) => r.id === 'score_maturity')).toBe(true);
  });

  it('Test 5: Contributor threshold', () => {
    const result = determineFinalTier(
      input({
        overallScore: 60,
        ...contributorReady,
      }),
    );
    expect(result.finalTier).toBe('contributor');
  });

  it('Test 6: Contributor score but insufficient Performance → Builder', () => {
    const result = determineFinalTier(
      input({
        overallScore: 68,
        ...contributorReady,
        performanceScore: 42,
        contributionsScore: 61,
        confidence: 'high',
      }),
    );
    expect(result.baseTier).toBe('contributor');
    expect(result.finalTier).toBe('builder');
    expect(
      result.unmetRequirements.some(
        (r) => r.id === 'performance_score' && r.explanation?.includes('50'),
      ),
    ).toBe(true);
  });

  it('Test 7: Catalyst threshold', () => {
    const result = determineFinalTier(
      input({
        overallScore: 75,
        ...catalystReady,
      }),
    );
    expect(result.finalTier).toBe('catalyst');
  });

  it('Test 8: Catalyst score but low Contributions → Contributor', () => {
    const result = determineFinalTier(
      input({
        overallScore: 81,
        ...catalystReady,
        performanceScore: 72,
        contributionsScore: 61,
      }),
    );
    expect(result.baseTier).toBe('catalyst');
    expect(result.finalTier).toBe('contributor');
  });

  it('Test 9: Steward threshold', () => {
    const result = determineFinalTier(
      input({
        overallScore: 85,
        ...stewardReady,
      }),
    );
    expect(result.finalTier).toBe('steward');
  });

  it('Test 10: Steward score with unresolved integrity issue blocks Catalyst and Steward', () => {
    const result = determineFinalTier(
      input({
        overallScore: 91,
        ...stewardReady,
        performanceScore: 88,
        contributionsScore: 86,
        confidence: 'very_high',
        hasUnresolvedSeriousIntegrityIssue: true,
      }),
    );
    expect(result.baseTier).toBe('steward');
    expect(result.finalTier).toBe('contributor');
    expect(result.unmetRequirements.some((r) => r.id === 'integrity')).toBe(true);
  });

  it('Test 11: boundary values for base tier', () => {
    expect(getBaseTier(29.9)).toBe('explorer');
    expect(getBaseTier(30.0)).toBe('builder');
    expect(getBaseTier(59.9)).toBe('builder');
    expect(getBaseTier(60.0)).toBe('contributor');
    expect(getBaseTier(74.9)).toBe('contributor');
    expect(getBaseTier(75.0)).toBe('catalyst');
    expect(getBaseTier(84.9)).toBe('catalyst');
    expect(getBaseTier(85.0)).toBe('steward');
    expect(getBaseTier(100.0)).toBe('steward');
  });

  it('Test 12: score decrease recalculates tier and keeps unmet reasons', () => {
    const before = determineFinalTier(
      input({
        overallScore: 78,
        ...catalystReady,
        performanceScore: 70,
        contributionsScore: 68,
      }),
    );
    expect(before.finalTier).toBe('catalyst');

    const after = determineFinalTier(
      input({
        overallScore: 72,
        ...contributorReady,
        performanceScore: 70,
        contributionsScore: 62,
        confidence: 'high',
      }),
    );
    expect(after.baseTier).toBe('contributor');
    expect(after.finalTier).toBe('contributor');
  });

  it('does not use destructive red for low developmental scores', () => {
    expect(getDevelopmentalScoreColor(8.4, 'explorer')).not.toContain('destructive');
    expect(getDevelopmentalScoreColor(8.4, 'explorer')).toBe('text-[#5F6E86]');
    expect(getDevelopmentalScoreColor(42, 'builder')).toBe('text-[#1F7F79]');
    expect(getDevelopmentalScoreColor(90, 'steward')).toBe('text-[#8A6410]');
  });

  it('example: score 78 with Performance 61 qualifies as Contributor not Catalyst', () => {
    const result = determineFinalTier(
      input({
        overallScore: 78,
        ...catalystReady,
        performanceScore: 61,
        contributionsScore: 68,
      }),
    );
    expect(result.baseTier).toBe('catalyst');
    expect(result.finalTier).toBe('contributor');
    expect(result.unmetRequirements.some((r) => r.id === 'performance_score')).toBe(true);
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { assessContributionImpact, parseImpactEvidence } from '@/lib/civizen-contribution-impact';
import { evaluateContributionLifecycle, withVerificationUnchanged } from '@/lib/civizen-contribution-lifecycle';
import { scoreContributionsFromEvents, type ContributionEvent } from '@/lib/civizen-contributions';
import { buildScoreFromProfileActivity } from '@/lib/civizen-score';

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
    verified: overrides.verified ?? false,
    occurredAt: overrides.occurredAt ?? '2026-08-04T12:00:00.000Z',
    rawMeta: overrides.rawMeta ?? {},
  };
}

describe('contribution lifecycle and impact', () => {
  it('A: immediate contribution receives an initial evaluation', () => {
    const view = evaluateContributionLifecycle(event({ verified: false }));
    expect(view.stage).toBe('initial_evaluation');
    expect(view.rawQuality).not.toBeNull();
    expect(view.realizedImpact).toBe('unknown');
  });

  it('B: later verification leaves raw quality unchanged and raises confidence', () => {
    const initial = evaluateContributionLifecycle(event({ verified: false }));
    const verified = evaluateContributionLifecycle(event({ verified: true, rawMeta: { eligibility: 'system_verified' } }));
    expect(withVerificationUnchanged(initial, verified)).toBe(true);
    expect(verified.stage).toBe('verified_evaluation');
    expect(verified.evidenceConfidence).not.toBe('low');
  });

  it('C: later positive outcome data raises realized impact', () => {
    const before = evaluateContributionLifecycle(event({ verified: true }));
    const after = evaluateContributionLifecycle(event({
      verified: true,
      rawMeta: { impactEvidence: { breadth: 'national', depth: 'substantial', outcomeMetric: 80, affectedPopulation: 4_200_000 } },
    }));
    expect(before.realizedImpact).toBe('unknown');
    expect(after.realizedImpact).not.toBe('unknown');
    expect(Number(after.realizedImpact)).toBeGreaterThan(50);
  });

  it('D: later failure lowers realized impact without erasing skills/experience support', () => {
    const failed = evaluateContributionLifecycle(event({
      verified: true,
      rawMeta: { testsPassed: true, impactEvidence: { breadth: 'national', depth: 'modest', outcomeMetric: 20, reversal: true } },
    }));
    expect(failed.rawQuality).toBeGreaterThan(70);
    expect(Number(failed.realizedImpact)).toBeLessThan(40);
    expect(failed.supports.skills.length).toBeGreaterThan(0);
    expect(failed.supports.experience).toBe(true);
  });

  it('E: global trivial impact does not dominate local deep impact', () => {
    const globalTrivial = assessContributionImpact({ breadth: 'global', depth: 'trivial', outcomeMetric: 30 });
    const localDeep = assessContributionImpact({ breadth: 'local', depth: 'transformative', outcomeMetric: 90 });
    expect(localDeep.realizedImpact!).toBeGreaterThan(globalTrivial.realizedImpact!);
  });

  it('F: broader demonstrated reach can matter for major outcomes', () => {
    const national = assessContributionImpact({
      realizedReach: 'national',
      depth: 'substantial',
      outcomeMetric: 80,
      affectedPopulation: 4_000_000,
    });
    const global = assessContributionImpact({
      realizedReach: 'global',
      depth: 'substantial',
      outcomeMetric: 80,
      affectedJurisdictions: 42,
    });
    expect(global.realizedImpact!).toBeGreaterThan(national.realizedImpact!);
    expect(global.realizedImpact! - national.realizedImpact!).toBeLessThan(20);
  });

  it('G: high expected impact with poor realized result changes the assessment', () => {
    const view = evaluateContributionLifecycle(event({
      verified: true,
      rawMeta: { expectedImpact: 82, impactEvidence: { expectedImpact: 82, breadth: 'national', depth: 'trivial', outcomeMetric: 22 } },
    }));
    expect(view.expectedImpact).toBe(82);
    expect(Number(view.realizedImpact)).toBeLessThan(50);
    expect(view.observation).not.toBe(view.rawQuality);
  });

  it('H: durable positive result strengthens long-term impact', () => {
    const short = assessContributionImpact({ breadth: 'community', depth: 'meaningful', outcomeMetric: 70, durabilityDays: 20 });
    const durable = assessContributionImpact({ breadth: 'community', depth: 'meaningful', outcomeMetric: 70, durabilityDays: 400 });
    expect(durable.realizedImpact!).toBeGreaterThan(short.realizedImpact!);
    expect(durable.longTermImpact).not.toBeNull();
  });

  it('I: one negative rater is bounded on mature reputation', () => {
    const mature = Array.from({ length: 12 }, (_, i) => event({
      sourceId: `r-${i}`,
      verified: true,
      rawMeta: { testsPassed: true },
    }));
    const withNegative = [
      ...mature,
      event({
        sourceId: 'bad',
        verified: true,
        rawMeta: { impactEvidence: { breadth: 'local', depth: 'trivial', outcomeMetric: 5, adverseOutcome: true } },
      }),
    ];
    const before = scoreContributionsFromEvents(mature)!;
    const after = scoreContributionsFromEvents(withNegative)!;
    expect(Math.abs(after.score! - before.score!)).toBeLessThan(8);
  });

  it('J: many independent affected-user reports can materially decline realized impact', () => {
    const positive = assessContributionImpact({
      breadth: 'community',
      depth: 'substantial',
      outcomeMetric: 80,
      feedback: Array.from({ length: 10 }, (_, i) => ({ role: 'beneficiary' as const, value: 82, affected: true, evidenceSupplied: true, raterId: `u${i}` })),
    });
    const declined = assessContributionImpact({
      breadth: 'community',
      depth: 'modest',
      outcomeMetric: 28,
      feedback: Array.from({ length: 10 }, (_, i) => ({ role: 'beneficiary' as const, value: 22, affected: true, evidenceSupplied: true, raterId: `u${i}` })),
    });
    expect(positive.realizedImpact! - declined.realizedImpact!).toBeGreaterThan(15);
  });

  it('K: popularity without outcome evidence does not create high impact', () => {
    const likes = assessContributionImpact({
      feedback: Array.from({ length: 40 }, () => ({ role: 'public' as const, value: 99, affected: false, evidenceSupplied: false, likesOnly: true })),
    });
    expect(likes.realizedImpact).toBeNull();
    expect(likes.popularityOnly).toBe(true);
  });

  it('V: historical contribution with unknown long-term impact stays legitimate', () => {
    const view = evaluateContributionLifecycle(event({
      verified: true,
      rawMeta: { reconstruction: true, reconstructionResult: 'reconstructed', testsPassed: true },
    }));
    expect(view.rawQuality).not.toBeNull();
    expect(view.realizedImpact).toBe('unknown');
    expect(view.longTermImpact).toBe('unknown');
  });

  it('W: one new contribution in a mature profile has bounded marginal effect', () => {
    const base = Array.from({ length: 20 }, (_, i) => event({ sourceId: `m-${i}`, verified: true, rawMeta: { testsPassed: true } }));
    const plus = [...base, event({ sourceId: 'extra', verified: true, title: 'Hide Endorse from the Profile menu' })];
    const before = scoreContributionsFromEvents(base)!;
    const after = scoreContributionsFromEvents(plus)!;
    expect(Math.abs(after.score! - before.score!)).toBeLessThan(4);
    expect(buildScoreFromProfileActivity({ contributions: after }).categories.find((item) => item.id === 'contributions')?.score).not.toBe(
      evaluateContributionLifecycle(plus[plus.length - 1]!).observation,
    );
  });

  it('does not parse placeholder 78/78/35 as realized impact', () => {
    const parsed = parseImpactEvidence({});
    expect(assessContributionImpact(parsed).realizedImpact).toBeNull();
    expect(evaluateContributionLifecycle(event({ verified: true })).realizedImpact).toBe('unknown');
  });
});

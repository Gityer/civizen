// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { evaluateContributionObservation, publicCommitShas } from '@/lib/civizen-contribution-observation';
import { scoreContributionsFromEvents, type ContributionEvent } from '@/lib/civizen-contributions';
import { buildScoreFromProfileActivity } from '@/lib/civizen-score';

function event(overrides: Partial<ContributionEvent>): ContributionEvent {
  return {
    profileId: 'p1',
    sourceTable: overrides.sourceTable ?? 'development_stories',
    sourceId: overrides.sourceId ?? 'root-1',
    eventType: overrides.eventType ?? 'development_story',
    title: overrides.title ?? 'Platform improvement',
    summary: overrides.summary ?? null,
    capacityEstimate: overrides.capacityEstimate ?? 78,
    impactEstimate: overrides.impactEstimate ?? 78,
    collaborationEstimate: overrides.collaborationEstimate ?? 35,
    beneficiaryEstimate: overrides.beneficiaryEstimate ?? 75,
    verified: overrides.verified ?? true,
    occurredAt: overrides.occurredAt ?? '2026-08-04T12:00:00.000Z',
    rawMeta: overrides.rawMeta ?? {},
  };
}

describe('contribution observation', () => {
  it('D: unknown realized impact is not filled with a default score', () => {
    const view = evaluateContributionObservation(
      event({ title: 'Score V2 evidence architecture', rawMeta: { eligibility: 'system_verified' } }),
    );
    expect(view.realizedImpact).toBe('unknown');
    expect(view.impact).toBeNull();
    expect(view.quality).not.toBeNull();
  });

  it('E: distinct development outcomes receive distinct evidence-based evaluations', () => {
    const architecture = evaluateContributionObservation(
      event({
        sourceId: 'score',
        title: 'Score V2 evidence architecture',
        rawMeta: { eligibility: 'system_verified', testsPassed: true, contributionFunction: 'system_architecture' },
      }),
    );
    const copy = evaluateContributionObservation(
      event({
        sourceId: 'og',
        title: 'Replace Lovable Open Graph image with Civizen brand preview',
        rawMeta: { eligibility: 'system_verified' },
      }),
    );
    expect(architecture.quality).not.toBe(copy.quality);
    expect(architecture.structuralSignificance).toBe('high');
    expect(copy.structuralSignificance).toBe('localized');
  });

  it('F: identical type with different evidence does not share 78/78/35', () => {
    const first = evaluateContributionObservation(
      event({ sourceId: 'a', title: 'Score V2 evidence architecture', rawMeta: { testsPassed: true } }),
    );
    const second = evaluateContributionObservation(
      event({ sourceId: 'b', title: 'Hide Endorse from the Profile menu' }),
    );
    expect(first.quality).not.toBe(78);
    expect(second.quality).not.toBe(first.quality);
    expect(first.collaboration).toBeNull();
    expect(second.collaboration).toBeNull();
  });

  it('G: one contribution supports several categories without extra roots', () => {
    const view = evaluateContributionObservation(
      event({ title: 'Score V2 evidence architecture', rawMeta: { testsPassed: true } }),
    );
    expect(view.supports.contributions).toBe(true);
    expect(view.supports.performance).toBe(true);
    expect(view.supports.skills).toContain('System architecture');
    expect(view.supports.experience).toBe(true);
    const scored = scoreContributionsFromEvents([event({ title: 'Score V2 evidence architecture' })]);
    expect(scored?.evidenceRoots).toHaveLength(1);
  });

  it('H: contribution observation does not imply additive score points', () => {
    const view = evaluateContributionObservation(event({ title: 'Web login/signup lockout correction' }));
    expect(view.impliesAdditivePoints).toBe(false);
    expect(view.observation).not.toBeNull();
  });

  it('K: same evidence recalculates identically', () => {
    const sample = event({ title: 'Public Areas and Initiatives', rawMeta: { testsPassed: true } });
    expect(evaluateContributionObservation(sample)).toEqual(evaluateContributionObservation({ ...sample }));
  });

  it('J: public provenance omits private journal identifiers', () => {
    const viewEvent = event({
      rawMeta: {
        commitShas: ['abcdef1234567890'],
        provenanceStoryIds: ['chat-secret-id'],
        chatTranscript: 'private instruction text',
      },
    });
    expect(publicCommitShas(viewEvent)).toEqual(['abcdef123456']);
    expect(JSON.stringify(evaluateContributionObservation(viewEvent))).not.toContain('chat-secret-id');
    expect(JSON.stringify(evaluateContributionObservation(viewEvent))).not.toContain('private instruction text');
  });

  it('does not copy contribution observation onto the category reputation', () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      event({ sourceId: `r-${i}`, title: 'Score V2 evidence architecture', rawMeta: { testsPassed: true } }),
    );
    const scored = scoreContributionsFromEvents(events)!;
    const observation = evaluateContributionObservation(events[0]!)!.observation!;
    expect(scored.score).not.toBe(observation);
    const built = buildScoreFromProfileActivity({ contributions: scored });
    expect(built.categories.find((item) => item.id === 'contributions')?.score).toBe(scored.score);
  });
});

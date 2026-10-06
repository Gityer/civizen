// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { ContributionEvent } from '@/lib/civizen-contributions';
import {
  buildPerformanceActivities,
  canRatePerformance,
  deriveSystemRating,
  scorePerformanceFromActivities,
  scorePerformanceFromEvents,
  type PerformancePeerRating,
} from '@/lib/civizen-performance';

function makeEvent(
  overrides: Partial<ContributionEvent> & Pick<ContributionEvent, 'eventType'>,
): ContributionEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    profileId: 'profile-1',
    sourceTable: overrides.sourceTable ?? 'posts',
    sourceId: overrides.sourceId ?? crypto.randomUUID(),
    eventType: overrides.eventType,
    title: overrides.title ?? 'Event',
    summary: overrides.summary ?? null,
    capacityEstimate: overrides.capacityEstimate ?? 25,
    impactEstimate: overrides.impactEstimate ?? 15,
    collaborationEstimate: overrides.collaborationEstimate ?? 20,
    beneficiaryEstimate: overrides.beneficiaryEstimate ?? 20,
    verified: overrides.verified ?? false,
    occurredAt: overrides.occurredAt ?? new Date().toISOString(),
    rawMeta: overrides.rawMeta ?? {},
  };
}

describe('civizen performance', () => {
  it('derives higher system ratings for verified platform work than posts', () => {
    const story = makeEvent({
      eventType: 'development_story',
      title: 'Score V2 evidence architecture',
      capacityEstimate: 78,
      impactEstimate: 78,
      collaborationEstimate: 35,
      verified: true,
      rawMeta: { testsPassed: true },
    });
    const post = makeEvent({
      eventType: 'post',
      capacityEstimate: 25,
      impactEstimate: 15,
      collaborationEstimate: 20,
      verified: false,
    });
    expect(deriveSystemRating(story)).toBeGreaterThan(deriveSystemRating(post));
  });

  it('does not copy stored 78/78/35 onto heterogeneous development work', () => {
    const architecture = makeEvent({
      eventType: 'development_story',
      title: 'Score V2 evidence architecture',
      capacityEstimate: 78,
      impactEstimate: 78,
      collaborationEstimate: 35,
      verified: true,
      rawMeta: { testsPassed: true },
    });
    const copy = makeEvent({
      eventType: 'development_story',
      title: 'Hide Endorse from the Profile menu',
      capacityEstimate: 78,
      impactEstimate: 78,
      collaborationEstimate: 35,
      verified: true,
    });
    expect(deriveSystemRating(architecture)).not.toBe(deriveSystemRating(copy));
  });

  it('forbids self-rating', () => {
    expect(canRatePerformance({ raterProfileId: 'a', subjectProfileId: 'a' })).toBe(false);
    expect(canRatePerformance({ raterProfileId: 'a', subjectProfileId: 'b' })).toBe(true);
    expect(canRatePerformance({ raterProfileId: null, subjectProfileId: 'b' })).toBe(false);
  });

  it('returns null score for empty activity', () => {
    expect(scorePerformanceFromEvents([])).toBeNull();
    expect(scorePerformanceFromActivities([])).toBeNull();
  });

  it('scores from system ratings without peer ratings', () => {
    const events = [
      makeEvent({
        eventType: 'development_story',
        capacityEstimate: 78,
        impactEstimate: 78,
        verified: true,
        sourceId: '1',
      }),
      makeEvent({
        eventType: 'law_contribution',
        capacityEstimate: 70,
        impactEstimate: 68,
        verified: true,
        sourceId: '2',
      }),
    ];
    const scored = scorePerformanceFromEvents(events);
    expect(scored).not.toBeNull();
    expect(scored!.score).toBeGreaterThan(40);
    expect(scored!.metrics?.find((m) => m.id === 'ratings')?.value).toBeNull();
    expect(scored!.metrics?.find((m) => m.id === 'accomplishment')?.value).toBeGreaterThan(50);
  });

  it('includes peer mean in ratings metric and raises overall when peers rate high', () => {
    const eventId = crypto.randomUUID();
    const events = [
      makeEvent({
        id: eventId,
        eventType: 'development_story',
        capacityEstimate: 50,
        impactEstimate: 50,
        verified: false,
        sourceId: '1',
      }),
    ];
    const lowPeer: PerformancePeerRating[] = [
      {
        contributionEventId: eventId,
        subjectProfileId: 'profile-1',
        raterProfileId: 'rater-1',
        score: 20,
        comment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const highPeer: PerformancePeerRating[] = [
      {
        contributionEventId: eventId,
        subjectProfileId: 'profile-1',
        raterProfileId: 'rater-1',
        score: 95,
        comment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const low = scorePerformanceFromEvents(events, lowPeer);
    const high = scorePerformanceFromEvents(events, highPeer);
    expect(low!.metrics?.find((m) => m.id === 'ratings')?.value).toBe(20);
    expect(high!.metrics?.find((m) => m.id === 'ratings')?.value).toBe(95);
    expect(high!.score!).toBeGreaterThan(low!.score!);
  });

  it('joins viewer rating onto activities', () => {
    const eventId = crypto.randomUUID();
    const events = [makeEvent({ id: eventId, eventType: 'post', sourceId: '1' })];
    const ratings: PerformancePeerRating[] = [
      {
        contributionEventId: eventId,
        subjectProfileId: 'profile-1',
        raterProfileId: 'viewer',
        score: 77,
        comment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const activities = buildPerformanceActivities(events, ratings, 'viewer');
    expect(activities[0].myRating).toBe(77);
    expect(activities[0].peerCount).toBe(1);
    expect(activities[0].peerAverage).toBe(77);
  });

  it('lets opportunity assessments change system ratings without using peer ratings', () => {
    const withoutAssessment = makeEvent({
      eventType: 'opportunity_participation',
      sourceTable: 'opportunity_participations',
      capacityEstimate: 75,
      impactEstimate: 87.5,
      collaborationEstimate: 40,
      verified: true,
      sourceId: 'part-1',
    });
    const withAssessment = makeEvent({
      eventType: 'opportunity_participation',
      sourceTable: 'opportunity_participations',
      capacityEstimate: 90,
      impactEstimate: 75,
      collaborationEstimate: 80,
      verified: true,
      sourceId: 'part-1',
    });
    expect(deriveSystemRating(withAssessment)).not.toBe(deriveSystemRating(withoutAssessment));
    const scored = scorePerformanceFromEvents([withAssessment]);
    expect(scored).not.toBeNull();
    expect(scored!.metrics?.find((m) => m.id === 'ratings')?.value).toBeNull();
    expect(scored!.metrics?.find((m) => m.id === 'accomplishment')?.value).toBe(
      deriveSystemRating(withAssessment),
    );
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { queryContributionLedger } from '@/lib/civizen-contribution-ledger';
import {
  applyVerifiedImpactBoost,
  CONTRIBUTION_SYNC_TTL_MS,
  contentSizeFactor,
  estimateContributionEvent,
  scoreContributionsFromEvents,
  type ContributionEvent,
} from '@/lib/civizen-contributions';
import { diminishingQuantityScore } from '@/lib/civizen-score';
import { peekBaseTranslations, loadBaseTranslations } from '@/lib/i18n.runtime';

function makeEvent(
  overrides: Partial<ContributionEvent> & Pick<ContributionEvent, 'eventType'>,
): ContributionEvent {
  return {
    profileId: 'profile-1',
    sourceTable: 'posts',
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

describe('civizen contributions estimator', () => {
  it('scales capacity by content size buckets', () => {
    expect(contentSizeFactor(10)).toBe(0.85);
    expect(contentSizeFactor(100)).toBe(1);
    expect(contentSizeFactor(500)).toBe(1.1);
  });

  it('does not change impact when verified', () => {
    expect(applyVerifiedImpactBoost(40, false)).toBe(40);
    expect(applyVerifiedImpactBoost(40, true)).toBe(40);
    expect(applyVerifiedImpactBoost(90, true)).toBe(90);
  });

  it('estimates law contributions with higher capacity than posts', () => {
    const law = estimateContributionEvent({
      profileId: 'p1',
      sourceTable: 'law_contributions',
      sourceId: '1',
      eventType: 'law_contribution',
      title: 'UDHR summary',
      textLen: 200,
      verified: true,
    });
    const post = estimateContributionEvent({
      profileId: 'p1',
      sourceTable: 'posts',
      sourceId: '2',
      eventType: 'post',
      title: 'Hello',
      textLen: 200,
      verified: false,
    });
    expect(law.capacityEstimate).toBeGreaterThan(post.capacityEstimate);
    expect(law.impactEstimate).toBeGreaterThan(post.impactEstimate);
    expect(law.verified).toBe(true);
  });

  it('returns null score for empty activity', () => {
    expect(scoreContributionsFromEvents([])).toBeNull();
  });

  it('scores a small verified set higher than many low-impact posts', () => {
    const verifiedFew = scoreContributionsFromEvents([
      makeEvent({
        eventType: 'governance_proposal',
        capacityEstimate: 75,
        impactEstimate: 75,
        collaborationEstimate: 40,
        beneficiaryEstimate: 70,
        verified: true,
        sourceId: 'a',
      }),
      makeEvent({
        eventType: 'law_contribution',
        capacityEstimate: 70,
        impactEstimate: 70,
        collaborationEstimate: 20,
        beneficiaryEstimate: 60,
        verified: true,
        sourceId: 'b',
      }),
      makeEvent({
        eventType: 'solution_problem',
        capacityEstimate: 55,
        impactEstimate: 60,
        collaborationEstimate: 35,
        beneficiaryEstimate: 65,
        verified: true,
        sourceId: 'c',
      }),
    ]);

    const manyPosts = scoreContributionsFromEvents(
      Array.from({ length: 40 }, (_, i) =>
        makeEvent({
          eventType: 'post',
          capacityEstimate: 20,
          impactEstimate: 10,
          collaborationEstimate: 15,
          beneficiaryEstimate: 15,
          verified: false,
          sourceId: `post-${i}`,
        }),
      ),
    );

    expect(verifiedFew).not.toBeNull();
    expect(manyPosts).not.toBeNull();
    expect(verifiedFew!.score!).toBeGreaterThan(manyPosts!.score!);
    // Quantity-only diminishing curve would favor 40 posts; impact discount keeps them moderate.
    const quantityOnly = diminishingQuantityScore(40, 12, 70);
    expect(manyPosts!.score!).toBeLessThan(quantityOnly);
  });

  it('populates metric groups and raises confidence with verified sources', () => {
    const scored = scoreContributionsFromEvents([
      makeEvent({
        eventType: 'funding_record',
        capacityEstimate: 80,
        impactEstimate: 85,
        verified: true,
        sourceId: 'f1',
      }),
      makeEvent({
        eventType: 'governance_vote',
        capacityEstimate: 20,
        impactEstimate: 25,
        collaborationEstimate: 50,
        verified: false,
        sourceId: 'v1',
      }),
      makeEvent({
        eventType: 'solution_comment',
        capacityEstimate: 35,
        impactEstimate: 30,
        collaborationEstimate: 70,
        verified: true,
        sourceId: 'c1',
      }),
    ]);

    expect(scored?.metrics?.map((m) => m.id)).toEqual([
      'recent',
      'verified',
      'impact',
      'collaboration',
      'beneficiaries',
      'ratings',
    ]);
    expect(scored?.metrics?.find((m) => m.id === 'ratings')?.value).toBeNull();
    expect(scored?.verifiedSourceCount).toBe(2);
    expect(scored?.confidence).toBe('low');
    expect(scored?.score).toBeGreaterThan(0);
  });

  it('scores sustained platform stories far above a handful of chat mirrors', () => {
    const fewChatMirrors = scoreContributionsFromEvents([
      makeEvent({
        eventType: 'content_item',
        capacityEstimate: 50,
        impactEstimate: 50,
        collaborationEstimate: 25,
        verified: true,
        sourceId: 'c1',
      }),
      makeEvent({
        eventType: 'content_item',
        capacityEstimate: 50,
        impactEstimate: 50,
        collaborationEstimate: 25,
        verified: true,
        sourceId: 'c2',
      }),
      makeEvent({
        eventType: 'content_item',
        capacityEstimate: 43,
        impactEstimate: 50,
        collaborationEstimate: 25,
        verified: true,
        sourceId: 'c3',
      }),
      makeEvent({
        eventType: 'content_item',
        capacityEstimate: 43,
        impactEstimate: 50,
        collaborationEstimate: 25,
        verified: true,
        sourceId: 'c4',
      }),
    ]);

    const manyStories = scoreContributionsFromEvents(
      Array.from({ length: 100 }, (_, i) =>
        makeEvent({
          eventType: 'development_story',
          title: 'Score V2 evidence architecture',
          verified: true,
          sourceId: `story-${i}`,
          rawMeta: { testsPassed: true, eligibility: 'system_verified' },
        }),
      ),
    );

    expect(fewChatMirrors!.score!).toBeLessThan(55);
    expect(manyStories!.score!).toBeGreaterThan(60);
    expect(manyStories!.score!).toBeGreaterThan(fewChatMirrors!.score! + 8);
    expect(manyStories!.score!).toBeLessThan(90);
  });

  it('does not hide high-volume canonical roots behind a type aggregate', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      makeEvent({
        eventType: 'development_story',
        sourceId: `s-${i}`,
        capacityEstimate: 70,
        impactEstimate: 65,
      }),
    );
    const page = queryContributionLedger(events, { pageSize: 20 });
    expect(page.total).toBe(20);
    expect(page.records).toHaveLength(20);
  });

  it('rewards type diversity over single-type spam', () => {
    const diverse = scoreContributionsFromEvents([
      makeEvent({ eventType: 'post', sourceId: '1', impactEstimate: 20, capacityEstimate: 25 }),
      makeEvent({
        eventType: 'governance_vote',
        sourceId: '2',
        impactEstimate: 25,
        capacityEstimate: 20,
      }),
      makeEvent({
        eventType: 'solution_comment',
        sourceId: '3',
        impactEstimate: 30,
        capacityEstimate: 35,
        collaborationEstimate: 70,
      }),
      makeEvent({
        eventType: 'law_contribution',
        sourceId: '4',
        impactEstimate: 40,
        capacityEstimate: 50,
      }),
    ]);
    const sameType = scoreContributionsFromEvents([
      makeEvent({ eventType: 'post', sourceId: '1', impactEstimate: 20, capacityEstimate: 25 }),
      makeEvent({ eventType: 'post', sourceId: '2', impactEstimate: 20, capacityEstimate: 25 }),
      makeEvent({ eventType: 'post', sourceId: '3', impactEstimate: 20, capacityEstimate: 25 }),
      makeEvent({ eventType: 'post', sourceId: '4', impactEstimate: 20, capacityEstimate: 25 }),
    ]);
    expect(diverse!.score!).toBeGreaterThan(sameType!.score!);
  });

  it('estimates verified opportunity participations as platform-direct work', () => {
    const event = estimateContributionEvent({
      profileId: 'p1',
      sourceTable: 'opportunity_participations',
      sourceId: 'part-1',
      eventType: 'opportunity_participation',
      title: 'Clinic workflow',
      verified: true,
      capacityOverride: 80,
      impactOverride: 60,
    });
    expect(event.verified).toBe(true);
    expect(event.capacityEstimate).toBe(80);
    expect(event.impactEstimate).toBe(60);
    expect(event.sourceTable).toBe('opportunity_participations');
  });

  it('does not treat unverified activity as a verified opportunity contribution', () => {
    const event = estimateContributionEvent({
      profileId: 'p1',
      sourceTable: 'posts',
      sourceId: '2',
      eventType: 'post',
      verified: false,
    });
    expect(event.eventType).not.toBe('opportunity_participation');
    expect(event.verified).toBe(false);
  });

  it('keeps contribution sync from hammering the ledger', () => {
    expect(CONTRIBUTION_SYNC_TTL_MS).toBeGreaterThanOrEqual(60_000);
  });
});

describe('i18n base prefetch helpers', () => {
  it('labels independent evidence and unclassified domain activity accurately', async () => {
    await loadBaseTranslations();
    const peeked = peekBaseTranslations() as {
      score?: { independentEvidence?: string; domainNoActivity?: string; verifiedContributions?: string };
      common?: { loading?: string };
    };
    expect(peeked).toBeTruthy();
    expect(peeked.common?.loading).toBeTruthy();
    expect(peeked.score?.independentEvidence).toBe('Independent verified evidence');
    expect(peeked.score?.verifiedContributions).toBe('Verified contributions');
    expect(peeked.score?.domainNoActivity).toBe('No classified domain activity yet.');
  });
});

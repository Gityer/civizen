import { describe, expect, it } from 'vitest';

import { isUsableScoreSnapshot, mapPublicProfileCard } from './public-profile-visibility';

const snapshot = { overall: { score: 41 }, tier: { finalTier: 'emerging' }, categories: [], validation: { verifiedEvidenceCount: 0 } };

describe('public profile card', () => {
  it('maps the server card and keeps a usable snapshot', () => {
    const card = mapPublicProfileCard({
      id: 'p1', is_own: false, show_score: true, show_endorsements: false, show_country: false, show_city: true,
      country: null, city: 'Lyon', endorsement_count: null, score: { score: 41, tier: 'emerging', snapshot },
    });
    expect(card).toMatchObject({ id: 'p1', isOwn: false, showScore: true, showEndorsements: false, showCountry: false, city: 'Lyon' });
    expect(card?.scoreSnapshot?.overall.score).toBe(41);
  });

  it('drops snapshots that do not have the rendered shape and defaults visibility to shown', () => {
    expect(isUsableScoreSnapshot({ overall: { score: 'x' } })).toBe(false);
    expect(isUsableScoreSnapshot(snapshot)).toBe(true);
    const card = mapPublicProfileCard({ id: 'p2', score: { score: 3, snapshot: { broken: true } } });
    expect(card?.scoreSnapshot).toBeNull();
    expect(card?.showScore).toBe(true);
    expect(mapPublicProfileCard(null)).toBeNull();
  });
});

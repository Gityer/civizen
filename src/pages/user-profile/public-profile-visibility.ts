import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import type { buildScoreFromProfileActivity } from '@/lib/civizen-score';

export type ProfileScore = ReturnType<typeof buildScoreFromProfileActivity>;

export type PublicProfileCard = {
  id: string;
  isOwn: boolean;
  showScore: boolean;
  showEndorsements: boolean;
  showCountry: boolean;
  showCity: boolean;
  country: string | null;
  city: string | null;
  endorsementCount: number | null;
  /** The owner's last computed score, kept by the server; null when none or hidden. */
  scoreSnapshot: ProfileScore | null;
};

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

/** True when a stored snapshot still has the shape the profile page renders. */
export function isUsableScoreSnapshot(value: unknown): value is ProfileScore {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const overall = row.overall as Record<string, unknown> | undefined;
  const tier = row.tier as Record<string, unknown> | undefined;
  return (
    typeof overall?.score === 'number' &&
    typeof tier === 'object' &&
    Array.isArray(row.categories) &&
    typeof row.validation === 'object'
  );
}

export function mapPublicProfileCard(data: unknown): PublicProfileCard | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const score = row.score && typeof row.score === 'object' ? (row.score as Record<string, unknown>) : null;
  return {
    id: String(row.id ?? ''),
    isOwn: row.is_own === true,
    showScore: bool(row.show_score, true),
    showEndorsements: bool(row.show_endorsements, true),
    showCountry: bool(row.show_country, true),
    showCity: bool(row.show_city, true),
    country: typeof row.country === 'string' ? row.country : null,
    city: typeof row.city === 'string' ? row.city : null,
    endorsementCount: typeof row.endorsement_count === 'number' ? row.endorsement_count : null,
    scoreSnapshot: score && isUsableScoreSnapshot(score.snapshot) ? score.snapshot : null,
  };
}

/** What another member may see of a profile (server-side, honours the owner's privacy settings). */
export async function loadPublicProfile(profileId: string): Promise<PublicProfileCard | null> {
  try {
    const { data, error } = await supabase.rpc('public_profile', { p_profile_id: profileId });
    if (error) return null;
    return mapPublicProfileCard(data);
  } catch {
    return null;
  }
}

/** The owner's client computed the score; the server keeps it for visitors. */
export async function saveMyScoreSnapshot(score: ProfileScore): Promise<void> {
  try {
    await supabase.rpc('save_my_score_snapshot', {
      p_score: Number(score.overall.score) || 0,
      p_tier: score.tier.finalTier ?? null,
      p_snapshot: JSON.parse(JSON.stringify(score)),
    });
  } catch {
    // best effort: the owner still sees the live computation
  }
}

/**
 * Visitors see the server snapshot and only what the owner allows (Phase 3 step 3.7); owners see their live
 * computation and refresh the snapshot when it is ready.
 */
export function usePublicProfileVisibility(input: { userId: string | undefined; isOwn: boolean; score: ProfileScore; ready: boolean }) {
  const [card, setCard] = useState<PublicProfileCard | null>(null);
  const savedFor = useRef<string | null>(null);
  const { userId, isOwn, score, ready } = input;

  useEffect(() => {
    if (!userId || isOwn) {
      setCard(null);
      return;
    }
    let active = true;
    void loadPublicProfile(userId).then((result) => {
      if (active) setCard(result);
    });
    return () => {
      active = false;
    };
  }, [userId, isOwn]);

  useEffect(() => {
    if (!isOwn || !ready || !userId) return;
    const key = `${userId}:${score.overall.score}`;
    if (savedFor.current === key) return;
    savedFor.current = key;
    void saveMyScoreSnapshot(score);
  }, [isOwn, ready, userId, score]);

  return {
    card,
    showScore: isOwn || (card?.showScore ?? true),
    showEndorsements: isOwn || (card?.showEndorsements ?? true),
    score: !isOwn && card?.scoreSnapshot ? card.scoreSnapshot : null,
  };
}

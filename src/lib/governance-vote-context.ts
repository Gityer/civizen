import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';
import type { AppRole } from '@/lib/access-control';
import { coerceCitizenshipStatus, deriveProjectedCitizenshipStatus } from '@/lib/civic-status';
import type { PillarId } from '@/lib/constants';
import {
  MIN_GOVERNANCE_SCORE,
  evaluateGovernanceEligibility,
  isNativeGovernanceApp,
  normalizeGovernanceScoreForRole,
  type GovernanceEligibilityResult,
} from '@/lib/governance-eligibility';
import { isMissingGovernanceSanctionsBackend } from '@/lib/governance-hub-backend';
import { governanceSanctionBlocksScope } from '@/lib/governance-sanctions';
import { calculateCivizenScore } from '@/lib/scoring';

type Client = SupabaseClient<Database>;

/** The profile fields the governance rules read. */
export type GovernanceVoteProfile = {
  id: string;
  role: AppRole;
  is_verified: boolean;
  is_active_citizen?: boolean | null;
  citizenship_status?: Parameters<typeof coerceCitizenshipStatus>[0];
};

export type GovernanceVoteContextState = {
  governanceScore: number | null;
  /** The score could not be loaded, so eligibility is reported as unavailable rather than denied. */
  scoreUnavailable: boolean;
  eligibility: GovernanceEligibilityResult;
  citizenshipStatus: string;
  voteBlockedBySanction: boolean;
  proposalBlockedBySanction: boolean;
  sanctionsUnavailable: boolean;
};

/**
 * Loads the member's current governance standing with the same rules as the member workspace:
 * the Civizen score comes from visible endorsements, eligibility from `evaluateGovernanceEligibility`,
 * and sanctions block voting or proposing only while they are currently active.
 */
export async function loadGovernanceVoteContext(
  client: Client,
  profile: GovernanceVoteProfile,
  options: { isNativeApp?: boolean } = {},
): Promise<GovernanceVoteContextState> {
  const citizenshipStatus = coerceCitizenshipStatus(
    profile.citizenship_status,
    deriveProjectedCitizenshipStatus(profile.role, Boolean(profile.is_verified)),
  );

  const [endorsementsResponse, sanctionsResponse] = await Promise.all([
    client
      .from('endorsements')
      .select('id, endorser_id, endorsed_id, pillar, stars, comment, created_at')
      .eq('endorsed_id', profile.id)
      .eq('is_hidden', false),
    client
      .from('governance_sanctions')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false }),
  ]);

  let governanceScore: number | null = null;
  let scoreUnavailable = false;
  if (endorsementsResponse.error) {
    console.error('Failed to load governance eligibility score:', endorsementsResponse.error);
    scoreUnavailable = true;
  } else {
    const endorsements = (endorsementsResponse.data ?? []).map((item) => ({
      ...item,
      pillar: item.pillar as PillarId,
    }));
    governanceScore = normalizeGovernanceScoreForRole(profile.role, calculateCivizenScore(endorsements).overall);
  }

  const sanctionsError = sanctionsResponse.error;
  const sanctionsUnavailable = Boolean(sanctionsError);
  if (sanctionsError && !isMissingGovernanceSanctionsBackend(sanctionsError)) {
    console.error('Failed to load governance sanctions:', sanctionsError);
  }
  const sanctions = sanctionsError ? [] : sanctionsResponse.data ?? [];

  const eligibility = evaluateGovernanceEligibility({
    isVerified: Boolean(profile.is_verified),
    role: profile.role,
    score: governanceScore,
    isNativeMobileApp: options.isNativeApp ?? isNativeGovernanceApp(),
    minScore: MIN_GOVERNANCE_SCORE,
  });

  return {
    governanceScore,
    scoreUnavailable,
    eligibility,
    citizenshipStatus,
    voteBlockedBySanction: sanctions.some((sanction) => governanceSanctionBlocksScope(sanction, 'vote')),
    proposalBlockedBySanction: sanctions.some((sanction) => governanceSanctionBlocksScope(sanction, 'proposal_create')),
    sanctionsUnavailable,
  };
}

import { supabase } from '@/integrations/supabase/client';

export type CivicStatusLayers = {
  citizenshipStatus: 'registered_member' | 'verified_member' | 'citizen';
  isVerified: boolean;
  verifiedSince: string | null;
  civicFrameworkAcceptedAt: string | null;
  /** When citizenship will be granted automatically (null when not verified or already a citizen). */
  citizenshipDueAt: string | null;
  citizenshipAcceptedAt: string | null;
  citizenshipAcceptanceMode: string | null;
  isActiveCitizen: boolean;
};

const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/** The signed-in member's civic status layers, computed by the server (Phase 3 step 3.1). */
export async function loadMyCivicStatus(): Promise<CivicStatusLayers | null> {
  let data: unknown;
  try {
    const result = await supabase.rpc('my_civic_status');
    if (result.error) return null;
    data = result.data;
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const status = row.citizenship_status;
  return {
    citizenshipStatus: status === 'citizen' || status === 'verified_member' ? status : 'registered_member',
    isVerified: row.is_verified === true,
    verifiedSince: str(row.verified_since),
    civicFrameworkAcceptedAt: str(row.civic_framework_accepted_at),
    citizenshipDueAt: str(row.citizenship_due_at),
    citizenshipAcceptedAt: str(row.citizenship_accepted_at),
    citizenshipAcceptanceMode: str(row.citizenship_acceptance_mode),
    isActiveCitizen: row.is_active_citizen === true,
  };
}

/** Accepting the civic framework shortens the wait for citizenship from 30 to 14 days after verification. */
export async function acceptCivicFramework(): Promise<string | null> {
  const { data, error } = await supabase.rpc('accept_civic_framework');
  if (error) throw new Error(error.message);
  return str(data);
}

export type EligibilityScope = 'participate' | 'vote_countable' | 'propose' | 'publish' | 'governance';
export type Eligibility = { eligible: boolean; reasons: string[]; scope: EligibilityScope };

/** One eligibility service in the database (Phase 3 step 3.2); null when the call fails. */
export async function loadMyEligibility(scope: EligibilityScope): Promise<Eligibility | null> {
  let data: unknown;
  try {
    const result = await supabase.rpc('my_eligibility', { p_scope: scope });
    if (result.error) return null;
    data = result.data;
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    eligible: row.eligible === true,
    reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : [],
    scope,
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { loadGovernanceVoteContext, type GovernanceVoteContextState } from '@/lib/governance-vote-context';
import type { GovernanceVoteIdentity } from '@/lib/governance-voting-service';

/**
 * The signed-in member's governance standing (score, eligibility, sanction blocks) plus the identity
 * to record votes with. `identity` is null until the standing has loaded or when signed out.
 */
export function useGovernanceVoteContext() {
  const { profile } = useAuth();
  const [context, setContext] = useState<GovernanceVoteContextState | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const profileId = profile?.id;
  const role = profile?.role;
  const isVerified = profile?.is_verified;
  const isActiveCitizen = profile?.is_active_citizen;
  const citizenshipStatus = profile?.citizenship_status;

  useEffect(() => {
    if (!profileId || !role) {
      setContext(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    void loadGovernanceVoteContext(supabase, {
      id: profileId,
      role,
      is_verified: Boolean(isVerified),
      is_active_citizen: isActiveCitizen,
      citizenship_status: citizenshipStatus,
    })
      .then((next) => {
        if (!cancelled) setContext(next);
      })
      .catch((error: unknown) => {
        console.error('Failed to load governance standing:', error);
        if (!cancelled) setContext(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, role, isVerified, isActiveCitizen, citizenshipStatus, reloadKey]);

  const identity = useMemo<GovernanceVoteIdentity | null>(() => {
    if (!profileId || !context) return null;
    return {
      voterId: profileId,
      influenceWeight: context.eligibility.influenceWeight,
      governanceScore: context.governanceScore,
      citizenshipStatus: context.citizenshipStatus,
      isVerified: Boolean(isVerified),
      isActiveCitizen: Boolean(isActiveCitizen),
    };
  }, [context, isActiveCitizen, isVerified, profileId]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { loading, context, identity, reload };
}

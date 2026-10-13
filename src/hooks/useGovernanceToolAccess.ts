import { useEffect, useState } from 'react';

import { canAdministerElections } from '@/lib/civic-voting/election-admin';
import { canReviewIdentityVerification } from '@/lib/identity-verification-queue';

export type GovernanceToolAccess = {
  /** Staff or Identity Verification domain member (v2 step C1). */
  identityReviewer: boolean;
  /** Founder/admin role or Civic Operations domain member (v2 step C2). */
  electionAdmin: boolean;
};

const NONE: GovernanceToolAccess = { identityReviewer: false, electionAdmin: false };

/** Server-checked governance tool access for the signed-in member (all false while loading or on error). */
export function useGovernanceToolAccess(profileId: string | undefined): GovernanceToolAccess {
  const [access, setAccess] = useState<GovernanceToolAccess>(NONE);

  useEffect(() => {
    if (!profileId) {
      setAccess(NONE);
      return undefined;
    }
    let cancelled = false;
    void Promise.all([canReviewIdentityVerification(), canAdministerElections()]).then(([identityReviewer, electionAdmin]) => {
      if (!cancelled) setAccess({ identityReviewer, electionAdmin });
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return access;
}

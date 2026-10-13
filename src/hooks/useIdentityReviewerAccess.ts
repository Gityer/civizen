import { useEffect, useState } from 'react';

import { canReviewIdentityVerification } from '@/lib/identity-verification-queue';

/** Whether the signed-in member may review identity verifications (false while loading or on error). */
export function useIdentityReviewerAccess(profileId: string | undefined): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!profileId) {
      setAllowed(false);
      return undefined;
    }
    let cancelled = false;
    void canReviewIdentityVerification().then((value) => {
      if (!cancelled) setAllowed(value);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return allowed;
}

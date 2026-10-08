import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { selectOwnedPendingAccessRequests, type PendingBusinessAccessRequest } from '@/lib/linked-business-accounts';
import type { LinkedAccountRow } from '@/components/layout/user-page-menu/user-page-menu-shared';

export type AccessRequestDecision = 'approved' | 'rejected';

/**
 * Pending access requests for the business accounts the signed-in profile owns, with the
 * owner's Approve / Decline actions. Approval establishes the requester's link server-side.
 */
export function useBusinessAccessRequests(params: {
  open: boolean;
  profileId: string | null | undefined;
  linkedAccounts: readonly LinkedAccountRow[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const { open, profileId, linkedAccounts, t } = params;
  const [pendingAccessRequests, setPendingAccessRequests] = useState<PendingBusinessAccessRequest[]>([]);
  const [reviewingAccessRequestId, setReviewingAccessRequestId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const ownedBusinessKey = useMemo(
    () =>
      linkedAccounts
        .filter((row) => row.relationship_type === 'business' && row.owner_profile_id === profileId)
        .map((row) => row.linked_profile_id)
        .sort()
        .join(','),
    [linkedAccounts, profileId],
  );

  useEffect(() => {
    if (!open || !profileId || !ownedBusinessKey) {
      setPendingAccessRequests([]);
      return;
    }
    const ownedBusinessIds = ownedBusinessKey.split(',');
    let active = true;

    Promise.resolve(
      supabase
        .from('business_account_access_requests')
        .select(
          `
            id,
            target_profile_id,
            requester_profile_id,
            created_at,
            requester:profiles!business_account_access_requests_requester_profile_id_fkey(id, full_name, username, avatar_url),
            target:profiles!business_account_access_requests_target_profile_id_fkey(id, full_name, username)
          `,
        )
        .eq('status', 'pending')
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setPendingAccessRequests([]);
            return;
          }
          setPendingAccessRequests(selectOwnedPendingAccessRequests(data ?? [], ownedBusinessIds));
        }),
    ).catch(() => {
      if (active) setPendingAccessRequests([]);
    });

    return () => {
      active = false;
    };
  }, [open, ownedBusinessKey, profileId, reloadKey]);

  const reviewAccessRequest = async (requestId: string, decision: AccessRequestDecision) => {
    if (reviewingAccessRequestId) return;
    setReviewingAccessRequestId(requestId);
    const { error } = await supabase.rpc('review_business_account_access_request', {
      p_request_id: requestId,
      p_decision: decision,
    });
    setReviewingAccessRequestId(null);
    if (error) {
      toast.error(t('home.accountSwitchAccessRequestReviewFailed'));
      return;
    }
    toast.success(
      t(decision === 'approved' ? 'home.accountSwitchAccessRequestApproved' : 'home.accountSwitchAccessRequestRejected'),
    );
    setReloadKey((key) => key + 1);
  };

  return { pendingAccessRequests, reviewingAccessRequestId, reviewAccessRequest };
}

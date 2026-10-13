import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { canAccessGovernanceTools } from '@/components/governance/member/governance-member-model';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveOfficeKeys } from '@/hooks/useActiveOfficeKeys';
import { useIdentityReviewerAccess } from '@/hooks/useIdentityReviewerAccess';
import { useGovernanceVoteContext } from '@/hooks/useGovernanceVoteContext';
import { deriveGovernancePermissions } from '@/lib/governance-permission-model';
import { StewardConsole } from './StewardConsole';

/**
 * The steward console page (/governance/tools/steward). Voting and proposals live on the member
 * Governance page (/governance); the legacy proposal system is retired (v2 step C5).
 */
export function GovernanceDashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { loading, context } = useGovernanceVoteContext();
  const officeKeys = useActiveOfficeKeys(profile?.id);
  const identityReviewer = useIdentityReviewerAccess(profile?.id);

  const permissions = useMemo(
    () =>
      deriveGovernancePermissions({
        permissions: profile?.effective_permissions ?? [],
        eligible: Boolean(context?.eligibility.eligible),
        voteBlockedBySanction: Boolean(context?.voteBlockedBySanction),
        proposalBlockedBySanction: Boolean(context?.proposalBlockedBySanction),
        activeOfficeKeys: officeKeys,
      }),
    [context, officeKeys, profile?.effective_permissions],
  );
  const consoleAllowed = canAccessGovernanceTools({
    role: profile?.role,
    permissions: profile?.effective_permissions,
    officeKeys,
    identityReviewer,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{t('governanceDashboard.standingTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {context ? (profile?.username ?? '') : t('governanceDashboard.standingUnavailable')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canVote ? (
              <Badge>{t('governanceDashboard.canVote')}</Badge>
            ) : (
              context && <Badge variant="outline">{t('governanceDashboard.notEligible')}</Badge>
            )}
            {permissions.canCreateProposals && <Badge variant="secondary">{t('governanceDashboard.canPropose')}</Badge>}
            {permissions.isOfficeHolder && <Badge variant="secondary">{t('governanceDashboard.officeHolder')}</Badge>}
          </div>
        </div>
      </Card>

      {consoleAllowed ? (
        <StewardConsole canManageOffices={permissions.canManageOffices} />
      ) : (
        <Card className="p-6 text-sm text-muted-foreground" data-testid="steward-console-no-access">
          {t('governanceDashboard.stewardNoAccess')}
        </Card>
      )}
    </div>
  );
}

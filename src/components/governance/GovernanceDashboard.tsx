import { useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveOfficeKeys } from '@/hooks/useActiveOfficeKeys';
import { useGovernanceVoteContext } from '@/hooks/useGovernanceVoteContext';
import { deriveGovernancePermissions } from '@/lib/governance-permission-model';
import { getGovernanceProposalStatusLabelKey } from '@/lib/governance-proposals';
import type { GovernanceProposal, GovernanceProposalFilter } from '@/lib/governance-ui.types';
import { GovernanceProposalsList } from './GovernanceProposalsList';
import { StewardConsole } from './StewardConsole';

export function GovernanceDashboard() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { loading, context, identity } = useGovernanceVoteContext();
  const officeKeys = useActiveOfficeKeys(profile?.id);
  const [filter, setFilter] = useState<GovernanceProposalFilter>('open');
  const [selected, setSelected] = useState<GovernanceProposal | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDate = (value: string) => new Date(value).toLocaleDateString(language);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('governanceDashboard.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('governanceDashboard.subtitle')}</p>
      </div>

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

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList>
          <TabsTrigger value="proposals">{t('governanceDashboard.tabProposals')}</TabsTrigger>
          {permissions.canAccessStewardConsole && (
            <TabsTrigger value="steward">{t('governanceDashboard.tabSteward')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          <div className="flex gap-2">
            {(['open', 'closed'] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={filter === option ? 'default' : 'outline'}
                onClick={() => {
                  setFilter(option);
                  setSelected(null);
                }}
              >
                {t(option === 'open' ? 'governanceDashboard.filterOpen' : 'governanceDashboard.filterClosed')}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <GovernanceProposalsList
                filter={filter}
                identity={identity}
                canVote={permissions.canVote}
                voteBlockedBySanction={Boolean(context?.voteBlockedBySanction)}
                onProposalSelect={setSelected}
              />
            </div>

            <div>
              {selected ? (
                <Card className="space-y-4 p-6">
                  <h3 className="text-lg font-semibold">{selected.title}</h3>
                  <Detail label={t('governanceDashboard.summary')}>{selected.body || selected.summary}</Detail>
                  <Detail label={t('governanceDashboard.type')}>{selected.proposal_type}</Detail>
                  <Detail label={t('governanceDashboard.status')}>
                    <Badge>{t(getGovernanceProposalStatusLabelKey(selected.status))}</Badge>
                  </Detail>
                  <Detail label={t('governanceDashboard.votingPeriod')}>
                    {formatDate(selected.opens_at)} – {formatDate(selected.closes_at)}
                  </Detail>
                </Card>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">{t('governanceDashboard.selectProposal')}</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {permissions.canAccessStewardConsole && (
          <TabsContent value="steward" className="space-y-4">
            <StewardConsole canManageOffices={permissions.canManageOffices} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
      <div className="mt-1 whitespace-pre-line text-sm">{children}</div>
    </div>
  );
}

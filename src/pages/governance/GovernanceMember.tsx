import { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { GovernanceProposalsTab } from '@/components/governance/member/GovernanceProposalsTab';
import { GovernanceToolsTab } from '@/components/governance/member/GovernanceToolsTab';
import { GovernanceVotesTab } from '@/components/governance/member/GovernanceVotesTab';
import {
  canAccessGovernanceTools,
  groupElections,
  groupProposals,
  readGovernanceTab,
  type GovernanceMemberTab,
} from '@/components/governance/member/governance-member-model';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveOfficeKeys } from '@/hooks/useActiveOfficeKeys';
import {
  getVotingProposalSupport,
  listCivicElections,
  listVotingProposals,
  myConsultationBallot,
  toConsultationReasonCode,
  toggleVotingProposalSupport,
  type CivicElection,
  type MyConsultationBallot,
  type VotingProposal,
  type VotingProposalSupport,
} from '@/lib/civic-voting';

/**
 * The one member-facing Governance page: what is open to vote on, what members are proposing,
 * and (for people who can act there) the steward and workspace tools.
 */
export default function GovernanceMember() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const officeKeys = useActiveOfficeKeys(profile?.id);
  const toolsAllowed = canAccessGovernanceTools({
    role: profile?.role,
    permissions: profile?.effective_permissions,
    officeKeys,
  });
  const tab = readGovernanceTab(location.search, toolsAllowed);

  const [elections, setElections] = useState<CivicElection[]>([]);
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [ballots, setBallots] = useState<Record<string, MyConsultationBallot | null>>({});
  const [support, setSupport] = useState<Record<string, VotingProposalSupport | null>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [electionResult, proposalRows] = await Promise.all([
      listCivicElections(),
      listVotingProposals().catch(() => [] as VotingProposal[]),
    ]);
    const groups = groupElections(electionResult.elections);
    setElections(electionResult.elections);
    setProposals(proposalRows);

    if (user) {
      const ballotEntries = await Promise.all(
        groups.open.map(async (election) => [election.id, await myConsultationBallot(election.id)] as const),
      );
      setBallots(Object.fromEntries(ballotEntries));
      const drafts = proposalRows.filter((row) => row.status === 'draft');
      const supportEntries = await Promise.all(
        drafts.map(async (row) => [row.id, await getVotingProposalSupport(row.id)] as const),
      );
      setSupport(Object.fromEntries(supportEntries));
    } else {
      setBallots({});
      setSupport({});
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const electionGroups = useMemo(() => groupElections(elections), [elections]);
  const proposalGroups = useMemo(() => groupProposals(proposals, profile?.id), [proposals, profile?.id]);

  const setTab = (next: string) => {
    const params = new URLSearchParams(location.search);
    if (next === 'votes') params.delete('tab');
    else params.set('tab', next);
    const query = params.toString();
    navigate({ pathname: location.pathname, search: query ? `?${query}` : '' }, { replace: true });
  };

  const supportProposal = async (proposalId: string) => {
    try {
      const summary = await toggleVotingProposalSupport(proposalId);
      setSupport((prev) => ({ ...prev, [proposalId]: summary }));
      toast.success(summary.supported ? t('proposalSupport.supported') : t('proposalSupport.unsupported'));
    } catch (error) {
      const code = toConsultationReasonCode(error);
      toast.error(code ? t(`civicBallot.reason.${code}`) : t('proposalSupport.supportFailed'));
    }
  };

  return (
    <AppLayout>
      <div className="flex min-h-0 flex-col px-4 pb-28 pt-4">
        <div className="mb-4">
          <AppPageHeader
            title={t('governanceMember.title')}
            subtitle={t('governanceMember.subtitle')}
            leading={<Landmark className="h-5 w-5 text-primary" aria-hidden />}
            fallbackPath="/governance"
          />
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as GovernanceMemberTab)}>
          <TabsList className="mb-4 w-full justify-start overflow-x-auto">
            <TabsTrigger value="votes">{t('governanceMember.tabVotes')}</TabsTrigger>
            <TabsTrigger value="proposals">{t('governanceMember.tabProposals')}</TabsTrigger>
            {toolsAllowed ? <TabsTrigger value="tools">{t('governanceMember.tabTools')}</TabsTrigger> : null}
          </TabsList>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('common.loading')}
            </div>
          ) : (
            <>
              <TabsContent value="votes">
                <GovernanceVotesTab
                  t={t}
                  language={language}
                  groups={electionGroups}
                  ballots={ballots}
                  signedIn={Boolean(user)}
                  onOpen={(id) => navigate(`/governance/voting/${id}`)}
                />
              </TabsContent>
              <TabsContent value="proposals">
                <GovernanceProposalsTab
                  t={t}
                  groups={proposalGroups}
                  support={support}
                  onOpen={(id) => navigate(`/governance/voting/proposals/${id}`)}
                  onSupport={(id) => void supportProposal(id)}
                />
              </TabsContent>
              {toolsAllowed ? (
                <TabsContent value="tools">
                  <GovernanceToolsTab t={t} />
                </TabsContent>
              ) : null}
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

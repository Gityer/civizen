import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  canManageVotingProposals,
  canPublishVotingProposal,
  getVotingProposal,
  getVotingProposalSupport,
  openVotingProposalForSupport,
  publishVotingProposal,
  toConsultationReasonCode,
  toggleVotingProposalSupport,
  updateVotingProposalSettings,
  type VotingProposal,
  type VotingProposalSupport,
} from '@/lib/civic-voting';
import { ProposalSettingsCard, type ProposalSettingsInput } from '@/pages/governance/civic-voting-proposal/ProposalSettingsCard';
import { ProposalSupportCard } from '@/pages/governance/civic-voting-proposal/ProposalSupportCard';

export default function CivicVotingProposal() {
  const { proposalId = '' } = useParams();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<VotingProposal | null>(null);
  const [support, setSupport] = useState<VotingProposalSupport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isManager = canManageVotingProposals(profile?.role);
  const isAuthor = Boolean(profile?.id && proposal && proposal.createdByProfileId === profile.id);
  const canPublish = proposal
    ? canPublishVotingProposal({ role: profile?.role, profileId: profile?.id, proposal, support })
    : false;

  const load = useCallback(async () => {
    if (!proposalId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await getVotingProposal(proposalId);
      setProposal(row);
      setSupport(row && row.status === 'draft' ? await getVotingProposalSupport(proposalId) : null);
    } catch {
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const explain = (error: unknown, fallbackKey: string) => {
    const code = toConsultationReasonCode(error);
    return code ? t(`civicBallot.reason.${code}`) : error instanceof Error && error.message ? error.message : t(fallbackKey);
  };

  const run = async (action: () => Promise<void>, fallbackKey: string) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(explain(error, fallbackKey));
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = () =>
    run(async () => {
      if (!proposal) return;
      const electionId = await publishVotingProposal(proposal.id);
      toast.success(t('civicVoting.proposals.published'));
      navigate(`/governance/voting/${electionId}`);
    }, 'civicVoting.proposals.publishFailed');

  const handleOpenForSupport = (threshold: number) =>
    run(async () => {
      if (!proposal) return;
      setSupport(await openVotingProposalForSupport(proposal.id, threshold));
      setProposal({ ...proposal, openForSupport: true, supportThreshold: threshold });
      toast.success(t('proposalSupport.openedForSupport'));
    }, 'proposalSupport.supportFailed');

  const handleToggleSupport = () =>
    run(async () => {
      if (!proposal) return;
      const summary = await toggleVotingProposalSupport(proposal.id);
      setSupport(summary);
      toast.success(summary.supported ? t('proposalSupport.supported') : t('proposalSupport.unsupported'));
    }, 'proposalSupport.supportFailed');

  const handleSaveSettings = (input: ProposalSettingsInput) =>
    run(async () => {
      if (!proposal) return;
      await updateVotingProposalSettings({ proposalId: proposal.id, ...input });
      setProposal({
        ...proposal,
        scopeKind: input.scopeKind,
        scopeCountryCode: input.scopeCountryCode,
        votingOpensAt: input.votingOpensAt,
        votingClosesAt: input.votingClosesAt,
      });
      toast.success(t('proposalSupport.settingsSaved'));
    }, 'proposalSupport.settingsFailed');

  return (
    <CivicVotingPageShell
      sectionTrail={[
        { label: t('civicVoting.openElections'), href: '/governance/voting' },
        { label: t('civicVoting.proposals.singular') },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-4 px-1 py-2 pb-8">
        {loading ? (
          <Card className="flex items-center gap-2 rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </Card>
        ) : null}

        {!loading && !proposal ? (
          <Card className="rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">
            {t('civicVoting.proposals.notFound')}
          </Card>
        ) : null}

        {proposal ? (
          <>
            <Card className="space-y-4 rounded-2xl border-border/60 p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{t(`civicVoting.proposals.status.${proposal.status}`)}</Badge>
                <Badge variant="secondary">{t('civicVoting.proposals.nonbinding')}</Badge>
                <Badge variant="outline">
                  {proposal.scopeKind === 'country' && proposal.scopeCountryCode
                    ? proposal.scopeCountryCode
                    : t('civicVoting.filters.global')}
                </Badge>
              </div>
              <h1 className="font-display text-xl font-bold text-foreground">{proposal.title}</h1>
              {proposal.summary ? <p className="text-sm text-muted-foreground">{proposal.summary}</p> : null}
              {proposal.body ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{proposal.body}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">{t('civicVoting.proposals.limitations')}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link to={`/contribute/matters/${proposal.matterId}`}>{t('civicVoting.proposals.openMatter')}</Link>
                </Button>
                {canPublish ? (
                  <Button type="button" size="sm" disabled={busy} onClick={() => void handlePublish()}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('civicVoting.proposals.publish')}
                  </Button>
                ) : null}
                {proposal.electionId ? (
                  <Button type="button" size="sm" asChild>
                    <Link to={`/governance/voting/${proposal.electionId}`}>{t('civicVoting.proposals.openBallot')}</Link>
                  </Button>
                ) : null}
              </div>
              {proposal.status === 'draft' && isAuthor && !isManager && !canPublish ? (
                <p className="text-xs text-muted-foreground">{t('proposalSupport.authorPublishHint')}</p>
              ) : null}
            </Card>

            <ProposalSupportCard
              t={t}
              proposal={proposal}
              support={support}
              isAuthorOrManager={isAuthor || isManager}
              signedIn={Boolean(user)}
              busy={busy}
              onOpenForSupport={(threshold) => void handleOpenForSupport(threshold)}
              onToggleSupport={() => void handleToggleSupport()}
            />

            {isAuthor || isManager ? (
              <ProposalSettingsCard t={t} proposal={proposal} busy={busy} onSave={(input) => void handleSaveSettings(input)} />
            ) : null}
          </>
        ) : null}
      </div>
    </CivicVotingPageShell>
  );
}

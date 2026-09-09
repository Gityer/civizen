import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  canManageVotingProposals,
  getVotingProposal,
  publishVotingProposal,
  type VotingProposal,
} from '@/lib/civic-voting';
import { toast } from 'sonner';

export default function CivicVotingProposal() {
  const { proposalId = '' } = useParams();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<VotingProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const canPublish = canManageVotingProposals(profile?.role);

  const load = useCallback(async () => {
    if (!proposalId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await getVotingProposal(proposalId);
      setProposal(row);
    } catch {
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePublish = async () => {
    if (!proposal) return;
    setPublishing(true);
    try {
      const electionId = await publishVotingProposal(proposal.id);
      toast.success(t('civicVoting.proposals.published'));
      navigate(`/governance/voting/${electionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('civicVoting.proposals.publishFailed'));
    } finally {
      setPublishing(false);
    }
  };

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
          <Card className="space-y-4 rounded-2xl border-border/60 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(`civicVoting.proposals.status.${proposal.status}`)}</Badge>
              <Badge variant="secondary">{t('civicVoting.proposals.nonbinding')}</Badge>
              {proposal.scopeKind === 'global' ? (
                <Badge variant="outline">{t('civicVoting.filters.global')}</Badge>
              ) : null}
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">{proposal.title}</h1>
            {proposal.summary ? (
              <p className="text-sm text-muted-foreground">{proposal.summary}</p>
            ) : null}
            {proposal.body ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {proposal.body}
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">{t('civicVoting.proposals.limitations')}</p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to={`/contribute/matters/${proposal.matterId}`}>
                  {t('civicVoting.proposals.openMatter')}
                </Link>
              </Button>
              {proposal.status === 'draft' && canPublish ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={publishing}
                  onClick={() => void handlePublish()}
                >
                  {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('civicVoting.proposals.publish')}
                </Button>
              ) : null}
              {proposal.electionId ? (
                <Button type="button" size="sm" asChild>
                  <Link to={`/governance/voting/${proposal.electionId}`}>
                    {t('civicVoting.proposals.openBallot')}
                  </Link>
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </CivicVotingPageShell>
  );
}

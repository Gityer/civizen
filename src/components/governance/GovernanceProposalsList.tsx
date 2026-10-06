import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getGovernanceProposalStatusLabelKey,
  getGovernanceVoteChoiceLabelKey,
} from '@/lib/governance-proposals';
import type {
  GovernanceProposal,
  GovernanceProposalFilter,
  GovernanceProposalResults,
  GovernanceVoteChoice,
} from '@/lib/governance-ui.types';
import {
  fetchGovernanceProposalResults,
  fetchGovernanceProposals,
  fetchMyGovernanceVotes,
} from '@/lib/governance-ui-utils';
import {
  getGovernanceVoteBlockReason,
  recordGovernanceVote,
  type GovernanceVoteIdentity,
} from '@/lib/governance-voting-service';

const VOTE_CHOICES: GovernanceVoteChoice[] = ['approve', 'reject', 'abstain'];

interface GovernanceProposalsListProps {
  filter: GovernanceProposalFilter;
  identity: GovernanceVoteIdentity | null;
  canVote: boolean;
  voteBlockedBySanction: boolean;
  onProposalSelect?: (proposal: GovernanceProposal) => void;
}

export function GovernanceProposalsList({
  filter,
  identity,
  canVote,
  voteBlockedBySanction,
  onProposalSelect,
}: GovernanceProposalsListProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [results, setResults] = useState<Record<string, GovernanceProposalResults>>({});
  const [myVotes, setMyVotes] = useState<Record<string, GovernanceVoteChoice>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);

  const profileId = profile?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const rows = await fetchGovernanceProposals(supabase, filter);
      const [nextResults, nextVotes] = await Promise.all([
        fetchGovernanceProposalResults(supabase, rows),
        profileId
          ? fetchMyGovernanceVotes(
              supabase,
              profileId,
              rows.map((row) => row.id),
            )
          : Promise.resolve({}),
      ]);
      setProposals(rows);
      setResults(nextResults);
      setMyVotes(nextVotes);
    } catch (error) {
      console.error('Failed to load governance proposals:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [filter, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleVote = async (proposal: GovernanceProposal, choice: GovernanceVoteChoice) => {
    const blockReason = getGovernanceVoteBlockReason({
      signedIn: Boolean(identity),
      voteBlockedBySanction,
      eligible: canVote,
    });
    if (blockReason || !identity) return;

    setVotingProposalId(proposal.id);
    const outcome = await recordGovernanceVote(supabase, { proposalId: proposal.id, choice, identity });
    setVotingProposalId(null);

    if (!outcome.ok) {
      toast.error(t('governanceDashboard.voteFailed'));
      return;
    }
    toast.success(t('governanceDashboard.voteSaved'));
    setMyVotes((previous) => ({ ...previous, [proposal.id]: choice }));
    try {
      const updated = await fetchGovernanceProposalResults(supabase, [proposal]);
      setResults((previous) => ({ ...previous, ...updated }));
    } catch (error) {
      console.error('Failed to refresh proposal results:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (failed || proposals.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          {failed ? t('governanceDashboard.loadFailed') : t('governanceDashboard.noProposals')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => {
        const tally = results[proposal.id];
        const myVote = myVotes[proposal.id];
        const isOpen = proposal.status === 'open';
        const busy = votingProposalId === proposal.id;

        return (
          <Card
            key={proposal.id}
            className="cursor-pointer p-6 transition-shadow hover:shadow-md"
            onClick={() => onProposalSelect?.(proposal)}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold">{proposal.title}</h3>
                  {proposal.summary && <p className="mt-1 text-sm text-muted-foreground">{proposal.summary}</p>}
                </div>
                <Badge variant={isOpen ? 'default' : 'secondary'}>
                  {t(getGovernanceProposalStatusLabelKey(proposal.status))}
                </Badge>
              </div>

              {tally && (
                <div className="space-y-2">
                  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                    <span>{t('governanceDashboard.totalVotes', { count: tally.totalVotes })}</span>
                    <span>
                      {t('governanceDashboard.quorum', { met: tally.decisiveVotes, required: tally.requiredQuorum })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <ResultBar
                      label={t(getGovernanceVoteChoiceLabelKey('approve'))}
                      percentage={tally.approvalPercentage}
                      barClass="bg-green-500"
                    />
                    <ResultBar
                      label={t(getGovernanceVoteChoiceLabelKey('reject'))}
                      percentage={tally.rejectionPercentage}
                      barClass="bg-red-500"
                    />
                  </div>
                </div>
              )}

              {isOpen && canVote && !voteBlockedBySanction && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {VOTE_CHOICES.map((choice) => (
                    <Button
                      key={choice}
                      size="sm"
                      variant={myVote === choice ? 'default' : 'outline'}
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleVote(proposal, choice);
                      }}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t(getGovernanceVoteChoiceLabelKey(choice))}
                    </Button>
                  ))}
                </div>
              )}

              {myVote && !isOpen && (
                <p className="pt-2 text-sm text-muted-foreground">
                  {t('governanceHub.yourVote', { choice: t(getGovernanceVoteChoiceLabelKey(myVote)) })}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ResultBar({ label, percentage, barClass }: { label: string; percentage: number; barClass: string }) {
  return (
    <div className="flex-1">
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full transition-all ${barClass}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

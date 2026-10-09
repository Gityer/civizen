import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Loader2, Vote, XCircle } from 'lucide-react';

import { GovernanceGuardianSignoffCard } from '@/components/governance/GovernanceGuardianSignoffCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Database, Json } from '@/integrations/supabase/types';
import {
  getGovernanceExecutionActionLabelKey,
  readGovernanceProposalExecutionSpec,
} from '@/lib/governance-execution';
import {
  readGovernanceExecutionThresholdRuleFromMetadata,
  resolveGovernanceExecutionThresholdRule,
} from '@/lib/governance-execution-thresholds';
import {
  getGovernanceImplementationStatusClassName,
  getGovernanceImplementationStatusLabelKey,
  getGovernanceUnitLabelKey,
} from '@/lib/governance-implementation';
import {
  getGovernanceDecisionClassLabelKey,
  getGovernanceProposalStatusLabelKey,
  getGovernanceVoteChoiceLabelKey,
  tallyGovernanceVotes,
} from '@/lib/governance-proposals';

type ProposalRow = Database['public']['Tables']['governance_proposals']['Row'];
type VoteRow = Database['public']['Tables']['governance_proposal_votes']['Row'];
type EventRow = Database['public']['Tables']['governance_proposal_events']['Row'];
type ProposalImplementationRow = Database['public']['Tables']['governance_proposal_implementations']['Row'];
type GovernanceExecutionUnitRow = Database['public']['Tables']['governance_execution_units']['Row'];
type ProfileDirectoryRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'username' | 'role' | 'is_verified' | 'is_active_citizen'
>;
type MonetaryPolicyProfileRow = Database['public']['Tables']['monetary_policy_profiles']['Row'];
type ContentItemRow = Pick<
  Database['public']['Tables']['content_items']['Row'],
  'id' | 'title' | 'review_status' | 'content_type' | 'professional_domain' | 'source_table'
>;

export type GovernanceHubProposalsListProps = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatDateTime: (value: string | null) => string;
  formatProfileLabel: (profile: ProfileDirectoryRow) => string;
  formatContentItemLabel: (item: ContentItemRow) => string;
  loadingHub: boolean;
  backendUnavailable: boolean;
  proposals: ProposalRow[];
  votesByProposal: Record<string, VoteRow[]>;
  currentUserVotes: Record<string, VoteRow | undefined>;
  events: EventRow[];
  implementationsByProposal: Record<string, ProposalImplementationRow[]>;
  governanceEligible: boolean;
  voteBlockedBySanction: boolean;
  votingProposalId: string | null;
  onVote: (proposal: ProposalRow, choice: VoteRow['choice']) => Promise<void>;
  isGuardianSigner: boolean;
  profileId: string | null;
  onGuardianSignoffUpdated: () => Promise<void>;
  unitsById: Record<string, GovernanceExecutionUnitRow | undefined>;
  currentUserUnitIds: Set<string>;
  executionBlockedBySanction: boolean;
  profileDirectoryById: Record<string, ProfileDirectoryRow | undefined>;
  monetaryPolicyProfiles: MonetaryPolicyProfileRow[];
  contentItemsById: Record<string, ContentItemRow | undefined>;
  studyCertificationLabelByKey: Record<string, string>;
  executingImplementationId: string | null;
  onExecuteImplementation: (proposal: ProposalRow, implementation: ProposalImplementationRow) => Promise<void>;
  showControls?: boolean;
  emptyLabel?: string;
};

export function GovernanceHubProposalsList({
  t,
  formatDateTime,
  formatProfileLabel,
  formatContentItemLabel,
  loadingHub,
  backendUnavailable,
  proposals,
  votesByProposal,
  currentUserVotes,
  events,
  implementationsByProposal,
  governanceEligible,
  voteBlockedBySanction,
  votingProposalId,
  onVote,
  isGuardianSigner,
  profileId,
  onGuardianSignoffUpdated,
  unitsById,
  currentUserUnitIds,
  executionBlockedBySanction,
  profileDirectoryById,
  monetaryPolicyProfiles,
  contentItemsById,
  studyCertificationLabelByKey,
  executingImplementationId,
  onExecuteImplementation,
  showControls = true,
  emptyLabel,
}: GovernanceHubProposalsListProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'needs_my_vote' | 'approved' | 'execution_queue' | 'mine_executable'>('open');
  const [activeSort, setActiveSort] = useState<'closing_soon' | 'recently_created' | 'most_support'>('closing_soon');

  const filteredAndSortedProposals = useMemo(() => {
    const nowMs = Date.now();

    const filtered = proposals.filter((proposal) => {
      const isOpen = proposal.status === 'open';
      const hasExecutionQueue = (implementationsByProposal[proposal.id] || []).length > 0;
      const canExecuteFromMyUnits = (implementationsByProposal[proposal.id] || []).some((implementation) => (
        currentUserUnitIds.has(implementation.unit_id)
        && (implementation.status === 'queued' || implementation.status === 'blocked' || implementation.status === 'in_progress')
      ));
      const missingMyVote = Boolean(profileId) && isOpen && !currentUserVotes[proposal.id];

      switch (activeFilter) {
        case 'open':
          return isOpen;
        case 'needs_my_vote':
          return missingMyVote;
        case 'approved':
          return proposal.status === 'approved';
        case 'execution_queue':
          return hasExecutionQueue;
        case 'mine_executable':
          return canExecuteFromMyUnits;
        case 'all':
        default:
          return true;
      }
    });

    return [...filtered].sort((left, right) => {
      if (activeSort === 'recently_created') {
        return left.created_at < right.created_at ? 1 : -1;
      }
      if (activeSort === 'most_support') {
        const leftVotes = votesByProposal[left.id] || [];
        const rightVotes = votesByProposal[right.id] || [];
        const leftTally = tallyGovernanceVotes(leftVotes);
        const rightTally = tallyGovernanceVotes(rightVotes);
        return rightTally.approvals - leftTally.approvals;
      }

      const leftIsOpen = left.status === 'open';
      const rightIsOpen = right.status === 'open';
      if (leftIsOpen !== rightIsOpen) return leftIsOpen ? -1 : 1;
      if (!leftIsOpen && !rightIsOpen) return left.created_at < right.created_at ? 1 : -1;

      const leftClosesDelta = Math.abs(new Date(left.closes_at).getTime() - nowMs);
      const rightClosesDelta = Math.abs(new Date(right.closes_at).getTime() - nowMs);
      return leftClosesDelta - rightClosesDelta;
    });
  }, [activeFilter, activeSort, currentUserUnitIds, currentUserVotes, implementationsByProposal, profileId, proposals, votesByProposal]);

  if (loadingHub) {
    return (
      <Card className="flex items-center justify-center gap-2 rounded-3xl border-border/60 px-6 py-16 text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('common.loading')}</span>
      </Card>
    );
  }

  if (backendUnavailable) {
    return (
      <Card className="rounded-3xl border-border/60 p-5 text-sm text-muted-foreground shadow-sm">
        {t('governanceHub.backendUnavailable')}
      </Card>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card className="rounded-3xl border-border/60 p-5 text-sm text-muted-foreground shadow-sm">
        {t('governanceHub.empty')}
      </Card>
    );
  }

  return (
    <>
      {showControls ? (
        <Card className="rounded-3xl border-border/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={activeFilter === 'open' ? 'secondary' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveFilter('open')}
            >
              {t('governanceHub.filters.open')}
            </Badge>
            <Badge
              variant={activeFilter === 'needs_my_vote' ? 'secondary' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveFilter('needs_my_vote')}
            >
              {t('governanceHub.filters.needsMyVote')}
            </Badge>
            <Badge
              variant={activeFilter === 'approved' ? 'secondary' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveFilter('approved')}
            >
              {t('governanceHub.filters.approved')}
            </Badge>
            <Badge
              variant={activeFilter === 'execution_queue' ? 'secondary' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveFilter('execution_queue')}
            >
              {t('governanceHub.filters.executionQueue')}
            </Badge>
            <Badge
              variant={activeFilter === 'mine_executable' ? 'secondary' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveFilter('mine_executable')}
            >
              {t('governanceHub.filters.mineExecutable')}
            </Badge>
            <Badge
              variant={activeFilter === 'all' ? 'secondary' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveFilter('all')}
            >
              {t('governanceHub.filters.all')}
            </Badge>

            <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
              <Button size="sm" variant={activeSort === 'closing_soon' ? 'secondary' : 'outline'} onClick={() => setActiveSort('closing_soon')}>
                {t('governanceHub.sort.closingSoon')}
              </Button>
              <Button size="sm" variant={activeSort === 'recently_created' ? 'secondary' : 'outline'} onClick={() => setActiveSort('recently_created')}>
                {t('governanceHub.sort.recentlyCreated')}
              </Button>
              <Button size="sm" variant={activeSort === 'most_support' ? 'secondary' : 'outline'} onClick={() => setActiveSort('most_support')}>
                {t('governanceHub.sort.mostSupport')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {filteredAndSortedProposals.length === 0 ? (
        <Card className="rounded-3xl border-border/60 p-5 text-sm text-muted-foreground shadow-sm">
          {emptyLabel || t('governanceHub.filters.empty')}
        </Card>
      ) : null}

      {filteredAndSortedProposals.map((proposal) => {
        const proposalVotes = votesByProposal[proposal.id] || [];
        const voteTally = tallyGovernanceVotes(proposalVotes);
        const decisiveVotes = Math.max(0, voteTally.approvals + voteTally.rejections);
        const approvePct = decisiveVotes > 0 ? Math.round((voteTally.approvals / decisiveVotes) * 100) : 0;
        const rejectPct = decisiveVotes > 0 ? Math.round((voteTally.rejections / decisiveVotes) * 100) : 0;
        const abstainPct = voteTally.totalVotes > 0 ? Math.round((voteTally.abstentions / voteTally.totalVotes) * 100) : 0;
        const quorumProgressPct = Math.min(100, Math.round((voteTally.decisiveVotes / Math.max(1, proposal.required_quorum)) * 100));
        const currentVote = currentUserVotes[proposal.id];
        const recentEvent = events.find((event) => event.proposal_id === proposal.id);
        const civiDiscussionEvent = events.find(
          (event) => event.proposal_id === proposal.id && event.event_type === 'discussion.nela',
        );
        const civiDiscussionComment =
          civiDiscussionEvent && civiDiscussionEvent.payload && typeof civiDiscussionEvent.payload === 'object'
            ? (civiDiscussionEvent.payload as Record<string, unknown>).comment
            : null;
        const proposalImplementations = implementationsByProposal[proposal.id] || [];
        const executionSpec = readGovernanceProposalExecutionSpec(proposal.metadata);
        const requiresGuardianSignoff = (
          readGovernanceExecutionThresholdRuleFromMetadata(proposal.metadata)
          || resolveGovernanceExecutionThresholdRule({
            actionType: executionSpec.actionType,
            decisionClass: proposal.decision_class,
          })
        ).approvalClass === 'guardian_threshold';

        const voteBlockedReason = !governanceEligible
          ? t('governanceHub.voteBlocked')
          : voteBlockedBySanction
            ? t('governanceHub.voteBlockedBySanction')
            : null;

        return (
          <Card id={`proposal-${proposal.id}`} key={proposal.id} className="rounded-2xl border-border/60 p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{t(getGovernanceProposalStatusLabelKey(proposal.status))}</Badge>
                  <Badge variant="outline">{t(getGovernanceDecisionClassLabelKey(proposal.decision_class))}</Badge>
                  <Badge variant="outline">{t(getGovernanceExecutionActionLabelKey(executionSpec.actionType))}</Badge>
                  {proposal.bootstrap_mode && <Badge variant="outline">{t('governanceHub.bootstrapMode')}</Badge>}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground line-clamp-1">{proposal.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{proposal.summary}</p>
                </div>
                <details className="rounded-xl border border-border/60 bg-background/50 p-2">
                  <summary className="cursor-pointer text-xs font-medium text-foreground">
                    {t('governanceHub.proposalDetailsToggle')}
                  </summary>
                  <p className="mt-2 text-xs leading-5 text-foreground/90">{proposal.body}</p>
                </details>
              </div>

              <div className="min-w-[220px] space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('governanceHub.opensAt')}</p>
                    <p className="mt-1 text-foreground">{formatDateTime(proposal.opens_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('governanceHub.closesAt')}</p>
                    <p className="mt-1 text-foreground">{formatDateTime(proposal.closes_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('governanceHub.quorum')}</p>
                    <p className="mt-1 text-foreground">{proposal.required_quorum}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('governanceHub.eligibleSnapshot')}</p>
                    <p className="mt-1 text-foreground">{proposal.eligible_voter_count_snapshot}</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('governanceHub.weightedTallyTitle')}</p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span>{t('governanceHub.voteChoices.approve')}</span>
                        <span>{approvePct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${approvePct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span>{t('governanceHub.voteChoices.reject')}</span>
                        <span>{rejectPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-rose-500" style={{ width: `${rejectPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span>{t('governanceHub.voteChoices.abstain')}</span>
                        <span>{abstainPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-slate-400" style={{ width: `${abstainPct}%` }} />
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span>{t('governanceHub.quorumProgress')}</span>
                        <span>{quorumProgressPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${quorumProgressPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {currentVote && (
                  <p className="text-xs text-muted-foreground">
                    {t('governanceHub.yourVote', { choice: t(getGovernanceVoteChoiceLabelKey(currentVote.choice)) })}
                  </p>
                )}

                {recentEvent && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{formatDateTime(recentEvent.created_at)}</span>
                  </div>
                )}

                {typeof civiDiscussionComment === 'string' && civiDiscussionComment.trim() ? (
                  <p className="rounded-xl border border-border/60 bg-background/60 px-2 py-1.5 text-xs text-muted-foreground">
                    {civiDiscussionComment}
                  </p>
                ) : null}

                {proposal.status === 'open' && (
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="secondary"
                      className="gap-2"
                      disabled={Boolean(voteBlockedReason) || votingProposalId === proposal.id}
                      onClick={() => void onVote(proposal, 'approve')}
                    >
                      {votingProposalId === proposal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {t('governanceHub.actions.approve')}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={Boolean(voteBlockedReason) || votingProposalId === proposal.id}
                      onClick={() => void onVote(proposal, 'reject')}
                    >
                      <XCircle className="h-4 w-4" />
                      {t('governanceHub.actions.reject')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="gap-2"
                      disabled={Boolean(voteBlockedReason) || votingProposalId === proposal.id}
                      onClick={() => void onVote(proposal, 'abstain')}
                    >
                      <Vote className="h-4 w-4" />
                      {t('governanceHub.actions.abstain')}
                    </Button>
                    <GovernanceGuardianSignoffCard
                      proposalId={proposal.id}
                      proposalStatus={proposal.status}
                      requiresGuardianSignoff={requiresGuardianSignoff}
                      isGuardianSigner={isGuardianSigner}
                      isBlocked={voteBlockedBySanction}
                      profileId={profileId}
                      onUpdated={onGuardianSignoffUpdated}
                    />
                    {voteBlockedReason ? (
                      <p className="text-xs text-amber-600 dark:text-amber-300">{voteBlockedReason}</p>
                    ) : null}
                  </div>
                )}

                {proposal.final_decision_summary && (
                  <p className="text-sm text-muted-foreground">{proposal.final_decision_summary}</p>
                )}

                {proposalImplementations.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {t('governanceHub.implementationQueueTitle')}
                    </p>
                    {proposalImplementations.map((implementation) => {
                      const unit = unitsById[implementation.unit_id];
                      const canExecuteImplementation = currentUserUnitIds.has(implementation.unit_id)
                        && executionSpec.autoExecutable
                        && !executionBlockedBySanction
                        && (implementation.status === 'queued' || implementation.status === 'blocked');
                      const executeBlockedReason = currentUserUnitIds.has(implementation.unit_id) && executionSpec.autoExecutable && executionBlockedBySanction
                        ? t('governanceHub.executeBlockedBySanction')
                        : null;
                      const targetProfile = 'profileId' in executionSpec
                        ? profileDirectoryById[executionSpec.profileId]
                        : null;
                      const targetPolicy = 'policyProfileId' in executionSpec
                        ? monetaryPolicyProfiles.find((policy) => policy.id === executionSpec.policyProfileId) || null
                        : null;
                      const targetContentItem = 'contentItemId' in executionSpec
                        ? contentItemsById[executionSpec.contentItemId] || null
                        : null;
                      const targetCertification = 'certificationKey' in executionSpec
                        ? studyCertificationLabelByKey[executionSpec.certificationKey] || executionSpec.certificationKey
                        : null;
                      return (
                        <div key={implementation.id} className="rounded-2xl border border-border/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {unit?.name || t(getGovernanceUnitLabelKey((implementation.metadata as { unit_key?: string } | null)?.unit_key || 'civic_operations'))}
                            </p>
                            <Badge
                              className={getGovernanceImplementationStatusClassName(implementation.status)}
                              variant="outline"
                            >
                              {t(getGovernanceImplementationStatusLabelKey(implementation.status))}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{implementation.implementation_summary}</p>
                          {'targetUnitKey' in executionSpec && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {t('governanceHub.targetUnitLabel')}: {t(getGovernanceUnitLabelKey(executionSpec.targetUnitKey))}
                            </p>
                          )}
                          {targetProfile && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('governanceHub.targetProfileLabel')}: {formatProfileLabel(targetProfile)}
                            </p>
                          )}
                          {targetPolicy && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('governanceHub.targetPolicyLabel')}: {targetPolicy.policy_name} ({targetPolicy.version})
                            </p>
                          )}
                          {targetCertification && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('governanceHub.targetCertificationLabel')}: {targetCertification}
                            </p>
                          )}
                          {targetContentItem && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('governanceHub.targetContentItemLabel')}: {formatContentItemLabel(targetContentItem)}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t('governanceHub.assignedAt')}: {formatDateTime(implementation.assigned_at)}
                          </p>
                          {canExecuteImplementation && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                className="gap-2"
                                disabled={executingImplementationId === implementation.id}
                                onClick={() => void onExecuteImplementation(proposal, implementation)}
                              >
                                {executingImplementationId === implementation.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowRight className="h-4 w-4" />
                                )}
                                {t('governanceHub.executeAction')}
                              </Button>
                            </div>
                          )}
                          {executeBlockedReason ? (
                            <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">{executeBlockedReason}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
}

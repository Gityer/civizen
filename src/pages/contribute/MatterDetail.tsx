import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  canManageVotingProposals,
  createVotingProposalFromMatter,
  listVotingProposalsForMatter,
  type VotingProposal,
} from '@/lib/civic-voting';
import { listCurrentAreas } from '@/lib/classification';
import {
  REOPEN_REASONS,
  actorLabel,
  buildBallIsWithCopy,
  deriveMatterStatus,
  formatDueDate,
  formalActionsForContext,
  viewerRepresents,
  workProgressLine,
  type FormalActionType,
  type MatterActorKind,
  type ReopenReason,
} from '@/lib/matters';
import {
  addMatterComment,
  completeMatterCollaborativeWork,
  getMatterDetail,
  performCollaborationAction,
  performMatterFormalAction,
  searchMatterActors,
  startMatterCollaborativeWork,
  uploadMatterFile,
  type MatterActorSuggestion,
  type MatterDetailBundle,
} from '@/lib/matters-api';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';
import { MatterWorkPanel } from '@/pages/contribute/MatterWorkPanel';
import { MatterAgentPanel } from '@/pages/contribute/MatterAgentPanel';
import { MatterResolutionPanel } from '@/pages/contribute/MatterResolutionPanel';

function formatWhen(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MatterDetail() {
  const { matterId } = useParams<{ matterId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const areas = useMemo(() => listCurrentAreas(), []);

  const [bundle, setBundle] = useState<MatterDetailBundle | null>(null);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentions, setMentions] = useState<MatterActorSuggestion[]>([]);
  const [mentionHits, setMentionHits] = useState<MatterActorSuggestion[]>([]);
  const [selectedAction, setSelectedAction] = useState<FormalActionType | ''>('');
  const [actionMessage, setActionMessage] = useState('');
  const [reopenReason, setReopenReason] = useState<ReopenReason>('issue_returned');
  const [targetQuery, setTargetQuery] = useState('');
  const [target, setTarget] = useState<MatterActorSuggestion | null>(null);
  const [targetHits, setTargetHits] = useState<MatterActorSuggestion[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [section, setSection] = useState<'overview' | 'discussion' | 'work' | 'decisions' | 'ai' | 'resolution' | 'outcome' | 'activity'>('overview');
  const [outstandingReason, setOutstandingReason] = useState('');
  const [votingProposals, setVotingProposals] = useState<VotingProposal[]>([]);
  const [creatingProposal, setCreatingProposal] = useState(false);

  const load = useCallback(async () => {
    if (!matterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      setLinkedIds(linked);
      const row = await getMatterDetail(matterId);
      setBundle(row);
      try {
        const proposals = await listVotingProposalsForMatter(matterId);
        setVotingProposals(proposals);
      } catch {
        setVotingProposals([]);
      }
    } catch {
      setBundle(null);
      setVotingProposals([]);
    } finally {
      setLoading(false);
    }
  }, [matterId, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const needle = mentionQuery.trim();
    if (needle.length < 2) {
      setMentionHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchMatterActors(needle, profileId).then(setMentionHits);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [mentionQuery, profileId]);

  useEffect(() => {
    const needle = targetQuery.trim();
    if (needle.length < 2) {
      setTargetHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchMatterActors(needle, profileId).then(setTargetHits);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [targetQuery, profileId]);

  const matter = bundle?.matter ?? null;
  const action = bundle?.currentAction ?? null;
  const derived = matter ? deriveMatterStatus(matter, action) : null;
  const ball = matter
    ? buildBallIsWithCopy({
        matter,
        action,
        viewerProfileId: profileId,
        managedOrganizationIds: linkedIds,
      })
    : null;
  const viewerIsInitiator = matter
    ? viewerRepresents(profileId, matter.initiator, linkedIds)
    : false;
  const viewerIsResponsible = matter
    ? viewerRepresents(profileId, matter.responsible, linkedIds)
    : false;
  const canDraftVotingProposal =
    Boolean(profileId) &&
    (viewerIsInitiator || viewerIsResponsible || canManageVotingProposals(profile?.role));
  const openVotingDraft = votingProposals.find((item) => item.status === 'draft') ?? null;
  const hasWork = Boolean(matter?.collaborativeWorkStartedAt);
  const workSummary = bundle?.workSummary ?? null;
  const outstandingTasks = workSummary?.outstandingTasks ?? [];
  const hasOutstanding = Boolean(
    hasWork && !matter?.collaborativeWorkCompletedAt && (workSummary?.outstanding ?? 0) > 0,
  );
  const progress = workProgressLine(workSummary);
  const pendingActions = bundle?.pendingActions ?? [];
  const hasResolution = (bundle?.resolutions?.length ?? 0) > 0
    || pendingActions.some((item) => ['review_resolution', 'propose_resolution'].includes(item.actionType));
  const hasOutcome = (bundle?.outcomeFollowups?.length ?? 0) > 0
    || pendingActions.some((item) => item.actionType === 'outcome_followup');
  const hasAi = hasWork
    || (bundle?.agentAssignments?.length ?? 0) > 0
    || (bundle?.agentArtifacts?.length ?? 0) > 0;
  const sectionItems = (['overview', 'discussion', ...(hasWork ? ['work', 'decisions'] as const : []), ...(hasAi ? ['ai'] as const : []), ...(hasResolution ? ['resolution'] as const : []), ...(hasOutcome ? ['outcome'] as const : []), 'activity'] as const);
  const options = matter
    ? formalActionsForContext({
        lifecycleStatus: matter.lifecycleStatus,
        currentAction: action,
        viewerProfileId: profileId,
        managedOrganizationIds: linkedIds,
        viewerIsInitiator,
        matterType: matter.matterType,
      })
    : [];
  const selectedOption = options.find((item) => item.action === selectedAction) ?? null;
  const areaName = matter?.areaNodeId
    ? areas.find((node) => node.id === matter.areaNodeId)?.displayName
    : null;
  const rootComments = (bundle?.comments ?? []).filter((item) => !item.parentId && !item.taskId);

  const actorKindForViewer: MatterActorKind =
    matter && viewerRepresents(profileId, matter.responsible, linkedIds) && matter.responsible.kind === 'organization'
      ? 'organization'
      : 'person';

  const postComment = async () => {
    if (!matterId || comment.trim().length < 1) return;
    setBusy(true);
    try {
      await addMatterComment(matterId, comment.trim(), {
        parentId: replyTo,
        authorKind: actorKindForViewer,
        mentionedProfileIds: mentions.map((item) => item.profileId),
      });
      if (file) await uploadMatterFile(matterId, file);
      setComment('');
      setReplyTo(null);
      setMentions([]);
      setFile(null);
      toast.success(tRef.current('contribute.matters.commentPosted'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tRef.current('contribute.matters.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const createVotingProposal = async () => {
    if (!matter || !matterId || !canDraftVotingProposal || openVotingDraft) return;
    setCreatingProposal(true);
    try {
      const proposalId = await createVotingProposalFromMatter({
        matterId,
        title: matter.title.slice(0, 160),
        summary: (matter.description || '').slice(0, 280),
        body: matter.description || '',
      });
      toast.success(tRef.current('civicVoting.proposals.openProposal'));
      navigate(`/governance/voting/proposals/${proposalId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tRef.current('civicVoting.proposals.createFailed'),
      );
    } finally {
      setCreatingProposal(false);
    }
  };

  const runAction = async () => {
    if (!matterId || !selectedOption) return;
    if (selectedOption.needsTarget && !target) {
      toast.error(tRef.current('contribute.matters.recipientRequired'));
      return;
    }
    if (selectedOption.action === 'reopen' && !actionMessage.trim() && !reopenReason) {
      toast.error(tRef.current('contribute.matters.reopenReasonRequired'));
      return;
    }
    setBusy(true);
    try {
      await performMatterFormalAction(matterId, selectedOption.action, {
        message: actionMessage.trim() || undefined,
        targetKind: target?.kind,
        targetProfileId: target?.profileId,
        reopenReason: selectedOption.action === 'reopen' ? reopenReason : undefined,
        actorKind: actorKindForViewer,
      });
      setSelectedAction('');
      setActionMessage('');
      setTarget(null);
      toast.success(tRef.current('contribute.matters.actionSaved'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tRef.current('contribute.matters.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const runCollabAction = async (
    actionId: string,
    verb: string,
    extras?: { message?: string; targetKind?: MatterActorKind; targetProfileId?: string },
  ) => {
    setBusy(true);
    try {
      await performCollaborationAction(actionId, verb, extras);
      setActionMessage('');
      setTarget(null);
      setTargetQuery('');
      toast.success(tRef.current('contribute.matters.actionSaved'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tRef.current('contribute.matters.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (!matter) {
    return (
      <AppLayout>
        <div className="space-y-3 px-4 py-6">
          <AppPageHeader title={t('contribute.matters.missingTitle')} fallbackPath="/contribute/matters" />
          <p className="text-sm text-muted-foreground">{t('contribute.matters.missingBody')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={matter.title}
          subtitle={t(`contribute.matters.types.${matter.matterType}`)}
          fallbackPath="/contribute/matters"
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.matters.status.${derived}`)}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.matters.visibility.${matter.visibility}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('contribute.matters.fromLabel')} {actorLabel(matter.initiator)} · {t('contribute.matters.toLabel')}{' '}
          {actorLabel(matter.responsible)} · {formatWhen(matter.createdAt)}
          {matter.scopeKind === 'global'
            ? ` · ${t('contribute.matters.scope.global')}`
            : matter.scopeCountryCode
              ? ` · ${matter.scopeCountryCode}`
              : ''}
          {areaName ? ` · ${areaName}` : ''}
        </p>

        {ball ? (
          <Card className="border-primary/40 bg-primary/5 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {t('contribute.matters.currentAction')}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{ball.headline}</p>
            <p className="mt-1 text-sm text-foreground">{ball.detail}</p>
            {ball.dueLine ? <p className="mt-2 text-sm text-muted-foreground">{ball.dueLine}</p> : null}
            {action?.taskTitle ? (
              <p className="mt-2 text-sm text-foreground">
                {t('contribute.matters.work.taskLabel')}: {action.taskTitle}
              </p>
            ) : null}
            {pendingActions.length > 1 ? (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {pendingActions.map((item) => (
                  <li key={item.id}>
                    {actorLabel(item.assignedActor)} — {item.taskTitle || t(`contribute.matters.work.actionTypes.${item.actionType}`)}
                    {item.dueAt ? ` · ${formatDueDate(item.dueAt)}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
            {action
              && viewerRepresents(profileId, action.assignedActor, linkedIds)
              && (action.actionType === 'shared_responsibility_response'
                || (action.actionType === 'clarify' && action.contextKind === 'responsibility')) ? (
              <div className="mt-4 space-y-3">
                <OutlinedField label={t('contribute.matters.actionNoteLabel')}>
                  <Textarea value={actionMessage} onChange={(event) => setActionMessage(event.target.value)} rows={2} />
                </OutlinedField>
                {action.actionType === 'clarify' ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void runCollabAction(action.id, 'respond', { message: actionMessage || undefined })}
                  >
                    {t('contribute.matters.work.respondClarification')}
                  </Button>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void runCollabAction(action.id, 'accept', { message: actionMessage || undefined })}>
                        {t('contribute.matters.work.acceptResponsibility')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runCollabAction(action.id, 'accept_partially', { message: actionMessage || undefined })}>
                        {t('contribute.matters.work.acceptPartially')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runCollabAction(action.id, 'request_clarification', { message: actionMessage || undefined })}>
                        {t('contribute.matters.work.askClarification')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runCollabAction(action.id, 'decline', { message: actionMessage || undefined })}>
                        {t('contribute.matters.work.declineResponsibility')}
                      </Button>
                    </div>
                    <OutlinedField label={t('contribute.matters.work.suggestAnother')}>
                      {target ? (
                        <div className="flex items-center justify-between gap-2 py-1">
                          <p className="text-sm">{target.displayName}</p>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(null)}>
                            {t('common.edit')}
                          </Button>
                        </div>
                      ) : (
                        <Input
                          value={targetQuery}
                          onChange={(event) => setTargetQuery(event.target.value)}
                          placeholder={t('contribute.matters.recipientHint')}
                        />
                      )}
                    </OutlinedField>
                    {targetHits.map((hit) => (
                      <button
                        key={hit.profileId}
                        type="button"
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setTarget(hit);
                          setTargetQuery('');
                          setTargetHits([]);
                        }}
                      >
                        {hit.displayName}
                      </button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy || !target}
                      onClick={() =>
                        void runCollabAction(action.id, 'suggest_actor', {
                          message: actionMessage || undefined,
                          targetKind: target?.kind,
                          targetProfileId: target?.profileId,
                        })
                      }
                    >
                      {t('contribute.matters.work.suggestAnother')}
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </Card>
        ) : null}

        {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}

        {matter.collaborativeWorkCompletionKind === 'with_outstanding_work' ? (
          <Card className="space-y-2 border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-foreground">{t('contribute.matters.work.outstandingCompleteTitle')}</p>
            {matter.collaborativeWorkCompletionReason ? (
              <p className="text-sm text-muted-foreground">{matter.collaborativeWorkCompletionReason}</p>
            ) : null}
            {outstandingTasks.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {outstandingTasks.map((task) => (
                  <li key={task.id}>
                    {task.title} · {t(`contribute.matters.work.status.${task.status}`)}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        {matter.lifecycleStatus !== 'closed' && viewerIsResponsible && !hasWork ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                try {
                  await startMatterCollaborativeWork(matter.id);
                  toast.success(tRef.current('contribute.matters.work.started'));
                  await load();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : tRef.current('contribute.matters.actionFailed'));
                } finally {
                  setBusy(false);
                }
              })()
            }
          >
            {t('contribute.matters.work.start')}
          </Button>
        ) : null}

        {hasWork && viewerIsResponsible && !matter.collaborativeWorkCompletedAt && matter.lifecycleStatus !== 'closed' && hasOutstanding ? (
          <Card className="space-y-3 border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-foreground">{t('contribute.matters.work.outstandingTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('contribute.matters.work.outstandingWhy')}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              {outstandingTasks.map((task) => (
                <li key={task.id}>
                  {task.title} · {t(`contribute.matters.work.status.${task.status}`)}
                </li>
              ))}
            </ul>
            <OutlinedField label={t('contribute.matters.work.outstandingReason')} htmlFor="outstanding-reason">
              <Textarea
                id="outstanding-reason"
                value={outstandingReason}
                onChange={(event) => setOutstandingReason(event.target.value)}
                rows={3}
              />
            </OutlinedField>
            <Button
              type="button"
              variant="outline"
              disabled={busy || outstandingReason.trim().length < 3}
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await completeMatterCollaborativeWork(matter.id, {
                      allowOutstanding: true,
                      reason: outstandingReason.trim(),
                    });
                    toast.success(tRef.current('contribute.matters.work.readyWithOutstanding'));
                    setOutstandingReason('');
                    await load();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : tRef.current('contribute.matters.actionFailed'));
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              {t('contribute.matters.work.completeWithOutstanding')}
            </Button>
          </Card>
        ) : null}

        {hasWork && viewerIsResponsible && !matter.collaborativeWorkCompletedAt && matter.lifecycleStatus !== 'closed' && !hasOutstanding ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                try {
                  await completeMatterCollaborativeWork(matter.id);
                  toast.success(tRef.current('contribute.matters.work.readyForResponse'));
                  await load();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : tRef.current('contribute.matters.actionFailed'));
                } finally {
                  setBusy(false);
                }
              })()
            }
          >
            {t('contribute.matters.work.finish')}
          </Button>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {sectionItems.map((item) => (
            <Button key={item} type="button" size="sm" variant={section === item ? 'default' : 'outline'} onClick={() => setSection(item)}>
              {t(`contribute.matters.sections.${item}`)}
            </Button>
          ))}
        </div>

        {(!hasWork || section === 'overview') ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.matters.descriptionHeading')}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{matter.description}</p>
          {(bundle?.attachments.filter((item) => !item.taskId && !item.decisionId).length ?? 0) > 0 ? (
            <ul className="space-y-1 text-sm">
              {bundle?.attachments
                .filter((item) => !item.taskId && !item.decisionId)
                .map((item) => (
                <li key={item.id} className="text-muted-foreground">
                  {item.label || item.fileName || item.url || t('contribute.matters.attachment')}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        ) : null}

        {(!hasWork || section === 'overview') && (canDraftVotingProposal || votingProposals.length > 0) ? (
          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('civicVoting.proposals.title')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('civicVoting.proposals.limitations')}</p>
            {votingProposals.length > 0 ? (
              <ul className="space-y-2">
                {votingProposals.map((proposal) => (
                  <li key={proposal.id}>
                    <Card className="flex flex-wrap items-center gap-2 p-3">
                      <Badge variant="outline">
                        {t(`civicVoting.proposals.status.${proposal.status}`)}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {proposal.title}
                      </span>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link to={`/governance/voting/proposals/${proposal.id}`}>
                          {t('civicVoting.proposals.openProposal')}
                        </Link>
                      </Button>
                      {proposal.electionId ? (
                        <Button type="button" size="sm" asChild>
                          <Link to={`/governance/voting/${proposal.electionId}`}>
                            {t('civicVoting.proposals.openBallot')}
                          </Link>
                        </Button>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}
            {canDraftVotingProposal && !openVotingDraft ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={creatingProposal}
                onClick={() => void createVotingProposal()}
              >
                {creatingProposal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('civicVoting.proposals.createFromMatter')}
              </Button>
            ) : null}
          </section>
        ) : null}

        {bundle && bundle.parties.length > 0 && (!hasWork || section === 'overview') ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.matters.participantsHeading')}
          </h2>
          <ul className="space-y-1">
            {bundle.parties.map((party) => (
              <li key={party.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span>{actorLabel(party.actor)}</span>
                {party.actor.kind === 'ai_agent' ? (
                  <Badge variant="outline" className="text-xs">AI</Badge>
                ) : null}
                <span className="text-muted-foreground">· {party.role.replaceAll('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </section>
        ) : null}

        {options.length > 0 && (!hasWork || section === 'overview') ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('contribute.matters.formalActions')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('contribute.matters.formalActionsHint')}</p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <Button
                  key={option.action}
                  type="button"
                  size="sm"
                  variant={selectedAction === option.action ? 'default' : 'outline'}
                  onClick={() => setSelectedAction(option.action)}
                >
                  {option.action === 'confirm_resolved' && matter.matterType === 'question'
                    ? t('contribute.matters.actions.confirm_resolved_question')
                    : t(`contribute.matters.actions.${option.action}`)}
                </Button>
              ))}
            </div>
            {selectedOption ? (
              <Card className="space-y-3 border-primary/30 bg-card p-4">
                {selectedOption.action === 'reopen' ? (
                  <OutlinedField label={t('contribute.matters.reopenReasonLabel')}>
                    <Select value={reopenReason} onValueChange={(value) => setReopenReason(value as ReopenReason)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REOPEN_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {t(`contribute.matters.reopenReasons.${reason}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </OutlinedField>
                ) : null}
                {selectedOption.needsMessage || selectedOption.action === 'reopen' ? (
                  <OutlinedField label={t('contribute.matters.actionNoteLabel')} htmlFor="matter-action-note">
                    <Textarea
                      id="matter-action-note"
                      value={actionMessage}
                      onChange={(event) => setActionMessage(event.target.value)}
                      rows={3}
                    />
                  </OutlinedField>
                ) : null}
                {selectedOption.needsTarget ? (
                  <OutlinedField label={t('contribute.matters.targetLabel')} htmlFor="matter-target">
                    {target ? (
                      <div className="flex items-center justify-between gap-2 py-1">
                        <p className="text-sm">{target.displayName}</p>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(null)}>
                          {t('common.edit')}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Input
                          id="matter-target"
                          value={targetQuery}
                          onChange={(event) => setTargetQuery(event.target.value)}
                          placeholder={t('contribute.matters.recipientHint')}
                        />
                        {targetHits.map((hit) => (
                          <button
                            key={hit.profileId}
                            type="button"
                            className="mt-1 block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setTarget(hit);
                              setTargetQuery('');
                              setTargetHits([]);
                            }}
                          >
                            {hit.displayName}
                          </button>
                        ))}
                      </div>
                    )}
                  </OutlinedField>
                ) : null}
                <Button type="button" onClick={() => void runAction()} disabled={busy}>
                  {t('contribute.matters.confirmAction')}
                </Button>
              </Card>
            ) : null}
          </section>
        ) : null}

        {(!hasWork || section === 'discussion') ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.matters.conversation')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('contribute.matters.conversationHint')}</p>
          {rootComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('contribute.matters.noComments')}</p>
          ) : (
            <div className="space-y-3">
              {rootComments.map((item) => (
                <Card key={item.id} className="space-y-2 border-dashed border-border/80 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    {actorLabel(item.author)} · {formatWhen(item.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{item.body}</p>
                  {matter.lifecycleStatus !== 'closed' ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(item.id)}>
                    {t('contribute.matters.reply')}
                  </Button>
                  ) : null}
                  {(bundle?.comments ?? [])
                    .filter((child) => child.parentId === item.id)
                    .map((child) => (
                      <div key={child.id} className="ml-4 border-l border-border/70 pl-3">
                        <p className="text-xs text-muted-foreground">
                          {actorLabel(child.author)} · {formatWhen(child.createdAt)}
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{child.body}</p>
                      </div>
                    ))}
                </Card>
              ))}
            </div>
          )}
          {matter.lifecycleStatus === 'closed' ? (
            <p className="text-sm text-muted-foreground">{t('contribute.matters.closedNoComments')}</p>
          ) : (
          <Card className="space-y-3 border-dashed border-border/80 bg-muted/20 p-4">
            {replyTo ? (
              <p className="text-xs text-muted-foreground">{t('contribute.matters.replying')}</p>
            ) : null}
            <OutlinedField label={t('contribute.matters.commentLabel')} htmlFor="matter-comment">
              <Textarea
                id="matter-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
              />
            </OutlinedField>
            <OutlinedField label={t('contribute.matters.mentionLabel')} htmlFor="matter-mention">
              <Input
                id="matter-mention"
                value={mentionQuery}
                onChange={(event) => setMentionQuery(event.target.value)}
                placeholder={t('contribute.matters.mentionHint')}
              />
            </OutlinedField>
            {mentionHits.map((hit) => (
              <button
                key={hit.profileId}
                type="button"
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setMentions((current) =>
                    current.some((item) => item.profileId === hit.profileId) ? current : [...current, hit],
                  );
                  setMentionQuery('');
                  setMentionHits([]);
                }}
              >
                {hit.displayName}
              </button>
            ))}
            {mentions.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {mentions.map((item) => item.displayName).join(', ')}
              </p>
            ) : null}
            <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">{t('contribute.matters.commentNotAction')}</p>
            <Button type="button" variant="outline" onClick={() => void postComment()} disabled={busy}>
              {t('contribute.matters.postComment')}
            </Button>
          </Card>
          )}
        </section>
        ) : null}

        {hasWork && (section === 'work' || section === 'overview') && bundle ? (
          <MatterWorkPanel
            bundle={bundle}
            profileId={profileId}
            linkedIds={linkedIds}
            canManageWork={viewerIsResponsible || (bundle.responsibilities ?? []).some(
              (row) => row.status === 'accepted' && viewerRepresents(profileId, row.actor, linkedIds),
            )}
            busy={busy}
            onBusy={setBusy}
            onReload={load}
            t={t}
          />
        ) : null}

        {hasWork && (section === 'decisions' || section === 'overview') ? (
          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('contribute.matters.sections.decisions')}
            </h2>
            {(bundle?.decisions.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t('contribute.matters.work.noDecisions')}</p>
            ) : (
              bundle?.decisions.map((decision) => {
                const decisionAction = pendingActions.find(
                  (item) => item.contextKind === 'decision' && item.contextId === decision.id,
                );
                return (
                <Card key={decision.id} className="space-y-1 p-4">
                  <p className="font-medium">{decision.title}</p>
                  <p className="text-sm">{decision.statement}</p>
                  {decision.rationale ? <p className="text-sm text-muted-foreground">{decision.rationale}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {t(`contribute.matters.work.decisionStatus.${decision.status}`)} · {actorLabel(decision.proposedBy)}
                  </p>
                  {decisionAction?.actionType === 'confirm_decision' ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void (async () => {
                            setBusy(true);
                            try {
                              await performCollaborationAction(decisionAction.id, 'accept');
                              await load();
                            } finally {
                              setBusy(false);
                            }
                          })()
                        }
                      >
                        {t('contribute.matters.work.acceptDecision')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void (async () => {
                            setBusy(true);
                            try {
                              await performCollaborationAction(decisionAction.id, 'reject');
                              await load();
                            } finally {
                              setBusy(false);
                            }
                          })()
                        }
                      >
                        {t('contribute.matters.work.rejectDecision')}
                      </Button>
                    </div>
                  ) : null}
                </Card>
                );
              })
            )}
          </section>
        ) : null}

        {(hasAi && (section === 'ai' || section === 'overview') && bundle) ? (
          <MatterAgentPanel
            bundle={bundle}
            profileId={profileId}
            linkedIds={linkedIds}
            busy={busy}
            onBusy={setBusy}
            onReload={load}
            t={t}
          />
        ) : null}

        {(hasResolution && (section === 'resolution' || section === 'overview')) && bundle ? (
          <MatterResolutionPanel
            bundle={bundle}
            profileId={profileId}
            linkedIds={linkedIds}
            busy={busy}
            onBusy={setBusy}
            onReload={load}
            t={t}
          />
        ) : null}

        {(hasOutcome && section === 'outcome' && bundle) ? (
          <MatterResolutionPanel
            bundle={bundle}
            profileId={profileId}
            linkedIds={linkedIds}
            busy={busy}
            onBusy={setBusy}
            onReload={load}
            t={t}
          />
        ) : null}

        {(!hasWork || section === 'activity') ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.matters.activity')}
          </h2>
          <ol className="space-y-3">
            {(bundle?.events ?? []).map((event) => (
              <li
                key={event.id}
                className={event.isSystem ? 'border-l-2 border-primary/40 pl-3' : 'border-l-2 border-border/70 pl-3'}
              >
                <p className="text-sm text-foreground">{event.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {event.isSystem ? t('contribute.matters.systemActor') : actorLabel(event.actor)} ·{' '}
                  {formatWhen(event.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        </section>
        ) : null}
      </div>
    </AppLayout>
  );
}

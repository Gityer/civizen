import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { canManageVotingProposals, createVotingProposalFromMatter, listVotingProposalsForMatter, type VotingProposal } from '@/lib/civic-voting';
import { listCurrentAreas } from '@/lib/classification';
import { EMPTY_MATTER_LINKS, loadMatterLinks, type MatterLinks } from '@/lib/matter-links';
import { buildBallIsWithCopy, deriveMatterStatus, formalActionsForContext, viewerRepresents, workProgressLine, type FormalActionType, type MatterActorKind, type ReopenReason } from '@/lib/matters';
import { addMatterComment, getMatterDetail, performCollaborationAction, performMatterFormalAction, searchMatterActors, uploadMatterFile, type MatterActorSuggestion, type MatterDetailBundle } from '@/lib/matters-api';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';

export function useMatterDetail() {
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
  const [links, setLinks] = useState<MatterLinks>(EMPTY_MATTER_LINKS);

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
      setLinks(await loadMatterLinks(matterId));
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
        signer: profile ?? null,
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

  return {
    loading, t, matter, derived, areaName, linkedIds, busy, actionMessage, setActionMessage,
    targetQuery, setTargetQuery, target, setTarget, targetHits, setTargetHits, profileId, action,
    ball, pendingActions, runCollabAction, setBusy, section, setSection, outstandingReason,
    setOutstandingReason, tRef, load, viewerIsResponsible, hasWork, outstandingTasks,
    hasOutstanding, progress, sectionItems, bundle, selectedAction, setSelectedAction, reopenReason,
    setReopenReason, votingProposals, creatingProposal, canDraftVotingProposal, openVotingDraft, links,
    options, selectedOption, createVotingProposal, runAction, comment, setComment, replyTo,
    setReplyTo, mentionQuery, setMentionQuery, mentions, setMentions, mentionHits, setMentionHits,
    file, setFile, hasResolution, hasOutcome, hasAi, rootComments, postComment,
  };
}

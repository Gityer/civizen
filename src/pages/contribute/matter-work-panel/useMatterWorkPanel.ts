import { useMemo, useState } from 'react';
import { type MatterActionRequirement, type MatterActorKind } from '@/lib/matters';
import { performCollaborationAction, searchMatterActors, type MatterActorSuggestion } from '@/lib/matters-api';
import { groupCollaborationTask, type CollaborationTask } from '@/lib/matters-work';
import { type MatterWorkPanelProps } from '@/pages/contribute/matter-work-panel/matter-work-panel-shared';

export function useMatterWorkPanel({ bundle, profileId, linkedIds, canManageWork, busy, onBusy, onReload, t }: MatterWorkPanelProps) {
  const [title, setTitle] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assignee, setAssignee] = useState<MatterActorSuggestion | null>(null);
  const [hits, setHits] = useState<MatterActorSuggestion[]>([]);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [parentTaskId, setParentTaskId] = useState<string>('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionStatement, setDecisionStatement] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [taskComment, setTaskComment] = useState<Record<string, string>>({});
  const [evidenceNote, setEvidenceNote] = useState<Record<string, string>>({});
  const [actionNote, setActionNote] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteHit, setInviteHit] = useState<MatterActorSuggestion | null>(null);
  const [inviteHits, setInviteHits] = useState<MatterActorSuggestion[]>([]);
  const [inviteRole, setInviteRole] = useState('contributor');
  const [shareQuery, setShareQuery] = useState('');
  const [shareHit, setShareHit] = useState<MatterActorSuggestion | null>(null);
  const [shareHits, setShareHits] = useState<MatterActorSuggestion[]>([]);
  const [reassignQuery, setReassignQuery] = useState<Record<string, string>>({});
  const [reassignHits, setReassignHits] = useState<Record<string, MatterActorSuggestion[]>>({});
  const [reassignTarget, setReassignTarget] = useState<Record<string, MatterActorSuggestion | null>>({});

  const pending = bundle.pendingActions;
  const groups = useMemo(() => {
    const buckets: Record<string, CollaborationTask[]> = {
      needs_attention: [],
      in_progress: [],
      waiting: [],
      completed: [],
    };
    for (const task of bundle.tasks) {
      buckets[groupCollaborationTask(task)].push(task);
    }
    return buckets;
  }, [bundle.tasks]);

  const searchPeople = (value: string, setter: (hits: MatterActorSuggestion[]) => void) => {
    if (value.trim().length < 2) {
      setter([]);
      return;
    }
    void searchMatterActors(value, profileId).then(setter);
  };

  const run = async (work: () => Promise<void>) => {
    onBusy(true);
    try {
      await work();
      await onReload();
    } finally {
      onBusy(false);
    }
  };

  const actOn = (action: MatterActionRequirement, verb: string, message?: string, target?: MatterActorSuggestion | null) =>
    run(() =>
      performCollaborationAction(action.id, verb, {
        message,
        targetKind: target?.kind as MatterActorKind | undefined,
        targetProfileId: target?.profileId,
      }),
    );

  return {
    taskComment, setTaskComment, evidenceNote, setEvidenceNote, actionNote, setActionNote,
    reassignQuery, setReassignQuery, reassignHits, setReassignHits, reassignTarget,
    setReassignTarget, pending, groups, searchPeople, run, actOn, bundle, profileId, linkedIds,
    busy, t, inviteQuery, setInviteQuery, inviteHit, setInviteHit, inviteHits, setInviteHits,
    inviteRole, setInviteRole, shareQuery, setShareQuery, shareHit, setShareHit, shareHits,
    setShareHits, canManageWork, title, setTitle, assigneeQuery, setAssigneeQuery, assignee,
    setAssignee, hits, setHits, reviewRequired, setReviewRequired, dependsOn, setDependsOn,
    parentTaskId, setParentTaskId, decisionTitle, setDecisionTitle, decisionStatement,
    setDecisionStatement, decisionRationale, setDecisionRationale,
  };
}

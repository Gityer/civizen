import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AI_AGENT_ROLE_TYPES,
  agentRoleLabel,
  type AiAgentRoleType,
} from '@/lib/matters-ai';
import { CIVIZEN_REPO_SLUG } from '@/lib/matters-coding-policy';
import { MatterAgentArtifactCard } from '@/pages/contribute/MatterAgentArtifactCard';
import {
  assignMatterAiAgent,
  assignMatterCodingAgent,
  cancelMatterAgentAssignment,
  getMatterDetail,
  invokeMatterAgentRun,
  retryMatterAgentRun,
  reviewMatterAgentWork,
  type MatterDetailBundle,
} from '@/lib/matters-api';
import { actorLabel, viewerRepresents } from '@/lib/matters';
import { toast } from 'sonner';

type Props = {
  bundle: MatterDetailBundle;
  profileId: string;
  linkedIds: string[];
  busy: boolean;
  onBusy: (value: boolean) => void;
  onReload: () => Promise<void>;
  t: (key: string) => string;
};

const ROLE_TASK_TITLES: Record<AiAgentRoleType, string> = {
  research: 'Research applicable guidance and precedent',
  analysis: 'Analyze Matter evidence and options',
  planning: 'Propose resolution plan and Task structure',
  facilitation: 'Facilitate discussion summary and open questions',
  documentation: 'Prepare structured Matter documentation',
  coding: 'Implement the agreed code change',
};

const DEFAULT_CODING_PATHS = '';

/** The coding agent needs a registered runner; until one is configured the role is not offered (step 4.5). */
const CODING_RUNNER_CONFIGURED = import.meta.env.VITE_MATTER_CODING_RUNNER === '1';
const OFFERED_ROLE_TYPES = AI_AGENT_ROLE_TYPES.filter((role) => role !== 'coding' || CODING_RUNNER_CONFIGURED);

export function MatterAgentPanel({ bundle, profileId, linkedIds, busy, onBusy, onReload, t }: Props) {
  const canManage = viewerRepresents(profileId, bundle.matter.responsible, linkedIds)
    || bundle.responsibilities.some(
      (row) => row.kind === 'collaborator'
        && row.status === 'accepted'
        && viewerRepresents(profileId, row.actor, linkedIds),
    );

  const [roleType, setRoleType] = useState<AiAgentRoleType>('research');
  const [instructions, setInstructions] = useState('');
  const [supervisorId, setSupervisorId] = useState(profileId);
  const [reviewMessage, setReviewMessage] = useState('');
  const [allowedPathsText, setAllowedPathsText] = useState(DEFAULT_CODING_PATHS);

  const reviewAction = bundle.pendingActions.find(
    (item) => item.actionType === 'review_task'
      && viewerRepresents(profileId, item.assignedActor, linkedIds),
  );

  const humanParties = useMemo(
    () => bundle.parties.filter((party) => party.actor.kind !== 'ai_agent'),
    [bundle.parties],
  );

  const parseAllowedPaths = () => allowedPathsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const assignAgent = async () => {
    if (instructions.trim().length < 3) {
      toast.error(t('contribute.matters.ai.instructionsRequired'));
      return;
    }
    if (roleType === 'coding' && parseAllowedPaths().length < 1) {
      toast.error(t('contribute.matters.ai.allowedPaths'));
      return;
    }
    onBusy(true);
    try {
      const assignmentId = roleType === 'coding'
        ? await assignMatterCodingAgent({
          matterId: bundle.matter.id,
          instructions: instructions.trim(),
          supervisingProfileId: supervisorId,
          allowedPaths: parseAllowedPaths(),
          repositorySlug: CIVIZEN_REPO_SLUG,
          taskTitle: ROLE_TASK_TITLES.coding,
        })
        : await assignMatterAiAgent({
          matterId: bundle.matter.id,
          agentRoleType: roleType,
          instructions: instructions.trim(),
          supervisingProfileId: supervisorId,
          taskTitle: ROLE_TASK_TITLES[roleType],
        });
      await onReload();
      if (roleType !== 'coding') {
        const detail = await getMatterDetail(bundle.matter.id);
        const run = detail?.agentRuns.find((row) => row.assignmentId === assignmentId && row.status === 'queued')
          ?? detail?.agentRuns.find((row) => row.status === 'queued');
        if (run) {
          try {
            await invokeMatterAgentRun(run.id);
          } catch {
            // Execution may complete asynchronously; user can retry from the panel.
          }
        }
      }
      setInstructions('');
      toast.success(t('contribute.matters.ai.assigned'));
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
    } finally {
      onBusy(false);
    }
  };

  const runReview = async (action: 'accept' | 'request_changes' | 'reject') => {
    if (!reviewAction) return;
    if (action !== 'accept' && reviewMessage.trim().length < 3) {
      toast.error(t('contribute.matters.resolution.reasonRequired'));
      return;
    }
    onBusy(true);
    try {
      await reviewMatterAgentWork(reviewAction.id, action, reviewMessage.trim() || undefined);
      setReviewMessage('');
      toast.success(t('contribute.matters.ai.reviewSaved'));
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
    } finally {
      onBusy(false);
    }
  };

  return (
    <section className="min-w-0 space-y-3 overflow-x-hidden">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('contribute.matters.sections.ai')}
      </h2>

      {bundle.agentAssignments.length > 0 ? (
        <div className="space-y-2">
          {bundle.agentAssignments.map((assignment) => {
            const policy = assignment.codingPolicy ?? {};
            const paths = Array.isArray(policy.allowed_paths) ? policy.allowed_paths.map(String) : [];
            const workspace = (bundle.codingWorkspaces ?? []).find((row) => row.assignmentId === assignment.id);
            const latestRun = bundle.agentRuns
              .filter((run) => run.assignmentId === assignment.id)
              .sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
            return (
              <Card key={assignment.id} className="min-w-0 space-y-2 overflow-x-hidden p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{assignment.agentDisplayName ?? 'AI Agent'} · AI</p>
                  <Badge variant="outline">{agentRoleLabel(assignment.agentRoleType ?? roleType)}</Badge>
                  <Badge variant="secondary">{assignment.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{assignment.instructions}</p>
                <p className="text-xs text-muted-foreground">
                  {t('contribute.matters.ai.supervisor')}: {actorLabel({
                    kind: assignment.supervisor.kind,
                    profileId: assignment.supervisor.profileId,
                    displayName: humanParties.find((p) => p.actor.profileId === assignment.supervisor.profileId)?.actor.displayName,
                  })}
                </p>
                {assignment.agentRoleType === 'coding' ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>{t('contribute.matters.ai.repository')}: {String(policy.repository_slug ?? CIVIZEN_REPO_SLUG)}</p>
                    {workspace?.baseCommitSha ? (
                      <p>{t('contribute.matters.ai.baseCommit')}: {workspace.baseCommitSha.slice(0, 12)}</p>
                    ) : null}
                    {paths.length > 0 ? (
                      <p className="break-all">{t('contribute.matters.ai.allowedPaths')}: {paths.join(', ')}</p>
                    ) : null}
                    <p>{t('contribute.matters.ai.isolatedFromPrimary')}</p>
                    {workspace?.primaryDirtySummary ? (
                      <p>{t('contribute.matters.ai.dirtyPrimary')}</p>
                    ) : null}
                    {latestRun?.status === 'queued' || latestRun?.status === 'running' ? (
                      <p>{t('contribute.matters.ai.runnerWaiting')}</p>
                    ) : null}
                    <p>{t('contribute.matters.ai.notPushed')}</p>
                  </div>
                ) : null}
                {assignment.status === 'failed' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void (async () => {
                        onBusy(true);
                        try {
                          const runId = await retryMatterAgentRun(assignment.id);
                          if (assignment.agentRoleType !== 'coding') {
                            await invokeMatterAgentRun(runId);
                          }
                          await onReload();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
                        } finally {
                          onBusy(false);
                        }
                      })()}
                    >
                      {t('contribute.matters.ai.retry')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void cancelMatterAgentAssignment(assignment.id).then(onReload)}
                    >
                      {t('contribute.matters.ai.cancel')}
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('contribute.matters.ai.noneYet')}</p>
      )}

      {bundle.agentArtifacts.length > 0 ? (
        <div className="space-y-2">
          {bundle.agentArtifacts.map((artifact) => (
            <MatterAgentArtifactCard
              key={artifact.id}
              artifact={artifact}
              events={bundle.events}
              canManage={canManage}
              busy={busy}
              onBusy={onBusy}
              onReload={onReload}
              t={t}
            />
          ))}
        </div>
      ) : null}

      {reviewAction ? (
        <Card className="space-y-3 border-dashed p-4">
          <p className="text-sm font-medium">{t('contribute.matters.ai.reviewTitle')}</p>
          <OutlinedField label={t('contribute.matters.ai.reviewMessage')} htmlFor="ai-review-msg">
            <Textarea id="ai-review-msg" value={reviewMessage} onChange={(e) => setReviewMessage(e.target.value)} rows={3} />
          </OutlinedField>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void runReview('accept')}>
              {t('contribute.matters.ai.accept')}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runReview('request_changes')}>
              {t('contribute.matters.ai.requestChanges')}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void runReview('reject')}>
              {t('contribute.matters.ai.reject')}
            </Button>
          </div>
        </Card>
      ) : null}

      {canManage && bundle.matter.lifecycleStatus !== 'closed' ? (
        <Card className="space-y-3 border-dashed p-4">
          <p className="text-sm font-medium">{t('contribute.matters.ai.addTitle')}</p>
          <Select value={roleType} onValueChange={(value) => setRoleType(value as AiAgentRoleType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OFFERED_ROLE_TYPES.map((role) => (
                <SelectItem key={role} value={role}>{agentRoleLabel(role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roleType === 'coding' ? (
            <div className="space-y-3">
              <p className="text-sm">{t('contribute.matters.ai.confirmScope')}</p>
              <p className="text-sm text-muted-foreground">
                {t('contribute.matters.ai.repository')}: {CIVIZEN_REPO_SLUG}
              </p>
              <p className="text-xs text-muted-foreground">{t('contribute.matters.ai.codingRunnerHint')}</p>
              <p className="text-xs text-muted-foreground">{t('contribute.matters.ai.reviewRequired')}</p>
              <OutlinedField label={t('contribute.matters.ai.allowedPaths')} htmlFor="ai-coding-paths">
                <Textarea
                  id="ai-coding-paths"
                  value={allowedPathsText}
                  onChange={(e) => setAllowedPathsText(e.target.value)}
                  rows={3}
                />
              </OutlinedField>
              <p className="text-xs text-muted-foreground">{t('contribute.matters.ai.allowedPathsHint')}</p>
            </div>
          ) : null}
          <OutlinedField label={t('contribute.matters.ai.instructions')} htmlFor="ai-instructions">
            <Textarea id="ai-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} />
          </OutlinedField>
          <Select value={supervisorId} onValueChange={setSupervisorId}>
            <SelectTrigger><SelectValue placeholder={t('contribute.matters.ai.supervisor')} /></SelectTrigger>
            <SelectContent>
              {humanParties
                .filter((party) => party.actor.profileId)
                .map((party) => (
                  <SelectItem key={party.id} value={party.actor.profileId!}>
                    {actorLabel(party.actor)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button type="button" disabled={busy || instructions.trim().length < 3} onClick={() => void assignAgent()}>
            {roleType === 'coding' ? t('contribute.matters.ai.assignCoding') : t('contribute.matters.ai.assign')}
          </Button>
        </Card>
      ) : null}
    </section>
  );
}

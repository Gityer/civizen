import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { actorLabel, type MatterActorKind } from '@/lib/matters';
import { createCollaborationTask, inviteMatterParticipant, proposeMatterDecision } from '@/lib/matters-api';
import type { useMatterWorkPanel } from '@/pages/contribute/matter-work-panel/useMatterWorkPanel';

type MatterWorkPanelModel = ReturnType<typeof useMatterWorkPanel>;

export function MatterWorkManage({ model }: { model: MatterWorkPanelModel }) {
  const {
    inviteQuery, setInviteQuery, inviteHit, setInviteHit, inviteHits, setInviteHits, inviteRole,
    setInviteRole, shareQuery, setShareQuery, shareHit, setShareHit, shareHits, setShareHits,
    searchPeople, run, bundle, profileId, canManageWork, busy, t,
  } = model;
  return (
    <>
    {canManageWork ? (
      <>
      {(bundle.parties.filter((row) => ['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].includes(row.role)).length > 0
        || bundle.responsibilities.some((row) => row.kind === 'collaborator')) ? (
        <div className="space-y-2">
          {bundle.parties.filter((row) => ['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].includes(row.role)).length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('contribute.matters.work.invitedToCollaborate')}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-foreground">
                {bundle.parties
                  .filter((row) => ['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].includes(row.role))
                  .map((row) => (
                    <li key={row.id}>
                      {actorLabel(row.actor)} · {t(`contribute.matters.work.roles.${row.role}`)}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {bundle.responsibilities.filter((row) => row.kind === 'collaborator').length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('contribute.matters.work.sharedResponsibility')}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-foreground">
                {bundle.responsibilities
                  .filter((row) => row.kind === 'collaborator')
                  .map((row) => (
                    <li key={row.id}>
                      {actorLabel(row.actor)} ·{' '}
                      {row.status === 'accepted'
                        ? t('contribute.matters.work.responsibleCollaborator')
                        : row.status === 'declined'
                          ? t('contribute.matters.work.declinedResponsibility')
                          : t('contribute.matters.work.sharedRequested')}
                      {row.responseReason ? ` — ${row.responseReason}` : ''}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <Card className="space-y-3 border-dashed p-4">
        <h3 className="text-sm font-medium">{t('contribute.matters.work.inviteParticipate')}</h3>
        <p className="text-xs text-muted-foreground">{t('contribute.matters.work.inviteParticipateHint')}</p>
        <OutlinedField label={t('contribute.matters.work.invitePerson')}>
          {inviteHit ? (
            <p className="py-1 text-sm">{inviteHit.displayName}</p>
          ) : (
            <Input
              value={inviteQuery}
              onChange={(event) => {
                setInviteQuery(event.target.value);
                searchPeople(event.target.value, setInviteHits);
              }}
            />
          )}
        </OutlinedField>
        {inviteHits.map((hit) => (
          <button
            key={hit.profileId}
            type="button"
            className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setInviteHit(hit);
              setInviteHits([]);
              setInviteQuery('');
            }}
          >
            {hit.displayName}
          </button>
        ))}
        <div className="flex flex-wrap gap-2">
          {['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].map((role) => (
            <Button key={role} type="button" size="sm" variant={inviteRole === role ? 'default' : 'outline'} onClick={() => setInviteRole(role)}>
              {t(`contribute.matters.work.roles.${role}`)}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={busy || !inviteHit}
          onClick={() =>
            void run(async () => {
              if (!inviteHit) return;
              await inviteMatterParticipant(bundle.matter.id, {
                role: inviteRole,
                kind: inviteHit.kind as MatterActorKind,
                profileId: inviteHit.profileId,
              });
              setInviteHit(null);
            })
          }
        >
          {t('contribute.matters.work.sendInvite')}
        </Button>
      </Card>
      <Card className="space-y-3 border-dashed p-4">
        <h3 className="text-sm font-medium">{t('contribute.matters.work.requestSharedResponsibility')}</h3>
        <p className="text-xs text-muted-foreground">{t('contribute.matters.work.requestSharedResponsibilityHint')}</p>
        <OutlinedField label={t('contribute.matters.work.invitePerson')}>
          {shareHit ? (
            <p className="py-1 text-sm">{shareHit.displayName}</p>
          ) : (
            <Input
              value={shareQuery}
              onChange={(event) => {
                setShareQuery(event.target.value);
                searchPeople(event.target.value, setShareHits);
              }}
            />
          )}
        </OutlinedField>
        {shareHits.map((hit) => (
          <button
            key={hit.profileId}
            type="button"
            className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setShareHit(hit);
              setShareHits([]);
              setShareQuery('');
            }}
          >
            {hit.displayName}
          </button>
        ))}
        <Button
          type="button"
          size="sm"
          disabled={busy || !shareHit}
          onClick={() =>
            void run(async () => {
              if (!shareHit) return;
              await inviteMatterParticipant(bundle.matter.id, {
                role: 'responsible_collaborator',
                kind: shareHit.kind as MatterActorKind,
                profileId: shareHit.profileId,
              });
              setShareHit(null);
            })
          }
        >
          {t('contribute.matters.work.sendRequest')}
        </Button>
      </Card>
      </>
    ) : null}
    </>
  );
}

export function MatterWorkAddTask({ model }: { model: MatterWorkPanelModel }) {
  const {
    title, setTitle, assigneeQuery, setAssigneeQuery, assignee, setAssignee, hits, setHits,
    reviewRequired, setReviewRequired, dependsOn, setDependsOn, parentTaskId, setParentTaskId,
    searchPeople, run, bundle, canManageWork, busy, t,
  } = model;
  return (
    <>
    {canManageWork ? (
    <Card className="space-y-3 border-dashed p-4">
      <h3 className="text-sm font-medium">{t('contribute.matters.work.addTask')}</h3>
      <OutlinedField label={t('contribute.matters.work.taskTitle')}>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </OutlinedField>
      <OutlinedField label={t('contribute.matters.work.assignee')}>
        {assignee ? (
          <div className="flex items-center justify-between gap-2 py-1">
            <p className="text-sm">{assignee.displayName}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAssignee(null)}>
              {t('common.edit')}
            </Button>
          </div>
        ) : (
          <Input
            value={assigneeQuery}
            onChange={(event) => {
              setAssigneeQuery(event.target.value);
              searchPeople(event.target.value, setHits);
            }}
          />
        )}
      </OutlinedField>
      {hits.map((hit) => (
        <button
          key={hit.profileId}
          type="button"
          className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          onClick={() => {
            setAssignee(hit);
            setHits([]);
            setAssigneeQuery('');
          }}
        >
          {hit.displayName}
        </button>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={reviewRequired} onChange={(event) => setReviewRequired(event.target.checked)} />
        {t('contribute.matters.work.reviewRequired')}
      </label>
      {bundle.tasks.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t('contribute.matters.work.parentTask')}</p>
          {bundle.tasks.filter((task) => task.status !== 'cancelled').map((task) => (
            <label key={task.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="parent-task"
                checked={parentTaskId === task.id}
                onChange={() => setParentTaskId(task.id)}
              />
              {task.title}
            </label>
          ))}
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setParentTaskId('')}>
            {t('contribute.matters.work.noParent')}
          </button>
          <p className="text-xs text-muted-foreground">{t('contribute.matters.work.dependsOn')}</p>
          {bundle.tasks.filter((task) => task.status !== 'cancelled').map((task) => (
            <label key={`dep-${task.id}`} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dependsOn.includes(task.id)}
                onChange={(event) =>
                  setDependsOn((current) =>
                    event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id),
                  )
                }
              />
              {task.title}
            </label>
          ))}
        </div>
      ) : null}
      <Button
        type="button"
        disabled={busy || title.trim().length < 3}
        onClick={() =>
          void run(async () => {
            await createCollaborationTask({
              matterId: bundle.matter.id,
              title: title.trim(),
              assigneeKind: (assignee?.kind ?? 'person') as MatterActorKind,
              assigneeProfileId: assignee?.profileId,
              reviewRequired,
              parentTaskId: parentTaskId || null,
              dependsOn,
            });
            setTitle('');
            setAssignee(null);
            setDependsOn([]);
            setParentTaskId('');
            setReviewRequired(false);
          })
        }
      >
        {t('contribute.matters.work.createTask')}
      </Button>
    </Card>
    ) : null}
    </>
  );
}

export function MatterWorkDecision({ model }: { model: MatterWorkPanelModel }) {
  const {
    title, decisionTitle, setDecisionTitle, decisionStatement, setDecisionStatement,
    decisionRationale, setDecisionRationale, run, bundle, busy, t,
  } = model;
  return (
    <>
    <Card className="space-y-3 border-dashed p-4">
      <h3 className="text-sm font-medium">{t('contribute.matters.work.addDecision')}</h3>
      <OutlinedField label={t('contribute.matters.work.decisionTitle')}>
        <Input value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} />
      </OutlinedField>
      <OutlinedField label={t('contribute.matters.work.decisionStatement')}>
        <Textarea value={decisionStatement} onChange={(event) => setDecisionStatement(event.target.value)} rows={3} />
      </OutlinedField>
      <OutlinedField label={t('contribute.matters.work.decisionRationale')}>
        <Textarea value={decisionRationale} onChange={(event) => setDecisionRationale(event.target.value)} rows={2} />
      </OutlinedField>
      <Button
        type="button"
        disabled={busy || decisionTitle.trim().length < 3 || decisionStatement.trim().length < 3}
        onClick={() =>
          void run(async () => {
            await proposeMatterDecision({
              matterId: bundle.matter.id,
              title: decisionTitle.trim(),
              statement: decisionStatement.trim(),
              rationale: decisionRationale.trim() || undefined,
            });
            setDecisionTitle('');
            setDecisionStatement('');
            setDecisionRationale('');
          })
        }
      >
        {t('contribute.matters.work.recordDecision')}
      </Button>
    </Card>
    </>
  );
}

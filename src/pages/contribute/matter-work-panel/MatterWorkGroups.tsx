import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { actorLabel, viewerRepresents } from '@/lib/matters';
import { addMatterComment, addTaskEvidence, performCollaborationAction } from '@/lib/matters-api';
import { dueLine, taskActionFor } from '@/pages/contribute/matter-work-panel/matter-work-panel-shared';
import type { useMatterWorkPanel } from '@/pages/contribute/matter-work-panel/useMatterWorkPanel';

type MatterWorkPanelModel = ReturnType<typeof useMatterWorkPanel>;

export function MatterWorkGroups({ model }: { model: MatterWorkPanelModel }) {
  const {
    taskComment, setTaskComment, evidenceNote, setEvidenceNote, actionNote, setActionNote,
    reassignQuery, setReassignQuery, reassignHits, setReassignHits, reassignTarget,
    setReassignTarget, pending, groups, searchPeople, run, actOn, bundle, profileId, linkedIds,
    busy, t,
  } = model;
  return (
    <>
    {(['needs_attention', 'in_progress', 'waiting', 'completed'] as const).map((group) => {
      const items = groups[group];
      if (items.length === 0) return null;
      return (
        <section key={group} className="space-y-2">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t(`contribute.matters.work.groups.${group}`)}
          </h3>
          {items.map((task) => {
            const action = taskActionFor(task, pending);
            const mine = Boolean(
              action && viewerRepresents(profileId, action.assignedActor, linkedIds),
            );
            const comments = bundle.comments.filter((item) => item.taskId === task.id);
            const evidence = bundle.attachments.filter((item) => item.taskId === task.id);
            const indent = task.parentTaskId ? 'ml-4 border-l border-border/70 pl-3' : '';
            return (
              <Card key={task.id} className={`space-y-2 border-border/70 p-4 ${indent}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`contribute.matters.work.status.${task.status}`)}
                      {task.lead ? ` · ${actorLabel(task.lead)}` : ''}
                    </p>
                  </div>
                  {action ? (
                    <p className="text-xs text-muted-foreground">{dueLine(action)}</p>
                  ) : null}
                </div>
                {task.waitingCondition ? (
                  <p className="text-sm text-muted-foreground">{task.waitingCondition}</p>
                ) : null}
                {task.dependencies.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('contribute.matters.work.blockedBy')}{' '}
                    {task.dependencies.map((dep) => dep.dependsOnTitle).join(', ')}
                  </p>
                ) : null}
                {evidence.length > 0 ? (
                  <ul className="text-xs text-muted-foreground">
                    {evidence.map((item) => (
                      <li key={item.id}>{item.label || item.bodyText || item.url || item.fileName}</li>
                    ))}
                  </ul>
                ) : null}
                {task.assignments.some((row) => row.declineReason || row.suggestionReason) ? (
                  <ul className="text-xs text-muted-foreground">
                    {task.assignments.filter((row) => row.declineReason || row.suggestionReason).map((row) => (
                      <li key={row.id}>
                        {row.declineReason
                          ? `${t('contribute.matters.work.decline')}: ${row.declineReason}`
                          : `${t('contribute.matters.work.suggestReassign')}: ${row.suggestionReason}`}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {mine && (action?.actionType === 'accept_task' || action?.actionType === 'complete_task' || action?.actionType === 'review_task' || action?.actionType === 'reconsider_task') ? (
                  <OutlinedField label={t('contribute.matters.actionNoteLabel')}>
                    <Textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} rows={2} />
                  </OutlinedField>
                ) : null}
                {mine && action?.actionType === 'accept_task' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={busy} onClick={() => void actOn(action, 'accept')}>
                      {t('contribute.matters.work.accept')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'request_clarification', actionNote || undefined)}>
                      {t('contribute.matters.work.askClarification')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'decline', actionNote || undefined)}>
                      {t('contribute.matters.work.decline')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void actOn(action, 'suggest_reassignment', actionNote || undefined)}>
                      {t('contribute.matters.work.suggestReassign')}
                    </Button>
                  </div>
                ) : null}
                {mine && action?.actionType === 'complete_task' ? (
                  <div className="space-y-2">
                    <OutlinedField label={t('contribute.matters.work.evidenceNote')}>
                      <Textarea
                        value={evidenceNote[task.id] ?? ''}
                        onChange={(event) => setEvidenceNote((current) => ({ ...current, [task.id]: event.target.value }))}
                        rows={2}
                      />
                    </OutlinedField>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const note = evidenceNote[task.id]?.trim();
                          if (note) await addTaskEvidence(bundle.matter.id, task.id, { kind: 'text', bodyText: note, label: 'Work note' });
                          await performCollaborationAction(action.id, task.reviewRequired ? 'submit' : 'complete');
                        })
                      }
                    >
                      {task.reviewRequired ? t('contribute.matters.work.submit') : t('contribute.matters.work.complete')}
                    </Button>
                  </div>
                ) : null}
                {mine && action?.actionType === 'review_task' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={busy} onClick={() => void actOn(action, 'accept_completion')}>
                      {t('contribute.matters.work.acceptCompletion')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'request_changes', actionNote || undefined)}>
                      {t('contribute.matters.work.requestChanges')}
                    </Button>
                  </div>
                ) : null}
                {mine && action?.actionType === 'reconsider_task' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{t('contribute.matters.work.reconsiderHint')}</p>
                    <OutlinedField label={t('contribute.matters.work.reassignTo')}>
                      {reassignTarget[task.id] ? (
                        <p className="py-1 text-sm">{reassignTarget[task.id]?.displayName}</p>
                      ) : (
                        <Input
                          value={reassignQuery[task.id] ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setReassignQuery((current) => ({ ...current, [task.id]: value }));
                            searchPeople(value, (next) => setReassignHits((current) => ({ ...current, [task.id]: next })));
                          }}
                        />
                      )}
                    </OutlinedField>
                    {(reassignHits[task.id] ?? []).map((hit) => (
                      <button
                        key={hit.profileId}
                        type="button"
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setReassignTarget((current) => ({ ...current, [task.id]: hit }));
                          setReassignHits((current) => ({ ...current, [task.id]: [] }));
                        }}
                      >
                        {hit.displayName}
                      </button>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || !reassignTarget[task.id]}
                        onClick={() => void actOn(action, 'reassign', actionNote || undefined, reassignTarget[task.id])}
                      >
                        {t('contribute.matters.work.reassign')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'respond', actionNote || undefined)}>
                        {t('contribute.matters.work.respondClarification')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'waive', actionNote || undefined)}>
                        {t('contribute.matters.work.waive')}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void actOn(action, 'cancel_task', actionNote || undefined)}>
                        {t('contribute.matters.work.cancelTask')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {comments.length > 0 ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {comments.map((item) => (
                      <li key={item.id}>
                        {actorLabel(item.author)}: {item.body}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <OutlinedField label={t('contribute.matters.work.taskComment')}>
                  <Textarea
                    value={taskComment[task.id] ?? ''}
                    onChange={(event) => setTaskComment((current) => ({ ...current, [task.id]: event.target.value }))}
                    rows={2}
                  />
                </OutlinedField>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || !(taskComment[task.id] || '').trim()}
                  onClick={() =>
                    void run(async () => {
                      await addMatterComment(bundle.matter.id, taskComment[task.id].trim(), { taskId: task.id });
                      setTaskComment((current) => ({ ...current, [task.id]: '' }));
                    })
                  }
                >
                  {t('contribute.matters.postComment')}
                </Button>
              </Card>
            );
          })}
        </section>
      );
    })}
    </>
  );
}

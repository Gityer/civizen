import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { actorLabel, formatDueDate, viewerRepresents } from '@/lib/matters';
import type { useMatterDetail } from '@/pages/contribute/matter-detail/useMatterDetail';

type MatterDetailModel = ReturnType<typeof useMatterDetail>;

export function MatterDetailBall({ model }: { model: MatterDetailModel }) {
  const {
    linkedIds, busy, actionMessage, setActionMessage, targetQuery, setTargetQuery, target,
    setTarget, targetHits, setTargetHits, t, profileId, action, ball, pendingActions,
    runCollabAction,
  } = model;
  return (
    <>
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

    </>
  );
}

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { actorLabel, viewerRepresents } from '@/lib/matters';
import { performCollaborationAction } from '@/lib/matters-api';
import { MatterWorkPanel } from '@/pages/contribute/MatterWorkPanel';
import { MatterAgentPanel } from '@/pages/contribute/MatterAgentPanel';
import { MatterResolutionPanel } from '@/pages/contribute/MatterResolutionPanel';
import { formatWhen } from '@/pages/contribute/matter-detail/matter-detail-shared';
import type { useMatterDetail } from '@/pages/contribute/matter-detail/useMatterDetail';

type MatterDetailModel = ReturnType<typeof useMatterDetail>;

export function MatterDetailSections({ model }: { model: MatterDetailModel }) {
  const {
    bundle, linkedIds, busy, setBusy, comment, setComment, replyTo, setReplyTo, mentionQuery,
    setMentionQuery, mentions, setMentions, mentionHits, setMentionHits, file, setFile, section, t,
    profileId, load, matter, viewerIsResponsible, hasWork, pendingActions, hasResolution,
    hasOutcome, hasAi, rootComments, postComment,
  } = model;
  return (
    <>
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

    {(hasWork || (bundle?.decisions.length ?? 0) > 0) && (section === 'decisions' || section === 'overview') ? (
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
    </>
  );
}

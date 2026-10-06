import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { completeMatterCollaborativeWork, startMatterCollaborativeWork } from '@/lib/matters-api';
import { toast } from 'sonner';
import type { useMatterDetail } from '@/pages/contribute/matter-detail/useMatterDetail';

type MatterDetailModel = ReturnType<typeof useMatterDetail>;

export function MatterDetailActions({ model }: { model: MatterDetailModel }) {
  const {
    busy, setBusy, section, setSection, outstandingReason, setOutstandingReason, t, tRef, load,
    matter, viewerIsResponsible, hasWork, outstandingTasks, hasOutstanding, progress, sectionItems,
  } = model;
  return (
    <>
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

    </>
  );
}

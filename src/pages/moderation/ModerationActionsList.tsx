import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  appealModerationAction,
  decideModerationAppeal,
  isReasonCode,
  moderationErrorKey,
  type ModerationAction,
} from '@/lib/moderation';

type Mode = 'mine' | 'appeals';

function ActionCard({ action, mode, viewerProfileId, onDone }: { action: ModerationAction; mode: Mode; viewerProfileId?: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const reason = isReasonCode(action.reasonCode) ? t(`moderation.reasons.${action.reasonCode}`) : action.reasonCode;
  const ownDecision = mode === 'appeals' && action.moderatorProfileId === viewerProfileId;

  const run = async (work: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(t(successKey));
      setText('');
      onDone();
    } catch (error) {
      toast.error(t(moderationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  const status = action.restoredAt
    ? t('moderation.mine.restored')
    : action.appealDecision === 'upheld'
      ? t('moderation.mine.upheld')
      : action.appealedAt
        ? t('moderation.mine.appealPending')
        : null;

  return (
    <Card className="space-y-2 p-4" data-testid={`moderation-action-${action.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="rounded-full">{t(`moderation.kinds.${action.targetKind}`)}</Badge>
        <span className="text-muted-foreground">{t('moderation.mine.hiddenFor', { reason })}</span>
        {mode === 'appeals' && action.authorUsername ? <span className="text-muted-foreground">@{action.authorUsername}</span> : null}
        {status ? <Badge variant="secondary" className="rounded-full">{status}</Badge> : null}
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{action.excerpt}</p>
      {action.note ? <p className="text-xs text-muted-foreground">{t('moderation.mine.moderatorNote', { note: action.note })}</p> : null}
      {action.appealText ? (
        <p className="rounded-lg bg-muted/50 p-2 text-xs text-foreground">
          <span className="font-medium">{t('moderation.appeals.appealLabel')}: </span>{action.appealText}
        </p>
      ) : null}

      {mode === 'mine' && !action.appealedAt && !action.restoredAt ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000}
            placeholder={t('moderation.mine.appealPlaceholder')} data-testid="moderation-appeal-text" />
          <Button type="button" size="sm" disabled={busy || text.trim().length < 3} data-testid="moderation-appeal-send"
            onClick={() => void run(() => appealModerationAction(action.id, text), 'moderation.mine.appealSent')}>
            {t('moderation.mine.sendAppeal')}
          </Button>
        </div>
      ) : null}

      {mode === 'appeals' ? (
        ownDecision ? (
          <p className="text-xs text-muted-foreground">{t('moderation.appeals.rule')}</p>
        ) : (
          <div className="space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={t('moderation.queue.noteLabel')} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy} data-testid="moderation-appeal-overturn"
                onClick={() => void run(() => decideModerationAppeal(action.id, true, text), 'moderation.appeals.overturned')}>
                {t('moderation.appeals.overturn')}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} data-testid="moderation-appeal-uphold"
                onClick={() => void run(() => decideModerationAppeal(action.id, false, text), 'moderation.appeals.upheld')}>
                {t('moderation.appeals.uphold')}
              </Button>
            </div>
          </div>
        )
      ) : null}
    </Card>
  );
}

export function ModerationActionsList({ actions, mode, viewerProfileId, onChanged }: {
  actions: ModerationAction[];
  mode: Mode;
  viewerProfileId?: string;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  if (actions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(mode === 'mine' ? 'moderation.mine.empty' : 'moderation.appeals.empty')}</p>;
  }
  return (
    <div className="space-y-3">
      {mode === 'appeals' ? <p className="text-xs text-muted-foreground">{t('moderation.appeals.rule')}</p> : null}
      {actions.map((action) => (
        <ActionCard key={action.id} action={action} mode={mode} viewerProfileId={viewerProfileId} onDone={onChanged} />
      ))}
    </div>
  );
}

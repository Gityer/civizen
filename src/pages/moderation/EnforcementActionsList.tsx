import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  appealEnforcement,
  decideEnforcementAppeal,
  enforcementErrorKey,
  isStanding,
  type EnforcementAction,
} from '@/lib/member-enforcement';
import { isReasonCode, moderationErrorKey } from '@/lib/moderation';

type Mode = 'mine' | 'appeals';

function ActionCard({ action, mode, viewerProfileId, onDone }: { action: EnforcementAction; mode: Mode; viewerProfileId?: string; onDone: () => void }) {
  const { t, language } = useLanguage();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const reason = isReasonCode(action.reasonCode) ? t(`moderation.reasons.${action.reasonCode}`) : action.reasonCode;
  const ownDecision = mode === 'appeals' && action.moderatorProfileId === viewerProfileId;
  const standing = isStanding(action);

  const run = async (work: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(t(successKey));
      setText('');
      onDone();
    } catch (error) {
      toast.error(t(enforcementErrorKey(error instanceof Error ? error.message : '', moderationErrorKey)));
    } finally {
      setBusy(false);
    }
  };

  const status = action.liftedAt || action.appealDecision === 'overturned'
    ? t('moderation.mine.restored')
    : action.appealDecision === 'upheld'
      ? t('moderation.mine.upheld')
      : action.appealedAt
        ? t('moderation.mine.appealPending')
        : null;

  return (
    <Card className="space-y-2 p-4" data-testid={`enforcement-action-${action.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={standing ? 'destructive' : 'outline'} className="rounded-full">{t(`memberEnforcement.steps.${action.step}`)}</Badge>
        <span className="text-muted-foreground">{t('memberEnforcement.mine.reason', { reason })}</span>
        {mode === 'appeals' && action.username ? <span className="text-muted-foreground">@{action.username}</span> : null}
        {action.endsAt ? (
          <span className="text-muted-foreground">
            {standing
              ? t('memberEnforcement.mine.until', { date: new Date(action.endsAt).toLocaleString(language || undefined, { dateStyle: 'medium', timeStyle: 'short' }) })
              : t('memberEnforcement.mine.ended')}
          </span>
        ) : null}
        {status ? <Badge variant="secondary" className="rounded-full">{status}</Badge> : null}
      </div>
      {action.note ? <p className="text-xs text-muted-foreground">{t('moderation.mine.moderatorNote', { note: action.note })}</p> : null}
      {action.appealText ? (
        <p className="rounded-lg bg-muted/50 p-2 text-xs text-foreground">
          <span className="font-medium">{t('moderation.appeals.appealLabel')}: </span>{action.appealText}
        </p>
      ) : null}

      {mode === 'mine' && !action.appealedAt && !action.liftedAt ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000}
            placeholder={t('moderation.mine.appealPlaceholder')} data-testid="enforcement-appeal-text" />
          <Button type="button" size="sm" disabled={busy || text.trim().length < 3} data-testid="enforcement-appeal-send"
            onClick={() => void run(() => appealEnforcement(action.id, text), 'moderation.mine.appealSent')}>
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
              <Button type="button" size="sm" disabled={busy} data-testid="enforcement-appeal-overturn"
                onClick={() => void run(() => decideEnforcementAppeal(action.id, true, text), 'moderation.appeals.overturned')}>
                {t('moderation.appeals.overturn')}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} data-testid="enforcement-appeal-uphold"
                onClick={() => void run(() => decideEnforcementAppeal(action.id, false, text), 'moderation.appeals.upheld')}>
                {t('moderation.appeals.uphold')}
              </Button>
            </div>
          </div>
        )
      ) : null}
    </Card>
  );
}

/** Decisions about members' accounts: the member's own (with one appeal) or open appeals for moderators. */
export function EnforcementActionsList({ actions, mode, viewerProfileId, onChanged }: {
  actions: EnforcementAction[];
  mode: Mode;
  viewerProfileId?: string;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="space-y-3" data-testid={`enforcement-${mode}`}>
      <h2 className="text-sm font-semibold text-foreground">{t(mode === 'mine' ? 'memberEnforcement.mine.title' : 'memberEnforcement.appeals.title')}</h2>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(mode === 'mine' ? 'memberEnforcement.mine.empty' : 'memberEnforcement.appeals.empty')}</p>
      ) : (
        actions.map((action) => <ActionCard key={action.id} action={action} mode={mode} viewerProfileId={viewerProfileId} onDone={onChanged} />)
      )}
    </section>
  );
}

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  MODERATION_REASON_CODES,
  claimModerationTarget,
  dismissModerationTarget,
  hideModerationTarget,
  isReasonCode,
  moderationErrorKey,
  moderationTargetRoute,
  type ModerationQueueItem,
  type ModerationReasonCode,
} from '@/lib/moderation';
import { EnforcementForm } from '@/pages/moderation/EnforcementForm';

/** One open report group (all reports on the same item): claim, hide with a reason, or dismiss. */
function QueueCard({ item, onDone }: { item: ModerationQueueItem; onDone: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<ModerationReasonCode>(
    item.reasonCodes.find(isReasonCode) as ModerationReasonCode | undefined ?? 'other',
  );
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const route = moderationTargetRoute(item.targetKind, item.targetId);

  const run = async (work: () => Promise<void>, successKey?: string) => {
    setBusy(true);
    try {
      await work();
      if (successKey) toast.success(t(successKey));
      onDone();
    } catch (error) {
      toast.error(t(moderationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4" data-testid={`moderation-queue-${item.targetKind}-${item.targetId}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="rounded-full">{t(`moderation.kinds.${item.targetKind}`)}</Badge>
        <span className="text-muted-foreground">{t('moderation.queue.reports', { count: String(item.reportCount) })}</span>
        {item.authorUsername ? <span className="text-muted-foreground">@{item.authorUsername}</span> : null}
        {item.claimedByUsername ? (
          <span className="text-muted-foreground">{t('moderation.queue.claimedBy', { username: item.claimedByUsername })}</span>
        ) : null}
        {route ? (
          <Link to={route} className="inline-flex items-center gap-1 text-primary hover:underline" aria-label={t('moderation.queue.open')}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t('moderation.queue.open')}
          </Link>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{item.excerpt}</p>
      <div className="flex flex-wrap gap-1">
        {item.reasonCodes.map((code) => (
          <Badge key={code} variant="secondary" className="rounded-full text-[11px]">
            {isReasonCode(code) ? t(`moderation.reasons.${code}`) : code}
          </Badge>
        ))}
      </div>
      {item.targetKind === 'user' ? (
        <EnforcementForm profileId={item.targetId} username={item.authorUsername}
          initialReason={(item.reasonCodes.find(isReasonCode) as ModerationReasonCode | undefined) ?? 'other'} onDone={onDone} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <Select value={reason} onValueChange={(value) => setReason(value as ModerationReasonCode)}>
            <SelectTrigger aria-label={t('moderation.queue.hideReason')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODERATION_REASON_CODES.map((code) => (
                <SelectItem key={code} value={code}>{t(`moderation.reasons.${code}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} placeholder={t('moderation.queue.noteLabel')} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!item.claimedBy ? (
          <Button type="button" size="sm" variant="outline" disabled={busy}
            onClick={() => void run(() => claimModerationTarget(item.targetKind, item.targetId))}>
            {t('moderation.queue.claim')}
          </Button>
        ) : null}
        {item.targetKind !== 'user' ? (
          <Button type="button" size="sm" variant="destructive" disabled={busy} data-testid="moderation-hide"
            onClick={() => void run(() => hideModerationTarget(item.targetKind, item.targetId, reason, note), 'moderation.queue.hidden')}>
            {t('moderation.queue.hide')}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled={busy} data-testid="moderation-dismiss"
          onClick={() => void run(() => dismissModerationTarget(item.targetKind, item.targetId, note), 'moderation.queue.dismissed')}>
          {t('moderation.queue.dismiss')}
        </Button>
      </div>
      {item.targetKind !== 'user' && item.authorProfileId ? (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            {item.authorUsername ? t('memberEnforcement.form.title', { username: item.authorUsername }) : t('memberEnforcement.form.titleNoName')}
          </summary>
          <div className="pt-2">
            <EnforcementForm profileId={item.authorProfileId} username={item.authorUsername} initialReason={reason} onDone={onDone} />
          </div>
        </details>
      ) : null}
    </Card>
  );
}

export function ModerationQueueList({ items, onChanged }: { items: ModerationQueueItem[]; onChanged: () => void }) {
  const { t } = useLanguage();
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t('moderation.queue.empty')}</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <QueueCard key={`${item.targetKind}:${item.targetId}`} item={item} onDone={onChanged} />
      ))}
    </div>
  );
}

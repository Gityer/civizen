import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { confirmRemoval, enforcementErrorKey, withdrawRemoval, type EnforcementAction } from '@/lib/member-enforcement';
import { isReasonCode, moderationErrorKey } from '@/lib/moderation';

function RemovalCard({ action, viewerProfileId, onDone }: { action: EnforcementAction; viewerProfileId?: string; onDone: () => void }) {
  const { t, language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const reason = isReasonCode(action.reasonCode) ? t(`moderation.reasons.${action.reasonCode}`) : action.reasonCode;
  const ownProposal = action.moderatorProfileId === viewerProfileId;

  const run = async (work: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(t(successKey));
      onDone();
    } catch (error) {
      toast.error(t(enforcementErrorKey(error instanceof Error ? error.message : '', moderationErrorKey)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-2 p-4" data-testid={`removal-${action.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="destructive" className="rounded-full">{t('memberEnforcement.steps.removal')}</Badge>
        {action.username ? <span className="text-muted-foreground">@{action.username}</span> : null}
        <span className="text-muted-foreground">{t('memberEnforcement.mine.reason', { reason })}</span>
        <span className="text-muted-foreground">
          {t('memberEnforcement.removals.proposedBy', { date: new Date(action.createdAt).toLocaleString(language || undefined, { dateStyle: 'medium', timeStyle: 'short' }) })}
        </span>
      </div>
      {action.note ? <p className="text-xs text-muted-foreground">{t('moderation.mine.moderatorNote', { note: action.note })}</p> : null}
      {ownProposal ? <p className="text-xs text-muted-foreground">{t('memberEnforcement.removals.ownProposal')}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={busy} data-testid="removal-confirm"
          onClick={() => void run(() => confirmRemoval(action.id), 'memberEnforcement.removals.confirmed')}>
          {t('memberEnforcement.removals.confirm')}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} data-testid="removal-withdraw"
          onClick={() => void run(() => withdrawRemoval(action.id), 'memberEnforcement.removals.withdrawn')}>
          {t('memberEnforcement.removals.withdraw')}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Removals a moderator proposed and a second moderator still has to confirm (TD2). The proposer sees the card but the
 * server refuses their confirmation, unless the founder confirms while there are fewer than two moderators.
 */
export function PendingRemovalsList({ actions, viewerProfileId, onChanged }: {
  actions: EnforcementAction[];
  viewerProfileId?: string;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="space-y-3" data-testid="pending-removals">
      <h2 className="text-sm font-semibold text-foreground">{t('memberEnforcement.removals.title')}</h2>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('memberEnforcement.removals.empty')}</p>
      ) : (
        actions.map((action) => <RemovalCard key={action.id} action={action} viewerProfileId={viewerProfileId} onDone={onChanged} />)
      )}
    </section>
  );
}

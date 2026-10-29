import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { escalateMatterToCivicOperations, overdueActionForInitiator } from '@/lib/matter-escalation';
import type { useMatterDetail } from '@/pages/contribute/matter-detail/useMatterDetail';

/**
 * When the party the initiator is waiting on is past its deadline, the initiator can pass the Matter to Civic
 * Operations (launch gap 2): it lands in that position's queue instead of waiting on the silent party.
 */
export function MatterEscalateCard({ model }: { model: ReturnType<typeof useMatterDetail> }) {
  const { t, matter, pendingActions, profileId, linkedIds, viewerIsInitiator, load } = model;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  if (!matter || !viewerIsInitiator || !['submitted', 'active'].includes(matter.lifecycleStatus)) return null;
  if (!overdueActionForInitiator(pendingActions, profileId, linkedIds)) return null;

  const send = async () => {
    setBusy(true);
    try {
      await escalateMatterToCivicOperations(matter.id, note);
      setSent(true);
      toast.success(t('contribute.matters.escalate.sent'));
      void load();
    } catch {
      toast.error(t('contribute.matters.escalate.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-2 border-amber-500/40 p-4" data-testid="matter-escalate">
      <h2 className="text-sm font-semibold text-foreground">{t('contribute.matters.escalate.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('contribute.matters.escalate.body')}</p>
      {sent ? null : (
        <>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000}
            placeholder={t('contribute.matters.escalate.note')} aria-label={t('contribute.matters.escalate.note')} />
          <Button type="button" size="sm" disabled={busy} onClick={() => void send()} data-testid="matter-escalate-send">
            {t('contribute.matters.escalate.send')}
          </Button>
        </>
      )}
    </Card>
  );
}

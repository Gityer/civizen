import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  cancelElection,
  certifyElection,
  electionAdminErrorKey,
  extendElection,
  listElectionsForAdministration,
  requestElectionCertification,
  rescheduleElection,
  type ElectionAdminAction,
  type ElectionAdminItem,
} from '@/lib/civic-voting/election-admin';
import { ElectionAdminActionDialog, type ElectionAdminDialogValues } from './ElectionAdminActionDialog';
import { ElectionAdminCard } from './ElectionAdminCard';

/**
 * Election administration (v2 step C2): consultations that are scheduled, open, awaiting certification or
 * recently changed. Reschedule, extend, cancel (with a public reason) and certify with a second person.
 * New consultations are still created from a Matter through a voting proposal.
 */
export function StewardConsoleElections() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ElectionAdminItem[] | null>(null);
  const [pending, setPending] = useState<{ item: ElectionAdminItem; action: ElectionAdminAction } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listElectionsForAdministration());
    } catch {
      setItems([]);
      toast.error(t('electionAdmin.errors.generic'));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async ({ reason, opensAt, closesAt }: ElectionAdminDialogValues) => {
    if (!pending) return;
    const { item, action } = pending;
    setBusy(true);
    try {
      if (action === 'reschedule' && opensAt && closesAt) await rescheduleElection(item.electionId, opensAt, closesAt, reason);
      if (action === 'extend' && closesAt) await extendElection(item.electionId, closesAt, reason);
      if (action === 'cancel') await cancelElection(item.electionId, reason);
      if (action === 'requestCertification') await requestElectionCertification(item.electionId, reason);
      if (action === 'certify') await certifyElection(item.electionId);
      toast.success(t(`electionAdmin.done.${action}`));
      setPending(null);
      await load();
    } catch (error) {
      toast.error(t(electionAdminErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  if (items === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('electionAdmin.intro')}</p>
      {items.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">{t('electionAdmin.empty')}</Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ElectionAdminCard key={item.electionId} item={item} onAction={(target, action) => setPending({ item: target, action })} />
          ))}
        </div>
      )}
      <ElectionAdminActionDialog action={pending?.action ?? null} item={pending?.item ?? null} busy={busy}
        onOpenChange={(open) => !open && setPending(null)} onSubmit={(values) => void submit(values)} />
    </div>
  );
}

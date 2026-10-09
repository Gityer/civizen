import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PublicMarketJobListing } from '@/lib/market-job-listings';
import { updateMarketJobInterest, withdrawMarketJobInterest, type MarketJobOwnPatch } from '@/lib/market-job-own';

type Props = {
  listing: PublicMarketJobListing;
  onUpdated: (id: string, patch: MarketJobOwnPatch) => void;
  onWithdrawn: (id: string) => void;
};

/** Edit and withdraw controls on the poster's own row (Phase 6 step 6.2). */
export function MarketJobOwnActions({ listing, onUpdated, onWithdrawn }: Props) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState(listing.pay_amount ?? '');
  const [payPeriod, setPayPeriod] = useState(listing.pay_period ?? '');
  const [city, setCity] = useState(listing.city ?? '');
  const [notes, setNotes] = useState('');

  const save = async () => {
    setBusy(true);
    try {
      const patch: MarketJobOwnPatch = { pay_amount: payAmount.trim() || null, pay_period: payPeriod.trim() || null, city: city.trim() || null };
      if (notes.trim()) patch.notes = notes.trim();
      await updateMarketJobInterest(listing.id, patch);
      onUpdated(listing.id, patch);
      toast.success(t('market.jobsBoard.ownSaved'));
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('market.jobsBoard.ownSaveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!window.confirm(t('market.jobsBoard.ownWithdrawConfirm'))) return;
    setBusy(true);
    try {
      await withdrawMarketJobInterest(listing.id);
      onWithdrawn(listing.id);
      toast.success(t('market.jobsBoard.ownWithdrawn'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('market.jobsBoard.ownSaveFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1" data-testid={`market-job-own-${listing.id}`}>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t('market.jobsBoard.ownEdit')} title={t('market.jobsBoard.ownEdit')} disabled={busy} onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={t('market.jobsBoard.ownWithdraw')} title={t('market.jobsBoard.ownWithdraw')} disabled={busy} onClick={() => void withdraw()}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </span>
    );
  }

  return (
    <div className="grid min-w-64 gap-2 rounded-lg border border-border/60 bg-background p-2 text-left" data-testid={`market-job-own-edit-${listing.id}`}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`own-pay-${listing.id}`} className="text-xs">{t('market.jobsBoard.ownPay')}</Label>
          <Input id={`own-pay-${listing.id}`} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`own-period-${listing.id}`} className="text-xs">{t('market.jobsBoard.ownPayPeriod')}</Label>
          <Input id={`own-period-${listing.id}`} value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`own-city-${listing.id}`} className="text-xs">{t('market.jobsBoard.colCity')}</Label>
        <Input id={`own-city-${listing.id}`} value={city} onChange={(e) => setCity(e.target.value)} className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`own-notes-${listing.id}`} className="text-xs">{t('market.jobsBoard.ownNotes')}</Label>
        <Textarea id={`own-notes-${listing.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>{t('common.save')}</Button>
      </div>
    </div>
  );
}

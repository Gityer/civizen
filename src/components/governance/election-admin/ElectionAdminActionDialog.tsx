import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ElectionAdminAction, ElectionAdminItem } from '@/lib/civic-voting/election-admin';

export type ElectionAdminDialogValues = { reason: string; opensAt: string | null; closesAt: string | null };

/** `datetime-local` value (local time, minutes) for an ISO timestamp. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Reason (and new times where needed) for one administrative action on an election (v2 step C2). */
export function ElectionAdminActionDialog({
  action,
  item,
  busy,
  onOpenChange,
  onSubmit,
}: {
  action: ElectionAdminAction | null;
  item: ElectionAdminItem | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ElectionAdminDialogValues) => void;
}) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');

  useEffect(() => {
    setReason('');
    setOpensAt(toLocalInput(item?.opensAt ?? null));
    setClosesAt(toLocalInput(item?.closesAt ?? null));
  }, [action, item]);

  if (!action || !item) return null;

  const needsOpens = action === 'reschedule';
  const needsCloses = action === 'reschedule' || action === 'extend';
  const reasonRequired = action !== 'certify' && action !== 'requestCertification';
  const reasonOk = !reasonRequired || reason.trim().length >= 5;
  const timesOk = (!needsOpens || Boolean(fromLocalInput(opensAt))) && (!needsCloses || Boolean(fromLocalInput(closesAt)));

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent data-testid={`election-admin-dialog-${action}`}>
        <DialogHeader>
          <DialogTitle>{t(`electionAdmin.actions.${action}`)}</DialogTitle>
          <DialogDescription>
            {item.title}. {t(`electionAdmin.help.${action}`)}
          </DialogDescription>
        </DialogHeader>
        {needsOpens ? (
          <div className="space-y-1">
            <Label htmlFor="election-admin-opens">{t('electionAdmin.opensAt')}</Label>
            <Input id="election-admin-opens" type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} />
          </div>
        ) : null}
        {needsCloses ? (
          <div className="space-y-1">
            <Label htmlFor="election-admin-closes">{t('electionAdmin.closesAt')}</Label>
            <Input id="election-admin-closes" type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)}
              data-testid="election-admin-closes" />
          </div>
        ) : null}
        {action !== 'certify' ? (
          <div className="space-y-1">
            <Label htmlFor="election-admin-reason">{t(reasonRequired ? 'electionAdmin.reason' : 'electionAdmin.note')}</Label>
            <Textarea id="election-admin-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000}
              placeholder={t('electionAdmin.reasonPlaceholder')} data-testid="election-admin-reason" />
            <p className="text-xs text-muted-foreground">{t('electionAdmin.public')}</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={action === 'cancel' ? 'destructive' : 'default'}
            disabled={busy || !reasonOk || !timesOk}
            onClick={() => onSubmit({ reason: reason.trim(), opensAt: fromLocalInput(opensAt), closesAt: fromLocalInput(closesAt) })}
            data-testid="election-admin-submit"
          >
            {t(`electionAdmin.actions.${action}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

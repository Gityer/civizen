import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ACCOUNT_DELETION_CONFIRM_WORD,
  accountDeletionErrorKey,
  deleteMyAccount,
  isAccountDeletionConfirmed,
} from '@/lib/account-deletion';

/** Self-service account removal with a typed confirmation. */
export function DeleteAccountCard() {
  const { t } = useLanguage();
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (busy || !isAccountDeletionConfirmed(confirmation)) return;
    setBusy(true);
    try {
      await deleteMyAccount(ACCOUNT_DELETION_CONFIRM_WORD, profile?.id);
      toast.success(t('settings.deleteAccountDone'));
      setOpen(false);
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(t(accountDeletionErrorKey(error instanceof Error ? error.message : null)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 border-destructive/40 p-4" data-testid="delete-account-card">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{t('settings.deleteAccountTitle')}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('settings.deleteAccountDescription')}
        </p>
      </div>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          setOpen(next);
          if (!next) setConfirmation('');
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm" className="gap-2">
            <Trash2 className="h-4 w-4" aria-hidden />
            {t('settings.deleteAccountButton')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deleteAccountConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteAccountConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="delete-account-confirm" className="text-xs text-muted-foreground">
              {t('settings.deleteAccountTypeHint', { word: ACCOUNT_DELETION_CONFIRM_WORD })}
            </label>
            <Input
              id="delete-account-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={busy}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('settings.deleteAccountCancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !isAccountDeletionConfirmed(confirmation)}
              onClick={() => void handleDelete()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('settings.deleteAccountSubmit')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  decryptSecretKeyBackup,
  deleteKeyBackup,
  encryptSecretKeyBackup,
  generateRecoveryCode,
  isRecoveryCodeShape,
  loadKeyBackup,
  loadKeyBackupMeta,
  saveKeyBackup,
  type StoredBackupMeta,
} from '@/lib/messaging-key-backup';
import { getDeviceMessagingSecretKey, publicKeyBase64FromSecretKey, saveDeviceMessagingSecretKey } from '@/lib/messaging-e2ee';

type Props = { profileId: string; hasLocalKey: boolean; serverPublicKey: string | null; onChanged: () => void };

/**
 * Backup of the device's private messaging key under a recovery code, and restore on another device
 * (Phase 7 step 7.1). The code is shown once; the server only ever holds the encrypted copy.
 */
export function MessagingKeyBackupCard({ profileId, hasLocalKey, serverPublicKey, onChanged }: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState<StoredBackupMeta>(null);
  const [busy, setBusy] = useState(false);
  const [freshCode, setFreshCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');

  const refreshMeta = useCallback(async () => {
    try {
      setMeta(await loadKeyBackupMeta(supabase, profileId));
    } catch {
      setMeta(null);
    }
  }, [profileId]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const createBackup = async () => {
    setBusy(true);
    try {
      const secret = await getDeviceMessagingSecretKey(profileId);
      if (!secret) throw new Error('no local key');
      const code = generateRecoveryCode();
      const blob = await encryptSecretKeyBackup(secret, publicKeyBase64FromSecretKey(secret), code);
      await saveKeyBackup(supabase, profileId, blob);
      setFreshCode(code);
      toast.success(t('settings.keyBackup.created'));
      await refreshMeta();
    } catch {
      toast.error(t('settings.keyBackup.createFailed'));
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!isRecoveryCodeShape(codeInput)) {
      toast.error(t('settings.keyBackup.restoreWrongCode'));
      return;
    }
    setBusy(true);
    try {
      const blob = await loadKeyBackup(supabase, profileId);
      const secret = blob ? await decryptSecretKeyBackup(blob, codeInput) : null;
      if (!secret) {
        toast.error(t('settings.keyBackup.restoreWrongCode'));
        return;
      }
      await saveDeviceMessagingSecretKey(profileId, secret);
      const publicKey = publicKeyBase64FromSecretKey(secret);
      if (serverPublicKey !== publicKey) {
        await supabase.from('profiles').update({ messaging_x25519_public_key: publicKey }).eq('id', profileId);
      }
      setCodeInput('');
      toast.success(t('settings.keyBackup.restored'));
      onChanged();
    } catch {
      toast.error(t('settings.keyBackup.restoreFailed'));
    } finally {
      setBusy(false);
    }
  };

  const removeBackup = async () => {
    setBusy(true);
    try {
      await deleteKeyBackup(supabase, profileId);
      toast.success(t('settings.keyBackup.deleted'));
      await refreshMeta();
    } catch {
      toast.error(t('settings.keyBackup.deleteFailed'));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!freshCode) return;
    try {
      await navigator.clipboard.writeText(freshCode);
      toast.success(t('settings.keyBackup.copied'));
    } catch {
      /* clipboard unavailable: the code stays on screen */
    }
  };

  const stale = Boolean(meta && serverPublicKey && meta.public_key !== serverPublicKey);
  const savedOn = meta ? new Date(meta.created_at).toLocaleDateString(language) : null;

  return (
    <Card className="space-y-4 border-border/80 p-4" data-testid="messaging-key-backup-card">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{t('settings.keyBackup.title')}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.keyBackup.description')}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="messaging-key-backup-status">
        {meta ? t('settings.keyBackup.savedOn', { date: savedOn ?? '' }) : t('settings.keyBackup.none')}
        {stale ? ` ${t('settings.keyBackup.staleHint')}` : ''}
      </p>

      {freshCode ? (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3" data-testid="messaging-recovery-code">
          <p className="text-sm font-medium text-foreground">{t('settings.keyBackup.codeTitle')}</p>
          <p className="select-all break-all font-mono text-sm tracking-wide text-foreground">{freshCode}</p>
          <p className="text-xs text-muted-foreground">{t('settings.keyBackup.codeHint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void copyCode()}>{t('settings.keyBackup.copy')}</Button>
            <Button type="button" size="sm" onClick={() => setFreshCode(null)}>{t('settings.keyBackup.done')}</Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {hasLocalKey ? (
          <Button type="button" size="sm" onClick={() => void createBackup()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t(meta ? 'settings.keyBackup.replace' : 'settings.keyBackup.create')}
          </Button>
        ) : null}
        {meta ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void removeBackup()} disabled={busy}>
            {t('settings.keyBackup.delete')}
          </Button>
        ) : null}
      </div>

      {meta && !hasLocalKey ? (
        <div className="space-y-2 rounded-xl border border-border/60 p-3" data-testid="messaging-key-restore">
          <p className="text-sm font-medium text-foreground">{t('settings.keyBackup.restoreTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('settings.keyBackup.restoreHint')}</p>
          <Input
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder={t('settings.keyBackup.codePlaceholder')}
            aria-label={t('settings.keyBackup.codeTitle')}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          <Button type="button" size="sm" onClick={() => void restoreBackup()} disabled={busy || !codeInput.trim()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('settings.keyBackup.restore')}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

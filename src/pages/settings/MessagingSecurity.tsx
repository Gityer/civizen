import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessagingKeyBackupCard } from '@/components/settings/MessagingKeyBackupCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  clearDeviceMessagingSecretKey,
  encodePublicKeyBase64,
  generateMessagingKeyPair,
  getDeviceMessagingSecretKey,
  saveDeviceMessagingSecretKey,
} from '@/lib/messaging-e2ee';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function MessagingSecurity() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [hasLocalKey, setHasLocalKey] = useState(false);
  const [serverPublicKey, setServerPublicKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile?.id) return;
    const local = await getDeviceMessagingSecretKey(profile.id);
    setHasLocalKey(Boolean(local));
    const { data } = await supabase
      .from('profiles')
      .select('messaging_x25519_public_key')
      .eq('id', profile.id)
      .single();
    setServerPublicKey((data?.messaging_x25519_public_key as string | null) ?? null);
  }, [profile?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enableE2ee = async () => {
    if (!profile?.id) return;
    setBusy(true);
    try {
      const pair = generateMessagingKeyPair();
      await saveDeviceMessagingSecretKey(profile.id, pair.secretKey);
      const pubB64 = encodePublicKeyBase64(pair.publicKey);
      const { error } = await supabase
        .from('profiles')
        .update({ messaging_x25519_public_key: pubB64 })
        .eq('id', profile.id);
      if (error) {
        await clearDeviceMessagingSecretKey(profile.id);
        toast.error(t('settings.messagingSecurityEnableFailed'));
        return;
      }
      toast.success(t('settings.messagingSecurityEnabled'));
      await refresh();
    } catch {
      toast.error(t('settings.messagingSecurityEnableFailed'));
    } finally {
      setBusy(false);
    }
  };

  const disableE2ee = async () => {
    if (!profile?.id) return;
    setBusy(true);
    try {
      await clearDeviceMessagingSecretKey(profile.id);
      const { error } = await supabase
        .from('profiles')
        .update({ messaging_x25519_public_key: null })
        .eq('id', profile.id);
      if (error) {
        toast.error(t('settings.messagingSecurityDisableFailed'));
        return;
      }
      toast.success(t('settings.messagingSecurityDisabled'));
      await refresh();
    } catch {
      toast.error(t('settings.messagingSecurityDisableFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.messagingSecurityTitle')}
          subtitle={t('settings.messagingSecuritySubtitle')}
          fallbackPath="/settings/messaging"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
          }
        />

        <Card className="space-y-3 border-border/80 p-4">
          <p className="text-sm text-foreground">{t('settings.messagingSecurityDmBody')}</p>
          <p className="text-xs text-muted-foreground">{t('settings.messagingSecurityDmFootnote')}</p>
        </Card>

        <Card className="space-y-3 border-border/80 p-4">
          <p className="text-sm font-medium text-foreground">{t('settings.messagingSecurityCallsTitle')}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.messagingSecurityCallsBody')}</p>
        </Card>

        {!profile?.id ? (
          <p className="text-sm text-muted-foreground">{t('settings.messagingSecuritySignIn')}</p>
        ) : (
          <Card className="space-y-4 border-border/80 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('settings.messagingSecurityStatusTitle')}</p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                <li>
                  {hasLocalKey
                    ? t('settings.messagingSecurityStatusLocalOn')
                    : t('settings.messagingSecurityStatusLocalOff')}
                </li>
                <li>
                  {serverPublicKey
                    ? t('settings.messagingSecurityStatusServerOn')
                    : t('settings.messagingSecurityStatusServerOff')}
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void enableE2ee()} disabled={busy || !profile.id}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('settings.messagingSecurityEnable')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void disableE2ee()}
                disabled={busy || (!hasLocalKey && !serverPublicKey)}
              >
                {t('settings.messagingSecurityDisable')}
              </Button>
            </div>
          </Card>
        )}

        {profile?.id ? (
          <MessagingKeyBackupCard profileId={profile.id} hasLocalKey={hasLocalKey} serverPublicKey={serverPublicKey} onChanged={() => void refresh()} />
        ) : null}
      </div>
    </AppLayout>
  );
}

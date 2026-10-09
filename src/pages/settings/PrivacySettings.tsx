import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { DeleteAccountCard } from '@/components/settings/DeleteAccountCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  disableBiometricSignIn,
  enableBiometricSignIn,
  getBiometricSignInCapability,
  isBiometricSignInSupportedPlatform,
} from '@/lib/biometric-sign-in';
import { Fingerprint, Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export default function PrivacySettings() {
  const { session, profile } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState('unsupported_platform');
  const nativeSupported = isBiometricSignInSupportedPlatform();
  // Step 2.5: opt-in daily e-mail digest of unread notifications.
  const [digest, setDigest] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);

  useEffect(() => {
    setDigest(Boolean((profile as { notification_email_digest?: boolean } | null)?.notification_email_digest));
  }, [profile]);

  const handleDigest = async (next: boolean) => {
    if (digestBusy) return;
    setDigestBusy(true);
    try {
      const { error } = await supabase.rpc('set_notification_email_digest', { p_enabled: next });
      if (error) throw new Error(error.message);
      setDigest(next);
      toast.success(t(next ? 'settings.emailDigestEnabled' : 'settings.emailDigestDisabled'));
    } catch {
      toast.error(t('settings.emailDigestFailed'));
    } finally {
      setDigestBusy(false);
    }
  };

  const refresh = useCallback(async () => {
    const capability = await getBiometricSignInCapability();
    setDeviceReady(capability.deviceReady);
    setEnabled(capability.canUnlock);
    setStatus(capability.status);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleToggle = async (nextEnabled: boolean) => {
    if (!session?.user || busy) return;
    setBusy(true);
    try {
      if (nextEnabled) {
        const { error } = await enableBiometricSignIn(
          {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            userId: session.user.id,
            email: session.user.email ?? undefined,
            displayName: profile?.full_name ?? undefined,
          },
          { reason: t('settings.biometricEnablePrompt') },
        );
        if (error) {
          toast.error(error.message || t('settings.biometricEnableFailed'));
          return;
        }
        toast.success(t('settings.biometricEnabled'));
      } else {
        const { error } = await disableBiometricSignIn();
        if (error) {
          toast.error(error.message || t('settings.biometricDisableFailed'));
          return;
        }
        toast.success(t('settings.biometricDisabled'));
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // Step 3.7: what other members may see on the public profile card.
  const PRIVACY_KEYS = ['show_country', 'show_city', 'show_score', 'show_endorsements'] as const;
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({});
  const [privacyBusy, setPrivacyBusy] = useState<string | null>(null);
  useEffect(() => {
    const stored = (profile as { privacy_settings?: Record<string, unknown> } | null)?.privacy_settings ?? {};
    setPrivacy(Object.fromEntries(PRIVACY_KEYS.map((key) => [key, stored[key] !== false])));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- PRIVACY_KEYS is a constant
  }, [profile]);
  const handlePrivacy = async (key: string, next: boolean) => {
    if (privacyBusy) return;
    setPrivacyBusy(key);
    try {
      const { error } = await supabase.rpc('set_my_privacy_settings', { p_settings: { [key]: next } });
      if (error) throw new Error(error.message);
      setPrivacy((prev) => ({ ...prev, [key]: next }));
    } catch {
      toast.error(t('settings.visibility.failed'));
    } finally {
      setPrivacyBusy(null);
    }
  };

  const availabilityHint = (() => {
    if (!nativeSupported) return t('settings.biometricAndroidOnly');
    if (status === 'none_enrolled') return t('settings.biometricNoneEnrolled');
    if (!deviceReady) return t('settings.biometricUnavailable');
    return t('settings.biometricDescription');
  })();

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.privacy')}
          subtitle={t('settings.privacyDescription')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Fingerprint className="h-6 w-6" />
            </div>
          }
        />

        <Card className="space-y-4 border-border/80 p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <h2 className="text-sm font-semibold text-foreground">{t('settings.biometricTitle')}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{availabilityHint}</p>
            </div>
            {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" /> : null}
            <Switch
              checked={enabled}
              disabled={busy || !nativeSupported || !deviceReady || !session?.user}
              onCheckedChange={(checked) => void handleToggle(checked)}
              aria-label={t('settings.biometricTitle')}
            />
          </div>
        </Card>

        <Card className="space-y-4 border-border/80 p-4" data-testid="email-digest-card">
          <div className="flex items-start gap-4">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="flex-1 space-y-1">
              <h2 className="text-sm font-semibold text-foreground">{t('settings.emailDigestTitle')}</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.emailDigestDescription')}</p>
            </div>
            {digestBusy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" /> : null}
            <Switch
              checked={digest}
              disabled={digestBusy || !session?.user}
              onCheckedChange={(checked) => void handleDigest(checked)}
              aria-label={t('settings.emailDigestTitle')}
            />
          </div>
        </Card>

        <Card className="space-y-3 border-border/80 p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{t('happiness.privacyTitle')}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('happiness.privacySettingsHint')}</p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/happiness/privacy">{t('happiness.openPrivacy')}</Link>
          </Button>
        </Card>

        <Card className="space-y-3 border-border/80 p-4" data-testid="profile-visibility-card">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{t('settings.visibility.title')}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.visibility.description')}</p>
          </div>
          {PRIVACY_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">{t(`settings.visibility.${key}`)}</span>
              <Switch
                checked={privacy[key] !== false}
                disabled={privacyBusy !== null || !session?.user}
                onCheckedChange={(checked) => void handlePrivacy(key, checked)}
                aria-label={t(`settings.visibility.${key}`)}
              />
            </div>
          ))}
        </Card>

        <DeleteAccountCard />
      </div>
    </AppLayout>
  );
}

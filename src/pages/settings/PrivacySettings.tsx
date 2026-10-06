import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { DataExportCard } from '@/components/settings/DataExportCard';
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
import { Fingerprint, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function PrivacySettings() {
  const { session, profile } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState('unsupported_platform');
  const nativeSupported = isBiometricSignInSupportedPlatform();

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

        <Card className="space-y-3 border-border/80 p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{t('happiness.privacyTitle')}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('happiness.privacySettingsHint')}</p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/happiness/privacy">{t('happiness.openPrivacy')}</Link>
          </Button>
        </Card>

        <DataExportCard />

        <DeleteAccountCard />
      </div>
    </AppLayout>
  );
}

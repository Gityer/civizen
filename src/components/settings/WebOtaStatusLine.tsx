import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CURRENT_ANDROID_RELEASE } from '@/lib/app-updates';
import { compareWebBundle, fetchWebOtaManifest, nativeShellSupportsBundle, type WebOtaManifest, type WebOtaStatus } from '@/lib/web-ota';

type Props = { installedReleaseLabel: string };

/**
 * Application version block (Phase 9 step 9.3): the installed release, plus which web layer is published for the
 * Android sideload channel and whether it is newer than the one running here. The native shell cannot apply a web
 * bundle yet (that step needs a native plugin and a signed APK release), so a newer bundle is reported, not applied.
 */
export function WebOtaStatusLine({ installedReleaseLabel }: Props) {
  const { t, language } = useLanguage();
  const [manifest, setManifest] = useState<WebOtaManifest | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    void fetchWebOtaManifest().then((result) => {
      if (!active) return;
      setManifest(result);
      setCheckedAt(new Date());
    });
    return () => {
      active = false;
    };
  }, []);

  const status: WebOtaStatus | null = manifest ? compareWebBundle(manifest) : null;
  const supported = manifest ? nativeShellSupportsBundle(manifest, CURRENT_ANDROID_RELEASE) : true;

  return (
    <div className="space-y-1" data-testid="app-release-info">
      <p className="text-sm font-medium text-foreground">{installedReleaseLabel}</p>
      {manifest && status ? (
        <p className="text-xs text-muted-foreground" data-testid="web-ota-status" data-status={status}>
          {t(`settings.webOta.${status}`, { version: manifest.bundleVersion })}
          {!supported ? ` ${t('settings.webOta.nativeTooOld')}` : ''}
          {checkedAt ? ` ${t('settings.webOta.checkedAt', { time: checkedAt.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }) })}` : ''}
        </p>
      ) : null}
    </div>
  );
}

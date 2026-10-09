import { useEffect, useState } from 'react';
import { Copy, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAndroidUpdateManifest, type AndroidUpdateManifest } from '@/lib/app-updates';
import { getAndroidUpdateManifestUrl } from '@/lib/downloads';

/** The published APK's SHA-256 and the release notes, read from the release manifest (Phase 9 step 9.1). */
export function AndroidChecksum() {
  const { t } = useLanguage();
  const [manifest, setManifest] = useState<AndroidUpdateManifest | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${getAndroidUpdateManifestUrl('release')}?t=${Date.now()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && isAndroidUpdateManifest(data)) setManifest(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!manifest) return null;
  const notes = (manifest.notes ?? []).filter((line) => typeof line === 'string' && line.trim());

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm" data-testid="android-checksum">
      {notes.length > 0 ? (
        <div>
          <p className="font-medium text-foreground">{t('downloads.android.whatChanged', { version: manifest.versionTag ?? manifest.version })}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {notes.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      ) : null}
      {manifest.sha256 ? (
        <div>
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            {t('downloads.android.checksumLabel')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('downloads.android.checksumHint')}</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-muted/60 px-2 py-1 text-[11px] text-foreground">{manifest.sha256}</code>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              aria-label={t('downloads.android.copyChecksum')}
              onClick={() => {
                void navigator.clipboard?.writeText(manifest.sha256 ?? '').then(() => toast.success(t('downloads.android.copied')));
              }}
            >
              <Copy className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

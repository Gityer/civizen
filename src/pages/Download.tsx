import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Apple, Download, ExternalLink, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ANDROID_DOWNLOAD_URL } from '@/lib/downloads';
import { PublicPageShell } from '@/components/public/PublicPageShell';

function isAndroidUserAgent(ua: string) {
  return /Android/i.test(ua);
}

export default function DownloadPage() {
  const { t } = useLanguage();
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAndroidUserAgent(window.navigator.userAgent)) return;
    if (new URLSearchParams(window.location.search).get('autodownload') === '0') return;

    // Sideload APKs rarely open the installer automatically; start the download and show steps.
    const timer = window.setTimeout(() => {
      setDownloadStarted(true);
      window.location.assign(ANDROID_DOWNLOAD_URL);
    }, 400);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <PublicPageShell
      contentClassName="px-4 py-8 sm:px-6 sm:py-12"
      layout="directory"
      showFooter
      sectionTrail={[{ label: t('downloads.title') }]}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            <Download className="h-4 w-4" />
            {t('downloads.badge')}
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">{t('downloads.title')}</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">{t('downloads.subtitle')}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="rounded-3xl border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{t('downloads.android.title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('downloads.android.subtitle')}</p>
                </div>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">{t('downloads.android.description')}</p>

              <ol className="space-y-2 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                <li>1. {t('downloads.android.step1')}</li>
                <li>2. {t('downloads.android.step2')}</li>
                <li>3. {t('downloads.android.step3')}</li>
              </ol>

              {downloadStarted ? (
                <p className="rounded-2xl border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
                  {t('downloads.android.openingDownload')}
                </p>
              ) : null}

              <Button asChild className="w-full gap-2">
                <a href={ANDROID_DOWNLOAD_URL} onClick={() => setDownloadStarted(true)}>
                  {t('downloads.android.button')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 bg-card/80 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Apple className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{t('downloads.ios.title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('downloads.ios.subtitle')}</p>
                </div>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">{t('downloads.ios.description')}</p>

              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                {t('downloads.ios.installHint')}
              </div>

              <Button disabled className="w-full">
                {t('downloads.ios.button')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button asChild variant="ghost">
            <Link to="/login">{t('downloads.backToApp')}</Link>
          </Button>
        </div>
      </motion.div>
    </PublicPageShell>
  );
}

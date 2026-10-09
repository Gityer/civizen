import { useNavigate } from 'react-router-dom';
import { Download, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeferredQrCode } from '@/components/ui/DeferredQrCode';
import { useLanguage } from '@/contexts/LanguageContext';
import { ANDROID_DOWNLOAD_URL, ANDROID_INSTALL_PAGE_URL } from '@/lib/downloads';
import { cn } from '@/lib/utils';

type AppDownloadCardProps = {
  variant?: 'stacked' | 'inline';
  className?: string;
  qrSize?: number;
  showTestingBadge?: boolean;
};

export function AppDownloadCard({
  variant = 'inline',
  className,
  qrSize = variant === 'stacked' ? 84 : 88,
  showTestingBadge = false,
}: AppDownloadCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const titleBlock = (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-foreground">{t('home.downloadApp')}</h3>
        {showTestingBadge ? (
          <Badge variant="secondary" className="rounded-full text-[10px] font-medium uppercase tracking-wide">
            {t('onboarding.earlyAccessBadge')}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{t('home.downloadAppDescription')}</p>
    </div>
  );

  if (variant === 'stacked') {
    return (
      <div className={cn('rounded-3xl border border-border/60 bg-card/90 p-5 shadow-soft', className)}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            {titleBlock}
          </div>
          <div className="rounded-2xl border border-border/50 bg-background p-2">
            <DeferredQrCode value={ANDROID_INSTALL_PAGE_URL} size={qrSize} includeMargin title={t('downloads.qrAlt')} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => window.open(ANDROID_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')}
            className="flex-1 gap-2"
          >
            <Download className="h-4 w-4" />
            {t('auth.downloadAndroid')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/download')}
            className="flex-1"
          >
            {t('home.openDownloadPage')}
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">{t('home.scanQrInstall')}</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            {titleBlock}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-2 rounded-xl">
              <a href={ANDROID_DOWNLOAD_URL}>
                <Download className="h-4 w-4" />
                {t('downloads.android.button')}
              </a>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate('/download')}
            >
              {t('home.openDownloadPage')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start rounded-2xl border border-border/60 bg-background/85 p-3 sm:self-center">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <DeferredQrCode value={ANDROID_INSTALL_PAGE_URL} size={qrSize} includeMargin title={t('downloads.qrAlt')} />
          </div>
          <p className="max-w-32 text-xs leading-5 text-muted-foreground">
            {t('home.scanQrInstall')}
          </p>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import { PUBLIC_JOBS_PATH } from '@/lib/public-jobs-path';

const CONTACT_URL = 'https://civizen.world';

const FOOTER_LINKS = [
  { to: '/why-this-exists', labelKey: 'onboarding.footerWhy' },
  { to: '/areas', labelKey: 'onboarding.footerAreas' },
  { to: PUBLIC_JOBS_PATH, labelKey: 'onboarding.footerJobs' },
  { to: '/fund', labelKey: 'onboarding.footerFund' },
  { to: '/documents', labelKey: 'onboarding.footerDocuments' },
  { to: '/governance', labelKey: 'onboarding.footerGovernance' },
  { to: '/about/legal-status', labelKey: 'onboarding.footerLegalStatus' },
  { to: '/terms', labelKey: 'onboarding.footerTerms' },
  { to: '/download', labelKey: 'onboarding.footerDownload' },
] as const;

export function PublicPageFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/40 pt-8 text-sm text-muted-foreground">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{t('common.appName')}</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t('onboarding.slogan')}
          </p>
        </div>
        <nav
          aria-label={t('common.appName')}
          className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8"
        >
          {FOOTER_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition-colors hover:text-foreground"
            >
              {t(item.labelKey)}
            </Link>
          ))}
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            {t('onboarding.footerContact')}
          </a>
        </nav>
      </div>
    </footer>
  );
}

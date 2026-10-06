import { Link, useLocation } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import { PUBLIC_JOBS_PATH } from '@/lib/public-jobs-path';
import { cn } from '@/lib/utils';

type PublicNavItem = {
  href: string;
  labelKey: string;
  match?: (pathname: string) => boolean;
};

const PUBLIC_PRIMARY_NAV: readonly PublicNavItem[] = [
  {
    href: '/why-this-exists',
    labelKey: 'onboarding.footerWhy',
    match: (pathname) => pathname === '/why-this-exists' || pathname.startsWith('/why-this-exists/'),
  },
  {
    href: '/areas',
    labelKey: 'onboarding.footerAreas',
    match: (pathname) => pathname === '/areas' || pathname.startsWith('/areas/'),
  },
  {
    href: PUBLIC_JOBS_PATH,
    labelKey: 'onboarding.footerJobs',
    match: (pathname) =>
      pathname === PUBLIC_JOBS_PATH ||
      pathname.startsWith(`${PUBLIC_JOBS_PATH}/`) ||
      pathname === '/market' ||
      pathname.startsWith('/market/'),
  },
  {
    href: '/documents',
    labelKey: 'onboarding.footerDocuments',
    match: (pathname) => pathname === '/documents' || pathname.startsWith('/documents/'),
  },
  {
    href: '/governance',
    labelKey: 'onboarding.footerGovernance',
    match: (pathname) => pathname === '/governance' || pathname.startsWith('/governance/'),
  },
] as const;

/** Visible destination links for the public header on large screens. */
export function PublicPrimaryNav({ className }: { className?: string }) {
  const { t } = useLanguage();
  const location = useLocation();

  return (
    <nav
      data-testid="public-primary-nav"
      aria-label={t('common.appName')}
      className={cn('hidden items-center gap-1 lg:flex', className)}
    >
      {PUBLIC_PRIMARY_NAV.map((item) => {
        const active = item.match?.(location.pathname) ?? location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

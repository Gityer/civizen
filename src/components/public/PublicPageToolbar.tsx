import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';

import { PublicLanguageSelect } from '@/components/public/PublicLanguageSelect';
import { PublicThemeToggle } from '@/components/public/PublicThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PUBLIC_JOBS_PATH } from '@/lib/public-jobs-path';
import { cn } from '@/lib/utils';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

type PublicPageToolbarProps = {
  className?: string;
  /**
   * Fade out the large-screen Sign in / Join pair (space is kept so the bar does not shift).
   * The landing sets this while its hero shows the same pair, so it never appears twice.
   */
  hideGuestAuthActions?: boolean;
};

export function PublicPageToolbar({ className, hideGuestAuthActions = false }: PublicPageToolbarProps) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const showGuestActions = !user;
  const showProfileMenu = Boolean(user && profile?.id);
  const authActionProps = {
    'aria-hidden': hideGuestAuthActions || undefined,
    tabIndex: hideGuestAuthActions ? -1 : undefined,
  };
  const authActionVisibility = hideGuestAuthActions ? 'pointer-events-none opacity-0' : 'opacity-100';

  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      {showGuestActions ? (
        <Link
          to={PUBLIC_JOBS_PATH}
          className="inline-flex h-9 items-center rounded-full px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent/70 lg:hidden"
          data-testid="public-jobs-link"
        >
          {t('onboarding.footerJobs')}
        </Link>
      ) : null}
      {showGuestActions ? (
        <>
          <Link
            to="/login"
            {...authActionProps}
            className={cn(
              'hidden h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-[color,background-color,opacity] duration-300 hover:bg-accent/70 hover:text-foreground motion-reduce:transition-none lg:inline-flex',
              authActionVisibility,
            )}
            data-testid="public-sign-in"
          >
            {t('onboarding.signIn')}
          </Link>
          <Link
            to="/signup"
            {...authActionProps}
            className={cn(
              'hidden h-9 items-center rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-[background-color,opacity] duration-300 hover:bg-primary/90 motion-reduce:transition-none lg:inline-flex',
              authActionVisibility,
            )}
            data-testid="public-join"
          >
            {t('onboarding.joinNetwork')}
          </Link>
          <Link
            to="/download"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent/70"
            data-testid="public-download-civizen"
          >
            <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="max-w-[9.5rem] truncate sm:max-w-none">{t('features.pages.downloads')}</span>
          </Link>
        </>
      ) : null}
      <PublicLanguageSelect />
      <PublicThemeToggle />
      {showProfileMenu ? (
        <Suspense fallback={<div className="h-10 w-10 rounded-full border border-border/60 bg-card/60" />}>
          <UserPageMenu />
        </Suspense>
      ) : null}
    </div>
  );
}

import { FileSignature } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';

import { MarketJobsInterestForm } from '@/components/market/MarketJobsInterestForm';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLanguageSelect } from '@/components/public/PublicLanguageSelect';
import { PublicThemeToggle } from '@/components/public/PublicThemeToggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

/**
 * Market is Jobs plus Agreements (decision D3, 2026-10-08). The product-listing grid, categories, saved
 * items, filters and prototype credits are retired until a lawful settlement path exists; Jobs stays
 * public and Agreements remain the way members formalise work.
 */
export default function Market() {
  const { t } = useLanguage();
  const { profile, loading: authLoading } = useAuth();
  const agreementsLabel = t('common.agreements');
  const profileMenuLabel = t('home.profileMenuButton');

  return (
    <AppLayout hideTopChrome>
      <div className="flex min-h-0 flex-col pb-28 lg:pb-8" data-build-key="marketPage" data-build-label="Marketplace page">
        <header
          className="sticky top-0 z-30 border-b border-border/60 bg-background/95 pb-3 pt-4 backdrop-blur-md supports-backdrop-filter:bg-background/80 lg:top-13"
          data-build-key="marketHeader"
          data-build-label="Marketplace header"
        >
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center justify-between gap-2 px-3">
              <h1
                className="truncate text-lg font-display font-bold leading-none tracking-tight text-foreground sm:text-xl"
                data-testid="market-page-title"
              >
                <span className="font-semibold text-muted-foreground">{t('market.title')}</span>
                <span className="font-normal text-muted-foreground"> / </span>
                <span>{t('market.categories.jobs')}</span>
              </h1>
              <div className="flex shrink-0 items-center gap-0.5">
                {profile?.id ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                          <Link
                            to="/agreements"
                            data-build-key="marketAgreementsLink"
                            data-build-label="Agreements link"
                            aria-label={agreementsLabel}
                          >
                            <FileSignature className="h-4 w-4" aria-hidden />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{agreementsLabel}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex shrink-0">
                          <Suspense fallback={<div className="h-8 w-8 shrink-0 rounded-full border border-border/60 bg-card/60" />}>
                            <UserPageMenu size="sm" />
                          </Suspense>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{profileMenuLabel}</TooltipContent>
                    </Tooltip>
                  </>
                ) : authLoading ? null : (
                  <div
                    className="flex items-center gap-1.5"
                    data-testid="market-guest-toolbar"
                    data-build-key="marketGuestToolbar"
                    data-build-label="Public Jobs sign-in tools"
                  >
                    <PublicLanguageSelect />
                    <PublicThemeToggle />
                    <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" asChild>
                      <Link to="/login" state={{ from: { pathname: '/market', search: '' } }}>
                        {t('onboarding.signIn')}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>
        </header>

        <div className="flex-1 space-y-3 px-3 pt-4" data-build-key="marketJobsSection">
          <MarketJobsInterestForm />
        </div>
      </div>
    </AppLayout>
  );
}

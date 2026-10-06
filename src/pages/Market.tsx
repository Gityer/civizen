import { FileSignature, ListFilter, Search, Coins } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { MarketFiltersSheet } from '@/components/market/MarketFiltersSheet';
import { MarketJobsInterestForm } from '@/components/market/MarketJobsInterestForm';
import { MarketListingCard } from '@/components/market/MarketListingCard';
import { MarketListingKindIconToggle } from '@/components/market/MarketListingKindIconToggle';
import { MarketListingSearchBar } from '@/components/market/MarketListingSearchBar';
import { MarketPostOfferDialog } from '@/components/market/MarketPostOfferDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLanguageSelect } from '@/components/public/PublicLanguageSelect';
import { PublicThemeToggle } from '@/components/public/PublicThemeToggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePageSecondaryNav } from '@/hooks/usePageSecondaryNav';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isMarketBrowseCategoryId,
  isMarketSectionId,
  MARKET_CAROUSEL_SECTION_IDS,
  MARKET_CATEGORY_ICONS,
  marketCategoryLabelKey,
  type MarketSectionId,
} from '@/lib/market-categories';
import {
  MARKET_FALLBACK_SECTION,
  resolveMarketSection,
  writeForYouSeenAt,
  writeLastMarketSection,
} from '@/lib/market-section-memory';
import type { MarketListingKind } from '@/lib/use-market-published-listings';
import {
  useMarketMyPublishedListings,
  useMarketPublishedListings,
} from '@/lib/use-market-published-listings';
import { LUMA_PROTOTYPE_NOTICE } from '@/lib/prototype-credits';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

function readListingKindFromParams(searchParams: URLSearchParams): MarketListingKind {
  return searchParams.get('kind') === 'service' ? 'service' : 'product';
}

export default function Market() {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { listings, loading: listingsLoading, error: listingsError, refetch: refetchListings } =
    useMarketPublishedListings();
  const {
    listings: myListings,
    loading: myListingsLoading,
    error: myListingsError,
    refetch: refetchMyListings,
  } = useMarketMyPublishedListings(profile?.id ?? null);
  const [postOpen, setPostOpen] = useState(false);
  const [section, setSection] = useState<MarketSectionId>(() =>
    resolveMarketSection({ sectionParam: searchParams.get('section') }),
  );
  const [listingSearchOpen, setListingSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [listingKind, setListingKind] = useState<MarketListingKind>(() =>
    readListingKindFromParams(searchParams),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const appliedForYouBoostRef = useRef(false);

  const amountLocale = language === 'en' ? 'en-US' : language;

  const bumpListings = useCallback(() => {
    void refetchListings();
    void refetchMyListings();
  }, [refetchListings, refetchMyListings]);

  const noopBalance = useCallback(() => {}, []);

  const isSaved = section === 'saved';
  const isSelling = section === 'sell';
  const isJobs = section === 'jobs';
  const isForYou = section === 'for-you';
  const browseCategoryId = isMarketBrowseCategoryId(section) ? section : null;

  const sourceListings = isSelling ? myListings : listings;
  const sourceLoading = isSelling ? myListingsLoading : listingsLoading;
  const sourceError = isSelling ? myListingsError : listingsError;

  const showListingKindToggle = !isJobs;

  const listingKindFilter: MarketListingKind | null = isJobs ? 'service' : listingKind;

  const filteredListings = useMemo(() => {
    return sourceListings.filter((listing) => {
      if (listingKindFilter && listing.listing_kind !== listingKindFilter) {
        return false;
      }
      if (searchDraft.trim()) {
        const needle = searchDraft.trim().toLowerCase();
        const haystack = `${listing.title} ${listing.description ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [listingKindFilter, searchDraft, sourceListings]);

  const marketSecondaryNav = useMemo(
    () => ({
      loop: true,
      persistCarousel: true,
      items: MARKET_CAROUSEL_SECTION_IDS.map((id) => ({
        id,
        label: t(marketCategoryLabelKey(id)),
        icon: MARKET_CATEGORY_ICONS[id],
        disabled: (id === 'sell' || id === 'saved') && !profile?.id,
      })),
      value: section,
      onChange: (value: string) => {
        if (!isMarketSectionId(value)) return;
        if ((value === 'sell' || value === 'saved') && !profile?.id) return;
        setSection(value);
      },
      fab: profile?.id
        ? {
            label: t('market.sellFabLabel'),
            ariaLabel: t('market.sellFabLabel'),
            onClick: () => {
              setSection('sell');
              setPostOpen(true);
            },
          }
        : null,
    }),
    [profile?.id, section, t],
  );
  usePageSecondaryNav(marketSecondaryNav);

  const emptyMessage = useMemo(() => {
    const servicesBrowse = listingKind === 'service' && !isSelling && !isSaved;
    if (isSaved) return t('market.sectionSavedEmpty');
    if (isSelling) {
      return listingKind === 'service' ? t('market.sellingEmptyServices') : t('market.sellingEmpty');
    }
    if (servicesBrowse) return t('market.sectionBrowseServicesEmpty');
    if (isForYou) return t('market.sectionForYouEmpty');
    if (section === 'local') return t('market.sectionLocalEmpty');
    if (isJobs) return t('market.sectionJobsEmpty');
    if (browseCategoryId) return t('market.sectionCategoryEmpty');
    return t('market.listingsEmpty');
  }, [browseCategoryId, isForYou, isJobs, isSaved, isSelling, listingKind, section, t]);

  const sectionTitle = t(marketCategoryLabelKey(section));
  const profileMenuLabel = t('home.profileMenuButton');
  const filtersLabel = t('market.filtersTitle');
  const agreementsLabel = t('common.agreements');
  const creditsLabel = t('market.walletShortcut');
  const searchLabel = t('common.search');

  useEffect(() => {
    const fromUrl = resolveMarketSection({ sectionParam: searchParams.get('section') });
    setSection((current) => (current === fromUrl ? current : fromUrl));
    const fromKind = readListingKindFromParams(searchParams);
    setListingKind((current) => (current === fromKind ? current : fromKind));
  }, [searchParams]);

  useEffect(() => {
    if (listingsLoading || appliedForYouBoostRef.current) return;
    if (searchParams.get('section')) {
      appliedForYouBoostRef.current = true;
      return;
    }
    const next = resolveMarketSection({
      sectionParam: null,
      listings,
      listingsReady: true,
    });
    appliedForYouBoostRef.current = true;
    setSection((current) => (current === next ? current : next));
  }, [listings, listingsLoading, searchParams]);

  useEffect(() => {
    writeLastMarketSection(section);
    if (section === 'for-you') {
      writeForYouSeenAt(new Date().toISOString());
    }
  }, [section]);

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('section', section);
        if (listingKind === 'service') {
          next.set('kind', 'service');
        } else {
          next.delete('kind');
        }
        next.delete('entity');
        return next;
      },
      { replace: true },
    );
  }, [listingKind, section, setSearchParams]);

  useEffect(() => {
    if ((section === 'sell' || section === 'saved') && !profile?.id) {
      setSection(MARKET_FALLBACK_SECTION);
    }
  }, [profile?.id, section]);

  useEffect(() => {
    if (!listingSearchOpen) return;
    queueMicrotask(() => searchInputRef.current?.focus());
  }, [listingSearchOpen]);

  const showListingsGrid = !isJobs && !isSaved;

  return (
    <AppLayout hideTopChrome>
      <div
        className="flex min-h-0 flex-col pb-28 lg:pb-8"
        data-build-key="marketPage"
        data-build-label="Marketplace page"
      >
        <header
          className="sticky top-0 z-30 border-b border-border/60 bg-background/95 pb-3 pt-4 backdrop-blur-md supports-backdrop-filter:bg-background/80 lg:top-13"
          data-build-key="marketHeader"
          data-build-label="Marketplace header"
        >
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center justify-between gap-2 px-3">
              <div className="flex min-w-0 flex-1 items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1
                      className="truncate text-lg font-display font-bold leading-none tracking-tight text-foreground sm:text-xl"
                      data-testid="market-page-title"
                    >
                      {isJobs ? (
                        <>
                          <span className="font-semibold text-muted-foreground">{t('market.title')}</span>
                          <span className="font-normal text-muted-foreground"> / </span>
                          <span>{t('market.categories.jobs')}</span>
                        </>
                      ) : (
                        t('market.title')
                      )}
                    </h1>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-sm leading-relaxed">
                    {t('market.specialists.description')}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setFiltersOpen(true)}
                      data-build-key="marketFiltersButton"
                      data-build-label="Open marketplace filters"
                      aria-label={filtersLabel}
                    >
                      <ListFilter className="h-4 w-4" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{filtersLabel}</TooltipContent>
                </Tooltip>
                {showListingKindToggle ? (
                  <MarketListingKindIconToggle
                    value={listingKind}
                    onChange={setListingKind}
                    productsLabel={t('market.filterProducts')}
                    servicesLabel={t('market.filterServices')}
                    groupLabel={t('market.listingKindToggleLabel')}
                  />
                ) : null}
              </div>
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
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                          <Link
                            to="/settings/prototype-credits"
                            data-build-key="marketPrototypeCreditsLink"
                            data-build-label="Prototype credits link"
                            aria-label={creditsLabel}
                          >
                            <Coins className="h-4 w-4" aria-hidden />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs space-y-1.5">
                        <p className="font-medium">{creditsLabel}</p>
                        <p className="text-xs font-normal leading-relaxed text-primary-foreground/90">
                          {LUMA_PROTOTYPE_NOTICE}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            setListingSearchOpen((current) => {
                              const next = !current;
                              if (!next) setSearchDraft('');
                              return next;
                            });
                          }}
                          data-build-key="marketListingSearchToggle"
                          data-build-label="Toggle listing search"
                          aria-label={searchLabel}
                          aria-pressed={listingSearchOpen}
                          data-testid="market-listing-search-toggle"
                        >
                          <Search className="h-4 w-4" aria-hidden />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{searchLabel}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex shrink-0">
                          <Suspense
                            fallback={
                              <div className="h-8 w-8 shrink-0 rounded-full border border-border/60 bg-card/60" />
                            }
                          >
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
                      <Link
                        to="/login"
                        state={{ from: { pathname: '/market', search: isJobs ? '?section=jobs' : '' } }}
                      >
                        {t('onboarding.signIn')}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>

          {listingSearchOpen ? (
            <MarketListingSearchBar
              inputRef={searchInputRef}
              value={searchDraft}
              onChange={setSearchDraft}
              listingKind={listingKind}
              t={t}
            />
          ) : null}
        </header>

        <div className="flex-1 space-y-3 px-2 pt-3 sm:px-3" data-build-key="marketGridSection">
          {!isForYou && !isJobs ? (
            <div className="px-1">
              <h2 className="text-base font-semibold text-foreground">{sectionTitle}</h2>
              {!isSelling && !isSaved && browseCategoryId ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{t('market.categoriesHint')}</p>
              ) : null}
            </div>
          ) : null}

          {isJobs ? (
            <div className="space-y-3 px-1 pt-1">
              <MarketJobsInterestForm />
            </div>
          ) : null}

          {isSaved ? (
            <Card className="mx-1 border-border/60 bg-muted/15 p-8 text-center text-sm text-muted-foreground">
              {t('market.sectionSavedEmpty')}
            </Card>
          ) : null}

          {showListingsGrid ? (
            sourceLoading ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t('market.listingsLoading')}</p>
            ) : sourceError ? (
              <p className="px-2 py-6 text-center text-sm text-destructive">{t('market.listingsError')}</p>
            ) : sourceListings.length === 0 ? (
              <Card className="mx-1 border-border/60 bg-muted/15 p-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </Card>
            ) : filteredListings.length === 0 ? (
              <Card className="mx-1 border-border/60 bg-muted/15 p-8 text-center text-sm text-muted-foreground">
                {searchDraft.trim() ? t('market.listingsNoMatch') : emptyMessage}
              </Card>
            ) : (
              <ul className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
                {filteredListings.map((listing) => (
                  <MarketListingCard
                    key={listing.id}
                    listing={listing}
                    buyerProfileId={profile?.id ?? null}
                    amountLocale={amountLocale}
                    t={t}
                    layout="marketplace"
                    onListingsChanged={bumpListings}
                    onBalanceChanged={noopBalance}
                  />
                ))}
              </ul>
            )
          ) : null}
        </div>

        {!user && !isJobs ? (
          <p className="px-4 pt-2 text-center text-xs text-muted-foreground">{t('market.signInToSell')}</p>
        ) : null}
      </div>

      <MarketFiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} t={t} />

      {profile?.id ? (
        <MarketPostOfferDialog
          open={postOpen}
          onOpenChange={setPostOpen}
          sellerProfileId={profile.id}
          onCreated={bumpListings}
          t={t}
        />
      ) : null}
    </AppLayout>
  );
}

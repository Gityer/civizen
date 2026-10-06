import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Building2, CheckCircle, FileText, Package, Search as SearchIcon, UserRound, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  buildSearchContentsCatalog,
  filterSearchContents,
  parseSearchTabParam,
  searchContentKindLabelKey,
  type SearchFilterTab,
  type SearchTabSelection,
} from '@/lib/search-contents';
import {
  parseSearchDirectoryPayload,
  type SearchDirectoryCompany,
  type SearchDirectoryPerson,
} from '@/lib/search-directory';
import { useMarketPublishedListings } from '@/lib/use-market-published-listings';
import { cn } from '@/lib/utils';

interface UnifiedSearchBlockProps {
  showTitle?: boolean;
  syncUrlParams?: boolean;
  className?: string;
  initialQuery?: string;
  /** Specific filter, or omit/`null` to search all categories. */
  initialTab?: SearchFilterTab | null;
}

const FILTER_TAB_LABEL_KEYS: Record<SearchFilterTab, string> = {
  people: 'search.tabPeople',
  companies: 'search.tabCompanies',
  products: 'search.tabProducts',
  services: 'search.tabServices',
  contents: 'search.tabContents',
};

export function UnifiedSearchBlock({
  showTitle = true,
  syncUrlParams = true,
  className,
  initialQuery = '',
  initialTab = null,
}: UnifiedSearchBlockProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile: currentProfile } = useAuth();
  const { t } = useLanguage();
  const { listings } = useMarketPublishedListings();
  const [query, setQuery] = useState(() => (syncUrlParams ? searchParams.get('q') ?? '' : initialQuery));
  const [peopleResults, setPeopleResults] = useState<SearchDirectoryPerson[]>([]);
  const [companyResults, setCompanyResults] = useState<SearchDirectoryCompany[]>([]);
  const [directoryError, setDirectoryError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<SearchTabSelection>(() => {
    if (!syncUrlParams) return initialTab;
    return parseSearchTabParam(searchParams.get('tab'));
  });

  // Adopt URL → local only when the URL itself changes (back/forward, deep link).
  // Do not depend on `query`/`tab` here — that reverts each keystroke against a stale `q`.
  useEffect(() => {
    if (!syncUrlParams) return;

    setTab(parseSearchTabParam(searchParams.get('tab')));
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams, syncUrlParams]);

  useEffect(() => {
    if (!syncUrlParams) return;

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (query.trim()) {
        next.set('q', query);
      } else {
        next.delete('q');
      }
      if (tab) {
        next.set('tab', tab);
      } else {
        next.delete('tab');
      }
      if (next.toString() === current.toString()) return current;
      return next;
    }, { replace: true });
  }, [query, setSearchParams, syncUrlParams, tab]);

  useEffect(() => {
    const searchDirectory = async () => {
      if (query.length < 2) {
        setPeopleResults([]);
        setCompanyResults([]);
        setDirectoryError(false);
        return;
      }

      // Skip network directory when filtering to listing/contents-only tabs.
      if (tab === 'products' || tab === 'services' || tab === 'contents') {
        setPeopleResults([]);
        setCompanyResults([]);
        setDirectoryError(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setDirectoryError(false);

      const { data, error } = await supabase.rpc('search_civizen_directory', {
        p_query: query,
        p_exclude_profile_id: currentProfile?.id ?? null,
        p_limit: 30,
      });

      if (error) {
        setDirectoryError(true);
        setPeopleResults([]);
        setCompanyResults([]);
        setLoading(false);
        return;
      }

      const parsed = parseSearchDirectoryPayload(data);
      setPeopleResults(parsed.people);
      setCompanyResults(parsed.companies);
      setLoading(false);
    };

    const debounce = setTimeout(searchDirectory, 250);
    return () => clearTimeout(debounce);
  }, [query, currentProfile?.id, tab]);

  const contentsCatalog = useMemo(
    () => buildSearchContentsCatalog(t, currentProfile?.effective_permissions ?? []),
    [t, currentProfile?.effective_permissions],
  );

  const contentResults = useMemo(
    () => filterSearchContents(contentsCatalog, query),
    [contentsCatalog, query],
  );

  const matchingListings = useMemo(() => {
    if (query.length < 2) return [];
    const normalized = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const haystack = `${listing.title} ${listing.description ?? ''} ${listing.profiles?.full_name ?? ''} ${listing.profiles?.username ?? ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [listings, query]);

  const productResults = useMemo(
    () => matchingListings.filter((listing) => listing.listing_kind === 'product').slice(0, 20),
    [matchingListings],
  );
  const serviceResults = useMemo(
    () => matchingListings.filter((listing) => listing.listing_kind === 'service').slice(0, 20),
    [matchingListings],
  );

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const priceLabel = (priceLumens: number) => {
    return `${(priceLumens / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Luma`;
  };

  const showPeople = tab === null || tab === 'people';
  const showCompanies = tab === null || tab === 'companies';
  const showProducts = tab === null || tab === 'products';
  const showServices = tab === null || tab === 'services';
  const showContents = tab === null || tab === 'contents';
  const hasAnyResults =
    (showPeople && peopleResults.length > 0)
    || (showCompanies && companyResults.length > 0)
    || (showProducts && productResults.length > 0)
    || (showServices && serviceResults.length > 0)
    || (showContents && contentResults.length > 0);

  const toggleFilterTab = (next: SearchFilterTab) => {
    setTab((current) => (current === next ? null : next));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {showTitle ? (
        <h1 className="text-2xl font-display font-bold text-foreground mb-4">
          {t('search.title')}
        </h1>
      ) : null}

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={t('search.placeholderUnified')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <div
        className="flex h-10 w-full items-center gap-1 overflow-x-auto rounded-md bg-muted p-1 text-muted-foreground scrollbar-none [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('search.title')}
      >
        {(Object.keys(FILTER_TAB_LABEL_KEYS) as SearchFilterTab[]).map((filterTab) => {
          const selected = tab === filterTab;
          return (
            <button
              key={filterTab}
              type="button"
              role="tab"
              aria-selected={selected}
              data-state={selected ? 'active' : 'inactive'}
              className={cn(
                'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:text-foreground',
              )}
              onClick={() => toggleFilterTab(filterTab)}
            >
              {t(FILTER_TAB_LABEL_KEYS[filterTab])}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {loading && (
          <p className="text-center text-muted-foreground animate-pulse-soft">
            {t('search.searching')}
          </p>
        )}

        {!loading && query.length >= 2 && directoryError && (showPeople || showCompanies) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <p className="text-sm text-muted-foreground">{t('search.directoryError')}</p>
          </motion.div>
        )}

        {!loading && query.length >= 2 && !hasAnyResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('search.noResultsFound')}</p>
            <p className="text-sm text-muted-foreground">{t('search.tryDifferent')}</p>
          </motion.div>
        )}

        {query.length >= 2 && showPeople && peopleResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t('search.tabPeople')}</h2>
            </div>
            {peopleResults.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {user.full_name || t('common.anonymousUser')}
                        </h3>
                        {user.is_verified && (
                          <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                      {user.username && (
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/user/${user.id}`)}>
                        {t('search.viewProfile')}
                      </Button>
                      <Button size="sm" onClick={() => navigate(`/endorse/${user.id}`)}>
                        {t('common.endorse')}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {query.length >= 2 && showCompanies && companyResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t('search.tabCompanies')}</h2>
            </div>
            {companyResults.map((company, index) => {
              const ownerName = company.owner?.full_name || company.owner?.username || t('common.anonymousUser');
              return (
                <motion.div
                  key={company.profile_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={company.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(company.profile.full_name || company.business_name_normalized)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {company.profile.full_name || company.business_name_normalized || t('search.companyFallback')}
                          </h3>
                          {company.profile.is_verified && (
                            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {company.profile.username ? `@${company.profile.username}` : t('search.businessAccount')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/user/${company.profile_id}`)}>
                          {t('search.viewProfile')}
                        </Button>
                        <Button size="sm" onClick={() => navigate(`/endorse/${company.profile_id}`)}>
                          {t('common.endorse')}
                        </Button>
                      </div>
                    </div>
                    {company.owner ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                        onClick={() => navigate(`/user/${company.owner!.id}`)}
                        aria-label={t('search.viewOwnerProfile', { name: ownerName })}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={company.owner.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {getInitials(company.owner.full_name || company.owner.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {t('search.runBy', { name: ownerName })}
                          </p>
                          {company.owner.username ? (
                            <p className="truncate text-xs text-muted-foreground">@{company.owner.username}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-primary">
                          {t('search.viewProfile')}
                        </span>
                      </button>
                    ) : null}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {query.length >= 2 && showProducts && productResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t('search.tabProducts')}</h2>
            </div>
            {productResults.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{listing.description || t('search.noDescription')}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">{priceLabel(listing.price_lumens)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {listing.profiles?.full_name || listing.profiles?.username || t('search.sellerFallback')}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/market?entity=products')}>
                      {t('search.openInMarket')}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {query.length >= 2 && showServices && serviceResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t('search.tabServices')}</h2>
            </div>
            {serviceResults.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{listing.description || t('search.noDescription')}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">{priceLabel(listing.price_lumens)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {listing.profiles?.full_name || listing.profiles?.username || t('search.sellerFallback')}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/market?entity=services')}>
                      {t('search.openInMarket')}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {query.length >= 2 && showContents && contentResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t('search.tabContents')}</h2>
            </div>
            {contentResults.map((hit, index) => (
              <motion.div
                key={hit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="truncate text-sm font-semibold text-foreground">{hit.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {hit.summary || t('search.noDescription')}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">{t(searchContentKindLabelKey(hit.kind))}</Badge>
                        <span className="truncate text-xs text-muted-foreground">{hit.path}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(hit.path)}>
                      {t('search.openContent')}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {query.length < 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('search.startTypingUnified')}</p>
            <p className="text-sm text-muted-foreground">
              {t('search.descriptionUnified')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

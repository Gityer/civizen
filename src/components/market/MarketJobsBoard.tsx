import { Lock, LockOpen, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  formatJobTypesDisplay,
  formatListingLocation,
  formatMaskedPhone,
  formatPayDisplay,
  formatPostedOn,
  formatUnlockedPhone,
  listPublicMarketJobListings,
  listingMatchesFilters,
  listingModeForViewer,
  unlockMarketJobContact,
  type PublicMarketJobListing,
  type UnlockedMarketJobContact,
} from '@/lib/market-job-listings';
import type { MarketJobMode } from '@/lib/market-job-types';
import { cn } from '@/lib/utils';

type MarketJobsBoardProps = {
  viewerMode: MarketJobMode;
  jobTypes: string[];
  countryCode: string;
  city: string;
  refreshKey: number;
};

export function MarketJobsBoard({
  viewerMode,
  jobTypes,
  countryCode,
  city,
  refreshKey,
}: MarketJobsBoardProps) {
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState<PublicMarketJobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<Record<string, UnlockedMarketJobContact>>({});

  const listingMode = listingModeForViewer(viewerMode);

  // Keep the latest translator for the fetch error toast without refetching when it changes.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listPublicMarketJobListings(listingMode)
      .then((rows) => {
        if (!cancelled) setListings(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setListings([]);
          toast.error(error instanceof Error ? error.message : tRef.current('market.jobsBoard.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingMode, refreshKey]);

  const visibleListings = useMemo(
    () =>
      listings.filter((listing) =>
        listingMatchesFilters(listing, {
          jobTypes,
          countryCode,
          city,
        }),
      ),
    [city, countryCode, jobTypes, listings],
  );

  const goToSignIn = () => {
    navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } });
  };

  const onUnlock = async (listing: PublicMarketJobListing) => {
    if (unlocked[listing.id]) {
      setUnlocked((current) => {
        const next = { ...current };
        delete next[listing.id];
        return next;
      });
      return;
    }
    if (authLoading) return;
    if (!user?.id) {
      toast.message(t('market.jobsBoard.signInToUnlock'));
      goToSignIn();
      return;
    }
    setUnlockingId(listing.id);
    try {
      const contact = await unlockMarketJobContact(listing.id);
      setUnlocked((current) => ({ ...current, [listing.id]: contact }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('market.jobsBoard.unlockError');
      if (/sign in required|not authenticated|42501/i.test(message)) {
        toast.message(t('market.jobsBoard.signInToUnlock'));
        goToSignIn();
      } else {
        toast.error(message);
      }
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <section className="space-y-3 pt-4" data-testid="market-jobs-board">
      <div className="space-y-1">
        <h3 className="text-lg font-display font-semibold text-foreground sm:text-xl">
          {viewerMode === 'seeker' ? t('market.jobsBoard.workTitle') : t('market.jobsBoard.workersTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {viewerMode === 'seeker' ? t('market.jobsBoard.workSubtitle') : t('market.jobsBoard.workersSubtitle')}
        </p>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('market.jobsBoard.loading')}</p>
      ) : visibleListings.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
          {viewerMode === 'seeker' ? t('market.jobsBoard.emptyWork') : t('market.jobsBoard.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">{t('market.jobsBoard.colPosted')}</th>
                <th className="px-3 py-2 font-semibold">
                  {viewerMode === 'seeker' ? t('market.jobsBoard.colCompany') : t('market.jobsBoard.colName')}
                </th>
                <th className="px-3 py-2 font-semibold">{t('market.jobsBoard.colJobType')}</th>
                <th className="px-3 py-2 font-semibold">{t('market.jobsBoard.colCity')}</th>
                <th className="px-3 py-2 font-semibold">{t('market.jobsBoard.colAge')}</th>
                <th className="px-3 py-2 font-semibold">{t('market.jobsBoard.colPay')}</th>
                <th className="px-3 py-2 font-semibold">{t('market.jobsBoard.colPhone')}</th>
                <th className="px-3 py-2 font-semibold">
                  <span className="sr-only">{t('market.jobsBoard.colAction')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleListings.map((listing) => {
                const contact = unlocked[listing.id];
                const name = contact
                  ? listing.mode === 'employer'
                    ? contact.company_name?.trim() || contact.full_name || listing.display_name
                    : contact.full_name || listing.display_name
                  : listing.display_name;
                const phone = contact
                  ? formatUnlockedPhone(contact)
                  : formatMaskedPhone(listing.phone_country_code, listing.has_phone);
                const unlocking = unlockingId === listing.id;
                return (
                  <tr key={listing.id} className="border-b border-border/40 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {formatPostedOn(listing.created_at, language === 'en' ? 'en-GB' : language)}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-primary">{name}</td>
                    <td className="max-w-[14rem] px-3 py-2.5 text-foreground">
                      {formatJobTypesDisplay(listing.job_types)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        {listing.country_code ? (
                          <RoundCountryFlag countryCode={listing.country_code} locale={language} size="xs" />
                        ) : null}
                        {formatListingLocation(listing)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{listing.age?.trim() || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {formatPayDisplay(listing.pay_amount, listing.pay_period)}
                    </td>
                    <td className={cn('whitespace-nowrap px-3 py-2.5', contact ? 'text-foreground' : 'text-muted-foreground')}>
                      {phone}
                    </td>
                    <td className="px-2 py-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => void onUnlock(listing)}
                        disabled={unlocking}
                        aria-label={
                          contact ? t('market.jobsBoard.lockAgain') : t('market.jobsBoard.unlockLabel')
                        }
                        data-testid={`market-jobs-unlock-${listing.id}`}
                      >
                        {unlocking ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : contact ? (
                          <LockOpen className="h-4 w-4" aria-hidden />
                        ) : (
                          <Lock className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

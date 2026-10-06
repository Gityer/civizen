import { useState } from 'react';
import { Briefcase, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatLumaFromLumens } from '@/lib/prototype-credits';
import { cn } from '@/lib/utils';
import type { PublishedMarketListing } from '@/lib/use-market-published-listings';

import { MarketListingArchiveButton } from '@/components/market/MarketListingArchiveButton';
import { StartAgreementDialog } from '@/components/market/StartAgreementDialog';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function sellerLabel(seller: PublishedMarketListing['profiles'], t: Translate) {
  const name = seller?.full_name?.trim();
  if (name) return name;
  const handle = seller?.username?.trim();
  if (handle) return handle;
  return t('market.sellerAnonymous');
}

function sellerInitials(seller: PublishedMarketListing['profiles']) {
  const raw = seller?.full_name?.trim() || seller?.username?.trim();
  if (!raw) return '?';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}

type MarketListingCardProps = {
  listing: PublishedMarketListing;
  buyerProfileId: string | null;
  amountLocale: string;
  t: Translate;
  onListingsChanged: () => void;
  onBalanceChanged: () => void;
  layout?: 'list' | 'grid' | 'marketplace';
};

export function MarketListingCard({
  listing,
  buyerProfileId,
  amountLocale,
  t,
  onListingsChanged,
  onBalanceChanged,
  layout = 'list',
}: MarketListingCardProps) {
  void onBalanceChanged;
  const isSeller = Boolean(buyerProfileId && buyerProfileId === listing.seller_profile_id);
  const inStock = listing.remaining_quantity > 0;
  const canStartAgreement = Boolean(buyerProfileId && !isSeller && inStock);
  const priceLabel = formatLumaFromLumens(listing.price_lumens, { locale: amountLocale });
  const kindLabel = listing.listing_kind === 'service' ? t('market.kindService') : t('market.kindProduct');
  const KindIcon = listing.listing_kind === 'service' ? Briefcase : Package;
  const marketplace = layout === 'marketplace';

  const actions = (
    <div className={cn('flex flex-wrap justify-end gap-2', marketplace && 'gap-1.5')}>
      {canStartAgreement ? (
        <>
          <MarketListingAgreementButton listing={listing} compact={marketplace} t={t} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={
              marketplace
                ? 'h-7 shrink-0 rounded-full border-background/80 bg-background/90 px-2 text-[10px] font-semibold text-foreground shadow-md hover:bg-background'
                : 'h-8'
            }
            asChild
          >
            <Link
              to="/messaging"
              onClick={(e) => e.stopPropagation()}
              data-build-key={`marketListingContact-${listing.id}`}
              data-build-label="Contact seller"
            >
              {t('market.contactButton')}
            </Link>
          </Button>
        </>
      ) : null}
      {isSeller ? (
        <MarketListingArchiveButton
          listingId={listing.id}
          sellerProfileId={listing.seller_profile_id}
          label={t('market.archiveOfferShort')}
          workingLabel={t('market.archivingOffer')}
          onArchived={() => onListingsChanged()}
          className={
            marketplace
              ? 'h-7 max-w-22 truncate rounded-full bg-background/90 px-2 text-[10px] font-medium text-muted-foreground shadow-md hover:text-destructive'
              : undefined
          }
        />
      ) : null}
    </div>
  );

  if (marketplace) {
    return (
      <li className="min-h-0" data-build-key={`marketListing-${listing.id}`} data-build-label={listing.title}>
        <Card className="overflow-hidden border border-border/40 bg-card shadow-sm">
          <div className="relative aspect-square bg-linear-to-br from-muted to-muted/60">
            <div className="absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm">
              {kindLabel}
            </div>
            <div className="flex h-full items-center justify-center text-muted-foreground/40">
              <KindIcon className="h-12 w-12" aria-hidden />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/35 to-transparent pt-10 pb-2 pl-2 pr-2">
              <div className="flex items-end justify-between gap-1">
                <p className="min-w-0 flex-1 truncate text-base font-bold tabular-nums text-white drop-shadow-md">
                  {priceLabel}
                </p>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {actions}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-0.5 p-2">
            <p className="line-clamp-2 text-left text-xs font-medium leading-snug text-foreground">{listing.title}</p>
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                {listing.profiles?.avatar_url ? (
                  <AvatarImage src={listing.profiles.avatar_url} alt="" />
                ) : null}
                <AvatarFallback className="text-[9px]">{sellerInitials(listing.profiles)}</AvatarFallback>
              </Avatar>
              <p className="min-w-0 truncate text-[11px] text-muted-foreground">{sellerLabel(listing.profiles, t)}</p>
            </div>
            {!inStock ? (
              <p className="text-[10px] font-medium text-destructive">{t('market.listingSoldOut')}</p>
            ) : null}
          </div>
        </Card>
      </li>
    );
  }

  if (layout === 'grid') {
    return (
      <li className="h-full min-h-0" data-build-key={`marketListing-${listing.id}`} data-build-label={listing.title}>
        <Card className="flex h-full flex-col overflow-hidden border-border/70 bg-card/95 shadow-sm">
          <div className="relative aspect-4/3 bg-linear-to-br from-muted/80 to-muted/40">
            <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-medium text-foreground shadow-sm">
              {kindLabel}
            </div>
            <div className="flex h-full items-center justify-center text-muted-foreground/50">
              <KindIcon className="h-14 w-14" aria-hidden />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
            <p className="line-clamp-2 font-medium text-foreground">{listing.title}</p>
            {listing.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {inStock
                ? t('market.listingStock', { count: listing.remaining_quantity })
                : t('market.listingSoldOut')}
            </p>
            <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-3">
              <Avatar className="h-8 w-8">
                {listing.profiles?.avatar_url ? (
                  <AvatarImage src={listing.profiles.avatar_url} alt="" />
                ) : null}
                <AvatarFallback className="text-xs">{sellerInitials(listing.profiles)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">{sellerLabel(listing.profiles, t)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(listing.created_at).toLocaleDateString(amountLocale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-2 pt-1">
              <p className="text-lg font-semibold tabular-nums text-foreground">{priceLabel}</p>
              {actions}
            </div>
          </div>
        </Card>
      </li>
    );
  }

  return (
    <li data-build-key={`marketListing-${listing.id}`} data-build-label={listing.title}>
      <Card className="border-border/70 bg-card/95 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{listing.title}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{kindLabel}</span>
            </div>
            {listing.description ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.description}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t('market.postedLabel')}{' '}
              {new Date(listing.created_at).toLocaleDateString(amountLocale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              · {sellerLabel(listing.profiles, t)}
            </p>
            <p className="text-xs text-muted-foreground">
              {inStock
                ? t('market.listingStock', { count: listing.remaining_quantity })
                : t('market.listingSoldOut')}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <p className="text-lg font-semibold text-foreground sm:text-right">{priceLabel}</p>
            {actions}
          </div>
        </div>
      </Card>
    </li>
  );
}

function MarketListingAgreementButton({
  listing,
  compact,
  t,
}: {
  listing: PublishedMarketListing;
  compact?: boolean;
  t: Translate;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={
          compact
            ? 'h-7 shrink-0 rounded-full border-background/80 bg-background/90 px-2 text-[10px] font-semibold text-foreground shadow-md hover:bg-background'
            : 'h-8'
        }
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {t('market.agreementButton')}
      </Button>
      <StartAgreementDialog open={open} onOpenChange={setOpen} listing={listing} t={t} />
    </>
  );
}

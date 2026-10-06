import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatLumaFromLumens } from '@/lib/prototype-credits';
import type { LumaLedgerActivityRow } from '@/lib/use-luma-ledger-activity';
import { useLumaLedgerActivity } from '@/lib/use-luma-ledger-activity';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type ActivityFilter = 'all' | 'credits';

function partyLabel(rawParty: LumaLedgerActivityRow['to_party'], t: Translate) {
  // A joined row can arrive as an object or a one-element array depending on the relationship.
  const party = Array.isArray(rawParty) ? rawParty[0] : rawParty;
  const n = party?.full_name?.trim();
  if (n) return n;
  const u = party?.username?.trim();
  if (u) return u;
  return t('market.sellerAnonymous');
}

function describeRow(row: LumaLedgerActivityRow, myId: string, t: Translate): { label: string; amountSign: 1 | -1 } {
  const isOut = row.from_profile_id === myId;
  const isTreasury = row.entry_kind === 'treasury_mint' && row.from_profile_id == null;

  if (isTreasury && row.to_profile_id === myId) {
    return { label: t('market.activityTreasuryCredit'), amountSign: 1 };
  }
  if (row.entry_kind === 'market_purchase' && isOut) {
    return { label: t('market.activityMarketPurchaseOut'), amountSign: -1 };
  }
  if (row.entry_kind === 'market_purchase' && !isOut) {
    return { label: t('market.activityMarketPurchaseIn'), amountSign: 1 };
  }
  if (row.entry_kind === 'peer_transfer' && isOut) {
    return {
      label: t('market.activityPeerOut', { other: partyLabel(row.to_party, t) }),
      amountSign: -1,
    };
  }
  if (row.entry_kind === 'peer_transfer' && !isOut) {
    return {
      label: t('market.activityPeerIn', { other: partyLabel(row.from_party, t) }),
      amountSign: 1,
    };
  }
  if (isOut) {
    return { label: t('market.activityGenericOut'), amountSign: -1 };
  }
  return { label: t('market.activityGenericIn'), amountSign: 1 };
}

function filterRows(rows: LumaLedgerActivityRow[], myId: string, filter: ActivityFilter): LumaLedgerActivityRow[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.entry_kind === 'treasury_mint' && r.to_profile_id === myId);
}

type MarketLumaActivitySectionProps = {
  profileId: string;
  amountLocale: string;
  t: Translate;
};

export function MarketLumaActivitySection({ profileId, amountLocale, t }: MarketLumaActivitySectionProps) {
  const { rows, loading, error } = useLumaLedgerActivity(profileId);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const visibleRows = useMemo(() => filterRows(rows, profileId, filter), [rows, profileId, filter]);

  const filterButtons: { id: ActivityFilter; labelKey: string }[] = [
    { id: 'all', labelKey: 'market.activityFilterAll' },
    { id: 'credits', labelKey: 'market.activityFilterCredits' },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{t('market.activityTitle')}</h2>
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((b) => (
          <Button
            key={b.id}
            type="button"
            size="sm"
            variant={filter === b.id ? 'default' : 'outline'}
            className="h-8"
            onClick={() => setFilter(b.id)}
          >
            {t(b.labelKey)}
          </Button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">{t('market.activityLoading')}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{t('market.activityError')}</p>
      ) : rows.length === 0 ? (
        <Card className="border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground shadow-sm">{t('market.activityEmpty')}</Card>
      ) : visibleRows.length === 0 ? (
        <Card className="border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground shadow-sm">
          {t('market.activityFilteredEmpty')}
        </Card>
      ) : (
        <ul className="space-y-2">
          {visibleRows.map((row) => {
            const { label, amountSign } = describeRow(row, profileId, t);
            const signedLumens = amountSign * row.amount_lumens;
            const abs = Math.abs(signedLumens);
            const absFormatted = formatLumaFromLumens(abs, { locale: amountLocale });
            const amountText =
              signedLumens < 0 ? `−${absFormatted}` : signedLumens > 0 ? `+${absFormatted}` : absFormatted;
            return (
              <li key={row.id}>
                <Card className="border-border/70 bg-card/95 px-4 py-3 shadow-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString(amountLocale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                        {row.memo ? ` · ${row.memo}` : ''}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold tabular-nums sm:text-right ${
                        signedLumens > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {amountText}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

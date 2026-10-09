import { motion } from 'framer-motion';
import { FileSignature } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EARNINGS_FILTERS, counterpartyNames, earningsActivityDate, providesInAgreement, type EarningsFilter } from '@/lib/provider-earnings';
import { useProviderEarnings } from '@/lib/use-provider-earnings';
import { cn } from '@/lib/utils';

/** Earnings = the agreements a member is party to, with the ones where they provide counted (Phase 6 step 6.1). No money moves here. */
export default function Earnings() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile, loading: authLoading } = useAuth();
  const dateLocale = language === 'en' ? 'en-US' : language;
  const profileId = profile?.id ?? '';
  const { filteredRows, summary, filter, setFilter, loading, error, backendMissing } = useProviderEarnings(profile?.id);

  const statusLabel = (status: string) => {
    const key = `agreements.status.${status}` as const;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </AppLayout>
    );
  }

  if (!profileId) {
    return (
      <AppLayout>
        <div className="px-4 py-6" data-build-key="earningsSignIn" data-build-label="Earnings sign-in prompt">
          <p className="text-sm text-muted-foreground">{t('earnings.signIn')}</p>
          <Button type="button" variant="link" className="mt-2 px-0" onClick={() => navigate('/')}>
            {t('earnings.backHome')}
          </Button>
        </div>
      </AppLayout>
    );
  }

  const summaryCards: Array<[string, number]> = [
    ['earnings.summaryProviding', summary.providing],
    ['earnings.summaryActive', summary.active],
    ['earnings.summaryAwaiting', summary.awaiting],
    ['earnings.summaryCompleted', summary.completed],
  ];

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 overflow-x-clip px-4 py-6" data-build-key="earningsPage" data-build-label="Earnings page">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <AppPageHeader
            title={t('earnings.pageTitle')}
            subtitle={t('earnings.pageSubtitle')}
            leading={
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <FileSignature className="h-5 w-5" aria-hidden />
              </div>
            }
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
          <Card className="rounded-2xl border-amber-500/40 bg-amber-500/5 p-4 text-sm leading-relaxed text-foreground" data-build-key="earningsSettlementNotice" data-build-label="Earnings settlement notice">
            {t('earnings.settlementNotice')}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-build-key="earningsSummary" data-build-label="Earnings summary">
          {summaryCards.map(([key, value]) => (
            <Card key={key} className="rounded-2xl border-border/60 p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">{t(key)}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
            </Card>
          ))}
        </motion.div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as EarningsFilter)} className="w-full min-w-0" data-build-key="earningsFilters" data-build-label="Earnings filters">
          <div className="-mx-4 min-w-0 overflow-x-auto overscroll-x-contain scroll-smooth touch-pan-x [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
            <TabsList aria-label={t('earnings.pageTitle')} className="inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none border-b border-border/60 bg-transparent p-0 text-foreground shadow-none">
              {EARNINGS_FILTERS.map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    'shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-2.5 py-2 text-xs font-medium shadow-none',
                    'text-muted-foreground hover:text-foreground',
                    'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
                    'focus-visible:ring-1 focus-visible:ring-ring sm:px-3 sm:text-sm',
                  )}
                >
                  {t(`earnings.filter.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/agreements/new">{t('earnings.newAgreement')}</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/agreements">{t('earnings.openAgreements')}</Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : backendMissing ? (
          <Card className="rounded-2xl border-border/60 p-5 text-sm text-muted-foreground">{t('earnings.backendUnavailable')}</Card>
        ) : error ? (
          <Card className="rounded-2xl border-destructive/40 p-5 text-sm text-destructive">{error}</Card>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-2xl border-border/60 p-8 text-center text-sm text-muted-foreground" data-build-key="earningsEmpty" data-build-label="Earnings empty state">
            {t('earnings.empty')}
          </Card>
        ) : (
          <ul className="space-y-3" data-build-key="earningsHistory" data-build-label="Earnings history">
            {filteredRows.map((row) => {
              const others = counterpartyNames(row, profileId).join(' · ');
              const typeKey = `agreements.types.${row.agreementType ?? ''}` as const;
              const typeLabel = row.agreementType ? (t(typeKey) === typeKey ? row.agreementType : t(typeKey)) : '';
              return (
                <li key={row.id}>
                  <Link to={`/agreements/${row.id}`}>
                    <Card className="rounded-2xl border-border/60 p-4 shadow-sm transition-colors hover:bg-muted/30">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-foreground">{row.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {[typeLabel, others, new Date(earningsActivityDate(row)).toLocaleDateString(dateLocale)].filter(Boolean).join(' · ')}
                          </p>
                          {providesInAgreement(row, profileId) ? (
                            <p className="text-xs text-muted-foreground">{t('earnings.rowProvidingHint')}</p>
                          ) : null}
                        </div>
                        <Badge variant="secondary">{statusLabel(row.status)}</Badge>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}

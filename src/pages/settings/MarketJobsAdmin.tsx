import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  MARKET_JOB_REVIEW_STATUSES,
  countByStatus,
  listMarketJobInterestsForReview,
  setMarketJobInterestStatus,
  type MarketJobInterestRow,
  type MarketJobReviewStatus,
} from '@/lib/market-job-admin';
import { formatJobTypesDisplay, formatPayDisplay } from '@/lib/market-job-listings';

type Filter = MarketJobReviewStatus | 'all';

/** Jobs review screen for market managers (Phase 6 step 6.2): every posting with its real status and contact. */
export default function MarketJobsAdmin() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<MarketJobInterestRow[]>([]);
  const [filter, setFilter] = useState<Filter>('new');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listMarketJobInterestsForReview());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('marketJobsAdmin.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => countByStatus(rows), [rows]);
  const visible = useMemo(() => (filter === 'all' ? rows : rows.filter((row) => row.status === filter)), [rows, filter]);

  const setStatus = async (row: MarketJobInterestRow, status: MarketJobReviewStatus) => {
    setBusyId(row.id);
    try {
      await setMarketJobInterestStatus(row.id, status);
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status } : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('marketJobsAdmin.updateFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const dateLocale = language === 'en' ? 'en-GB' : language;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 pb-24 md:pb-6" data-testid="market-jobs-admin">
        <AppPageHeader
          title={t('marketJobsAdmin.title')}
          subtitle={t('marketJobsAdmin.subtitle')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-6 w-6" />
            </div>
          }
        />

        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            {(['all', ...MARKET_JOB_REVIEW_STATUSES] as Filter[]).map((value) => (
              <TabsTrigger key={value} value={value} className="rounded-full border border-border/60 px-3 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t(`marketJobsAdmin.status.${value}`)} {value === 'all' ? rows.length : counts[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : visible.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">{t('marketJobsAdmin.empty')}</Card>
        ) : (
          <ul className="space-y-3">
            {visible.map((row) => (
              <li key={row.id}>
                <Card className="space-y-2 p-4" data-testid={`market-jobs-admin-row-${row.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {row.mode === 'employer' ? row.company_name || row.full_name : row.full_name}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{t(`marketJobsAdmin.mode.${row.mode}`)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[formatJobTypesDisplay(row.job_types), row.city, row.country_code, formatPayDisplay(row.pay_amount, row.pay_period)].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[row.phone_country_code, row.phone_number].filter(Boolean).join(' ')}
                        {' · '}
                        {new Date(row.created_at).toLocaleDateString(dateLocale)}
                        {row.user_id ? '' : ` · ${t('marketJobsAdmin.anonymous')}`}
                      </p>
                      {row.notes ? <p className="mt-1 text-sm text-foreground">{row.notes}</p> : null}
                    </div>
                    <Badge variant="outline">{t(`marketJobsAdmin.status.${row.status}`)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {MARKET_JOB_REVIEW_STATUSES.filter((status) => status !== row.status).map((status) => (
                      <Button key={status} type="button" size="sm" variant={status === 'spam' ? 'destructive' : 'outline'} disabled={busyId === row.id} onClick={() => void setStatus(row, status)}>
                        {t(`marketJobsAdmin.setStatus.${status}`)}
                      </Button>
                    ))}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}

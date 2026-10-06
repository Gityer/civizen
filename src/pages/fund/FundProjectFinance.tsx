import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { FundPageShell } from '@/components/funding/FundPageShell';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMinor } from '@/lib/finance/money';
import {
  getPublicProjectFinanceSummary,
  type PublicProjectFinanceSummary,
} from '@/lib/finance/public-api';

export default function FundProjectFinance() {
  const { t } = useLanguage();
  const [data, setData] = useState<PublicProjectFinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await getPublicProjectFinanceSummary();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setData(null);
      } else {
        setError(null);
        setData(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const published = Boolean(data?.published && data.budget);
  const isDemonstration = Boolean(data?.is_demonstration || data?.budget?.is_demonstration);
  const lastPublishedAt = data?.last_published_at || data?.budget?.published_at || null;
  const publishedVersion = data?.published_version ?? data?.budget?.version ?? null;

  return (
    <FundPageShell
      title={t('fund.projectFinance.title')}
      description={t('fund.projectFinance.description')}
      pageTitle={t('fund.projectFinance.title')}
      pageDescription={t('fund.projectFinance.description')}
    >
      <div className="space-y-6" data-build-key="fundProjectFinance" data-build-label="Public project finance">
        <p className="text-sm text-muted-foreground">
          <Link to="/fund/transparency" className="underline underline-offset-2">
            {t('fund.projectFinance.relatedTransparency')}
          </Link>
        </p>

        {isDemonstration ? (
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
            data-build-key="fundProjectFinanceDemoNotice"
            data-build-label="Demonstration data notice"
          >
            <p className="font-medium">{t('fund.projectFinance.demoNoticeTitle')}</p>
            <p className="mt-1 text-xs opacity-90">{t('fund.projectFinance.demoNoticeBody')}</p>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && !published ? (
          <p className="text-sm text-muted-foreground">{t('fund.projectFinance.notPublished')}</p>
        ) : null}

        {published && data?.budget ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{data.budget.name}</h2>
            {data.budget.purpose ? <p className="text-sm text-muted-foreground">{data.budget.purpose}</p> : null}
            <p className="text-sm text-muted-foreground" data-build-key="fundProjectFinancePublishMeta">
              <span className="font-medium text-foreground">
                {t('fund.projectFinance.publishedVersion')}: v{publishedVersion}
              </span>
              {lastPublishedAt ? (
                <>
                  {' · '}
                  {t('fund.projectFinance.lastPublished')}: {new Date(lastPublishedAt).toLocaleString()}
                </>
              ) : null}
            </p>

            {(data.budget.groups ?? []).map((group) => (
              <div key={`${group.name}-${group.display_order}`} className="space-y-2 rounded-lg border border-border/60 p-3">
                <h3 className="font-medium">{group.name}</h3>
                {group.description ? <p className="text-sm text-muted-foreground">{group.description}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {t('fund.projectFinance.planned')}: {formatMinor(Number(group.planned_minor ?? 0), data.budget!.currency)}
                  {' · '}
                  {t('fund.projectFinance.committed')}: {formatMinor(Number(group.committed_minor ?? 0), data.budget!.currency)}
                  {' · '}
                  {t('fund.projectFinance.actual')}: {formatMinor(Number(group.actual_minor ?? 0), data.budget!.currency)}
                </p>
                <ul className="space-y-1 text-sm">
                  {(group.line_items ?? []).map((line) => (
                    <li key={line.title}>
                      <span className="font-medium">{line.title}</span>
                      {line.public_description ? ` — ${line.public_description}` : ''}
                      <div className="text-xs text-muted-foreground">
                        {t('fund.projectFinance.planned')} {formatMinor(Number(line.planned_minor), line.currency)}
                        {' · '}
                        {t('fund.projectFinance.committed')} {formatMinor(Number(line.committed_minor), line.currency)}
                        {' · '}
                        {t('fund.projectFinance.actual')} {formatMinor(Number(line.actual_minor), line.currency)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {published && data?.funding ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">{t('fund.projectFinance.fundingHeading')}</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              {Object.entries(data.funding.received_by_currency ?? {}).map(([currency, amount]) => (
                <div key={currency}>
                  {t('fund.projectFinance.received')}: {formatMinor(Number(amount), currency)}
                </div>
              ))}
            </div>
            <ul className="space-y-1 text-sm">
              {(data.funding.published_sources ?? []).map((source) => (
                <li key={`${source.display_name}-${source.category}`}>
                  {source.display_name} · {source.category}
                  {source.requested_minor != null
                    ? ` · ${t('fund.projectFinance.requested')} ${formatMinor(Number(source.requested_minor), source.currency)}`
                    : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </FundPageShell>
  );
}

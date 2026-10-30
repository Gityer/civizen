import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { listGeoCountryCodes } from '@/lib/geo-locations';
import { loadCoverage, type CoverageRow } from '@/lib/public-delivery';
import { MatterScopeFields } from '@/pages/contribute/matter-form/MatterScopeFields';
import { EMPTY_MATTER_SCOPE, matterScopeForSubmit, matterScopeMissingKey, type MatterScopeValue } from '@/pages/contribute/matter-form/matter-scope';

/**
 * Coverage of a place: which public functions no mapped body performs there (gaps), and which several bodies perform at
 * the same level (overlaps). The evidence for improving existing structures, place by place.
 */
export function PublicCoverage() {
  const { t, language } = useLanguage();
  const countryOptions = useMemo(() => listGeoCountryCodes(language), [language]);
  const [scope, setScope] = useState<MatterScopeValue>(EMPTY_MATTER_SCOPE);
  const [rows, setRows] = useState<CoverageRow[] | null>(null);

  useEffect(() => {
    if (matterScopeMissingKey(scope)) {
      setRows(null);
      return;
    }
    let active = true;
    void loadCoverage(matterScopeForSubmit(scope)).then((next) => { if (active) setRows(next); }, () => undefined);
    return () => { active = false; };
  }, [scope]);

  const gaps = rows?.filter((row) => row.status === 'gap') ?? [];
  const overlaps = rows?.filter((row) => row.status === 'overlap') ?? [];
  const covered = rows?.filter((row) => row.status === 'covered') ?? [];

  return (
    <Card className="space-y-3 p-4" data-testid="public-coverage">
      <h2 className="text-base font-semibold text-foreground">{t('organisation.public.coverage.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('organisation.public.coverage.body')}</p>
      <MatterScopeFields value={scope} onChange={setScope} countryOptions={countryOptions} language={language} t={t} />
      {rows ? (
        <div className="space-y-2 text-sm" data-testid="public-coverage-result">
          <p>{t('organisation.public.coverage.summary', { covered: covered.length, overlaps: overlaps.length, gaps: gaps.length })}</p>
          {overlaps.length ? (
            <div>
              <h3 className="font-medium text-foreground">{t('organisation.public.coverage.overlaps')}</h3>
              <ul className="list-disc space-y-1 pl-5">
                {overlaps.map((row) => (
                  <li key={row.functionKey} data-testid="public-coverage-overlap">
                    {row.name}: {row.bodies.map((body, index) => (
                      <span key={body.id}>{index ? ', ' : ''}<Link to={`/organisation/public/body/${body.id}`} className="text-primary underline underline-offset-2">{body.name}</Link></span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {gaps.length ? (
            <details>
              <summary className="cursor-pointer font-medium text-foreground">{t('organisation.public.coverage.gaps', { count: gaps.length })}</summary>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">{gaps.map((row) => <li key={row.functionKey}>{row.name}</li>)}</ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

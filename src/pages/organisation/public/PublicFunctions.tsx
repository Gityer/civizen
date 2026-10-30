import type React from 'react';
import { useEffect, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadFunctionCatalog, type PublicFunction } from '@/lib/public-functions';
import { DIVISION_KEYS, byDivision } from '@/pages/organisation/public/groups';
import { ProposeBodyForm } from '@/pages/organisation/public/ProposeBodyForm';
import { PublicRouteFinder } from '@/pages/organisation/public/PublicRouteFinder';
import { PublicCoverage } from '@/pages/organisation/public/PublicCoverage';

function PublicFunctionsShell({ children }: { hideNav?: boolean; children: React.ReactNode }) {
  return (
    <PublicPageShell showFooter contentClassName="pb-16">
      {children}
    </PublicPageShell>
  );
}

/**
 * Public functions: the one planet-wide model of what public bodies do, which existing bodies anywhere are mapped
 * onto it, who answers where none is mapped yet, and how members add the body for their place.
 */
export default function PublicFunctions() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [functions, setFunctions] = useState<PublicFunction[] | null>(null);
  const Shell = user ? AppLayout : PublicFunctionsShell;

  useEffect(() => {
    let active = true;
    void loadFunctionCatalog().then((rows) => { if (active) setFunctions(rows); }, () => { if (active) setFunctions([]); });
    return () => { active = false; };
  }, []);

  return (
    <Shell hideNav={false}>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('organisation.public.title')}
          subtitle={t('organisation.public.subtitle')}
          fallbackPath="/organisation"
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe2 className="h-7 w-7" />
            </div>
          }
        />
        <p className="text-sm text-muted-foreground">{t('organisation.public.howItWorks')}</p>
        {functions === null ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {functions?.length ? <PublicRouteFinder functions={functions} /> : null}
        {functions?.length ? <PublicCoverage /> : null}
        {functions ? byDivision(functions).map((group) => (
          <section key={group.code} className="space-y-2" data-testid={`public-division-${group.code}`}>
            <h2 className="text-lg font-semibold text-foreground">{DIVISION_KEYS[group.code] ? t(DIVISION_KEYS[group.code]) : group.name}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.functions.map((fn) => (
                <Card key={fn.functionKey} className="space-y-1 p-3">
                  <p className="font-medium text-foreground">{fn.name}</p>
                  <p className="text-xs text-muted-foreground">{fn.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="rounded-full">
                      {fn.origin === 'cofog' ? t('organisation.public.origin.cofog', { code: fn.cofogCode ?? '' })
                        : fn.origin === 'civizen_addition' ? t('organisation.public.origin.civizen_addition') : t('organisation.public.origin.catch_all')}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">{t('organisation.public.mappedBodies', { count: fn.verifiedBodies })}</Badge>
                    {fn.liaisonPositionKey ? (
                      <Link to={`/organisation/${fn.liaisonPositionKey}`} className="text-primary underline underline-offset-2">
                        {t('organisation.public.liaison')}
                      </Link>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )) : null}
        {user && functions?.length ? <ProposeBodyForm functions={functions} /> : null}
        {!user ? <p className="text-sm text-muted-foreground">{t('organisation.public.signInToPropose')}</p> : null}
      </div>
    </Shell>
  );
}

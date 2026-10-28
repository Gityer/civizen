import type React from 'react';
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadMyPositions, loadOrgChart, personName, type ChartUnit } from '@/lib/organisation';

function PublicOrganisationShell({ children }: { hideNav?: boolean; children: React.ReactNode }) {
  return (
    <PublicPageShell showFooter contentClassName="pb-16">
      {children}
    </PublicPageShell>
  );
}

/**
 * The organisation: units, the positions in them, who holds each one (or that it is vacant and who answers for it
 * meanwhile), and how much is open. Public, so members and visitors can see who is responsible for what.
 */
export default function Organisation() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [units, setUnits] = useState<ChartUnit[] | null>(null);
  const [mine, setMine] = useState<Array<{ positionKey: string; title: string; held: boolean; openItems: number }>>([]);
  const Shell = user ? AppLayout : PublicOrganisationShell;

  useEffect(() => {
    let active = true;
    void loadOrgChart().then((chart) => { if (active) setUnits(chart); }, () => { if (active) setUnits([]); });
    if (user) void loadMyPositions().then((rows) => { if (active) setMine(rows); }, () => undefined);
    return () => { active = false; };
  }, [user]);

  return (
    <Shell hideNav={false}>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('organisation.title')}
          subtitle={t('organisation.subtitle')}
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
          }
        />

        {mine.length ? (
          <section className="space-y-2" data-testid="organisation-mine">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{t('organisation.mine')}</h2>
            <div className="flex flex-wrap gap-2">
              {mine.map((p) => (
                <Link key={p.positionKey} to={`/organisation/${p.positionKey}`}
                  className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10">
                  {p.title}{p.held ? '' : ` · ${t('organisation.covering')}`}{p.openItems ? ` · ${t('organisation.openCount', { count: p.openItems })}` : ''}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-sm text-muted-foreground">{t('organisation.howItWorks')}</p>

        {units === null ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {units?.map((unit) => (
          <section key={unit.unitKey} className="space-y-3" data-testid={`organisation-unit-${unit.unitKey}`}>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{unit.name}</h2>
              {unit.description ? <p className="text-sm text-muted-foreground">{unit.description}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {unit.positions.map((position) => (
                <Card key={position.positionKey} className="relative space-y-2 p-4 focus-within:ring-2 focus-within:ring-ring">
                  <h3 className="font-semibold text-foreground">
                    <Link to={`/organisation/${position.positionKey}`} className="outline-none after:absolute after:inset-0 after:rounded-[inherit]"
                      data-testid={`organisation-position-${position.positionKey}`}>
                      {position.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground">{position.mandate}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {position.holders.length ? (
                      position.holders.map((holder) => (
                        <Badge key={holder.profileId} variant="secondary" className="rounded-full">
                          {personName(holder)}{holder.kind === 'acting' ? ` · ${t('organisation.acting')}` : ''}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="rounded-full">{t('organisation.vacant')}</Badge>
                    )}
                    {position.openItems ? (
                      <Badge variant="outline" className="rounded-full">{t('organisation.openCount', { count: position.openItems })}</Badge>
                    ) : null}
                    {position.contactTopic ? (
                      <Badge variant="outline" className="rounded-full">{t('organisation.answersContact')}</Badge>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}

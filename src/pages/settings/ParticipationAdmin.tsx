import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { PARTICIPATION_TARGETS, type ParticipationFunnel, mapParticipationFunnel } from '@/lib/participation-funnel';

function Tile({ label, value, target }: { label: string; value: string; target?: string }) {
  return (
    <Card className="rounded-2xl border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {target ? <p className="text-[11px] text-muted-foreground">{target}</p> : null}
    </Card>
  );
}

/** The participation funnel for staff (v2 step B5): aggregate counts only, against the 2026-12-22 targets (E7). */
export default function ParticipationAdmin() {
  const { t } = useLanguage();
  const [funnel, setFunnel] = useState<ParticipationFunnel | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void supabase.rpc('participation_funnel', { p_days: 30 }).then(({ data, error }) => {
      if (error) setFailed(true);
      else setFunnel(mapParticipationFunnel(data));
    });
  }, []);

  const n = (value: number | null | undefined) => (value === null || value === undefined ? '—' : String(value));
  const tt = funnel?.totals;
  const target = (key: keyof typeof PARTICIPATION_TARGETS) => t('participation.target', { value: String(PARTICIPATION_TARGETS[key]) });

  return (
    <AppLayout>
      <div className="space-y-4 px-4 py-6">
        <AppPageHeader title={t('participation.title')} subtitle={t('participation.subtitle')} fallbackPath="/settings"
          leading={<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BarChart3 className="h-6 w-6" /></div>} />
        <p className="text-xs text-muted-foreground">{t('participation.privacyNote')}</p>
        {failed ? <p className="text-sm text-destructive">{t('participation.loadFailed')}</p> : null}
        {tt ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Tile label={t('participation.members')} value={n(tt.members)} target={target('members')} />
              <Tile label={t('participation.countries')} value={n(tt.countries)} target={target('countries')} />
              <Tile label={t('participation.ballotsCountable')} value={n(tt.ballotsCountable)} target={target('ballotsCountable')} />
              <Tile label={t('participation.publicMatters')} value={n(tt.publicMattersByMembers)} target={target('publicMattersByMembers')} />
              <Tile label={t('participation.verificationHours')} value={n(tt.verificationMedianHours)} target={target('verificationHours')} />
              <Tile label={t('participation.oldestReportHours')} value={n(tt.oldestOpenReportHours)} target={target('oldestReportHours')} />
            </div>
            <Card className="space-y-1 rounded-2xl border-border/60 p-4 text-sm">
              <h2 className="pb-1 font-semibold text-foreground">{t('participation.funnelTitle', { days: String(funnel?.days ?? 30) })}</h2>
              {([
                ['signups', tt.signups], ['confirmed', tt.confirmed], ['tookFirstAction', tt.tookFirstAction],
                ['verificationRequested', tt.verificationRequested], ['verified', tt.verified], ['ballotsAdvisory', tt.ballotsAdvisory],
                ['active7d', tt.active7d], ['active30d', tt.active30d], ['openReports', tt.openReports],
              ] as const).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 border-b border-border/40 py-1 last:border-0">
                  <span className="text-muted-foreground">{t(`participation.metrics.${key}`)}</span>
                  <span className="tabular-nums text-foreground">{n(value)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 py-1">
                <span className="text-muted-foreground">{t('participation.metrics.returned')}</span>
                <span className="tabular-nums text-foreground">{n(tt.returnedAfterSignup)} / {n(tt.signedUpOver7dAgo)}</span>
              </div>
            </Card>
            <Card className="overflow-x-auto rounded-2xl border-border/60 p-4">
              <h2 className="pb-2 text-sm font-semibold text-foreground">{t('participation.dailyTitle')}</h2>
              <table className="w-full text-xs tabular-nums">
                <thead className="text-muted-foreground">
                  <tr>{['day', 'pageViews', 'signups', 'ballots', 'matters', 'posts'].map((h) => <th key={h} className="px-1 py-1 text-left font-medium">{t(`participation.columns.${h}`)}</th>)}</tr>
                </thead>
                <tbody>
                  {[...(funnel?.daily ?? [])].reverse().map((row) => (
                    <tr key={row.day} className="border-t border-border/40">
                      <td className="px-1 py-1">{row.day}</td><td className="px-1">{row.pageViews}</td><td className="px-1">{row.signups}</td>
                      <td className="px-1">{row.ballots}</td><td className="px-1">{row.matters}</td><td className="px-1">{row.posts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card className="rounded-2xl border-border/60 p-4 text-sm">
              <h2 className="pb-2 font-semibold text-foreground">{t('participation.topPages')}</h2>
              {(funnel?.topPages ?? []).length === 0 ? <p className="text-xs text-muted-foreground">{t('participation.noPageViews')}</p> : null}
              {(funnel?.topPages ?? []).map((row) => (
                <div key={row.path} className="flex justify-between gap-3 py-0.5 text-xs">
                  <code className="truncate text-foreground">{row.path}</code><span className="tabular-nums text-muted-foreground">{row.views}</span>
                </div>
              ))}
            </Card>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

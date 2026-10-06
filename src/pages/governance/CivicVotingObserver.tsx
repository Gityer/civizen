import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';

import { CivicVotingPageHeading, CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatTurnoutPercent } from '@/lib/civic-voting';
import {
  loadCivicElectionObserverMetrics,
  summarizeObserverSnapshot,
  type CivicObserverSnapshot,
} from '@/lib/civic-voting/observer-metrics';

type Translate = (key: string) => string;

/** Pure rendering of one election's observer metrics. Exported for tests. */
export function CivicVotingObserverPanel({
  t,
  snapshot,
}: {
  t: Translate;
  snapshot: CivicObserverSnapshot;
}) {
  const summary = summarizeObserverSnapshot(snapshot);
  const sessionRows: Array<[string, number]> = [
    ['cast', summary.sessionsCast],
    ['voided', summary.sessionsVoided],
    ['missed', summary.sessionsMissed],
    ['failed', summary.sessionsFailed],
    ['exhausted', summary.sessionsExhausted],
  ];

  return (
    <div className="space-y-4" data-testid="observer-panel">
      {snapshot.isSample ? (
        <p className="text-xs text-muted-foreground">{t('civicVoting.observer.sampleNotice')}</p>
      ) : null}

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.participationTitle')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetricCard label={t('civicVoting.observer.countable')} value={String(snapshot.ballotsCountable)} />
          <MetricCard label={t('civicVoting.observer.withdrawn')} value={String(snapshot.ballotsWithdrawn)} />
          <MetricCard label={t('civicVoting.observer.events')} value={String(snapshot.eventsRecorded)} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('civicVoting.observer.eventsHint')}</p>
      </Card>

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.turnout')}</h2>
        </div>
        {summary.turnoutRate === null ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('civicVoting.observer.noRoster')}</p>
        ) : (
          <>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
              {formatTurnoutPercent(summary.turnoutRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.sessionsCast} / {snapshot.eligibleRosterCount}{' '}
              {t('civicVoting.observer.castOfEligible')}
            </p>
            <Progress className="mt-3" value={summary.turnoutRate * 100} />
          </>
        )}
      </Card>

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.sessionsTitle')}</h2>
        {summary.hasSessions ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {sessionRows.map(([key, value]) => (
              <MetricCard key={key} label={t(`civicVoting.observer.${key}`)} value={String(value)} />
            ))}
            {snapshot.averageAttemptsCast !== null ? (
              <MetricCard
                label={t('civicVoting.observer.avgAttempts')}
                value={snapshot.averageAttemptsCast.toFixed(2)}
              />
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{t('civicVoting.observer.noSessions')}</p>
        )}
      </Card>

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.gateFails')}</h2>
        {summary.gateFailRates.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('civicVoting.observer.noGates')}</p>
        ) : (
          summary.gateFailRates.map((gate) => (
            <div key={gate.kind} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize">{gate.kind.replace(/_/g, ' ')}</span>
                <span className="tabular-nums">
                  {(gate.rate * 100).toFixed(1)}% · {gate.failed}/{gate.total}
                </span>
              </div>
              <Progress value={gate.rate * 100} />
            </div>
          ))
        )}
      </Card>

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.riskTitle')}</h2>
        {summary.riskTotal === 0 ? (
          <p className="text-xs text-muted-foreground">{t('civicVoting.observer.noRisk')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(snapshot.riskFindingsBySeverity).map(([severity, count]) => (
              <Badge key={severity} variant="outline" className="capitalize">
                {severity}: {count}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t('civicVoting.observer.riskBody')}</p>
      </Card>

      <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.canvassTitle')}</h2>
        <p className="text-xs text-muted-foreground">{t('civicVoting.observer.canvassBody')}</p>
        {summary.hasCanvass ? (
          <p className="text-sm text-foreground">
            {snapshot.canvassSamples} {t('civicVoting.observer.canvassSamples')} · {snapshot.canvassReviewed}{' '}
            {t('civicVoting.observer.canvassReviewed')}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('civicVoting.observer.noCanvass')}</p>
        )}
      </Card>
    </div>
  );
}

export default function CivicVotingObserver() {
  const { electionId = '' } = useParams();
  const { t } = useLanguage();
  const [snapshot, setSnapshot] = useState<CivicObserverSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await loadCivicElectionObserverMetrics(electionId);
      if (cancelled) return;
      setSnapshot(result.snapshot);
      setError(result.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  return (
    <CivicVotingPageShell
      sectionTrail={[
        { label: t('civicVoting.openElections'), href: '/governance/voting' },
        { label: t('civicVoting.observer.short') },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-4 px-0 py-2 pb-8">
        <div className="min-w-0 space-y-1">
          <CivicVotingPageHeading title={t('civicVoting.observer.title')} />
          <p className="text-xs text-muted-foreground">{t('civicVoting.observer.subtitle')}</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{t('civicVoting.observer.loadFailed')}</p>
        ) : !snapshot ? (
          <p className="text-sm text-muted-foreground">{t('civicVoting.observer.notFound')}</p>
        ) : (
          <CivicVotingObserverPanel t={t} snapshot={snapshot} />
        )}

        <p className="text-xs">
          <Link to={`/governance/voting/${electionId}`} className="text-primary underline-offset-4 hover:underline">
            {t('civicVoting.backToVoting')}
          </Link>
        </p>
      </div>
    </CivicVotingPageShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </Card>
  );
}

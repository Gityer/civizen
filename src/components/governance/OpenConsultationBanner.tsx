import { useEffect, useState } from 'react';
import { ArrowRight, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { listCivicElections, loadCivicElectionPublicTallies, type CivicElection } from '@/lib/civic-voting';
import { selectOpenVotes } from '@/components/study/study-open-votes';

type Translate = (key: string, params?: Record<string, string>) => string;

function formatDate(value: string, language: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(language || 'en', { dateStyle: 'medium' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Pure view: the first open consultation with its question, closing date, count and a vote link. */
export function OpenConsultationBannerView({
  t,
  language,
  election,
  countable,
  moreCount,
}: {
  t: Translate;
  language: string;
  election: CivicElection;
  countable: number | null;
  moreCount: number;
}) {
  const ballotPath = `/governance/voting/${election.id}`;
  return (
    <Card
      className="relative overflow-hidden rounded-2xl border-primary/30 bg-primary/5 p-5 shadow-sm sm:p-6"
      data-testid="open-consultation-banner"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Vote className="h-4 w-4" aria-hidden />
            {t('openConsultation.eyebrow')}
            <span className="font-normal normal-case tracking-normal text-muted-foreground">
              · {t('openConsultation.closes', { date: formatDate(election.votingClosesAt, language) })}
            </span>
          </p>
          <h2 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
            <Link to={ballotPath} className="hover:underline">{election.title}</Link>
          </h2>
          {election.summary ? (
            <p className="text-sm leading-relaxed text-foreground/90 sm:text-base">{election.summary}</p>
          ) : null}
          {countable !== null && countable > 0 ? (
            <p className="text-xs text-muted-foreground">
              {countable === 1
                ? t('openConsultation.ballotsOne')
                : t('openConsultation.ballots', { count: String(countable) })}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button asChild size="sm" className="gap-1.5">
            <Link to={ballotPath}>
              {t('openConsultation.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="text-xs text-muted-foreground">
            <Link to="/governance/voting">
              {moreCount > 0 ? t('openConsultation.more', { count: String(moreCount) }) : t('openConsultation.hub')}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Shows the first live open consultation wherever members and visitors arrive (landing page,
 * Home). Renders nothing while loading, on error, or when no consultation is open.
 */
export function OpenConsultationBanner() {
  const { t, language } = useLanguage();
  const [election, setElection] = useState<CivicElection | null>(null);
  const [moreCount, setMoreCount] = useState(0);
  const [countable, setCountable] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listCivicElections();
      if (cancelled || result.error) return;
      const open = selectOpenVotes(result.elections);
      const first = open[0] ?? null;
      setElection(first);
      setMoreCount(Math.max(0, open.length - 1));
      if (first) {
        const tally = await loadCivicElectionPublicTallies(first.id);
        if (!cancelled && !tally.error) setCountable(tally.totalCountable);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!election) return null;
  return (
    <OpenConsultationBannerView
      t={t as Translate}
      language={language}
      election={election}
      countable={countable}
      moreCount={moreCount}
    />
  );
}

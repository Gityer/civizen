import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { CivicElection, MyConsultationBallot } from '@/lib/civic-voting';
import { consultationOptionLabel, describeConsultationOutcome, readConsultationOutcome } from '@/lib/civic-voting/outcome';
import { readFinalTally, type ElectionGroups } from './governance-member-model';

type Translate = (key: string, params?: Record<string, string>) => string;

function formatDate(value: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language || 'en', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

function ElectionRow({
  t,
  language,
  election,
  ballot,
  signedIn,
  onOpen,
}: {
  t: Translate;
  language: string;
  election: CivicElection;
  ballot: MyConsultationBallot | null | undefined;
  signedIn: boolean;
  onOpen: (id: string) => void;
}) {
  const voted = Boolean(ballot?.optionKey);
  return (
    <Card className="space-y-2 rounded-2xl border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{election.title}</p>
          {election.summary ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{election.summary}</p>
          ) : null}
        </div>
        <Badge variant="outline" className="shrink-0">{t(`civicVoting.status.${election.status}`)}</Badge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t('governanceMember.closesOn', { date: formatDate(election.votingClosesAt, language) })}</span>
        {signedIn ? (
          <span className="inline-flex items-center gap-1" data-testid={voted ? 'vote-status-voted' : 'vote-status-pending'}>
            {voted ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden /> : <Circle className="h-3.5 w-3.5" aria-hidden />}
            {voted
              ? t('governanceMember.youVoted', { choice: consultationOptionLabel(t, ballot?.optionKey) })
              : t('governanceMember.notVotedYet')}
          </span>
        ) : null}
      </div>
      <Button type="button" size="sm" variant={voted ? 'outline' : 'default'} className="gap-2" onClick={() => onOpen(election.id)}>
        {voted ? t('governanceMember.reviewBallot') : t('study.openBallot')}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </Card>
  );
}

function ResultRow({
  t,
  language,
  election,
  onOpen,
}: {
  t: Translate;
  language: string;
  election: CivicElection;
  onOpen: (id: string) => void;
}) {
  const tally = readFinalTally(election.metadata);
  const total = tally.reduce((sum, row) => sum + row.voteCount, 0);
  const outcome = readConsultationOutcome(election.metadata);
  const outcomeLine = outcome
    ? describeConsultationOutcome(outcome, (key) =>
        consultationOptionLabel(t, key, tally.find((row) => row.optionKey === key)?.displayName),
      )
    : null;
  return (
    <Card className="space-y-2 rounded-2xl border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-foreground">{election.title}</p>
        <Badge variant="secondary" className="shrink-0">{t(`civicVoting.status.${election.status}`)}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('governanceMember.closedOn', { date: formatDate(election.votingClosesAt, language) })}
      </p>
      {tally.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('governanceMember.resultPending')}</p>
      ) : (
        <ul className="space-y-1.5">
          {tally.map((row) => {
            const pct = total > 0 ? Math.round((row.voteCount / total) * 100) : 0;
            return (
              <li key={row.optionKey} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{consultationOptionLabel(t, row.optionKey, row.displayName)}</span>
                  <span className="text-xs text-muted-foreground">{row.voteCount} · {pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </li>
            );
          })}
        </ul>
      )}
      {outcomeLine ? (
        <p className="text-sm text-foreground" data-testid="result-outcome">{t(outcomeLine.key, outcomeLine.params)}</p>
      ) : null}
      <Button type="button" size="sm" variant="ghost" className="gap-2 px-0" onClick={() => onOpen(election.id)}>
        {t('governanceMember.openResult')}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </Card>
  );
}

export function GovernanceVotesTab({
  t,
  language,
  groups,
  ballots,
  signedIn,
  onOpen,
}: {
  t: Translate;
  language: string;
  groups: ElectionGroups;
  ballots: Record<string, MyConsultationBallot | null>;
  signedIn: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t('governanceMember.openVotes')}
        </h2>
        {groups.open.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('governanceMember.noOpenVotes')}</p>
        ) : (
          groups.open.map((election) => (
            <ElectionRow
              key={election.id}
              t={t}
              language={language}
              election={election}
              ballot={ballots[election.id]}
              signedIn={signedIn}
              onOpen={onOpen}
            />
          ))
        )}
      </section>

      {groups.scheduled.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('governanceMember.scheduledVotes')}
          </h2>
          {groups.scheduled.map((election) => (
            <Card key={election.id} className="rounded-2xl border-border/60 p-4">
              <p className="font-semibold text-foreground">{election.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('civicBallot.opensOn', { date: formatDate(election.votingOpensAt, language) })}
              </p>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t('governanceMember.results')}
        </h2>
        {groups.closed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('governanceMember.noResults')}</p>
        ) : (
          groups.closed.map((election) => (
            <ResultRow key={election.id} t={t} language={language} election={election} onOpen={onOpen} />
          ))
        )}
      </section>
    </div>
  );
}

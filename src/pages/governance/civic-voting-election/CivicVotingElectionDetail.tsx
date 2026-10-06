import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CIVIC_ELECTION_TIER_LABELS, CIVIC_SECURITY_CLASS_LABELS } from '@/lib/civic-voting';
import { getCountryName } from '@/lib/countries';
import { Switch } from '@/components/ui/switch';
import type { useCivicVotingElection } from '@/pages/governance/civic-voting-election/useCivicVotingElection';

type CivicVotingElectionModel = ReturnType<typeof useCivicVotingElection>;

export function CivicVotingElectionDetail({ model }: { model: CivicVotingElectionModel }) {
  const {
    detail, tallies, tallyTotal, tallyError, countryStats, directory, directoryVisible,
    directoryBusy, myOption, casting, withdrawing, t, language, user, isConsultation, votingOpen,
    votingClosed, castConsultation, withdrawConsultation, toggleDirectoryPresence,
  } = model;
  return (
    <>
    {detail ? (
      <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{CIVIC_ELECTION_TIER_LABELS[detail.election.tier]}</Badge>
          {isConsultation ? (
            <Badge variant="secondary">{t('civicVoting.proposals.nonbinding')}</Badge>
          ) : null}
          {isConsultation &&
          detail.election.scopeCountryCode &&
          /^(GLOBAL|WW|XZ|UN)$/i.test(detail.election.scopeCountryCode) ? (
            <Badge variant="outline">{t('civicVoting.filters.global')}</Badge>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline">
                {CIVIC_SECURITY_CLASS_LABELS[detail.election.securityClass]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[16rem]">
              <p className="font-medium">
                {CIVIC_SECURITY_CLASS_LABELS[detail.election.securityClass]}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(`civicVoting.securityHint.${detail.election.securityClass}`)}
              </p>
            </TooltipContent>
          </Tooltip>
          {detail.scopeRegionCode ? <Badge variant="outline">{detail.scopeRegionCode}</Badge> : null}
          {detail.scopeLocalityCode ? (
            <Badge variant="outline">{detail.scopeLocalityCode}</Badge>
          ) : null}
          <Badge variant={detail.election.status === 'certified' ? 'default' : 'secondary'}>
            {t(`civicVoting.status.${detail.election.status}`)}
          </Badge>
        </div>

        {isConsultation && detail.election.summary ? (
          <p className="text-base leading-relaxed text-foreground">{detail.election.summary}</p>
        ) : null}

        {isConsultation && detail.body ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {detail.body}
          </div>
        ) : null}

        {isConsultation ? (
          <p className="text-xs text-muted-foreground">{t('civicVoting.consultation.bodyHint')}</p>
        ) : null}

        {detail.contests.map((contest) => (
          <div key={contest.id} className="space-y-3">
            {!(isConsultation && contest.title === detail.election.title) ? (
              <h2 className="text-base font-semibold text-foreground">{contest.title}</h2>
            ) : null}
            {!isConsultation ? (
              <ul className="space-y-2">
                {contest.candidates.map((candidate) => (
                  <li
                    key={candidate.id}
                    className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3"
                  >
                    <p className="font-medium text-foreground">{candidate.displayName}</p>
                    {candidate.statement ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {candidate.statement}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}

        <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
          <h3 className="text-sm font-semibold text-foreground">{t('civicVoting.tallies.title')}</h3>
          {tallyError ? (
            <p className="text-xs text-muted-foreground">{t('civicVoting.tallies.unavailable')}</p>
          ) : tallyTotal === 0 ? (
            <p className="text-xs text-muted-foreground">{t('civicVoting.tallies.noneYet')}</p>
          ) : (
            <ul className="space-y-2">
              {tallies.map((row) => {
                const pct = tallyTotal > 0 ? Math.round((row.voteCount / tallyTotal) * 100) : 0;
                return (
                  <li key={row.candidateId} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-foreground">{row.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.voteCount} · {pct}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {t('civicVoting.tallies.total', { count: String(tallyTotal) })}
          </p>
          <p className="text-xs text-muted-foreground">{t('civicVoting.tallies.validOnly')}</p>
        </div>

        {isConsultation ? (
          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('civicVoting.participation.countryTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('civicVoting.participation.countryHint')}
            </p>
            {countryStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('civicVoting.participation.countrySuppressed')}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {countryStats.map((row) => (
                  <li
                    key={row.countryCode}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {getCountryName(row.countryCode, language)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.participantCount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {isConsultation ? (
          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('civicVoting.participation.directoryTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('civicVoting.participation.directoryHint')}
            </p>
            {directory.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('civicVoting.participation.directoryEmpty')}
              </p>
            ) : (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {directory.map((row, index) => (
                  <li
                    key={`${row.displayName}-${row.countryCode ?? ''}-${index}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate font-medium text-foreground">
                      {row.displayName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {row.countryCode
                        ? getCountryName(row.countryCode, language)
                        : t('civicVoting.participation.countryUnknown')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {isConsultation ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('civicVoting.proposals.changeUntilClose')}
            </p>
            {!user ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('civicVoting.proposals.guestCta')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" asChild>
                    <Link to="/login">{t('civicVoting.publicLanding.signIn')}</Link>
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link to="/signup">{t('civicVoting.publicLanding.signUp')}</Link>
                  </Button>
                </div>
              </div>
            ) : votingClosed ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('civicVoting.proposals.votingClosed')}
                </p>
                {myOption ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-border/50 p-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {t('civicVoting.participation.directoryToggle')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('civicVoting.participation.directoryToggleHint')}
                      </p>
                    </div>
                    <Switch
                      checked={directoryVisible}
                      disabled={directoryBusy}
                      onCheckedChange={(checked) => void toggleDirectoryPresence(checked)}
                      aria-label={t('civicVoting.participation.directoryToggle')}
                    />
                  </div>
                ) : null}
              </div>
            ) : votingOpen ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t('civicVoting.consultation.participate')}
                </p>
                {myOption ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {t('civicVoting.proposals.yourChoice')}:{' '}
                      <span className="font-medium text-foreground">
                        {myOption === 'support'
                          ? t('civicVoting.proposals.castSupport')
                          : myOption === 'oppose'
                            ? t('civicVoting.proposals.castOppose')
                            : t('civicVoting.proposals.castAbstain')}
                      </span>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={casting || withdrawing}
                      onClick={() => void withdrawConsultation()}
                    >
                      {withdrawing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t('civicVoting.proposals.withdrawBallot')}
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['support', 'castSupport'],
                      ['oppose', 'castOppose'],
                      ['abstain', 'castAbstain'],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={myOption === key ? 'default' : 'outline'}
                      disabled={casting || withdrawing}
                      onClick={() => void castConsultation(key)}
                    >
                      {t(`civicVoting.proposals.${labelKey}`)}
                    </Button>
                  ))}
                </div>
                {myOption ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-border/50 p-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {t('civicVoting.participation.directoryToggle')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('civicVoting.participation.directoryToggleHint')}
                      </p>
                    </div>
                    <Switch
                      checked={directoryVisible}
                      disabled={directoryBusy || withdrawing}
                      onCheckedChange={(checked) => void toggleDirectoryPresence(checked)}
                      aria-label={t('civicVoting.participation.directoryToggle')}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(`civicVoting.status.${detail.election.status}`)}
              </p>
            )}
          </div>
        ) : null}
      </Card>
    ) : null}
    </>
  );
}

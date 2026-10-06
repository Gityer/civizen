import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CIVIC_ELECTION_TIER_LABELS, CIVIC_SECURITY_CLASS_LABELS } from '@/lib/civic-voting';
import { consultationOptionLabel } from '@/lib/civic-voting/outcome';
import { getCountryName } from '@/lib/countries';
import { CivicVotingConsultationVote } from '@/pages/governance/civic-voting-election/CivicVotingConsultationVote';
import type { useCivicVotingElection } from '@/pages/governance/civic-voting-election/useCivicVotingElection';

type CivicVotingElectionModel = ReturnType<typeof useCivicVotingElection>;

export function CivicVotingElectionDetail({ model }: { model: CivicVotingElectionModel }) {
  const {
    detail, tallies, tallyTotal, tallyError, countryStats, directory, t, language, isConsultation,
    verificationSplit,
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

        {isConsultation ? <CivicVotingConsultationVote model={model} /> : null}

        {isConsultation && detail.body ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {detail.body}
          </div>
        ) : null}

        {isConsultation ? (
          <p className="text-xs text-muted-foreground">{t('civicVoting.consultation.bodyHint')}</p>
        ) : null}

        {isConsultation && (detail.election.metadata?.matter_id || detail.election.metadata?.proposal_id) ? (
          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3" data-testid="consultation-discussion">
            <h3 className="text-sm font-semibold text-foreground">{t('civicBallot.discussionTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('civicBallot.discussionHint')}</p>
            <div className="flex flex-wrap gap-2">
              {detail.election.metadata?.matter_id ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link to={`/contribute/matters/${String(detail.election.metadata.matter_id)}`}>
                    {t('civicVoting.proposals.openMatter')}
                  </Link>
                </Button>
              ) : null}
              {detail.election.metadata?.proposal_id ? (
                <Button type="button" size="sm" variant="ghost" asChild>
                  <Link to={`/governance/voting/proposals/${String(detail.election.metadata.proposal_id)}`}>
                    {t('civicVoting.proposals.openProposal')}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
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
                      <span className="font-medium text-foreground">
                        {consultationOptionLabel(t, row.optionKey, row.displayName)}
                      </span>
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
            {tallyTotal === 1
              ? t('civicVoting.tallies.totalOne')
              : t('civicVoting.tallies.total', { count: String(tallyTotal) })}
          </p>
          {isConsultation && verificationSplit && verificationSplit.verified + verificationSplit.unverified > 0 ? (
            <p className="text-xs text-muted-foreground" title={t('civicVoting.tallies.verifiedSplitHint')}>
              {t('civicVoting.tallies.verifiedSplit', {
                verified: String(verificationSplit.verified),
                unverified: String(verificationSplit.unverified),
              })}
            </p>
          ) : null}
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

      </Card>
    ) : null}
    </>
  );
}

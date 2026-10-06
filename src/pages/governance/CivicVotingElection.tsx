import { Link } from 'react-router-dom';
import { Eye, Globe2, Loader2 } from 'lucide-react';
import { CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SlowRunningText } from '@/components/ui/slow-running-text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCivicVotingElection } from '@/pages/governance/civic-voting-election/useCivicVotingElection';
import { CivicVotingElectionDetail } from '@/pages/governance/civic-voting-election/CivicVotingElectionDetail';
import { CivicVotingElectionAccordion } from '@/pages/governance/civic-voting-election/CivicVotingElectionAccordion';

export default function CivicVotingElection() {
  const model = useCivicVotingElection();
  const {
    detail, detailLoading, detailError, electionId, t, language, user, isConsultation, title,
    displayTitle,
  } = model;

  return (
    <CivicVotingPageShell
      sectionTrail={[
        { label: t('civicVoting.openElections'), href: '/governance/voting' },
        { label: displayTitle },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-4 px-1 py-2 pb-8">
        <div className="space-y-1">
          {isConsultation ? (
            <h1 className="text-lg font-semibold leading-snug text-foreground">{displayTitle}</h1>
          ) : (
            <h1 className="sr-only">{displayTitle}</h1>
          )}
          <div className="flex min-w-0 items-center gap-2">
            {detail?.election.scopeCountryCode &&
            /^(GLOBAL|WW|XZ|UN)$/i.test(detail.election.scopeCountryCode) ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30"
                title={t('civicVoting.filters.global')}
                aria-label={t('civicVoting.filters.global')}
              >
                <Globe2 className="h-2.5 w-2.5" aria-hidden />
              </span>
            ) : detail?.election.scopeCountryCode ? (
              <RoundCountryFlag
                countryCode={detail.election.scopeCountryCode}
                locale={language}
                size="sm"
              />
            ) : null}
            {!isConsultation && detail?.election.summary ? (
              <SlowRunningText
                text={detail.election.summary}
                onlyWhenOverflow
                className="min-w-0 flex-1 text-sm text-muted-foreground"
              />
            ) : (
              <span className="min-w-0 flex-1" />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild>
                  <Link
                    to={`/governance/voting/${electionId}/observe`}
                    aria-label={t('civicVoting.observer.short')}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{t('civicVoting.observer.short')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {detailLoading ? (
          <Card className="flex items-center gap-2 rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </Card>
        ) : null}

        {detailError ? (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            {t('civicVoting.loadFailed')}
          </Card>
        ) : null}

        <CivicVotingElectionDetail model={model} />

        {!user && !isConsultation ? (
          <Card className="rounded-2xl border-dashed border-border/70 p-4 shadow-none space-y-3">
            <p className="text-sm text-muted-foreground">{t('civicVoting.publicBrowseOnly')}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" asChild>
                <Link to="/login">{t('civicVoting.publicLanding.signIn')}</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to="/signup">{t('civicVoting.publicLanding.signUp')}</Link>
              </Button>
            </div>
          </Card>
        ) : null}

        <CivicVotingElectionAccordion model={model} />
      </div>
    </CivicVotingPageShell>
  );
}

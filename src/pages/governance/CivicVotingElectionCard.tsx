import { Link } from 'react-router-dom';
import { ChevronRight, Globe2 } from 'lucide-react';
import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { CIVIC_SECURITY_CLASS_LABELS, electionTitleWithoutCountryLabel, isOrdinaryConsultationElection, type CivicElection } from '@/lib/civic-voting';
import { cn } from '@/lib/utils';
import { SECURITY_ICON, STATUS_ICON, isGlobalScopeCountry } from '@/pages/governance/civic-voting-hub-shared';

export function ElectionCard({ election }: { election: CivicElection }) {
  const { t, language } = useLanguage();
  const securityLabel = CIVIC_SECURITY_CLASS_LABELS[election.securityClass];
  const securityHint = t(`civicVoting.securityHint.${election.securityClass}`);
  const securityMeta = SECURITY_ICON[election.securityClass];
  const SecurityIcon = securityMeta.icon;
  const statusMeta = STATUS_ICON[election.status];
  const StatusIcon = statusMeta.icon;
  const statusLabel = t(`civicVoting.status.${election.status}`);
  const statusHint = t(`civicVoting.statusHint.${election.status}`);
  const openLabel = t('civicVoting.openElection');
  const displayTitle = electionTitleWithoutCountryLabel(
    election.title,
    election.scopeCountryCode,
    language,
  );

  return (
    <Card className="rounded-xl border-border/60 px-2.5 py-1.5 shadow-none transition-colors hover:bg-muted/20">
      <Link
        to={`/governance/voting/${election.id}`}
        className="block space-y-0.5"
        aria-label={`${election.title}. ${securityLabel}. ${statusLabel}. ${openLabel}`}
      >
        <div className="flex min-w-0 items-center gap-1">
          {isGlobalScopeCountry(election.scopeCountryCode) ? (
            <span
              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30"
              title={t('civicVoting.filters.global')}
              aria-label={t('civicVoting.filters.global')}
            >
              <Globe2 className="h-2.5 w-2.5" aria-hidden />
            </span>
          ) : election.scopeCountryCode ? (
            <RoundCountryFlag
              countryCode={election.scopeCountryCode}
              locale={language}
              size="xs"
            />
          ) : null}
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground">
            {displayTitle}
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  securityMeta.className,
                )}
                aria-label={securityLabel}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <SecurityIcon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[16rem]">
              <p className="font-medium">{securityLabel}</p>
              <p className="text-xs text-muted-foreground">{securityHint}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  statusMeta.className,
                )}
                aria-label={statusLabel}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <StatusIcon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[16rem]">
              <p className="font-medium">{statusLabel}</p>
              <p className="text-xs text-muted-foreground">{statusHint}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {isOrdinaryConsultationElection(election) ? (
          <p className="text-[11px] font-medium leading-tight text-muted-foreground">
            {t('civicVoting.proposals.nonbinding')}
          </p>
        ) : null}
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 flex-1 line-clamp-1 text-xs leading-tight text-muted-foreground">
            {election.summary}
          </p>
          <span aria-hidden className="inline-flex h-5 w-5 shrink-0" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary">
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">{openLabel}</TooltipContent>
          </Tooltip>
        </div>
      </Link>
    </Card>
  );
}

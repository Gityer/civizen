import { AlertCircle, CheckCircle2, Loader2, RefreshCcw, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getGovernanceDomainMaturityDeficits,
  getGovernanceDomainMaturityProgress,
  getGovernanceDomainMaturityState,
  getGovernanceDomainTransitionSummary,
  type GovernanceDomainMaturitySnapshotRow,
  type GovernanceDomainMaturityState,
  type GovernanceDomainMaturityTransitionRow,
  type GovernanceDomainRow,
} from '@/lib/governance-maturity';

interface GovernanceMaturityReviewCardProps {
  domains: GovernanceDomainRow[];
  latestSnapshotsByDomain: Record<string, GovernanceDomainMaturitySnapshotRow | undefined>;
  latestTransitionsByDomain: Record<string, GovernanceDomainMaturityTransitionRow | undefined>;
  recentTransitions: GovernanceDomainMaturityTransitionRow[];
  loading: boolean;
  backendUnavailable: boolean;
  refreshingAll: boolean;
  refreshingDomainKey: string | null;
  formatTimestamp: (value: string) => string;
  onRefreshAll: () => void;
  onRefreshDomain: (domainKey: string) => void;
}

function getMaturityStateBadgeClass(state: GovernanceDomainMaturityState) {
  switch (state) {
    case 'mature':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'at_risk':
      return 'border-destructive/20 bg-destructive/10 text-destructive';
    case 'building':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'unknown':
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function getMaturityStateLabel(state: GovernanceDomainMaturityState) {
  switch (state) {
    case 'mature':
      return 'Mature';
    case 'at_risk':
      return 'At risk';
    case 'building':
      return 'Building';
    case 'unknown':
    default:
      return 'No snapshot';
  }
}

function getTransitionBadgeClass(transitionType: GovernanceDomainMaturityTransitionRow['transition_type']) {
  switch (transitionType) {
    case 'matured':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'regressed':
      return 'border-destructive/20 bg-destructive/10 text-destructive';
    case 'initial':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    case 'unchanged':
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function TransitionIcon({ type }: { type: GovernanceDomainMaturityTransitionRow['transition_type'] }) {
  if (type === 'matured') return <TrendingUp className="h-3.5 w-3.5" />;
  if (type === 'regressed') return <TrendingDown className="h-3.5 w-3.5" />;
  return <AlertCircle className="h-3.5 w-3.5" />;
}

export function GovernanceMaturityReviewCard({
  domains,
  latestSnapshotsByDomain,
  latestTransitionsByDomain,
  recentTransitions,
  loading,
  backendUnavailable,
  refreshingAll,
  refreshingDomainKey,
  formatTimestamp,
  onRefreshAll,
  onRefreshDomain,
}: GovernanceMaturityReviewCardProps) {
  const { t } = useLanguage();
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Maturity Stewardship</h2>
          <p className="text-sm text-muted-foreground">
            Review domain readiness, monitor regressions, and capture new snapshots.
          </p>
        </div>

        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRefreshAll} disabled={refreshingAll || backendUnavailable}>
          {refreshingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh all domains
        </Button>
      </div>

      {backendUnavailable ? (
        <p className="mt-4 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Maturity backend tables are not available in this environment yet.
        </p>
      ) : loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading domain maturity snapshots...
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 xl:grid-cols-2">
            {domains.map((domain) => {
              const snapshot = latestSnapshotsByDomain[domain.domain_key];
              const transition = latestTransitionsByDomain[domain.domain_key];
              const state = getGovernanceDomainMaturityState({ snapshot, transition });
              const progress = getGovernanceDomainMaturityProgress(snapshot);
              const deficits = getGovernanceDomainMaturityDeficits(snapshot).slice(0, 2);
              const domainRefreshing = refreshingDomainKey === domain.domain_key;

              return (
                <div key={domain.domain_key} className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{domain.name}</p>
                      <p className="text-xs text-muted-foreground">{domain.domain_key}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={getMaturityStateBadgeClass(state)}>
                        {state === 'mature' ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1 h-3.5 w-3.5" />}
                        {getMaturityStateLabel(state)}
                      </Badge>
                      {transition && (
                        <Badge variant="outline" className={getTransitionBadgeClass(transition.transition_type)}>
                          <TransitionIcon type={transition.transition_type} />
                          <span className="ml-1">{getGovernanceDomainTransitionSummary(transition.transition_type)}</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Phase 10.4: founder stewardship ends by domain; the resolver withdraws the domain's permissions once it is mature. */}
                  <p className="mt-2 text-xs text-muted-foreground" data-testid="founder-domain-access" data-state={state === 'mature' ? 'withdrawn' : 'active'}>
                    {t(state === 'mature' ? 'governance.founderAccessWithdrawn' : 'governance.founderAccessActive')}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Thresholds met</p>
                      <p className="font-medium text-foreground">{progress.thresholdsMetCount} / {progress.thresholdCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Readiness</p>
                      <p className="font-medium text-foreground">{progress.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Snapshot source</p>
                      <p className="font-medium text-foreground">{snapshot?.source || 'none'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last measured</p>
                      <p className="font-medium text-foreground">{snapshot ? formatTimestamp(snapshot.measured_at) : 'n/a'}</p>
                    </div>
                  </div>

                  {deficits.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Biggest gaps</p>
                      {deficits.map((deficit) => (
                        <p key={deficit.thresholdKey} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{deficit.thresholdName}</span>
                          {' '}
                          ({deficit.observedCount}/{deficit.requiredCount})
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRefreshDomain(domain.domain_key)}
                      disabled={domainRefreshing || refreshingAll}
                      className="gap-2"
                    >
                      {domainRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      Refresh domain
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent maturity transitions</h3>
              <p className="text-xs text-muted-foreground">{recentTransitions.length} logged</p>
            </div>

            {recentTransitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transition events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentTransitions.slice(0, 8).map((transition) => (
                  <div key={transition.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTransitionBadgeClass(transition.transition_type)}>
                        <TransitionIcon type={transition.transition_type} />
                        <span className="ml-1">{getGovernanceDomainTransitionSummary(transition.transition_type)}</span>
                      </Badge>
                      <span className="font-medium text-foreground">{transition.domain_key}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {formatTimestamp(transition.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

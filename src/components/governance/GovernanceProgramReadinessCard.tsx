import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { GovernanceProgramReadinessScopeCard } from '@/components/governance/GovernanceProgramReadinessScopeCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getActivationStatusLabel,
  type ActivationDecisionRow,
  type ActivationEvidenceRow,
  type ActivationReviewDecision,
  type ActivationReviewStatus,
  type ActivationThresholdReviewRow,
} from '@/lib/governance-activation-review';
import { cn } from '@/lib/utils';
import { type StatusFilter, type SortKey, reviewLabel, summarizeJurisdictionReadiness, filterAndSortJurisdictionReviews } from '@/components/governance/jurisdiction-readiness';

interface GovernanceProgramReadinessCardProps {
  reviews: ActivationThresholdReviewRow[];
  latestEvidenceByReviewId: Record<string, ActivationEvidenceRow>;
  latestDecisionByReviewId: Record<string, ActivationDecisionRow>;
  loading: boolean;
  backendUnavailable: boolean;
  recordingDecisionReviewId: string | null;
  formatTimestamp: (value: string | null) => string;
  onRecordDecision: (args: { reviewId: string; decision: ActivationReviewDecision; notes: string }) => void;
}

function statusBadgeClass(status: ActivationThresholdReviewRow['status']) {
  switch (status) {
    case 'activated':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'approved_for_activation':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    case 'pending_review':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'rejected':
    case 'revoked':
      return 'border-destructive/20 bg-destructive/10 text-destructive';
    case 'pre_activation':
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

export function GovernanceProgramReadinessCard({
  reviews,
  latestEvidenceByReviewId,
  latestDecisionByReviewId,
  loading,
  backendUnavailable,
  recordingDecisionReviewId,
  formatTimestamp,
  onRecordDecision,
}: GovernanceProgramReadinessCardProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailDirty, setDetailDirty] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const worldReview = useMemo(
    () => reviews.find((r) => r.scope_type === 'world') ?? null,
    [reviews],
  );

  const summary = useMemo(() => summarizeJurisdictionReadiness(reviews), [reviews]);

  const filteredJurisdictions = useMemo(
    () => filterAndSortJurisdictionReviews({ reviews, query, statusFilter, sortKey }),
    [reviews, query, statusFilter, sortKey],
  );

  const selectedReview = useMemo(() => {
    if (!selectedId) return null;
    return reviews.find((r) => r.id === selectedId) ?? null;
  }, [reviews, selectedId]);

  useEffect(() => {
    if (selectedId && !reviews.some((r) => r.id === selectedId)) {
      setSelectedId(null);
      setDetailDirty(false);
    }
  }, [reviews, selectedId]);

  const selectReview = (id: string) => {
    if (detailDirty && selectedId && selectedId !== id) {
      const ok = window.confirm('You have unsaved decision notes. Discard them and switch records?');
      if (!ok) return;
    }
    setDetailDirty(false);
    setSelectedId(id);
    queueMicrotask(() => {
      const node = detailRef.current;
      if (!node) return;
      node.focus();
      if (typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  };

  const closeDetail = () => {
    if (detailDirty) {
      const ok = window.confirm('You have unsaved decision notes. Discard them?');
      if (!ok) return;
    }
    setDetailDirty(false);
    setSelectedId(null);
  };

  return (
    <Card id="stewardship-program-readiness" className="scroll-mt-24 space-y-4 p-4 pb-8 md:pb-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Program readiness</h2>
        <p className="text-sm text-muted-foreground">
          Review capacity and availability by world and jurisdiction; record one decision at a time.
        </p>
      </div>

      {backendUnavailable ? (
        <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Program readiness tables are not available in this environment yet.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading program readiness data...
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No program readiness reviews found yet.</p>
      ) : (
        <>
          {worldReview ? (
            <div
              className="rounded-xl border border-border/70 bg-card p-3"
              data-build-key="programReadinessWorldSummary"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{reviewLabel(worldReview)}</p>
                  <p className="text-xs text-muted-foreground">World scope</p>
                </div>
                <Badge variant="outline" className={statusBadgeClass(worldReview.status)}>
                  {getActivationStatusLabel(worldReview.status)}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-2 text-xs sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Verified members</p>
                  <p className="font-medium text-foreground">{worldReview.verified_citizens_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Participating verified</p>
                  <p className="font-medium text-foreground">{worldReview.eligible_verified_citizens_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium text-foreground">{formatTimestamp(worldReview.updated_at)}</p>
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" size="sm" variant="outline" onClick={() => selectReview(worldReview.id)}>
                  {selectedId === worldReview.id ? 'Viewing decision' : 'Review / record decision'}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" data-build-key="programReadinessJurisdictionSummary">
            <SummaryChip label="Jurisdictions" value={summary.total} />
            <SummaryChip label="Available" value={summary.available} />
            <SummaryChip label="Exploratory" value={summary.exploratory} />
            <SummaryChip label="Needs decision" value={summary.needsDecision} />
            <SummaryChip label="Unavailable" value={summary.unavailable} />
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-1">
                <Label htmlFor="readiness-search">Search</Label>
                <Input
                  id="readiness-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or code"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="readiness-status-filter">Readiness status</Label>
                <select
                  id="readiness-status-filter"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">All statuses</option>
                  <option value="pre_activation">{getActivationStatusLabel('pre_activation')}</option>
                  <option value="pending_review">{getActivationStatusLabel('pending_review')}</option>
                  <option value="approved_for_activation">{getActivationStatusLabel('approved_for_activation')}</option>
                  <option value="activated">{getActivationStatusLabel('activated')}</option>
                  <option value="rejected">{getActivationStatusLabel('rejected')}</option>
                  <option value="revoked">{getActivationStatusLabel('revoked')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="readiness-sort">Sort</Label>
                <select
                  id="readiness-sort"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                >
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                  <option value="updated">Updated</option>
                </select>
              </div>
            </div>

            {filteredJurisdictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jurisdictions match these filters.</p>
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
                {filteredJurisdictions.map((review) => {
                  const active = selectedId === review.id;
                  return (
                    <li
                      key={review.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm',
                        active && 'bg-muted/50',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{reviewLabel(review)}</p>
                        <p className="text-xs text-muted-foreground">
                          {review.country_code || '—'} · Participating verified: {review.eligible_verified_citizens_count} ·{' '}
                          {formatTimestamp(review.updated_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={statusBadgeClass(review.status)}>
                          {getActivationStatusLabel(review.status)}
                        </Badge>
                        <Button type="button" size="sm" variant={active ? 'default' : 'outline'} onClick={() => selectReview(review.id)}>
                          Review
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedReview ? (
            <div
              ref={detailRef}
              tabIndex={-1}
              className="rounded-xl border border-primary/30 bg-card p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-build-key="programReadinessSelectedDetail"
            >
              <div className="flex items-center justify-between gap-2 px-2 pt-2">
                <p className="text-sm font-medium text-foreground">Selected record</p>
                <Button type="button" size="sm" variant="ghost" onClick={closeDetail}>
                  Back to list
                </Button>
              </div>
              <GovernanceProgramReadinessScopeCard
                review={selectedReview}
                latestEvidence={latestEvidenceByReviewId[selectedReview.id]}
                latestDecision={latestDecisionByReviewId[selectedReview.id]}
                recordingDecision={recordingDecisionReviewId === selectedReview.id}
                formatTimestamp={formatTimestamp}
                onRecordDecision={(args) => {
                  setDetailDirty(false);
                  onRecordDecision(args);
                }}
                onDirtyChange={setDetailDirty}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select World or a jurisdiction to open its decision form.</p>
          )}
        </>
      )}
    </Card>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

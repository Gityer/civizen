import type { ActivationReviewStatus, ActivationThresholdReviewRow } from '@/lib/governance-activation-review';

export type StatusFilter = 'all' | ActivationReviewStatus;

export type SortKey = 'name' | 'status' | 'updated';

export function reviewLabel(review: ActivationThresholdReviewRow) {
  return review.jurisdiction_label || (review.scope_type === 'world' ? 'World' : review.country_code);
}

/** Pure helper for jurisdiction summary counts (unit-tested). */
export function summarizeJurisdictionReadiness(reviews: ActivationThresholdReviewRow[]) {
  const jurisdictions = reviews.filter((r) => r.scope_type !== 'world');
  return {
    total: jurisdictions.length,
    available: jurisdictions.filter((r) => r.status === 'activated').length,
    exploratory: jurisdictions.filter((r) => r.status === 'pre_activation').length,
    needsDecision: jurisdictions.filter((r) => r.status === 'pending_review' || r.status === 'approved_for_activation').length,
    unavailable: jurisdictions.filter((r) => r.status === 'rejected' || r.status === 'revoked').length,
  };
}

export function filterAndSortJurisdictionReviews(args: {
  reviews: ActivationThresholdReviewRow[];
  query: string;
  statusFilter: StatusFilter;
  sortKey: SortKey;
}) {
  const q = args.query.trim().toLowerCase();
  let rows = args.reviews.filter((r) => r.scope_type !== 'world');
  if (args.statusFilter !== 'all') {
    rows = rows.filter((r) => r.status === args.statusFilter);
  }
  if (q) {
    rows = rows.filter((r) => {
      const label = reviewLabel(r).toLowerCase();
      const code = (r.country_code || '').toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }
  rows = [...rows].sort((a, b) => {
    if (args.sortKey === 'status') return a.status.localeCompare(b.status) || reviewLabel(a).localeCompare(reviewLabel(b));
    if (args.sortKey === 'updated') return b.updated_at.localeCompare(a.updated_at);
    return reviewLabel(a).localeCompare(reviewLabel(b));
  });
  return rows;
}

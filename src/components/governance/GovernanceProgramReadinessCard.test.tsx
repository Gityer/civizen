import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GovernanceProgramReadinessCard } from '@/components/governance/GovernanceProgramReadinessCard';
import { filterAndSortJurisdictionReviews, summarizeJurisdictionReadiness } from '@/components/governance/jurisdiction-readiness';
import type { ActivationThresholdReviewRow } from '@/lib/governance-activation-review';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function makeReview(
  partial: Partial<ActivationThresholdReviewRow> & Pick<ActivationThresholdReviewRow, 'id' | 'scope_type' | 'status'>,
): ActivationThresholdReviewRow {
  return {
    country_code: partial.country_code ?? (partial.scope_type === 'world' ? '' : 'AA'),
    jurisdiction_label: partial.jurisdiction_label ?? (partial.scope_type === 'world' ? 'World' : 'Alpha'),
    threshold_percent: 50,
    target_population: 8_000_000_000,
    eligible_verified_citizens_count: partial.eligible_verified_citizens_count ?? 10,
    verified_citizens_count: partial.verified_citizens_count ?? 12,
    metadata: {},
    updated_at: partial.updated_at ?? '2026-07-30T12:00:00.000Z',
    declaration_notes: null,
    declared_at: null,
    declared_by: null,
    opened_at: '2026-01-01T00:00:00.000Z',
    opened_by: null,
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as ActivationThresholdReviewRow;
}

const world = makeReview({
  id: 'world-1',
  scope_type: 'world',
  status: 'pending_review',
  jurisdiction_label: 'World',
});

const alpha = makeReview({
  id: 'j-alpha',
  scope_type: 'country',
  status: 'pre_activation',
  country_code: 'AA',
  jurisdiction_label: 'Alpha',
  updated_at: '2026-07-29T12:00:00.000Z',
});

const beta = makeReview({
  id: 'j-beta',
  scope_type: 'country',
  status: 'activated',
  country_code: 'BB',
  jurisdiction_label: 'Beta',
  updated_at: '2026-07-31T12:00:00.000Z',
});

describe('GovernanceProgramReadinessCard focused workflow', () => {
  it('summarizes jurisdictions without dumping forms for every row', () => {
    expect(summarizeJurisdictionReadiness([world, alpha, beta])).toEqual({
      total: 2,
      available: 1,
      exploratory: 1,
      needsDecision: 0,
      unavailable: 0,
    });

    const onRecordDecision = vi.fn();
    const { container } = render(
      <GovernanceProgramReadinessCard
        reviews={[world, alpha, beta]}
        latestEvidenceByReviewId={{}}
        latestDecisionByReviewId={{}}
        loading={false}
        backendUnavailable={false}
        recordingDecisionReviewId={null}
        formatTimestamp={(value) => value ?? 'n/a'}
        onRecordDecision={onRecordDecision}
      />,
    );

    const text = container.textContent?.toLowerCase() ?? '';
    expect(text).toContain('program readiness');
    expect(text).not.toMatch(/activation/);
    expect(text).not.toMatch(/target population/);
    expect(screen.getAllByRole('button', { name: /^Review$/i })).toHaveLength(2);
    expect(screen.queryAllByLabelText(/Decision notes/i)).toHaveLength(0);
    expect(container.querySelector('#stewardship-program-readiness')).not.toBeNull();
  });

  it('opens a single decision form for the selected jurisdiction', () => {
    const onRecordDecision = vi.fn();
    const { container } = render(
      <GovernanceProgramReadinessCard
        reviews={[world, alpha, beta]}
        latestEvidenceByReviewId={{}}
        latestDecisionByReviewId={{}}
        loading={false}
        backendUnavailable={false}
        recordingDecisionReviewId={null}
        formatTimestamp={(value) => value ?? 'n/a'}
        onRecordDecision={onRecordDecision}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^Review$/i })[0]);
    expect(container.querySelector('[data-build-key="programReadinessSelectedDetail"]')).toBeTruthy();
    expect(screen.getAllByLabelText(/Decision notes/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Save decision/i }));
    expect(onRecordDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewId: 'j-alpha',
        decision: 'approve',
      }),
    );
  });

  it('filters jurisdictions by search and status', () => {
    const filtered = filterAndSortJurisdictionReviews({
      reviews: [world, alpha, beta],
      query: 'be',
      statusFilter: 'activated',
      sortKey: 'name',
    });
    expect(filtered.map((r) => r.id)).toEqual(['j-beta']);
  });

  it('keeps filtered list while opening world detail', () => {
    const { container } = render(
      <GovernanceProgramReadinessCard
        reviews={[world, alpha, beta]}
        latestEvidenceByReviewId={{}}
        latestDecisionByReviewId={{}}
        loading={false}
        backendUnavailable={false}
        recordingDecisionReviewId={null}
        formatTimestamp={(value) => value ?? 'n/a'}
        onRecordDecision={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Search/i), { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByText('Beta')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Review \/ record decision/i }));
    const detail = container.querySelector('[data-build-key="programReadinessSelectedDetail"]');
    expect(detail).toBeTruthy();
    expect(within(detail as HTMLElement).getByText('World')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
  });
});

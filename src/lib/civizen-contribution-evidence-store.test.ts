import { describe, expect, it, vi } from 'vitest';
import {
  CONTRIBUTION_EVIDENCE_IN_BATCH_SIZE,
  CONTRIBUTION_EVIDENCE_IN_QUERY_URL_SOFT_LIMIT,
  contributionEvidenceInQueryUrlLength,
  loadContributionEvidenceRecords,
} from '@/lib/civizen-contribution-evidence-store';
import type { ContributionEvent } from '@/lib/civizen-contributions';

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

function event(profileId: string, sourceId: string): ContributionEvent {
  return {
    profileId,
    sourceTable: 'posts',
    sourceId,
    eventType: 'post',
    title: 't',
    summary: null,
    capacityEstimate: 1,
    impactEstimate: 1,
    collaborationEstimate: 1,
    beneficiaryEstimate: 1,
    verified: false,
    occurredAt: '2026-01-01T00:00:00.000Z',
    rawMeta: {},
  };
}

describe('contribution evidence URL guard', () => {
  it('flags an unbounded founder-sized in() list as over the soft URL limit', () => {
    const ids = Array.from({ length: 400 }, (_, i) => uuid(i + 1));
    expect(contributionEvidenceInQueryUrlLength(ids)).toBeGreaterThan(
      CONTRIBUTION_EVIDENCE_IN_QUERY_URL_SOFT_LIMIT,
    );
  });

  it('keeps each in() batch under the soft URL limit', () => {
    const ids = Array.from({ length: 400 }, (_, i) => uuid(i + 1));
    for (let i = 0; i < ids.length; i += CONTRIBUTION_EVIDENCE_IN_BATCH_SIZE) {
      const batch = ids.slice(i, i + CONTRIBUTION_EVIDENCE_IN_BATCH_SIZE);
      expect(contributionEvidenceInQueryUrlLength(batch)).toBeLessThanOrEqual(
        CONTRIBUTION_EVIDENCE_IN_QUERY_URL_SOFT_LIMIT,
      );
    }
  });

  it('loads by subject_profile_id once when all events share a profile (no unbounded in())', async () => {
    const profileId = uuid(99);
    const ids = Array.from({ length: 250 }, (_, i) => uuid(i + 1));
    const events = ids.map((id) => event(profileId, id));

    const eq = vi.fn(async () => ({ data: [], error: null }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const inFn = vi.fn();

    await loadContributionEvidenceRecords(events, { from } as never);

    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('contribution_evidence_records');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('subject_profile_id', profileId);
    expect(inFn).not.toHaveBeenCalled();
  });

  it('chunks .in() when events span multiple profiles', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => uuid(i + 1));
    const events = ids.map((id, i) => event(uuid(1000 + (i % 3)), id));

    const inCalls: string[][] = [];
    const from = vi.fn(() => ({
      select: () => ({
        in: async (_col: string, batch: string[]) => {
          inCalls.push(batch);
          return { data: [], error: null };
        },
        eq: async () => ({ data: [], error: null }),
      }),
    }));

    await loadContributionEvidenceRecords(events, { from } as never);

    expect(inCalls.length).toBeGreaterThan(1);
    expect(inCalls.every((batch) => batch.length <= CONTRIBUTION_EVIDENCE_IN_BATCH_SIZE)).toBe(true);
    expect(
      inCalls.every(
        (batch) => contributionEvidenceInQueryUrlLength(batch) <= CONTRIBUTION_EVIDENCE_IN_QUERY_URL_SOFT_LIMIT,
      ),
    ).toBe(true);
  });

  it('dedupes concurrent loads for the same subject', async () => {
    const profileId = uuid(77);
    const events = [event(profileId, uuid(1)), event(profileId, uuid(2))];

    let selectCalls = 0;
    let release!: (value: { data: unknown[]; error: null }) => void;
    const pending = new Promise<{ data: unknown[]; error: null }>((resolve) => {
      release = resolve;
    });

    const from = vi.fn(() => ({
      select: () => {
        selectCalls += 1;
        return {
          eq: () => pending,
        };
      },
    }));

    const client = { from } as never;
    const a = loadContributionEvidenceRecords(events, client);
    const b = loadContributionEvidenceRecords(events, client);
    release({ data: [], error: null });
    await Promise.all([a, b]);

    expect(selectCalls).toBe(1);
  });
});

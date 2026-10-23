import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_LEDGER_PAGE_SIZE,
  fetchAllContributionEventRows,
  loadContributionEvents,
  mapContributionEventRow,
  type ContributionEvent,
} from '@/lib/civizen-contributions';
import {
  demonstratedProjectsFromContributionEvents,
  demonstratedSkillsFromContributionEvents,
  scoreContributionsFromEvents,
} from '@/lib/civizen-contribution-score';
import { scorePerformanceFromEvents } from '@/lib/civizen-performance';
import { buildScoreFromProfileActivity, type CivizenScoreResponse } from '@/lib/civizen-score';

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

function ledgerRow(args: {
  n: number;
  sourceTable?: string;
  verified?: boolean;
  occurredAt?: string;
  rawMeta?: Record<string, unknown>;
}): Record<string, unknown> {
  const sourceTable = args.sourceTable ?? 'posts';
  return {
    id: uuid(args.n),
    profile_id: 'profile-home',
    source_table: sourceTable,
    source_id: uuid(10_000 + args.n),
    event_type: sourceTable === 'opportunity_participations' ? 'opportunity_participation' : 'post',
    title: `row-${args.n}`,
    summary: null,
    capacity_estimate: sourceTable === 'opportunity_participations' ? 75 : 20,
    impact_estimate: sourceTable === 'opportunity_participations' ? 70 : 10,
    collaboration_estimate: 20,
    beneficiary_estimate: 20,
    verified: args.verified ?? false,
    occurred_at: args.occurredAt ?? `2026-01-${String((args.n % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    raw_meta: args.rawMeta ?? {},
  };
}

function mockPagedClient(allRows: Record<string, unknown>[]) {
  const ranges: Array<[number, number]> = [];
  const client = {
    from: () => {
      const builder: {
        select: () => typeof builder;
        eq: () => typeof builder;
        order: () => typeof builder;
        range: (from: number, to: number) => Promise<{ data: Record<string, unknown>[]; error: null }>;
      } = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: async (from: number, to: number) => {
          ranges.push([from, to]);
          return { data: allRows.slice(from, to + 1), error: null };
        },
      };
      return builder;
    },
  };
  return { client: client as never, ranges };
}

function makeEvent(
  overrides: Partial<ContributionEvent> & Pick<ContributionEvent, 'eventType' | 'sourceId'>,
): ContributionEvent {
  return {
    profileId: 'profile-home',
    sourceTable: overrides.sourceTable ?? 'posts',
    sourceId: overrides.sourceId,
    eventType: overrides.eventType,
    title: overrides.title ?? 'Event',
    summary: overrides.summary ?? null,
    capacityEstimate: overrides.capacityEstimate ?? 25,
    impactEstimate: overrides.impactEstimate ?? 15,
    collaborationEstimate: overrides.collaborationEstimate ?? 20,
    beneficiaryEstimate: overrides.beneficiaryEstimate ?? 20,
    verified: overrides.verified ?? false,
    occurredAt: overrides.occurredAt ?? '2026-01-01T00:00:00.000Z',
    rawMeta: overrides.rawMeta ?? {},
  };
}

/** Mirrors useHomeFeed.applyContributionEvents -> useHomeContent score inputs. */
function homeScoreFromEvents(events: ContributionEvent[]): CivizenScoreResponse {
  return buildScoreFromProfileActivity({
    userId: 'profile-home',
    demonstratedSkills: demonstratedSkillsFromContributionEvents(events),
    demonstratedProjects: demonstratedProjectsFromContributionEvents(events),
    contributions: scoreContributionsFromEvents(events),
    performance: scorePerformanceFromEvents(events, [], 'profile-home'),
  });
}

function scoredAreaIds(score: CivizenScoreResponse): string[] {
  return score.categories.filter((c) => c.score != null).map((c) => c.id).sort();
}

describe('contribution ledger paging for Home score', () => {
  it('pages past the PostgREST max-rows cap so older verified roots remain', async () => {
    const page = 50;
    const newest = Array.from({ length: 120 }, (_, i) =>
      ledgerRow({
        n: 200 - i,
        occurredAt: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T12:00:00.000Z`,
      }),
    );
    const verifiedOpp = ledgerRow({
      n: 1,
      sourceTable: 'opportunity_participations',
      verified: true,
      occurredAt: '2026-01-01T00:00:00.000Z',
      rawMeta: { demonstratedSkills: ['Facilitation'] },
    });
    const allRows = [...newest, verifiedOpp];
    const { client, ranges } = mockPagedClient(allRows);

    const rows = await fetchAllContributionEventRows('profile-home', client, page);
    expect(ranges.length).toBeGreaterThan(1);
    expect(ranges[0]).toEqual([0, page - 1]);
    expect(rows).toHaveLength(allRows.length);
    expect(rows.some((row) => row.source_table === 'opportunity_participations' && row.verified === true)).toBe(
      true,
    );

    const events = await loadContributionEvents('profile-home', client);
    expect(events.some((e) => e.sourceTable === 'opportunity_participations' && e.verified)).toBe(true);
  });

  it('keeps CONTRIBUTION_LEDGER_PAGE_SIZE at the PostgREST default cap', () => {
    expect(CONTRIBUTION_LEDGER_PAGE_SIZE).toBe(1000);
  });
});

describe('Home score inputs pinned for ledger truncation class', () => {
  it('pins Home scored areas: newest-1000 drop verified opportunity and Skills', () => {
    const posts = Array.from({ length: 1000 }, (_, i) =>
      makeEvent({
        eventType: 'post',
        sourceId: `post-${i}`,
        occurredAt: `2026-10-01T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
        capacityEstimate: 20,
        impactEstimate: 10,
      }),
    );
    const verifiedOpp = makeEvent({
      eventType: 'opportunity_participation',
      sourceTable: 'opportunity_participations',
      sourceId: 'opp-old',
      verified: true,
      occurredAt: '2026-01-01T00:00:00.000Z',
      capacityEstimate: 75,
      impactEstimate: 70,
      collaborationEstimate: 40,
      beneficiaryEstimate: 65,
      rawMeta: { demonstratedSkills: ['Facilitation', 'Documentation'] },
    });

    const truncated = homeScoreFromEvents(posts);
    const full = homeScoreFromEvents([...posts, verifiedOpp]);

    expect(scoredAreaIds(truncated)).toEqual(['contributions', 'performance']);
    expect(scoredAreaIds(full)).toEqual(['contributions', 'performance', 'skills']);
    expect(truncated.coverage?.scoredCount).toBe(2);
    expect(full.coverage?.scoredCount).toBe(3);
    expect(full.overall.provisionalEstimate ?? 0).toBeGreaterThan(truncated.overall.provisionalEstimate ?? 0);

    expect({
      scoredAreas: scoredAreaIds(full),
      scoredCount: full.coverage?.scoredCount,
      demonstratedSkills: demonstratedSkillsFromContributionEvents([...posts, verifiedOpp])
        .map((s) => s.skillName)
        .sort(),
      contributionSourceCount: scoreContributionsFromEvents([...posts, verifiedOpp])?.sourceCount,
    }).toEqual({
      scoredAreas: ['contributions', 'performance', 'skills'],
      scoredCount: 3,
      demonstratedSkills: ['Documentation', 'Facilitation'],
      contributionSourceCount: 1001,
    });
  });

  it('mapContributionEventRow preserves verified opportunity roots used by Home', () => {
    const event = mapContributionEventRow(
      ledgerRow({
        n: 9,
        sourceTable: 'opportunity_participations',
        verified: true,
        rawMeta: { demonstratedSkills: ['Facilitation'] },
      }),
    );
    expect(event.verified).toBe(true);
    expect(event.sourceTable).toBe('opportunity_participations');
    expect(demonstratedSkillsFromContributionEvents([event])[0]?.skillName).toBe('Facilitation');
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { getWellbeingAggregate } from './engine';
import {
  AGGREGATE_VIEWER_FORBIDDEN_TABLES,
  GENERATOR_REQUESTER_ID,
  generateWellbeingAggregateSnapshot,
  PRIVILEGED_GENERATION_ROLE,
  rejectUnsafeAggregateFlags,
} from './generate';
import { DEMO_QUERY, DEMO_REQUESTER, DEMO_SCOPE, syntheticObservations, tinyCellObservations } from './harness';
import { deriveSystemicIssueCandidate, mayAutoPublish } from './systemic';
import type { AggregateQuery, EligibleObservation } from './types';

function generate(observations: EligibleObservation[], query: AggregateQuery = DEMO_QUERY, extra: Record<string, unknown> = {}) {
  return generateWellbeingAggregateSnapshot({
    query,
    scope: DEMO_SCOPE,
    observations,
    request: extra,
  });
}

describe('privileged wellbeing aggregate generation', () => {
  it('uses service_role as the only privileged generation role and strips private fields', () => {
    expect(PRIVILEGED_GENERATION_ROLE).toBe('service_role');
    const first = generateWellbeingAggregateSnapshot({
      query: DEMO_QUERY,
      scope: DEMO_SCOPE,
      observations: syntheticObservations({ participating: 25, relevant: 25, privateNote: 'night shifts at Site B' }),
    });
    expect(first.result.kind).toBe('insight');
    expect(first.wroteNew).toBe(true);
    expect(first.leaked).toBe(false);
    expect(first.audit.requesterProfileId).toBe(GENERATOR_REQUESTER_ID);
    expect(JSON.stringify(first.stored)).not.toMatch(/member-|Site B|night shifts/);
  });

  it('does not rewrite a historic snapshot after withdrawal', () => {
    const store = new Map();
    const qualifying = syntheticObservations({ participating: 25, relevant: 25, privateNote: 'keep-private' });
    const first = generateWellbeingAggregateSnapshot({
      query: DEMO_QUERY,
      scope: DEMO_SCOPE,
      observations: qualifying,
      store,
      now: '2026-08-01T00:00:00.000Z',
    });
    expect(first.result.kind).toBe('insight');
    const withdrawn = generateWellbeingAggregateSnapshot({
      query: DEMO_QUERY,
      scope: DEMO_SCOPE,
      observations: syntheticObservations({ participating: 25, relevant: 25, withdrawn: 1 }),
      store,
      now: '2026-08-15T00:00:00.000Z',
    });
    expect(withdrawn.result.kind).toBe('suppressed');
    expect(withdrawn.wroteNew).toBe(false);
    expect(withdrawn.stored.result.kind).toBe('insight');
    expect(withdrawn.stored.createdAt).toBe('2026-08-01T00:00:00.000Z');
    const laterPeriod = generateWellbeingAggregateSnapshot({
      query: { ...DEMO_QUERY, periodStart: '2026-07-01' },
      scope: DEMO_SCOPE,
      observations: syntheticObservations({ participating: 25, relevant: 25, withdrawn: 1 }),
      store,
    });
    expect(laterPeriod.result).toMatchObject({ kind: 'suppressed', reason: 'cohort_too_small' });
    expect(laterPeriod.wroteNew).toBe(true);
    expect(store.get(`${DEMO_SCOPE.id}|${first.stored.fingerprint}|wellbeing-aggregate-privacy-v1|wellbeing-aggregate-v1`)?.result.kind).toBe(
      'insight',
    );
  });

  it('rejects raw/unsuppressed flags and still suppresses small cohorts', () => {
    expect(rejectUnsafeAggregateFlags({ raw: true })).toBe('bypass_not_permitted');
    expect(
      generate(syntheticObservations({ participating: 25, relevant: 25 }), DEMO_QUERY, { unsuppressed: true }).result,
    ).toMatchObject({ reason: 'bypass_not_permitted' });
    expect(generate(syntheticObservations({ participating: 10, relevant: 10 })).result).toMatchObject({
      kind: 'suppressed',
      reason: 'cohort_too_small',
    });
    expect(generate(syntheticObservations({ participating: 40, relevant: 20, inScope: 40 })).result).toMatchObject({
      reason: 'not_enough_observations',
    });
    const cells = generate(tinyCellObservations());
    expect(cells.result.kind).toBe('insight');
    if (cells.result.kind === 'insight') {
      expect(cells.result.groupedDistribution?.struggling).toBe('grouped');
    }
  });

  it('records audit metadata without contributor identities or private notes', () => {
    const { audit, result } = generate(tinyCellObservations());
    expect(audit).toMatchObject({
      requesterProfileId: GENERATOR_REQUESTER_ID,
      scopeId: DEMO_SCOPE.id,
      timeBucket: 'quarter',
      topic: 'domain_state',
      privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
      aggregationModelVersion: 'wellbeing-aggregate-v1',
    });
    expect(audit.fingerprint).toContain(DEMO_SCOPE.id);
    expect(result.kind === 'suppressed' ? audit.suppression : audit.suppression === null).toBeTruthy();
    expect(JSON.stringify(audit)).not.toMatch(/member-|Site B|exhausted/);
  });

  it('lets a viewer request a snapshot but not private wellbeing tables', () => {
    const generated = generate(syntheticObservations({ participating: 25, relevant: 25 }));
    const viewed = getWellbeingAggregate(DEMO_QUERY, DEMO_REQUESTER, {
      scope: DEMO_SCOPE,
      snapshot: generated.result,
    });
    expect(viewed.result.kind).toBe('insight');
    expect(generated.result.kind).toBe('insight');
    expect(
      getWellbeingAggregate(DEMO_QUERY, DEMO_REQUESTER, { scope: DEMO_SCOPE }).result,
    ).toMatchObject({ kind: 'suppressed', reason: 'not_enough_observations' });
    expect(AGGREGATE_VIEWER_FORBIDDEN_TABLES).toEqual(
      expect.arrayContaining([
        'happiness_checkins',
        'happiness_assessment_responses',
        'fulfillment_plans',
        'work_joy_entries',
        'wellbeing_aggregate_participation',
      ]),
    );
    const stranger = getWellbeingAggregate(DEMO_QUERY, { profileId: 'stranger', canViewScope: true }, {
      scope: DEMO_SCOPE,
      snapshot: generated.result,
    });
    expect(stranger.result).toMatchObject({ reason: 'unauthorized' });
  });

  it('builds systemic candidates from snapshots only and never auto-publishes', () => {
    const one = generate(syntheticObservations({ participating: 25, relevant: 25 }));
    const watching = deriveSystemicIssueCandidate({
      scopeId: DEMO_SCOPE.id,
      domain: 'time_life_balance',
      qualifyingInsights: [one.stored.result],
    });
    expect(watching.status).toBe('observing');
    const emerging = deriveSystemicIssueCandidate({
      scopeId: DEMO_SCOPE.id,
      domain: 'time_life_balance',
      qualifyingInsights: [one.stored.result, one.stored.result],
    });
    expect(emerging.status).toBe('emerging');
    const established = deriveSystemicIssueCandidate({
      scopeId: DEMO_SCOPE.id,
      domain: 'time_life_balance',
      qualifyingInsights: [one.stored.result, one.stored.result, one.stored.result],
    });
    expect(established.status).toBe('established_pattern');
    expect(mayAutoPublish(established)).toBe(false);
    expect(JSON.stringify(established)).not.toMatch(/member-/);
  });
});

describe('generation SQL boundary', () => {
  it('keeps collect/persist off authenticated and get_wellbeing_aggregate off private tables', () => {
    const sql = [
      readFileSync('supabase/migrations/20260815200000_wellbeing_aggregate_phase4a.sql', 'utf8'),
      readFileSync('supabase/migrations/20260815210000_wellbeing_aggregate_generation_boundary.sql', 'utf8'),
      readFileSync('supabase/migrations/20260815220000_wellbeing_aggregate_viewer_grants.sql', 'utf8'),
      readFileSync('supabase/migrations/20260815230000_wellbeing_insights_phase4b.sql', 'utf8'),
      readFileSync('supabase/migrations/20260815240000_wellbeing_aggregate_can_view_scope_definer.sql', 'utf8'),
    ].join('\n');
    expect(sql).toMatch(/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public.collect_wellbeing_structured_signals/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public.collect_wellbeing_structured_signals/);
    expect(sql).toMatch(/TO service_role/);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public.collect_wellbeing_structured_signals\(uuid, date, text\) TO authenticated/);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public.persist_wellbeing_aggregate_snapshot\(jsonb\) TO authenticated/);
    expect(sql).toMatch(/ON CONFLICT .* DO NOTHING/i);
    expect(sql).toMatch(/must never SELECT happiness_checkins/);
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE/);
    expect(sql).toMatch(/bypass_not_permitted/);
    expect(sql).not.toMatch(/FROM public\.happiness_checkins/);
  });
});

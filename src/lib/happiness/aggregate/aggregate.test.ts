import { describe, expect, it } from 'vitest';

import {
  applyWellbeingAggregatePrivacy,
  getWellbeingAggregate,
  snapshotHasPrivateLeak,
  type AggregatePrivacyOptions,
} from './engine';
import { DEMO_QUERY, DEMO_REQUESTER, DEMO_SCOPE, syntheticObservations, tinyCellObservations } from './harness';
import { WELLBEING_AGGREGATE_PRIVACY_V1, dimensionMeta } from './policy';
import { assertDimensionAllowed, fingerprintQuery, validateAggregateQuery } from './query-guard';
import { deriveSystemicIssueCandidate, mayAutoPublish, SYSTEMIC_PATTERN_V1 } from './systemic';
import { toCiviAggregateContext } from './civi-context';
import { WELLBEING_AGGREGATE_PRIVACY_VERSION, WELLBEING_AGGREGATE_MODEL_VERSION } from './types';
import type { AggregateQuery, WellbeingAggregateResult } from './types';

function run(query: AggregateQuery = DEMO_QUERY, extra?: Partial<AggregatePrivacyOptions>) {
  const fingerprint = fingerprintQuery(query);
  const finish = (result: WellbeingAggregateResult) => ({
    result,
    audit: {
      requesterProfileId: DEMO_REQUESTER.profileId,
      scopeId: query.scopeId,
      fingerprint,
      timeBucket: query.timeBucket,
      topic: query.topic,
      privacyPolicyVersion: WELLBEING_AGGREGATE_PRIVACY_VERSION,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      suppression: result.kind === 'suppressed' ? result.reason : null,
    },
  });
  return applyWellbeingAggregatePrivacy(query, DEMO_REQUESTER, {
    scope: DEMO_SCOPE,
    observations: extra?.observations ?? syntheticObservations({ participating: 25, relevant: 25 }),
    ...extra,
  }, finish);
}

describe('wellbeing aggregate privacy v1', () => {
  it('keeps privacy, aggregation, and systemic model versions distinct', () => {
    expect(WELLBEING_AGGREGATE_PRIVACY_VERSION).toBe('wellbeing-aggregate-privacy-v1');
    expect(WELLBEING_AGGREGATE_MODEL_VERSION).toBe('wellbeing-aggregate-v1');
    expect(SYSTEMIC_PATTERN_V1.version).toBe('systemic-pattern-v1');
    expect(WELLBEING_AGGREGATE_PRIVACY_V1.minCohort).toBe(25);
    expect(WELLBEING_AGGREGATE_PRIVACY_V1.smallCellMin).toBe(5);
  });

  it('suppresses 10 and 24 participating members under the working threshold', () => {
    expect(run(DEMO_QUERY, { observations: syntheticObservations({ participating: 10, relevant: 10 }) }).result).toMatchObject({
      kind: 'suppressed',
      reason: 'cohort_too_small',
    });
    expect(run(DEMO_QUERY, { observations: syntheticObservations({ participating: 24, relevant: 24 }) }).result).toMatchObject({
      kind: 'suppressed',
      reason: 'cohort_too_small',
    });
  });

  it('aggregates when 25 qualifying members participate with relevant observations', () => {
    const { result, audit } = run();
    expect(result.kind).toBe('insight');
    if (result.kind !== 'insight') return;
    expect(result.summary).toMatch(/Time & Life Balance appears to be a recurring concern/);
    expect(result.summary).not.toMatch(/causes poor|management is bad|improves Happiness by/i);
    expect(result.participation).toBe('sufficient');
    expect(result.privacyPolicyVersion).toBe(WELLBEING_AGGREGATE_PRIVACY_VERSION);
    expect(audit.suppression).toBeNull();
    expect(audit.requesterProfileId).toBe('viewer-1');
  });

  it('uses effective cohort: 40 members with 20 relevant responses are suppressed', () => {
    const { result } = run(DEMO_QUERY, {
      observations: syntheticObservations({ participating: 40, relevant: 20, inScope: 40 }),
    });
    expect(result).toMatchObject({ kind: 'suppressed', reason: 'not_enough_observations' });
    expect(JSON.stringify(result)).not.toMatch(/"20"|"24"|"25"/);
  });

  it('groups small cells instead of exposing exact tiny counts', () => {
    const { result } = run(DEMO_QUERY, { observations: tinyCellObservations() });
    expect(result.kind).toBe('insight');
    if (result.kind !== 'insight') return;
    expect(result.groupedDistribution?.struggling).toBe('grouped');
    expect(result.groupedDistribution?.thriving).toBe('grouped');
    expect(result.groupedDistribution?.flourishing).toBe('shown');
    expect(JSON.stringify(result)).not.toMatch(/"count"|member-28/);
  });

  it('accepts allowed dimensions and rejects prohibited or over-specific combinations', () => {
    expect(validateAggregateQuery(DEMO_QUERY)).toBeNull();
    expect(assertDimensionAllowed('race')).toBe('dimension_not_permitted');
    expect(assertDimensionAllowed('disability')).toBe('dimension_not_permitted');
    expect(dimensionMeta('age_group')?.classification).toBe('research_only');
    expect(
      validateAggregateQuery({
        ...DEMO_QUERY,
        factorCategory: 'transportation',
        workContextType: 'employment',
        interventionType: 'schedule_change',
      }),
    ).toBe('combination_too_specific');
    expect(validateAggregateQuery({ ...DEMO_QUERY, timeBucket: 'day' as AggregateQuery['timeBucket'] })).toBe(
      'time_period_too_narrow',
    );
    expect(validateAggregateQuery({ ...DEMO_QUERY, geography: 'street' as AggregateQuery['geography'] })).toBe(
      'geography_not_permitted',
    );
  });

  it('excludes withdrawn members from future aggregates without rewriting the earlier result', () => {
    const first = run(DEMO_QUERY, { observations: syntheticObservations({ participating: 25, relevant: 25 }) });
    expect(first.result.kind).toBe('insight');
    const later = run(DEMO_QUERY, {
      observations: syntheticObservations({ participating: 25, relevant: 25, withdrawn: 1 }),
    });
    expect(later.result).toMatchObject({ kind: 'suppressed', reason: 'cohort_too_small' });
    expect(first.result.kind).toBe('insight');
  });

  it('restricts overlapping slices and query-budget probing', () => {
    const firstPrint = fingerprintQuery(DEMO_QUERY);
    const narrower: AggregateQuery = { ...DEMO_QUERY, factorCategory: 'transportation' };
    const overlap = run(narrower, {
      observations: syntheticObservations({ participating: 40, relevant: 40, factorCategory: 'transportation' }),
      recentQueries: [{ fingerprint: firstPrint, queriedAt: '2026-08-15T00:00:00Z' }],
    });
    expect(overlap.result).toMatchObject({ kind: 'suppressed', reason: 'similar_slice_restricted' });
    const budget = run(DEMO_QUERY, {
      recentQueries: Array.from({ length: 8 }, () => ({ fingerprint: 'other', queriedAt: '2026-08-15T00:00:00Z' })),
    });
    expect(budget.result).toMatchObject({ kind: 'suppressed', reason: 'query_budget_exceeded' });
  });

  it('enforces requester authorization server-side and records audit metadata', () => {
    const denied = getWellbeingAggregate(DEMO_QUERY, { profileId: 'stranger', canViewScope: true }, {
      scope: DEMO_SCOPE,
      snapshot: run().result,
    });
    expect(denied.result).toMatchObject({ kind: 'suppressed', reason: 'unauthorized' });
    expect(denied.audit.requesterProfileId).toBe('stranger');
    expect(denied.audit.suppression).toBe('unauthorized');
    expect(
      getWellbeingAggregate(DEMO_QUERY, DEMO_REQUESTER, { scope: DEMO_SCOPE, request: { raw: true } }).result,
    ).toMatchObject({ kind: 'suppressed', reason: 'bypass_not_permitted' });
  });

  it('never copies member identities or private notes into aggregate or Civi context', () => {
    const observations = tinyCellObservations();
    const { result } = run(DEMO_QUERY, { observations });
    expect(snapshotHasPrivateLeak(result, observations)).toBe(false);
    const civi = toCiviAggregateContext(result);
    expect(JSON.stringify(civi)).not.toMatch(/member-|Site B|exhausted/);
    expect(civi.caveats.join(' ')).toMatch(/not a scientific finding|not included/i);
  });

  it('requires repeated qualifying evidence for a systemic candidate and never auto-publishes', () => {
    const one: WellbeingAggregateResult[] = [run().result];
    const watching = deriveSystemicIssueCandidate({
      scopeId: DEMO_SCOPE.id,
      domain: 'time_life_balance',
      qualifyingInsights: one,
    });
    expect(watching.status).toBe('observing');
    expect(mayAutoPublish(watching)).toBe(false);
    const established = deriveSystemicIssueCandidate({
      scopeId: DEMO_SCOPE.id,
      domain: 'time_life_balance',
      qualifyingInsights: [run().result, run().result, run().result],
    });
    expect(established.status).toBe('established_pattern');
    expect(established.publishesChallenge).toBe(false);
    expect(established.publishesGovernance).toBe(false);
    expect(SYSTEMIC_PATTERN_V1.autoPublishChallenge).toBe(false);
  });
});

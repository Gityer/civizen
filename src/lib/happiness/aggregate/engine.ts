/**
 * Trusted wellbeing aggregate service. Phase 4B must call this instead of private Happiness tables.
 */
import { WELLBEING_AGGREGATE_PRIVACY_V1 } from './policy';
import { fingerprintQuery, requiredCohort, validateAggregateQuery, isSubsetFingerprint, rejectUnsafeAggregateFlags } from './query-guard';
import { countBy, effectiveCohort, participationBand, suppressSmallCells } from './suppress';
import type {
  AggregateAuditRecord,
  AggregateQuery,
  AggregateRequester,
  EligibleObservation,
  PriorAggregateQuery,
  QualifyingScope,
  WellbeingAggregateResult,
} from './types';
import {
  WELLBEING_AGGREGATE_MODEL_VERSION,
  WELLBEING_AGGREGATE_PRIVACY_VERSION,
} from './types';

export type AggregatePrivacyOptions = {
  scope: QualifyingScope;
  observations: EligibleObservation[];
  recentQueries?: PriorAggregateQuery[];
};

export type GetWellbeingAggregateOptions = {
  scope: QualifyingScope;
  snapshot?: WellbeingAggregateResult | null;
  request?: Record<string, unknown>;
};

function domainLabel(query: AggregateQuery): string {
  if (query.domain === 'time_life_balance') return 'Time & Life Balance';
  if (query.domain === 'work_fulfillment') return 'Work Fulfillment';
  if (query.domain === 'health_vitality') return 'Health & Energy';
  if (query.domain === 'relationships_belonging') return 'Relationships & Belonging';
  if (query.domain === 'meaning_purpose') return 'Purpose & Contribution';
  return 'this area';
}

function insightSummary(query: AggregateQuery, grouped: boolean): string {
  const area = domainLabel(query);
  if (query.topic === 'intervention_helpfulness') {
    return `Among qualifying participating members who tried this type of action, positive helpfulness was commonly reported.`;
  }
  if (query.topic === 'factor_category' && query.factorCategory) {
    return `${query.factorCategory} is frequently selected as a factor associated with ${area} concerns among participating members in this qualifying group.`;
  }
  if (grouped) {
    return `${area} appears to be a recurring concern among participating members in this qualifying group.`;
  }
  return `${area} appears to be a recurring concern among participating members in this qualifying group.`;
}

function unauthorized(): WellbeingAggregateResult {
  return {
    kind: 'suppressed',
    reason: 'unauthorized',
    privacyPolicyVersion: WELLBEING_AGGREGATE_PRIVACY_VERSION,
    aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
    summary: 'This wellbeing insight is not available.',
  };
}

export function getWellbeingAggregate(
  query: AggregateQuery,
  requester: AggregateRequester,
  options: GetWellbeingAggregateOptions,
): { result: WellbeingAggregateResult; audit: AggregateAuditRecord } {
  const policy = WELLBEING_AGGREGATE_PRIVACY_V1;
  const fingerprint = fingerprintQuery(query);
  const auditBase = {
    requesterProfileId: requester.profileId,
    scopeId: query.scopeId,
    fingerprint,
    timeBucket: query.timeBucket,
    topic: query.topic,
    privacyPolicyVersion: policy.version,
    aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
  };

  const finish = (result: WellbeingAggregateResult) => ({
    result,
    audit: {
      ...auditBase,
      suppression: result.kind === 'suppressed' ? result.reason : null,
    },
  });

  if (!requester.canViewScope || !options.scope.viewerProfileIds.includes(requester.profileId)) {
    return finish(unauthorized());
  }
  if (options.scope.id !== query.scopeId || !options.scope.enabled) {
    return finish({
      kind: 'suppressed',
      reason: 'scope_not_enabled',
      privacyPolicyVersion: policy.version,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      summary: 'This group has not enabled privacy-protected wellbeing insights.',
    });
  }
  const bypass = rejectUnsafeAggregateFlags(options.request ?? {});
  if (bypass) {
    return finish({
      kind: 'suppressed',
      reason: bypass,
      privacyPolicyVersion: policy.version,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      summary: 'That combination of wellbeing insight is not available.',
    });
  }
  if (options.snapshot) {
    return finish(options.snapshot);
  }
  return finish({
    kind: 'suppressed',
    reason: 'not_enough_observations',
    privacyPolicyVersion: policy.version,
    aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
    summary: 'There is not enough privacy-protected participation to share a group insight.',
  });
}

/**
 * Privacy/suppression core used by both the viewer API and privileged snapshot generation.
 * There is no raw or unsuppressed mode.
 */
export function applyWellbeingAggregatePrivacy(
  query: AggregateQuery,
  _requester: AggregateRequester,
  options: AggregatePrivacyOptions,
  finish: (result: WellbeingAggregateResult) => { result: WellbeingAggregateResult; audit: AggregateAuditRecord },
): { result: WellbeingAggregateResult; audit: AggregateAuditRecord } {
  const policy = WELLBEING_AGGREGATE_PRIVACY_V1;
  const fingerprint = fingerprintQuery(query);

  const invalid = validateAggregateQuery(query, policy);
  if (invalid) {
    return finish({
      kind: 'suppressed',
      reason: invalid,
      privacyPolicyVersion: policy.version,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      summary: 'That combination of wellbeing insight is not available.',
    });
  }

  const recent = options.recentQueries ?? [];
  if (recent.length >= policy.queryBudgetPerScope) {
    return finish({
      kind: 'suppressed',
      reason: 'query_budget_exceeded',
      privacyPolicyVersion: policy.version,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      summary: 'This wellbeing insight is not available.',
    });
  }
  if (recent.some((row) => isSubsetFingerprint(fingerprint, row.fingerprint) || isSubsetFingerprint(row.fingerprint, fingerprint))) {
    return finish({
      kind: 'suppressed',
      reason: 'similar_slice_restricted',
      privacyPolicyVersion: policy.version,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      summary: 'Overlapping wellbeing slices are restricted to protect privacy.',
    });
  }

  const participatingInScope = options.observations.filter((row) => row.participating && row.inScope);
  const eligible = participatingInScope.filter((row) => {
    if (!row.inPeriod) return false;
    if (query.domain && row.domain !== query.domain) return false;
    if (query.factorCategory && row.factorCategory !== query.factorCategory) return false;
    if (query.interventionType && row.interventionType !== query.interventionType) return false;
    if (query.workContextType && row.workContextType !== query.workContextType) return false;
    if (query.geography && row.geographyGrain !== query.geography) return false;
    return true;
  });
  const participatingMembers = effectiveCohort(participatingInScope);
  const members = effectiveCohort(eligible);
  const minCohort = requiredCohort(query, policy);
  if (members.length < minCohort) {
    const reason =
      participatingMembers.length === 0
        ? 'insufficient_participation'
        : participatingMembers.length >= minCohort
          ? 'not_enough_observations'
          : 'cohort_too_small';
    return finish({
      kind: 'suppressed',
      reason,
      privacyPolicyVersion: policy.version,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      summary: 'There is not enough privacy-protected participation to share a group insight.',
    });
  }

  const distribution = countBy(eligible, (row) => row.level);
  const cells = suppressSmallCells(distribution, policy);
  const sources = ['structured_domain_state'];
  if (query.topic === 'factor_category') sources.push('structured_factor_category');
  if (query.topic === 'intervention_helpfulness') sources.push('structured_intervention_outcome');

  return finish({
    kind: 'insight',
    scopeId: query.scopeId,
    topic: query.topic,
    domain: query.domain,
    timeBucket: query.timeBucket,
    periodStart: query.periodStart,
    summary: insightSummary(query, cells.grouped),
    sufficiency: participationBand(members.length, minCohort),
    confidence: 'moderate',
    sourceTypes: sources,
    privacyPolicyVersion: policy.version,
    aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
    suppression: null,
    participation: participationBand(members.length, minCohort),
    groupedDistribution: cells.visible,
  });
}

export function snapshotHasPrivateLeak(result: WellbeingAggregateResult, observations: EligibleObservation[]): boolean {
  const blob = JSON.stringify(result);
  if (blob.includes('privateNote') || blob.includes('memberKey')) return true;
  return observations.some((row) => Boolean(row.privateNote) && blob.includes(row.privateNote!));
}

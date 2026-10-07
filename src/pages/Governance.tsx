import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Landmark, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GovernanceGuardianSignoffCard } from '@/components/governance/GovernanceGuardianSignoffCard';
import { GovernanceHubActivationReadinessCard } from '@/components/governance/GovernanceHubActivationReadinessCard';
import { GovernanceHubAdditionalDetailsPanel } from '@/components/governance/GovernanceHubAdditionalDetailsPanel';
import { GovernanceHubProposalSignalsSection } from '@/components/governance/GovernanceHubProposalSignalsSection';
import { GovernanceHubProposalsList } from '@/components/governance/GovernanceHubProposalsList';
import { GovernanceHubSanctionsSection } from '@/components/governance/GovernanceHubSanctionsSection';
import { GovernanceHubIdentityVerificationCard } from '@/components/governance/GovernanceHubIdentityVerificationCard';
import { WorldCitizenshipStatusNotice } from '@/components/institutional/WorldCitizenshipStatusNotice';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { coerceCitizenshipStatus, deriveProjectedCitizenshipStatus } from '@/lib/civic-status';
import {
  MIN_GOVERNANCE_SCORE,
  evaluateGovernanceEligibility,
  isNativeGovernanceApp,
  normalizeGovernanceScoreForRole,
  type GovernanceEligibilityReason,
} from '@/lib/governance-eligibility';
import {
  applyGovernanceProposalExecution,
  buildGovernanceProposalExecutionMetadata,
  describeGovernanceProposalExecution,
  getGovernanceExecutionActionLabelKey,
  getGovernanceProposalTypeForExecutionAction,
  readGovernanceProposalExecutionSpec,
  validateGovernanceExecutionDraft,
} from '@/lib/governance-execution';
import {
  persistGovernanceEligibilitySnapshot,
  sameGovernanceEligibilitySnapshot,
  type GovernanceEligibilitySnapshotPayload,
} from '@/lib/governance-eligibility-snapshots';
import {
  isMissingActivationReviewBackend,
  normalizeProfileCountryCodeForActivation,
  pickActivationReviewsForCitizenHub,
  type ActivationThresholdReviewHubRow,
} from '@/lib/governance-activation-review';
import {
  buildFederationExecutionGateMessages,
  buildGuardianRelayExecutionGateMessages,
  type GovernanceHubFederationExecutionGate,
  type GovernanceHubGuardianRelayExecutionGate,
} from '@/lib/governance-execution-gates';
import {
  isMissingGovernanceProposalBackend,
  isMissingGovernanceSanctionsBackend,
  isMissingIdentityVerificationCasesBackend,
} from '@/lib/governance-hub-backend';
import {
  computeGovernanceTimingWindow,
  getGovernanceDecisionClassLabelKey,
  getGovernanceProposalStatusLabelKey,
  getGovernanceVoteChoiceLabelKey,
  resolveGovernanceProposal,
} from '@/lib/governance-proposals';
import { buildGovernanceVoteHistoryForVoter } from '@/lib/governance-vote-history';
import { buildGovernanceExecutionTasksForUser } from '@/lib/governance-execution-tasks';
import {
  readGovernanceExecutionThresholdRuleFromMetadata,
  resolveGovernanceExecutionThresholdRule,
  serializeGovernanceExecutionThresholdRule,
  toGovernanceProposalResolutionThresholds,
} from '@/lib/governance-execution-thresholds';
import {
  getGovernanceSanctionAppealStatusLabelKey,
  getGovernanceSanctionScopeLabelKey,
  getGovernanceSanctionScopeOptionFromRow,
  governanceSanctionBlocksScope,
  isAppealOpen,
  isGovernanceSanctionCurrentlyActive,
} from '@/lib/governance-sanctions';
import {
  buildGovernanceImplementationQueue,
  getGovernanceImplementationStatusClassName,
  getGovernanceImplementationStatusLabelKey,
  getGovernanceUnitLabelKey,
  type GovernanceExecutionUnitRow,
} from '@/lib/governance-implementation';
import {
  countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring,
  GOVERNANCE_ACTIVATION_DEMOGRAPHIC_FEED_WORKER_ESCALATION_PAGE_KEY,
  GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
  isMissingPublicAuditAutomationBackend,
  readGovernancePublicAuditExternalExecutionPageBoardRows,
} from '@/lib/governance-public-audit-automation';
import {
  isMissingPublicAuditVerifierBackend,
  readGovernancePublicAuditVerifierMirrorFailoverPolicySummary,
  readGovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  type GovernancePublicAuditVerifierMirrorFederationOperationsSummary,
} from '@/lib/governance-public-audit-verifiers';
import {
  readGovernanceGuardianRelayDistributionReadinessIssues,
  readGovernanceProposalGuardianRelayClientVerificationDistributionSummary,
} from '@/lib/governance-guardian-relay-distribution';
import {
  isMissingGuardianRelayBackend,
  readGovernanceProposalGuardianRelayOperationsSummary,
} from '@/lib/governance-guardian-relays';
import { createEmptyGovernanceProposalDraft } from '@/lib/governance-proposal-draft';
import { calculateCivizenScore } from '@/lib/scoring';
import { resolveGovernanceHubIdentityVerificationPresentation, type GovernanceHubIdentityVerificationCasePick } from '@/lib/verification-workflow';
import type { PillarId } from '@/lib/constants';

const GovernanceProposalComposer = lazy(() =>
  import('@/components/governance/GovernanceProposalComposer').then((module) => ({
    default: module.GovernanceProposalComposer,
  })),
);

type ProposalRow = Database['public']['Tables']['governance_proposals']['Row'];
type VoteRow = Database['public']['Tables']['governance_proposal_votes']['Row'];
type EventRow = Database['public']['Tables']['governance_proposal_events']['Row'];
type ExecutionUnitMembershipRow = Database['public']['Tables']['governance_execution_unit_memberships']['Row'];
type ProposalImplementationRow = Database['public']['Tables']['governance_proposal_implementations']['Row'];
type GovernanceSanctionRow = Database['public']['Tables']['governance_sanctions']['Row'];
type GovernanceSanctionAppealRow = Database['public']['Tables']['governance_sanction_appeals']['Row'];
type MonetaryPolicyProfileRow = Database['public']['Tables']['monetary_policy_profiles']['Row'];
type ContentItemRow = Pick<
  Database['public']['Tables']['content_items']['Row'],
  'id' | 'title' | 'review_status' | 'content_type' | 'professional_domain' | 'source_table'
>;
type ProfileDirectoryRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'username' | 'role' | 'is_verified' | 'is_active_citizen'
>;

const FOUNDATION_CERTIFICATION_ID = 'civic_foundations';

async function resolveGovernanceExecutionNotReadyMessage(
  proposalId: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): Promise<string> {
  const [thresholdRes, guardianRes, federationRes, relayRes] = await Promise.all([
    supabase.rpc('governance_proposal_meets_execution_threshold', { target_proposal_id: proposalId }),
    supabase.rpc('governance_proposal_meets_guardian_signoff', { target_proposal_id: proposalId }),
    supabase.rpc('governance_proposal_meets_verifier_federation_distribution_gate', { target_proposal_id: proposalId }),
    supabase.rpc('governance_proposal_meets_guardian_relay_distribution_gate', { target_proposal_id: proposalId }),
  ]);
  const gateError = thresholdRes.error || guardianRes.error || federationRes.error || relayRes.error;
  if (gateError) {
    console.warn('Could not evaluate individual execution readiness gates:', gateError);
    return t('governanceHub.executeNotReady');
  }
  if (!thresholdRes.data) return t('governanceHub.executeNotReadyThreshold');
  if (!guardianRes.data) return t('governanceHub.executeNotReadyGuardian');
  if (!federationRes.data) return t('governanceHub.executeNotReadyFederationDistribution');
  if (!relayRes.data) return t('governanceHub.executeNotReadyGuardianRelay');
  return t('governanceHub.executeNotReady');
}

export default function Governance() {
  const { profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const [mobilePane, setMobilePane] = useState<'board' | 'workspace'>('board');
  const [proposalDraft, setProposalDraft] = useState(createEmptyGovernanceProposalDraft);
  const [governanceScore, setGovernanceScore] = useState<number | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [eligibilityUnavailable, setEligibilityUnavailable] = useState(false);
  const [eligibleCitizenCount, setEligibleCitizenCount] = useState(0);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [executionUnits, setExecutionUnits] = useState<GovernanceExecutionUnitRow[]>([]);
  const [unitMemberships, setUnitMemberships] = useState<ExecutionUnitMembershipRow[]>([]);
  const [implementations, setImplementations] = useState<ProposalImplementationRow[]>([]);
  const [monetaryPolicyProfiles, setMonetaryPolicyProfiles] = useState<MonetaryPolicyProfileRow[]>([]);
  const [contentItems, setContentItems] = useState<ContentItemRow[]>([]);
  const [profileDirectory, setProfileDirectory] = useState<ProfileDirectoryRow[]>([]);
  const [loadingHub, setLoadingHub] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [isGuardianSigner, setIsGuardianSigner] = useState(false);
  const [sanctionsBackendUnavailable, setSanctionsBackendUnavailable] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [executingImplementationId, setExecutingImplementationId] = useState<string | null>(null);
  const [sanctions, setSanctions] = useState<GovernanceSanctionRow[]>([]);
  const [appeals, setAppeals] = useState<GovernanceSanctionAppealRow[]>([]);
  const [submittingAppealForSanctionId, setSubmittingAppealForSanctionId] = useState<string | null>(null);
  const [appealDraftBySanctionId, setAppealDraftBySanctionId] = useState<Record<string, { reason: string; evidence: string }>>({});
  const [lastSnapshot, setLastSnapshot] = useState<GovernanceEligibilitySnapshotPayload | null>(null);
  const [verifierFederationExecutionGate, setVerifierFederationExecutionGate] = useState<GovernanceHubFederationExecutionGate | null>(null);
  const [federationDistributionEscalationOpenPageCount, setFederationDistributionEscalationOpenPageCount] = useState(0);
  const [activationDemographicFeedEscalationOpenPageCount, setActivationDemographicFeedEscalationOpenPageCount] = useState(0);
  const [guardianRelayEscalationOpenPageCount, setGuardianRelayEscalationOpenPageCount] = useState(0);
  const [emergencyAccessOpsEscalationOpenPageCount, setEmergencyAccessOpsEscalationOpenPageCount] = useState(0);
  const [guardianRelayExecutionGate, setGuardianRelayExecutionGate] = useState<GovernanceHubGuardianRelayExecutionGate | null>(null);
  const [identityVerificationCase, setIdentityVerificationCase] = useState<GovernanceHubIdentityVerificationCasePick | null>(null);
  const [identityVerificationLoading, setIdentityVerificationLoading] = useState(true);
  const [identityVerificationUnavailable, setIdentityVerificationUnavailable] = useState(false);
  const [identityVerificationLoadFailed, setIdentityVerificationLoadFailed] = useState(false);
  const [activationHubReviews, setActivationHubReviews] = useState<ActivationThresholdReviewHubRow[]>([]);
  const [activationHubLoading, setActivationHubLoading] = useState(true);
  const [activationHubUnavailable, setActivationHubUnavailable] = useState(false);
  const [activationHubLoadFailed, setActivationHubLoadFailed] = useState(false);
  const isNativeMobileGovernanceDevice = useMemo(() => isNativeGovernanceApp(), []);

  const projectedCitizenshipStatus = useMemo(
    () => deriveProjectedCitizenshipStatus(profile?.role, Boolean(profile?.is_verified)),
    [profile?.is_verified, profile?.role],
  );
  const effectiveCitizenshipStatus = useMemo(
    () => coerceCitizenshipStatus(profile?.citizenship_status, projectedCitizenshipStatus),
    [profile?.citizenship_status, projectedCitizenshipStatus],
  );

  const governanceEligibility = useMemo(
    () =>
      evaluateGovernanceEligibility({
        isVerified: Boolean(profile?.is_verified),
        role: profile?.role,
        score: governanceScore,
        isNativeMobileApp: isNativeMobileGovernanceDevice,
        minScore: MIN_GOVERNANCE_SCORE,
      }),
    [governanceScore, isNativeMobileGovernanceDevice, profile?.is_verified, profile?.role],
  );

  const requirementMessages = useMemo(() => {
    const messageByReason: Record<GovernanceEligibilityReason, string> = {
      mobile_app_required: t('governance.requirementMobile'),
      verified_required: t('governance.requirementVerified'),
      minimum_score_required: t('governance.requirementScore'),
      score_unavailable: t('governance.requirementScoreUnavailable'),
    };

    return governanceEligibility.reasons.map((reason) => messageByReason[reason]);
  }, [governanceEligibility.reasons, t]);

  const eligibilitySnapshot = useMemo<GovernanceEligibilitySnapshotPayload | null>(() => {
    if (!profile?.id || governanceScore === null) return null;

    return {
      profileId: profile.id,
      citizenshipStatus: effectiveCitizenshipStatus,
      isVerified: Boolean(profile.is_verified),
      isActiveCitizen: Boolean(profile.is_active_citizen),
      civizenScore: governanceScore,
      governanceScore,
      eligible: governanceEligibility.eligible,
      influenceWeight: governanceEligibility.influenceWeight,
      reasons: governanceEligibility.reasons,
    };
  }, [
    effectiveCitizenshipStatus,
    governanceEligibility.eligible,
    governanceEligibility.influenceWeight,
    governanceEligibility.reasons,
    governanceScore,
    profile?.id,
    profile?.is_active_citizen,
    profile?.is_verified,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadGovernanceEligibility = async () => {
      if (!profile?.id) {
        setGovernanceScore(null);
        setLoadingEligibility(false);
        return;
      }

      setLoadingEligibility(true);

      const { data, error } = await supabase
        .from('endorsements')
        .select('id, endorser_id, endorsed_id, pillar, stars, comment, created_at')
        .eq('endorsed_id', profile.id)
        .eq('is_hidden', false);

      if (cancelled) return;

      if (error) {
        console.error('Failed to load governance eligibility score:', error);
        setGovernanceScore(null);
        setEligibilityUnavailable(true);
        setLoadingEligibility(false);
        return;
      }

      const typedEndorsements = (data ?? []).map((item) => ({
        ...item,
        pillar: item.pillar as PillarId,
      }));
      const computedScore = calculateCivizenScore(typedEndorsements);
      const normalizedScore = normalizeGovernanceScoreForRole(profile.role, computedScore.overall);

      setGovernanceScore(normalizedScore);
      setEligibilityUnavailable(false);
      setLoadingEligibility(false);
    };

    void loadGovernanceEligibility();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    if (!eligibilitySnapshot || loadingEligibility || eligibilityUnavailable) return;
    if (lastSnapshot && sameGovernanceEligibilitySnapshot(lastSnapshot, eligibilitySnapshot)) return;

    let cancelled = false;

    const syncSnapshot = async () => {
      const payload = {
        ...eligibilitySnapshot,
        calculatedAt: new Date().toISOString(),
      };

      const { error } = await persistGovernanceEligibilitySnapshot(supabase, payload);
      if (cancelled) return;

      if (error) {
        console.error('Failed to persist governance eligibility snapshot:', error);
        return;
      }

      setLastSnapshot(payload);

      if (profile?.is_governance_eligible !== payload.eligible) {
        await refreshProfile();
      }
    };

    void syncSnapshot();

    return () => {
      cancelled = true;
    };
  }, [
    eligibilitySnapshot,
    eligibilityUnavailable,
    lastSnapshot,
    loadingEligibility,
    profile?.is_governance_eligible,
    refreshProfile,
  ]);

  const loadSanctionsAndAppeals = useCallback(async () => {
    if (!profile?.id) {
      setSanctions([]);
      setAppeals([]);
      setSanctionsBackendUnavailable(false);
      return;
    }

    const [sanctionsResponse, appealsResponse] = await Promise.all([
      supabase
        .from('governance_sanctions')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('governance_sanction_appeals')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);

    const sanctionsError = sanctionsResponse.error;
    const appealsError = appealsResponse.error;
    const missingBackend = isMissingGovernanceSanctionsBackend(sanctionsError) || isMissingGovernanceSanctionsBackend(appealsError);

    if (missingBackend) {
      setSanctionsBackendUnavailable(true);
      return;
    }

    if (sanctionsError || appealsError) {
      console.error('Failed to load governance sanctions/appeals:', {
        sanctionsError,
        appealsError,
      });
      return;
    }

    setSanctions(sanctionsResponse.data ?? []);
    setAppeals(appealsResponse.data ?? []);
    setSanctionsBackendUnavailable(false);
  }, [profile?.id]);

  useEffect(() => {
    void loadSanctionsAndAppeals();
  }, [loadSanctionsAndAppeals]);

  useEffect(() => {
    let cancelled = false;

    const loadIdentityVerificationCase = async () => {
      if (!profile?.id) {
        setIdentityVerificationCase(null);
        setIdentityVerificationUnavailable(false);
        setIdentityVerificationLoadFailed(false);
        setIdentityVerificationLoading(false);
        return;
      }

      setIdentityVerificationLoading(true);
      setIdentityVerificationLoadFailed(false);

      const { data, error } = await supabase
        .from('identity_verification_cases')
        .select('status, personal_info_completed, contact_info_completed, live_verification_completed')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        if (isMissingIdentityVerificationCasesBackend(error)) {
          setIdentityVerificationUnavailable(true);
          setIdentityVerificationLoadFailed(false);
          setIdentityVerificationCase(null);
        } else {
          console.error('Failed to load identity verification case for governance hub:', error);
          setIdentityVerificationUnavailable(false);
          setIdentityVerificationLoadFailed(true);
          setIdentityVerificationCase(null);
        }
        setIdentityVerificationLoading(false);
        return;
      }

      setIdentityVerificationUnavailable(false);
      setIdentityVerificationLoadFailed(false);
      setIdentityVerificationCase(data);
      setIdentityVerificationLoading(false);
    };

    void loadIdentityVerificationCase();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const identityVerificationPresentation = useMemo(() => {
    if (!profile?.id || identityVerificationLoading || identityVerificationUnavailable || identityVerificationLoadFailed) {
      return null;
    }

    return resolveGovernanceHubIdentityVerificationPresentation({
      isVerified: Boolean(profile.is_verified),
      caseRow: identityVerificationCase,
    });
  }, [
    identityVerificationCase,
    identityVerificationLoadFailed,
    identityVerificationLoading,
    identityVerificationUnavailable,
    profile?.id,
    profile?.is_verified,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadActivationHubReviews = async () => {
      if (!profile?.id) {
        setActivationHubReviews([]);
        setActivationHubUnavailable(false);
        setActivationHubLoadFailed(false);
        setActivationHubLoading(false);
        return;
      }

      setActivationHubLoading(true);
      setActivationHubLoadFailed(false);

      const { data, error } = await supabase
        .from('activation_threshold_reviews')
        .select(
          'id, scope_type, country_code, jurisdiction_label, status, threshold_percent, target_population, eligible_verified_citizens_count, metadata, updated_at',
        )
        .order('updated_at', { ascending: false })
        .limit(120);

      if (cancelled) return;

      if (error) {
        if (isMissingActivationReviewBackend(error)) {
          setActivationHubUnavailable(true);
          setActivationHubLoadFailed(false);
          setActivationHubReviews([]);
        } else {
          console.error('Failed to load activation threshold reviews for governance hub:', error);
          setActivationHubUnavailable(false);
          setActivationHubLoadFailed(true);
          setActivationHubReviews([]);
        }
        setActivationHubLoading(false);
        return;
      }

      setActivationHubUnavailable(false);
      setActivationHubLoadFailed(false);
      setActivationHubReviews(data ?? []);
      setActivationHubLoading(false);
    };

    void loadActivationHubReviews();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const normalizedActivationMemberCountryCode = useMemo(
    () => normalizeProfileCountryCodeForActivation(profile?.country_code),
    [profile?.country_code],
  );

  const citizenActivationReviews = useMemo(
    () => pickActivationReviewsForCitizenHub(activationHubReviews, normalizedActivationMemberCountryCode),
    [activationHubReviews, normalizedActivationMemberCountryCode],
  );

  const proposalsById = useMemo(
    () => Object.fromEntries(proposals.map((item) => [item.id, item])) as Record<string, ProposalRow>,
    [proposals],
  );

  const governanceVoteHistoryEntries = useMemo(() => {
    if (!profile?.id || backendUnavailable) return [];

    return buildGovernanceVoteHistoryForVoter({
      votes,
      proposalsById,
      voterId: profile.id,
    });
  }, [backendUnavailable, profile?.id, proposalsById, votes]);

  const federationOpsGateMessages = useMemo(
    () => buildFederationExecutionGateMessages(t, verifierFederationExecutionGate),
    [t, verifierFederationExecutionGate],
  );
  const guardianRelayGateMessages = useMemo(
    () => buildGuardianRelayExecutionGateMessages(t, guardianRelayExecutionGate),
    [guardianRelayExecutionGate, t],
  );

  const queueImplementationsForProposal = useCallback(async (
    proposal: ProposalRow,
    actorId: string | null,
    availableUnitsByKey: Record<string, GovernanceExecutionUnitRow>,
    existingImplementations: ProposalImplementationRow[],
  ) => {
    if (proposal.status !== 'approved') return false;
    if (existingImplementations.length > 0) return false;

    const queueEntries = buildGovernanceImplementationQueue({
      proposal,
      createdBy: actorId,
      unitsByKey: availableUnitsByKey,
    });

    if (!queueEntries.length) {
      return false;
    }

    const { error: implementationError } = await supabase
      .from('governance_proposal_implementations')
      .upsert(queueEntries, { onConflict: 'proposal_id,unit_id' });

    if (implementationError) {
      console.error('Failed to queue governance implementation records:', implementationError);
      return false;
    }

    const unitKeyById = Object.fromEntries(
      Object.values(availableUnitsByKey).map((unit) => [unit.id, unit.unit_key]),
    ) as Record<string, string>;

    const eventsToInsert = queueEntries.map((entry) => ({
      proposal_id: proposal.id,
      actor_id: actorId,
      event_type: 'implementation.queued',
      payload: {
        unit_id: entry.unit_id,
        unit_key: unitKeyById[entry.unit_id] || null,
        status: 'queued',
      },
    }));

    const { error: eventError } = await supabase.from('governance_proposal_events').insert(eventsToInsert);

    if (eventError) {
      console.error('Failed to record implementation queue events:', eventError);
    }

    return true;
  }, []);

  const finalizeProposalIfReady = useCallback(async (
    proposal: ProposalRow,
    proposalVotes: VoteRow[],
    actorId: string | null,
    availableUnitsByKey: Record<string, GovernanceExecutionUnitRow>,
    existingImplementations: ProposalImplementationRow[],
  ) => {
    const executionSpec = readGovernanceProposalExecutionSpec(proposal.metadata);
    const thresholdRule = readGovernanceExecutionThresholdRuleFromMetadata(proposal.metadata)
      || resolveGovernanceExecutionThresholdRule({
        actionType: executionSpec.actionType,
        decisionClass: proposal.decision_class,
      });
    const resolution = resolveGovernanceProposal({
      proposal,
      votes: proposalVotes,
      thresholds: toGovernanceProposalResolutionThresholds(thresholdRule),
    });
    if (!resolution.finalizable) return false;

    if (resolution.status === 'approved') {
      const { data: meetsGuardianSignoff, error: guardianSignoffError } = await supabase.rpc(
        'governance_proposal_meets_guardian_signoff',
        { target_proposal_id: proposal.id },
      );

      if (guardianSignoffError) {
        console.error('Failed to evaluate guardian signoff readiness:', guardianSignoffError);
        return false;
      }

      if (!meetsGuardianSignoff) {
        return false;
      }
    }

    const { error: updateError } = await supabase
      .from('governance_proposals')
      .update({
        status: resolution.status,
        resolved_at: new Date().toISOString(),
        final_decision_summary: resolution.summary,
      })
      .eq('id', proposal.id)
      .eq('status', 'open');

    if (updateError) {
      console.error('Failed to finalize governance proposal:', updateError);
      return false;
    }

    const { error: eventError } = await supabase
      .from('governance_proposal_events')
      .insert({
        proposal_id: proposal.id,
        actor_id: actorId,
        event_type: 'proposal.finalized',
        payload: {
          status: resolution.status,
          summary: resolution.summary,
          tally: resolution.tally,
        },
      });

    if (eventError) {
      console.error('Failed to record proposal finalization event:', eventError);
    }

    if (resolution.status === 'approved') {
      await queueImplementationsForProposal(
        {
          ...proposal,
          status: resolution.status,
        },
        actorId,
        availableUnitsByKey,
        existingImplementations,
      );
    }

    return true;
  }, [queueImplementationsForProposal]);

  const loadGovernanceHub = useCallback(async () => {
    setLoadingHub(true);

    const [
      proposalResponse,
      voteResponse,
      eventResponse,
      eligibleCountResponse,
      profileDirectoryResponse,
      monetaryPoliciesResponse,
      contentItemsResponse,
      executionUnitsResponse,
      membershipsResponse,
      implementationsResponse,
      guardianSignerResponse,
    ] = await Promise.all([
      supabase.from('governance_proposals').select('*').order('created_at', { ascending: false }),
      supabase.from('governance_proposal_votes').select('*').order('created_at', { ascending: false }),
      supabase.from('governance_proposal_events').select('*').order('created_at', { ascending: false }).limit(60),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_governance_eligible', true)
        .eq('is_active_citizen', true)
        .is('deleted_at', null),
      supabase
        .from('profiles')
        .select('id, full_name, username, role, is_verified, is_active_citizen')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase.from('monetary_policy_profiles').select('*').order('updated_at', { ascending: false }),
      supabase
        .from('content_items')
        .select('id, title, review_status, content_type, professional_domain, source_table')
        .order('updated_at', { ascending: false })
        .limit(200),
      supabase.from('governance_execution_units').select('*').eq('is_active', true).order('created_at', { ascending: true }),
      supabase
        .from('governance_execution_unit_memberships')
        .select('*')
        .eq('is_active', true)
        .order('assigned_at', { ascending: true }),
      supabase
        .from('governance_proposal_implementations')
        .select('*')
        .order('assigned_at', { ascending: false }),
      supabase.rpc('current_profile_is_guardian_signer'),
    ]);

    const primaryError =
      proposalResponse.error
      || voteResponse.error
      || eventResponse.error
      || eligibleCountResponse.error
      || profileDirectoryResponse.error
      || monetaryPoliciesResponse.error
      || contentItemsResponse.error
      || executionUnitsResponse.error
      || membershipsResponse.error
      || implementationsResponse.error
      || guardianSignerResponse.error;

    if (primaryError && isMissingGovernanceProposalBackend(primaryError)) {
      setBackendUnavailable(true);
      setVerifierFederationExecutionGate(null);
      setGuardianRelayExecutionGate(null);
      setFederationDistributionEscalationOpenPageCount(0);
      setActivationDemographicFeedEscalationOpenPageCount(0);
      setGuardianRelayEscalationOpenPageCount(0);
      setEmergencyAccessOpsEscalationOpenPageCount(0);
      setLoadingHub(false);
      return;
    }

    if (primaryError) {
      console.error('Failed to load governance hub:', {
        proposals: proposalResponse.error,
        votes: voteResponse.error,
        events: eventResponse.error,
        eligibleCount: eligibleCountResponse.error,
        profileDirectory: profileDirectoryResponse.error,
        monetaryPolicies: monetaryPoliciesResponse.error,
        contentItems: contentItemsResponse.error,
        executionUnits: executionUnitsResponse.error,
        memberships: membershipsResponse.error,
        implementations: implementationsResponse.error,
        guardianSigner: guardianSignerResponse.error,
      });
      toast.error(t('governanceHub.loadFailed'));
      setVerifierFederationExecutionGate(null);
      setGuardianRelayExecutionGate(null);
      setFederationDistributionEscalationOpenPageCount(0);
      setActivationDemographicFeedEscalationOpenPageCount(0);
      setGuardianRelayEscalationOpenPageCount(0);
      setEmergencyAccessOpsEscalationOpenPageCount(0);
      setLoadingHub(false);
      return;
    }

    const nextProposals = proposalResponse.data ?? [];
    const nextVotes = voteResponse.data ?? [];
    const nextEvents = eventResponse.data ?? [];
    const nextEligibleCitizenCount = eligibleCountResponse.count ?? 0;
    const nextProfileDirectory = profileDirectoryResponse.data ?? [];
    const nextMonetaryPolicyProfiles = monetaryPoliciesResponse.data ?? [];
    const nextContentItems = contentItemsResponse.data ?? [];
    const nextExecutionUnits = executionUnitsResponse.data ?? [];
    const nextUnitMemberships = membershipsResponse.data ?? [];
    const nextImplementations = implementationsResponse.data ?? [];
    const availableUnitsByKey = Object.fromEntries(
      nextExecutionUnits.map((unit) => [unit.unit_key, unit]),
    ) as Record<string, GovernanceExecutionUnitRow>;

    let finalizedAny = false;
    for (const proposal of nextProposals.filter((item) => item.status === 'open')) {
      const proposalVotes = nextVotes.filter((vote) => vote.proposal_id === proposal.id);
      const existingImplementations = nextImplementations.filter((item) => item.proposal_id === proposal.id);
      const finalized = await finalizeProposalIfReady(
        proposal,
        proposalVotes,
        profile?.id ?? null,
        availableUnitsByKey,
        existingImplementations,
      );
      finalizedAny = finalizedAny || finalized;
    }

    let queuedAny = false;
    for (const proposal of nextProposals.filter((item) => item.status === 'approved')) {
      const existingImplementations = nextImplementations.filter((item) => item.proposal_id === proposal.id);
      const queued = await queueImplementationsForProposal(
        proposal,
        profile?.id ?? null,
        availableUnitsByKey,
        existingImplementations,
      );
      queuedAny = queuedAny || queued;
    }

    if (finalizedAny || queuedAny) {
      await loadGovernanceHub();
      return;
    }

    setProposals(nextProposals);
    setVotes(nextVotes);
    setEvents(nextEvents);
    setProfileDirectory(nextProfileDirectory);
    setMonetaryPolicyProfiles(nextMonetaryPolicyProfiles);
    setContentItems(nextContentItems);
    setExecutionUnits(nextExecutionUnits);
    setUnitMemberships(nextUnitMemberships);
    setImplementations(nextImplementations);
    setEligibleCitizenCount(nextEligibleCitizenCount);
    setIsGuardianSigner(Boolean(guardianSignerResponse.data));
    setBackendUnavailable(false);

    const gateProposalId = nextProposals[0]?.id ?? '00000000-0000-0000-0000-000000000000';
    const [
      latestBatchRowResponse,
      failoverSummaryResponse,
      federationDistributionGateResponse,
      federationOpsSummaryResponse,
      guardianRelayDistributionGateResponse,
      guardianRelayOpsSummaryResponse,
      guardianRelayDistributionSummaryResponse,
    ] = await Promise.all([
      supabase
        .from('governance_public_audit_batches')
        .select('id')
        .order('batch_index', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc('governance_public_audit_verifier_mirror_failover_policy_summary', { requested_policy_key: 'default' }),
      supabase.rpc('governance_proposal_meets_verifier_federation_distribution_gate', { target_proposal_id: gateProposalId }),
      supabase.rpc('governance_public_audit_verifier_mirror_federation_operations_s', {
        requested_policy_key: 'default',
        requested_lookback_hours: 24,
        requested_alert_sla_hours: 12,
      }),
      supabase.rpc('governance_proposal_meets_guardian_relay_distribution_gate', { target_proposal_id: gateProposalId }),
      supabase.rpc('governance_proposal_guardian_relay_operations_summary', {
        target_proposal_id: gateProposalId,
        requested_policy_key: 'guardian_relay_default',
        requested_attestation_sla_minutes: null,
      }),
      supabase.rpc('governance_proposal_guardian_relay_client_verification_distribu', {
        target_proposal_id: gateProposalId,
      }),
    ]);

    let latestPublicAuditBatchId: string | undefined;
    if (latestBatchRowResponse.error) {
      const batchErr = latestBatchRowResponse.error;
      if (batchErr.code !== '42P01' && batchErr.code !== 'PGRST205') {
        console.warn('Could not load latest public audit batch id for governance hub:', batchErr);
      }
    } else if (latestBatchRowResponse.data?.id) {
      latestPublicAuditBatchId = latestBatchRowResponse.data.id;
    }

    const executionPageBoardResponse = await supabase.rpc('governance_public_audit_external_execution_page_board', {
      ...(latestPublicAuditBatchId ? { requested_batch_id: latestPublicAuditBatchId } : {}),
      max_pages: GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
    });
    const verifierGateError = failoverSummaryResponse.error || federationDistributionGateResponse.error;
    if (verifierGateError && isMissingPublicAuditVerifierBackend(verifierGateError)) {
      setVerifierFederationExecutionGate(null);
    } else if (verifierGateError) {
      console.warn('Could not load verifier federation execution gate context for governance hub:', verifierGateError);
      setVerifierFederationExecutionGate(null);
    } else {
      const failoverSummary = readGovernancePublicAuditVerifierMirrorFailoverPolicySummary(failoverSummaryResponse.data);
      let federationOps: GovernancePublicAuditVerifierMirrorFederationOperationsSummary | null = null;
      if (federationOpsSummaryResponse.error) {
        if (!isMissingPublicAuditVerifierBackend(federationOpsSummaryResponse.error)) {
          console.warn('Could not load federation operations summary for governance hub:', federationOpsSummaryResponse.error);
        }
      } else {
        federationOps = readGovernancePublicAuditVerifierMirrorFederationOperationsSummary(federationOpsSummaryResponse.data);
      }
      setVerifierFederationExecutionGate({
        policyRequiresFederationDistribution: Boolean(failoverSummary?.requireFederationOpsReadiness),
        distributionGateMet: Boolean(federationDistributionGateResponse.data),
        federationOps,
      });
    }

    const guardianRelayGateError = guardianRelayDistributionGateResponse.error || guardianRelayOpsSummaryResponse.error;
    if (guardianRelayGateError && isMissingGuardianRelayBackend(guardianRelayGateError)) {
      setGuardianRelayExecutionGate(null);
    } else if (guardianRelayGateError) {
      console.warn('Could not load guardian relay execution gate context for governance hub:', guardianRelayGateError);
      setGuardianRelayExecutionGate(null);
    } else {
      const relayOps = readGovernanceProposalGuardianRelayOperationsSummary(guardianRelayOpsSummaryResponse.data);
      const relayDistributionSummary = readGovernanceProposalGuardianRelayClientVerificationDistributionSummary(
        guardianRelayDistributionSummaryResponse.data,
      );
      const relayDistributionIssues = readGovernanceGuardianRelayDistributionReadinessIssues({
        distributionSummary: relayDistributionSummary,
        relayOperationsSummary: relayOps,
      });
      setGuardianRelayExecutionGate({
        policyRequiresRelayDistribution: Boolean(relayOps?.requireRelayOpsReadiness),
        distributionGateMet: relayDistributionIssues.length === 0 && Boolean(guardianRelayDistributionGateResponse.data),
        relayOps,
      });
    }

    if (!executionPageBoardResponse.error) {
      const executionPages = readGovernancePublicAuditExternalExecutionPageBoardRows(executionPageBoardResponse.data);
      setFederationDistributionEscalationOpenPageCount(
        countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(executionPages, 'verifier_federation_distribution'),
      );
      setActivationDemographicFeedEscalationOpenPageCount(
        countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(
          executionPages,
          GOVERNANCE_ACTIVATION_DEMOGRAPHIC_FEED_WORKER_ESCALATION_PAGE_KEY,
        ),
      );
      setGuardianRelayEscalationOpenPageCount(
        countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(executionPages, 'guardian_relay'),
      );
      setEmergencyAccessOpsEscalationOpenPageCount(
        countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(executionPages, 'emergency_access'),
      );
    } else if (isMissingPublicAuditAutomationBackend(executionPageBoardResponse.error)) {
      setFederationDistributionEscalationOpenPageCount(0);
      setActivationDemographicFeedEscalationOpenPageCount(0);
      setGuardianRelayEscalationOpenPageCount(0);
      setEmergencyAccessOpsEscalationOpenPageCount(0);
    } else {
      console.warn('Could not load external execution page board for governance hub:', executionPageBoardResponse.error);
      setFederationDistributionEscalationOpenPageCount(0);
      setActivationDemographicFeedEscalationOpenPageCount(0);
      setGuardianRelayEscalationOpenPageCount(0);
      setEmergencyAccessOpsEscalationOpenPageCount(0);
    }

    setLoadingHub(false);
  }, [finalizeProposalIfReady, profile?.id, queueImplementationsForProposal, t]);

  useEffect(() => {
    void loadGovernanceHub();
  }, [loadGovernanceHub]);

  const votesByProposal = useMemo(
    () =>
      votes.reduce<Record<string, VoteRow[]>>((accumulator, vote) => {
        if (!accumulator[vote.proposal_id]) accumulator[vote.proposal_id] = [];
        accumulator[vote.proposal_id].push(vote);
        return accumulator;
      }, {}),
    [votes],
  );
  const implementationsByProposal = useMemo(
    () =>
      implementations.reduce<Record<string, ProposalImplementationRow[]>>((accumulator, implementation) => {
        if (!accumulator[implementation.proposal_id]) accumulator[implementation.proposal_id] = [];
        accumulator[implementation.proposal_id].push(implementation);
        return accumulator;
      }, {}),
    [implementations],
  );
  const unitsById = useMemo(
    () => Object.fromEntries(executionUnits.map((unit) => [unit.id, unit])) as Record<string, GovernanceExecutionUnitRow>,
    [executionUnits],
  );
  const unitsByKey = useMemo(
    () => Object.fromEntries(executionUnits.map((unit) => [unit.unit_key, unit])) as Record<string, GovernanceExecutionUnitRow>,
    [executionUnits],
  );
  const membershipsByUnit = useMemo(
    () =>
      unitMemberships.reduce<Record<string, ExecutionUnitMembershipRow[]>>((accumulator, membership) => {
        if (!accumulator[membership.unit_id]) accumulator[membership.unit_id] = [];
        accumulator[membership.unit_id].push(membership);
        return accumulator;
      }, {}),
    [unitMemberships],
  );
  const profileDirectoryById = useMemo(
    () => Object.fromEntries(profileDirectory.map((entry) => [entry.id, entry])) as Record<string, ProfileDirectoryRow>,
    [profileDirectory],
  );
  const currentUserUnitIds = useMemo(
    () => new Set(unitMemberships.filter((membership) => membership.profile_id === profile?.id).map((membership) => membership.unit_id)),
    [profile?.id, unitMemberships],
  );
  const governanceExecutionTasks = useMemo(() => {
    if (!profile?.id || backendUnavailable || loadingHub) return [];
    return buildGovernanceExecutionTasksForUser({
      implementations,
      proposalsById,
      unitsById,
      currentUserUnitIds,
    });
  }, [backendUnavailable, currentUserUnitIds, implementations, loadingHub, profile?.id, proposalsById, unitsById]);
  const contentItemsById = useMemo(
    () => Object.fromEntries(contentItems.map((item) => [item.id, item])) as Record<string, ContentItemRow>,
    [contentItems],
  );
  const studyCertificationOptions = useMemo(
    () => [
      {
        key: FOUNDATION_CERTIFICATION_ID,
        label: t('governanceHub.certifications.civicFoundations'),
      },
    ],
    [t],
  );
  const studyCertificationLabelByKey = useMemo(
    () =>
      Object.fromEntries(studyCertificationOptions.map((option) => [option.key, option.label])) as Record<string, string>,
    [studyCertificationOptions],
  );

  const currentUserVotes = useMemo(
    () =>
      votes.reduce<Record<string, VoteRow>>((accumulator, vote) => {
        if (vote.voter_id === profile?.id) accumulator[vote.proposal_id] = vote;
        return accumulator;
      }, {}),
    [profile?.id, votes],
  );
  const activeSanctions = useMemo(
    () => sanctions.filter((sanction) => isGovernanceSanctionCurrentlyActive(sanction)),
    [sanctions],
  );
  const proposalBlockedBySanction = useMemo(
    () => activeSanctions.some((sanction) => governanceSanctionBlocksScope(sanction, 'proposal_create')),
    [activeSanctions],
  );
  const voteBlockedBySanction = useMemo(
    () => activeSanctions.some((sanction) => governanceSanctionBlocksScope(sanction, 'vote')),
    [activeSanctions],
  );
  const executionBlockedBySanction = useMemo(
    () => activeSanctions.some((sanction) => governanceSanctionBlocksScope(sanction, 'execution')),
    [activeSanctions],
  );
  const openAppealsBySanctionId = useMemo(
    () =>
      appeals.reduce<Record<string, GovernanceSanctionAppealRow>>((accumulator, appeal) => {
        if (isAppealOpen(appeal.status) && !accumulator[appeal.sanction_id]) {
          accumulator[appeal.sanction_id] = appeal;
        }
        return accumulator;
      }, {}),
    [appeals],
  );
  const openProposalsCount = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'open').length,
    [proposals],
  );
  const proposalsNeedingMyVoteCount = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'open' && !currentUserVotes[proposal.id]).length,
    [currentUserVotes, proposals],
  );
  const pendingProposals = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'open'),
    [proposals],
  );
  const passedProposals = useMemo(
    () => proposals.filter((proposal) => proposal.status !== 'open'),
    [proposals],
  );
  const currentSuggestions = useMemo(
    () => pendingProposals.filter((proposal) => !currentUserVotes[proposal.id]).slice(0, 4),
    [currentUserVotes, pendingProposals],
  );

  const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat(language, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const formatProfileLabel = (entry: ProfileDirectoryRow) => {
    const name = entry.full_name?.trim() || entry.username?.trim() || t(`admin.roles.${entry.role}`);
    const statusBits = [
      entry.is_verified ? t('admin.users.verifiedBadge') : t('admin.users.unverifiedBadge'),
      entry.is_active_citizen ? t('admin.users.activeCitizenBadge') : t('governanceHub.notActiveCitizen'),
    ];
    return `${name} (${statusBits.join(' • ')})`;
  };
  const formatContentItemLabel = (item: ContentItemRow) => {
    const title = item.title?.trim() || `${item.content_type} • ${item.professional_domain}`;
    return `${title} (${item.review_status})`;
  };

  const handleCreateProposal = async () => {
    if (!profile?.id) {
      toast.error(t('governanceHub.proposeBlocked'));
      return;
    }

    if (proposalBlockedBySanction) {
      toast.error(t('governanceHub.proposeBlockedBySanction'));
      return;
    }

    if (!governanceEligibility.eligible) {
      toast.error(t('governanceHub.proposeBlocked'));
      return;
    }

    const title = proposalDraft.title.trim();
    const summary = proposalDraft.summary.trim();
    const body = proposalDraft.body.trim();

    if (!title || !summary || !body) {
      toast.error(t('governanceHub.requiredFields'));
      return;
    }

    if (!validateGovernanceExecutionDraft(proposalDraft.execution)) {
      toast.error(t('governanceHub.executionFieldsRequired'));
      return;
    }

    setCreatingProposal(true);

    const thresholdRule = resolveGovernanceExecutionThresholdRule({
      actionType: proposalDraft.execution.actionType,
      decisionClass: proposalDraft.decisionClass,
    });
    const timing = computeGovernanceTimingWindow({
      eligibleVoterCount: Math.max(eligibleCitizenCount, 1),
      minimumQuorum: thresholdRule.minQuorum,
      requireWaitWindow: thresholdRule.requiresWindowClose,
    });

    const executionMetadata = buildGovernanceProposalExecutionMetadata(proposalDraft.execution);

    const proposalInsert: Database['public']['Tables']['governance_proposals']['Insert'] = {
      title,
      summary,
      body,
      decision_class: proposalDraft.decisionClass,
      proposer_id: profile.id,
      proposal_type: getGovernanceProposalTypeForExecutionAction(proposalDraft.execution.actionType),
      eligible_voter_count_snapshot: timing.eligibleVoterCount,
      required_quorum: timing.requiredQuorum,
      bootstrap_mode: timing.bootstrapMode,
      opens_at: timing.opensAt,
      closes_at: timing.closesAt,
      approval_threshold: Math.max(0.5, thresholdRule.minApprovalShare),
      metadata: {
        created_from: 'citizen_governance_hub',
        wait_required: timing.waitRequired,
        execution_threshold: serializeGovernanceExecutionThresholdRule(thresholdRule),
        ...executionMetadata,
      },
    };

    const { data: createdProposal, error: proposalError } = await supabase
      .from('governance_proposals')
      .insert(proposalInsert)
      .select('*')
      .single();

    if (proposalError || !createdProposal) {
      console.error('Failed to create governance proposal:', proposalError);
      toast.error(t('governanceHub.createFailed'));
      setCreatingProposal(false);
      return;
    }

    const { error: eventError } = await supabase.from('governance_proposal_events').insert({
      proposal_id: createdProposal.id,
      actor_id: profile.id,
      event_type: 'proposal.created',
      payload: {
        decision_class: proposalDraft.decisionClass,
        bootstrap_mode: timing.bootstrapMode,
        eligible_voter_count_snapshot: timing.eligibleVoterCount,
        required_quorum: timing.requiredQuorum,
        approval_threshold: Math.max(0.5, thresholdRule.minApprovalShare),
        threshold_approval_class: thresholdRule.approvalClass,
        threshold_requires_window_close: thresholdRule.requiresWindowClose,
        execution_action_type: proposalDraft.execution.actionType,
      },
    });

    if (eventError) {
      console.error('Failed to record proposal creation event:', eventError);
    }

    if (timing.bootstrapMode) {
      const snapshot: Json = {
        governance_score: governanceScore,
        citizenship_status: effectiveCitizenshipStatus,
        is_verified: Boolean(profile.is_verified),
        is_active_citizen: Boolean(profile.is_active_citizen),
      };

      const { error: voteError } = await supabase.from('governance_proposal_votes').upsert(
        {
          proposal_id: createdProposal.id,
          voter_id: profile.id,
          choice: 'approve',
          weight: governanceEligibility.influenceWeight,
          rationale: t('governanceHub.bootstrapApprovalNote'),
          snapshot,
        },
        { onConflict: 'proposal_id,voter_id' },
      );

      if (voteError) {
        console.error('Failed to auto-cast bootstrap approval vote:', voteError);
      } else {
        await supabase.from('governance_proposal_events').insert({
          proposal_id: createdProposal.id,
          actor_id: profile.id,
          event_type: 'vote.recorded',
          payload: {
            choice: 'approve',
            auto_cast: true,
            bootstrap_mode: true,
          },
        });

        await finalizeProposalIfReady(
          createdProposal,
          [
            {
              id: '',
              proposal_id: createdProposal.id,
              voter_id: profile.id,
              choice: 'approve',
              weight: governanceEligibility.influenceWeight,
              rationale: t('governanceHub.bootstrapApprovalNote'),
              snapshot,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          profile.id,
          unitsByKey,
          [],
        );
      }
    }

    setProposalDraft(createEmptyGovernanceProposalDraft());
    toast.success(
      timing.bootstrapMode ? t('governanceHub.createdAndFinalized') : t('governanceHub.created'),
    );
    setCreatingProposal(false);
    await loadGovernanceHub();
  };

  const handleLoadAgreementsProposalTemplate = () => {
    const initiatorLabel = profile?.full_name?.trim() || profile?.username?.trim() || t('common.you');

    setProposalDraft({
      title: 'Civizen Agreements MVP and Governance Vote-Flow Test',
      summary:
        'Introduce digital agreement templates linked from Market into a dedicated Agreements workspace, then run this vote with Civi to validate the collective governance flow.',
      body: [
        'Initiator: ' + initiatorLabel,
        '',
        'Proposal objective',
        '- Launch a minimum viable Agreements module for buyer-seller and service-provider agreements in Civizen.',
        '- Keep Market as the discovery entry point, and route drafting/signing to Agreements workspace.',
        '- Use this proposal as a live test for multi-citizen voting (initiator + Civi).',
        '',
        'MVP scope',
        '- Add Agreement templates: Core, Product, and Service.',
        '- Allow both parties to edit permitted sections before signing.',
        '- Add status lifecycle: draft, pending_counterparty, signed, cancelled.',
        '- Capture digital signatures, timestamp, signer ids, and immutable signed snapshot.',
        '- Link each agreement record back to a Market listing when started from Market.',
        '',
        'UX flow',
        '- User discovers listing in Market and taps Start agreement.',
        '- System opens prefilled agreement draft in Agreements workspace.',
        '- Both parties review/edit terms and sign digitally.',
        '- Signed agreement appears in both parties history with audit trail.',
        '',
        'Governance acceptance criteria',
        '- This proposal remains open long enough for both me and Civi to vote.',
        '- Both votes are visible in Governance > Proposals tally and event history.',
        '- Proposal can finalize according to quorum/threshold rules without errors.',
        '- Final decision summary is recorded and visible in proposal details.',
      ].join('\n'),
      decisionClass: 'ordinary',
      execution: {
        ...createEmptyGovernanceProposalDraft().execution,
        actionType: 'manual_follow_through',
        notes:
          'After approval, implement Agreements MVP with Market entry integration and run vote-flow QA with initiator and Civi accounts.',
      },
    });
  };

  const handleVote = async (proposal: ProposalRow, choice: Database['public']['Enums']['governance_vote_choice']) => {
    if (!profile?.id) {
      toast.error(t('governanceHub.voteBlocked'));
      return;
    }

    if (voteBlockedBySanction) {
      toast.error(t('governanceHub.voteBlockedBySanction'));
      return;
    }

    if (!governanceEligibility.eligible) {
      toast.error(t('governanceHub.voteBlocked'));
      return;
    }

    setVotingProposalId(proposal.id);

    const snapshot: Json = {
      governance_score: governanceScore,
      citizenship_status: effectiveCitizenshipStatus,
      is_verified: Boolean(profile.is_verified),
      is_active_citizen: Boolean(profile.is_active_citizen),
    };

    const { error: voteError } = await supabase.from('governance_proposal_votes').upsert(
      {
        proposal_id: proposal.id,
        voter_id: profile.id,
        choice,
        weight: governanceEligibility.influenceWeight,
        rationale: null,
        snapshot,
      },
      { onConflict: 'proposal_id,voter_id' },
    );

    if (voteError) {
      console.error('Failed to record governance vote:', voteError);
      toast.error(t('governanceHub.voteFailed'));
      setVotingProposalId(null);
      return;
    }

    const { error: eventError } = await supabase.from('governance_proposal_events').insert({
      proposal_id: proposal.id,
      actor_id: profile.id,
      event_type: 'vote.recorded',
      payload: {
        choice,
        weight: governanceEligibility.influenceWeight,
      },
    });

    if (eventError) {
      console.error('Failed to record governance vote event:', eventError);
    }

    const { data: refreshedVotes, error: refreshedVotesError } = await supabase
      .from('governance_proposal_votes')
      .select('*')
      .eq('proposal_id', proposal.id);

    if (!refreshedVotesError) {
      await finalizeProposalIfReady(
        proposal,
        refreshedVotes ?? [],
        profile.id,
        unitsByKey,
        implementationsByProposal[proposal.id] || [],
      );
    }

    toast.success(t('governanceHub.voteRecorded', { choice: t(getGovernanceVoteChoiceLabelKey(choice)) }));
    setVotingProposalId(null);
    await loadGovernanceHub();
  };

  const handleExecuteImplementation = async (proposal: ProposalRow, implementation: ProposalImplementationRow) => {
    if (executionBlockedBySanction) {
      toast.error(t('governanceHub.executeBlockedBySanction'));
      return;
    }

    if (!profile?.id || !currentUserUnitIds.has(implementation.unit_id)) {
      toast.error(t('governanceHub.executeBlocked'));
      return;
    }

    const executionSpec = readGovernanceProposalExecutionSpec(proposal.metadata);
    if (!executionSpec.autoExecutable) {
      toast.error(t('governanceHub.executeManualOnly'));
      return;
    }

    const { data: executionReady, error: executionReadyError } = await supabase.rpc('governance_proposal_is_execution_ready', {
      target_proposal_id: proposal.id,
    });
    if (executionReadyError) {
      console.error('Failed to evaluate governance execution readiness:', executionReadyError);
      toast.error(t('governanceHub.executeFailed'));
      return;
    }
    if (!executionReady) {
      const detail = await resolveGovernanceExecutionNotReadyMessage(proposal.id, t);
      toast.error(detail);
      return;
    }

    setExecutingImplementationId(implementation.id);

    const startedAt = new Date().toISOString();
    const mergedStartingMetadata = {
      ...((implementation.metadata as Record<string, unknown> | null) || {}),
      execution_action_type: executionSpec.actionType,
      last_started_at: startedAt,
    };

    const { error: startError } = await supabase
      .from('governance_proposal_implementations')
      .update({
        status: 'in_progress',
        started_at: startedAt,
        metadata: mergedStartingMetadata,
      })
      .eq('id', implementation.id);

    if (startError) {
      console.error('Failed to mark governance implementation as in progress:', startError);
      toast.error(t('governanceHub.executeFailed'));
      setExecutingImplementationId(null);
      return;
    }

    await supabase.from('governance_proposal_events').insert({
      proposal_id: proposal.id,
      actor_id: profile.id,
      event_type: 'implementation.started',
      payload: {
        implementation_id: implementation.id,
        unit_id: implementation.unit_id,
        action_type: executionSpec.actionType,
      },
    });

    const executionResult = await applyGovernanceProposalExecution({
      client: supabase,
      spec: executionSpec,
      actorId: profile.id,
      unitsByKey,
    });

    const completedAt = executionResult.status === 'completed' ? new Date().toISOString() : null;
    const mergedResultMetadata = {
      ...mergedStartingMetadata,
      last_execution_status: executionResult.status,
      last_execution_summary: executionResult.summary,
      last_execution_details: executionResult.details,
      last_completed_at: completedAt,
    };

    const { error: finalizeError } = await supabase
      .from('governance_proposal_implementations')
      .update({
        status: executionResult.status,
        completed_at: completedAt,
        metadata: mergedResultMetadata,
      })
      .eq('id', implementation.id);

    if (finalizeError) {
      console.error('Failed to finalize governance implementation execution:', finalizeError);
      toast.error(t('governanceHub.executeFailed'));
      setExecutingImplementationId(null);
      await loadGovernanceHub();
      return;
    }

    const eventType = executionResult.status === 'completed' ? 'implementation.completed' : 'implementation.blocked';

    await Promise.all([
      supabase.from('governance_proposal_events').insert({
        proposal_id: proposal.id,
        actor_id: profile.id,
        event_type: eventType,
        payload: {
          implementation_id: implementation.id,
          unit_id: implementation.unit_id,
          action_type: executionSpec.actionType,
          status: executionResult.status,
          summary: executionResult.summary,
          details: executionResult.details,
        },
      }),
      supabase.from('governance_implementation_logs').insert({
        implementation_id: implementation.id,
        proposal_id: proposal.id,
        actor_id: profile.id,
        execution_status: executionResult.status,
        execution_summary: executionResult.summary,
        details: executionResult.details,
      }),
    ]);

    toast.success(
      executionResult.status === 'completed'
        ? t('governanceHub.executeCompleted')
        : t('governanceHub.executeBlockedResult'),
    );
    setExecutingImplementationId(null);
    await loadGovernanceHub();
  };

  const handleSubmitAppeal = async (sanction: GovernanceSanctionRow) => {
    if (!profile?.id) return;
    if (openAppealsBySanctionId[sanction.id]) {
      toast.error(t('governanceHub.appealAlreadyOpen'));
      return;
    }

    const draft = appealDraftBySanctionId[sanction.id] || { reason: '', evidence: '' };
    if (!draft.reason.trim()) {
      toast.error(t('governanceHub.appealReasonRequired'));
      return;
    }

    setSubmittingAppealForSanctionId(sanction.id);

    const { error } = await supabase
      .from('governance_sanction_appeals')
      .insert({
        sanction_id: sanction.id,
        profile_id: profile.id,
        appeal_reason: draft.reason.trim(),
        evidence_notes: draft.evidence.trim() || null,
      });

    if (error) {
      console.error('Failed to submit governance sanction appeal:', error);
      toast.error(t('governanceHub.appealSubmitFailed'));
      setSubmittingAppealForSanctionId(null);
      return;
    }

    setAppealDraftBySanctionId((current) => ({
      ...current,
      [sanction.id]: { reason: '', evidence: '' },
    }));
    toast.success(t('governanceHub.appealSubmitted'));
    setSubmittingAppealForSanctionId(null);
    await loadSanctionsAndAppeals();
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-6.5rem)] overflow-hidden px-3 py-3">
        <div className="flex h-full flex-col gap-4">
          <AppPageHeader
              title={t('governanceHub.title')}
              subtitle={<WorldCitizenshipStatusNotice className="max-w-xl" />}
              leading={
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Landmark className="h-4 w-4" />
                </div>
              }
              titleClassName="text-xl"
              actions={
                <TooltipProvider>
                  <div className="flex gap-2">
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" asChild>
                      <Link to="/search?tab=people" aria-label={t('common.search')}>
                        <Search className="h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="hidden gap-2 md:flex">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={governanceEligibility.eligible ? 'secondary' : 'outline'}>
                            {governanceEligibility.eligible ? t('governanceHub.eligible') : t('governanceHub.ineligible')}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{t('governanceHub.requirementsTitle')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={profile?.is_active_citizen ? 'secondary' : 'outline'}>
                            {profile?.is_active_citizen ? t('admin.users.activeCitizenBadge') : t('governanceHub.notActiveCitizen')}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{t('governanceHub.cards.eligibleCitizens')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </TooltipProvider>
              }
            />

          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Button
              size="sm"
              variant={mobilePane === 'board' ? 'secondary' : 'outline'}
              onClick={() => setMobilePane('board')}
            >
              Participate
            </Button>
            <Button
              size="sm"
              variant={mobilePane === 'workspace' ? 'secondary' : 'outline'}
              onClick={() => setMobilePane('workspace')}
            >
              Workspace
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-12">
            <div className={`min-h-0 space-y-3 overflow-y-auto pr-1 md:col-span-4 ${mobilePane === 'board' ? 'hidden md:block' : ''}`}>
              <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('governanceHub.cards.score')}</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{loadingEligibility ? '—' : governanceScore?.toFixed(1) ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('governanceHub.cards.mode')}</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {eligibleCitizenCount <= 1 ? t('governanceHub.bootstrapMode') : t('governanceHub.collectiveMode')}
                    </p>
                  </div>
                </div>
                {!governanceEligibility.eligible ? (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {requirementMessages.slice(0, 1).map((message) => <p key={message}>• {message}</p>)}
                  </div>
                ) : null}
              </Card>

              <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">{t('settings.civicVotingTitle')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings.civicVotingDescription')}</p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" asChild>
                    <Link to="/governance/voting">{t('civicVoting.title')}</Link>
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <Link to="/governance" className="underline-offset-2 hover:underline">
                    {t('civicVoting.publicLanding.title')}
                  </Link>
                </p>
              </Card>

              <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Current suggestions</h2>
                  <Badge variant="outline">{currentSuggestions.length}</Badge>
                </div>
                <div className="space-y-2">
                  {currentSuggestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No suggestions right now.</p>
                  ) : (
                    currentSuggestions.map((proposal) => (
                      <a
                        key={proposal.id}
                        href={`#proposal-${proposal.id}`}
                        className="block rounded-xl border border-border/60 bg-background/70 p-2 text-sm hover:border-primary/50"
                      >
                        <p className="line-clamp-1 font-medium text-foreground">{proposal.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{proposal.summary}</p>
                      </a>
                    ))
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <Card className="rounded-xl border-border/60 bg-background/70 p-2 text-center shadow-none">
                    <p className="text-muted-foreground">Needs vote</p>
                    <p className="mt-0.5 text-base font-semibold text-foreground">{proposalsNeedingMyVoteCount}</p>
                  </Card>
                  <Card className="rounded-xl border-border/60 bg-background/70 p-2 text-center shadow-none">
                    <p className="text-muted-foreground">My tasks</p>
                    <p className="mt-0.5 text-base font-semibold text-foreground">{governanceExecutionTasks.length}</p>
                  </Card>
                  <Card className="rounded-xl border-border/60 bg-background/70 p-2 text-center shadow-none">
                    <p className="text-muted-foreground">Open</p>
                    <p className="mt-0.5 text-base font-semibold text-foreground">{openProposalsCount}</p>
                  </Card>
                </div>
              </Card>

              <details id="governance-create" className="rounded-2xl border border-border/60 p-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">Propose</summary>
                <div className="mt-3">
                  <div className="mb-2 flex justify-end">
                    <Button type="button" variant="outline" size="sm" disabled={!profile?.id} onClick={handleLoadAgreementsProposalTemplate}>
                      Load template
                    </Button>
                  </div>
                  <Suspense
                    fallback={(
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('common.loading')}</span>
                      </div>
                    )}
                  >
                    <GovernanceProposalComposer
                      draft={proposalDraft}
                      executionUnits={executionUnits}
                      profileDirectory={profileDirectory}
                      monetaryPolicyProfiles={monetaryPolicyProfiles}
                      contentItems={contentItems}
                      studyCertificationOptions={studyCertificationOptions}
                      creatingProposal={creatingProposal}
                      governanceEligible={governanceEligibility.eligible && !proposalBlockedBySanction}
                      backendUnavailable={backendUnavailable}
                      formatContentItemLabel={formatContentItemLabel}
                      formatProfileLabel={formatProfileLabel}
                      onCreate={() => void handleCreateProposal()}
                      onDraftChange={setProposalDraft}
                      t={t}
                    />
                  </Suspense>
                </div>
              </details>
            </div>

            <div id="governance-proposals" className={`min-h-0 space-y-3 md:col-span-8 ${mobilePane === 'workspace' ? 'hidden md:block' : ''}`}>
              <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-foreground">Participate</h2>
                  <div className="text-xs text-muted-foreground">
                    Pending: <span className="font-semibold text-foreground">{pendingProposals.length}</span>
                    {' · '}
                    Passed/Closed: <span className="font-semibold text-foreground">{passedProposals.length}</span>
                  </div>
                </div>
              </Card>

              <div className="grid h-[calc(100%-3.5rem)] min-h-0 gap-3 lg:grid-cols-2">
                <Card className="min-h-0 rounded-2xl border-border/60 p-3 shadow-sm">
                  <div className="mb-2">
                    <h3 className="text-base font-semibold text-foreground">Pending proposals</h3>
                  </div>
                  <div className="h-[calc(100%-2.25rem)] overflow-y-auto pr-1">
                    <GovernanceHubProposalsList
                      t={t}
                      formatDateTime={formatDateTime}
                      formatProfileLabel={formatProfileLabel}
                      formatContentItemLabel={formatContentItemLabel}
                      loadingHub={loadingHub}
                      backendUnavailable={backendUnavailable}
                      proposals={pendingProposals}
                      votesByProposal={votesByProposal}
                      currentUserVotes={currentUserVotes}
                      events={events}
                      implementationsByProposal={implementationsByProposal}
                      governanceEligible={governanceEligibility.eligible}
                      voteBlockedBySanction={voteBlockedBySanction}
                      votingProposalId={votingProposalId}
                      onVote={handleVote}
                      isGuardianSigner={isGuardianSigner}
                      profileId={profile?.id ?? null}
                      onGuardianSignoffUpdated={loadGovernanceHub}
                      unitsById={unitsById}
                      currentUserUnitIds={currentUserUnitIds}
                      executionBlockedBySanction={executionBlockedBySanction}
                      profileDirectoryById={profileDirectoryById}
                      monetaryPolicyProfiles={monetaryPolicyProfiles}
                      contentItemsById={contentItemsById}
                      studyCertificationLabelByKey={studyCertificationLabelByKey}
                      executingImplementationId={executingImplementationId}
                      onExecuteImplementation={handleExecuteImplementation}
                      showControls={false}
                      emptyLabel="No pending proposals."
                    />
                  </div>
                </Card>

                <Card className="min-h-0 rounded-2xl border-border/60 p-3 shadow-sm">
                  <div className="mb-2">
                    <h3 className="text-base font-semibold text-foreground">Passed and closed proposals</h3>
                  </div>
                  <div className="h-[calc(100%-2.25rem)] overflow-y-auto pr-1">
                    <GovernanceHubProposalsList
                      t={t}
                      formatDateTime={formatDateTime}
                      formatProfileLabel={formatProfileLabel}
                      formatContentItemLabel={formatContentItemLabel}
                      loadingHub={loadingHub}
                      backendUnavailable={backendUnavailable}
                      proposals={passedProposals}
                      votesByProposal={votesByProposal}
                      currentUserVotes={currentUserVotes}
                      events={events}
                      implementationsByProposal={implementationsByProposal}
                      governanceEligible={governanceEligibility.eligible}
                      voteBlockedBySanction={voteBlockedBySanction}
                      votingProposalId={votingProposalId}
                      onVote={handleVote}
                      isGuardianSigner={isGuardianSigner}
                      profileId={profile?.id ?? null}
                      onGuardianSignoffUpdated={loadGovernanceHub}
                      unitsById={unitsById}
                      currentUserUnitIds={currentUserUnitIds}
                      executionBlockedBySanction={executionBlockedBySanction}
                      profileDirectoryById={profileDirectoryById}
                      monetaryPolicyProfiles={monetaryPolicyProfiles}
                      contentItemsById={contentItemsById}
                      studyCertificationLabelByKey={studyCertificationLabelByKey}
                      executingImplementationId={executingImplementationId}
                      onExecuteImplementation={handleExecuteImplementation}
                      showControls={false}
                      emptyLabel="No resolved proposals yet."
                    />
                  </div>
                </Card>
              </div>

              <GovernanceHubAdditionalDetailsPanel
                t={t}
                formatDateTime={formatDateTime}
                profileId={profile?.id}
                backendUnavailable={backendUnavailable}
                loadingHub={loadingHub}
                governanceVoteHistoryEntries={governanceVoteHistoryEntries}
                governanceExecutionTasks={governanceExecutionTasks}
                verifierFederationExecutionGate={verifierFederationExecutionGate}
                federationOpsGateMessages={federationOpsGateMessages}
                guardianRelayExecutionGate={guardianRelayExecutionGate}
                guardianRelayGateMessages={guardianRelayGateMessages}
                federationDistributionEscalationOpenPageCount={federationDistributionEscalationOpenPageCount}
                activationDemographicFeedEscalationOpenPageCount={activationDemographicFeedEscalationOpenPageCount}
                guardianRelayEscalationOpenPageCount={guardianRelayEscalationOpenPageCount}
                emergencyAccessOpsEscalationOpenPageCount={emergencyAccessOpsEscalationOpenPageCount}
                identityVerificationPresentation={identityVerificationPresentation}
                identityVerificationLoading={identityVerificationLoading}
                identityVerificationUnavailable={identityVerificationUnavailable}
                identityVerificationLoadFailed={identityVerificationLoadFailed}
                citizenActivationReviews={citizenActivationReviews}
                activationHubLoading={activationHubLoading}
                activationHubUnavailable={activationHubUnavailable}
                activationHubLoadFailed={activationHubLoadFailed}
                sanctionsBackendUnavailable={sanctionsBackendUnavailable}
                activeSanctions={activeSanctions}
                openAppealsBySanctionId={openAppealsBySanctionId}
                appealDraftBySanctionId={appealDraftBySanctionId}
                setAppealDraftBySanctionId={setAppealDraftBySanctionId}
                submittingAppealForSanctionId={submittingAppealForSanctionId}
                onSubmitAppeal={handleSubmitAppeal}
                appeals={appeals}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

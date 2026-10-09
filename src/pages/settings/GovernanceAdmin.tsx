import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Landmark } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  clearStoredCitizenSigningKey,
  formatCitizenSigningFingerprint,
  generateCitizenSigningKey,
  readStoredCitizenSigningKey,
  storeCitizenSigningKey,
} from '@/lib/governance-signing';
import {
  MIN_GOVERNANCE_SCORE,
  evaluateGovernanceEligibility,
  isNativeGovernanceApp,
  normalizeGovernanceScoreForRole,
  type GovernanceEligibilityReason,
} from '@/lib/governance-eligibility';
import {
  persistGovernanceEligibilitySnapshot,
  stampGovernanceEligibilitySnapshot,
  sameGovernanceEligibilitySnapshot,
  type GovernanceEligibilitySnapshotPayload,
} from '@/lib/governance-eligibility-snapshots';
import { isMissingMaturityBackend } from '@/lib/governance-admin-backend';
import { coerceCitizenshipStatus, deriveProjectedCitizenshipStatus } from '@/lib/civic-status';
import { calculateCivizenScore } from '@/lib/scoring';
import type { PillarId } from '@/lib/constants';
import { GovernanceEligibilityCard } from '@/components/governance/GovernanceEligibilityCard';
import { GovernanceKeyManagerCard } from '@/components/governance/GovernanceKeyManagerCard';
import { GovernanceMaturityReviewCard } from '@/components/governance/GovernanceMaturityReviewCard';
import { GovernanceProgramReadinessCard } from '@/components/governance/GovernanceProgramReadinessCard';
import { GovernanceGuardianMultisigCard } from '@/components/governance/GovernanceGuardianMultisigCard';
import { GovernancePublicAuditAnchoringCard } from '@/components/governance/GovernancePublicAuditAnchoringCard';
import type {
  GovernanceDomainMaturitySnapshotRow,
  GovernanceDomainMaturityTransitionRow,
  GovernanceDomainRow,
} from '@/lib/governance-maturity';
import { useGovernanceActivationReview } from '@/lib/use-governance-activation-review';
import { useGovernanceGuardianMultisig } from '@/lib/use-governance-guardian-multisig';
import { useGovernancePublicAuditAnchoring } from '@/lib/use-governance-public-audit-anchoring';

export default function GovernanceAdmin() {
  const location = useLocation();
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();

  const loadingRemoteState = false;
  const [governanceScore, setGovernanceScore] = useState<number | null>(null);
  const [governanceEndorsementCount, setGovernanceEndorsementCount] = useState(0);
  const [loadingGovernanceEligibility, setLoadingGovernanceEligibility] = useState(true);
  const [governanceEligibilityUnavailable, setGovernanceEligibilityUnavailable] = useState(false);
  const [generatingCitizenKey, setGeneratingCitizenKey] = useState(false);
  const [hasLocalCitizenKey, setHasLocalCitizenKey] = useState(false);
  const [citizenKeyMismatch, setCitizenKeyMismatch] = useState(false);
  const [governanceIntentBackendUnavailable, setGovernanceIntentBackendUnavailable] = useState(false);
  const [loadingMaturityReview, setLoadingMaturityReview] = useState(true);
  const [maturityBackendUnavailable, setMaturityBackendUnavailable] = useState(false);
  const [refreshingAllMaturitySnapshots, setRefreshingAllMaturitySnapshots] = useState(false);
  const [refreshingDomainMaturityKey, setRefreshingDomainMaturityKey] = useState<string | null>(null);
  const [maturityDomains, setMaturityDomains] = useState<GovernanceDomainRow[]>([]);
  const [latestMaturitySnapshotsByDomain, setLatestMaturitySnapshotsByDomain] = useState<
    Record<string, GovernanceDomainMaturitySnapshotRow | undefined>
  >({});
  const [latestMaturityTransitionsByDomain, setLatestMaturityTransitionsByDomain] = useState<
    Record<string, GovernanceDomainMaturityTransitionRow | undefined>
  >({});
  const [recentMaturityTransitions, setRecentMaturityTransitions] = useState<GovernanceDomainMaturityTransitionRow[]>([]);
  const lastEligibilitySnapshotRef = useRef<GovernanceEligibilitySnapshotPayload | null>(null);
  const isNativeMobileGovernanceDevice = useMemo(() => isNativeGovernanceApp(), []);
  const citizenKeyFingerprint = useMemo(
    () => formatCitizenSigningFingerprint(profile?.citizen_signing_public_key ?? null),
    [profile?.citizen_signing_public_key],
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
  const governanceRequirementMessages = useMemo(() => {
    const messageByReason: Record<GovernanceEligibilityReason, string> = {
      mobile_app_required: t('governance.requirementMobile'),
      verified_required: t('governance.requirementVerified'),
      minimum_score_required: t('governance.requirementScore'),
      score_unavailable: t('governance.requirementScoreUnavailable'),
    };

    return governanceEligibility.reasons.map((reason) => messageByReason[reason]);
  }, [governanceEligibility.reasons, t]);
  const projectedCitizenshipStatus = useMemo(
    () => deriveProjectedCitizenshipStatus(profile?.role, Boolean(profile?.is_verified)),
    [profile?.is_verified, profile?.role],
  );
  const effectiveCitizenshipStatus = useMemo(
    () => coerceCitizenshipStatus(profile?.citizenship_status, projectedCitizenshipStatus),
    [profile?.citizenship_status, projectedCitizenshipStatus],
  );
  const governanceEligibilitySnapshot = useMemo<GovernanceEligibilitySnapshotPayload | null>(() => {
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
  const {
    loadingActivationReview,
    activationReviewBackendUnavailable,
    recordingActivationDecisionReviewId,
    activationReviews,
    latestActivationEvidenceByReviewId,
    latestActivationDecisionByReviewId,
    handleRecordActivationDecision,
  } = useGovernanceActivationReview({ profileId: profile?.id });
  const {
    loadingGuardianMultisig,
    guardianMultisigBackendUnavailable,
    savingGuardianPolicy,
    addingGuardianSigner,
    togglingSignerId,
    guardianPolicy,
    guardianSigners,
    activeSignerCount,
    saveGuardianPolicy,
    addGuardianSigner,
    setGuardianSignerActive,
    refreshGuardianMultisig,
  } = useGovernanceGuardianMultisig({ profileId: profile?.id });
  const {
    loadingPublicAudit,
    publicAuditBackendUnavailable,
    creatingPublicAuditBatch,
    recordingPublicAuditAnchor,
    publicAuditBatches,
    publicAuditChainStatus,
    publicAuditAnchorNetwork,
    publicAuditAnchorReference,
    setPublicAuditAnchorNetwork,
    setPublicAuditAnchorReference,
    handleCapturePublicAuditBatch,
    handleRecordLatestPublicAuditAnchor,
  } = useGovernancePublicAuditAnchoring({ profileId: profile?.id });

  const refreshCitizenKeyStatus = useCallback(() => {
    if (!profile?.id) {
      setHasLocalCitizenKey(false);
      setCitizenKeyMismatch(false);
      return;
    }

    const localKey = readStoredCitizenSigningKey(profile.id);
    const registeredPublicKey = profile.citizen_signing_public_key ?? null;
    const localPublicKey = localKey?.publicKey ?? null;

    setHasLocalCitizenKey(Boolean(localKey));
    setCitizenKeyMismatch(Boolean(registeredPublicKey && localPublicKey && registeredPublicKey !== localPublicKey));
  }, [profile?.citizen_signing_public_key, profile?.id]);

  useEffect(() => {
    refreshCitizenKeyStatus();
  }, [refreshCitizenKeyStatus]);

  useEffect(() => {
    const hash = location.hash;
    const isProgramReadinessHash =
      hash === '#stewardship-program-readiness' || hash === '#stewardship-activation-review';
    if (hash !== '#stewardship-public-audit-tools' && !isProgramReadinessHash) {
      return;
    }

    const targetId = isProgramReadinessHash
      ? 'stewardship-program-readiness'
      : 'stewardship-public-audit-tools';

    const scrollToTarget = () => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    scrollToTarget();
    const retryId = window.setTimeout(scrollToTarget, 320);
    return () => window.clearTimeout(retryId);
  }, [
    location.hash,
    location.pathname,
    loadingActivationReview,
    loadingPublicAudit,
    loadingRemoteState,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadGovernanceEligibility = async () => {
      if (!profile?.id) {
        setGovernanceScore(null);
        setGovernanceEndorsementCount(0);
        setGovernanceEligibilityUnavailable(false);
        setLoadingGovernanceEligibility(false);
        return;
      }

      setLoadingGovernanceEligibility(true);

      const { data, error } = await supabase
        .from('endorsements')
        .select('id, endorser_id, endorsed_id, pillar, stars, comment, created_at')
        .eq('endorsed_id', profile.id)
        .eq('is_hidden', false);

      if (cancelled) return;

      if (error) {
        console.error('Failed to load governance eligibility score:', error);
        setGovernanceScore(null);
        setGovernanceEndorsementCount(0);
        setGovernanceEligibilityUnavailable(true);
        setLoadingGovernanceEligibility(false);
        return;
      }

      const typedEndorsements = (data ?? []).map((item) => ({
        ...item,
        pillar: item.pillar as PillarId,
      }));
      const computedScore = calculateCivizenScore(typedEndorsements);
      const normalizedScore = normalizeGovernanceScoreForRole(profile.role, computedScore.overall);

      setGovernanceScore(normalizedScore);
      setGovernanceEndorsementCount(computedScore.totalEndorsements);
      setGovernanceEligibilityUnavailable(false);
      setLoadingGovernanceEligibility(false);
    };

    void loadGovernanceEligibility();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    if (!profile?.id || loadingGovernanceEligibility || governanceEligibilityUnavailable || !governanceEligibilitySnapshot) {
      return;
    }

    if (
      lastEligibilitySnapshotRef.current
      && sameGovernanceEligibilitySnapshot(lastEligibilitySnapshotRef.current, governanceEligibilitySnapshot)
    ) {
      return;
    }

    let cancelled = false;

    const syncGovernanceEligibilitySnapshot = async () => {
      const payload = stampGovernanceEligibilitySnapshot(governanceEligibilitySnapshot);

      const { error } = await persistGovernanceEligibilitySnapshot(supabase, payload, { effectivePermissions: profile?.effective_permissions ?? [] });

      if (cancelled) return;

      if (error) {
        console.error('Failed to persist governance eligibility snapshot:', error);
        return;
      }

      lastEligibilitySnapshotRef.current = payload;

      const profileEligibilityChanged = profile.is_governance_eligible !== payload.eligible;
      const profileEligibilityTimestampMissing = payload.eligible && !profile.governance_eligible_at;

      if (profileEligibilityChanged || profileEligibilityTimestampMissing) {
        await refreshProfile();
      }
    };

    void syncGovernanceEligibilitySnapshot();

    return () => {
      cancelled = true;
    };
  }, [
    governanceEligibilitySnapshot,
    governanceEligibilityUnavailable,
    loadingGovernanceEligibility,
    profile?.governance_eligible_at,
    profile?.id,
    profile?.is_governance_eligible,
    refreshProfile,
  ]);

  const loadMaturityReview = useCallback(async () => {
    setLoadingMaturityReview(true);

    const scheduledRefreshResponse = await supabase.rpc('capture_scheduled_governance_domain_maturity_snapshots', {
      max_snapshot_age: '12 hours',
      snapshot_source: 'steward_console_refresh',
      snapshot_notes: 'Stale snapshot refresh triggered from governance admin maturity panel',
    });

    if (isMissingMaturityBackend(scheduledRefreshResponse.error)) {
      setMaturityBackendUnavailable(true);
      setLoadingMaturityReview(false);
      return;
    }

    if (scheduledRefreshResponse.error) {
      console.error('Failed to run scheduled maturity refresh helper:', scheduledRefreshResponse.error);
    }

    const [domainsResponse, snapshotsResponse, transitionsResponse] = await Promise.all([
      supabase
        .from('governance_domains')
        .select('*')
        .eq('is_active', true)
        .order('domain_key', { ascending: true }),
      supabase
        .from('governance_domain_maturity_snapshots')
        .select('*')
        .order('measured_at', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('governance_domain_maturity_transitions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80),
    ]);

    const sharedError = domainsResponse.error || snapshotsResponse.error || transitionsResponse.error;
    if (isMissingMaturityBackend(sharedError)) {
      setMaturityBackendUnavailable(true);
      setLoadingMaturityReview(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load maturity review data:', {
        domainsError: domainsResponse.error,
        snapshotsError: snapshotsResponse.error,
        transitionsError: transitionsResponse.error,
      });
      toast.error('Could not load domain maturity review data.');
      setLoadingMaturityReview(false);
      return;
    }

    const domains = domainsResponse.data ?? [];
    const snapshots = snapshotsResponse.data ?? [];
    const transitions = transitionsResponse.data ?? [];

    const latestSnapshots = snapshots.reduce<Record<string, GovernanceDomainMaturitySnapshotRow>>((accumulator, snapshot) => {
      if (!accumulator[snapshot.domain_key]) {
        accumulator[snapshot.domain_key] = snapshot;
      }
      return accumulator;
    }, {});

    const latestTransitions = transitions.reduce<Record<string, GovernanceDomainMaturityTransitionRow>>((accumulator, transition) => {
      if (!accumulator[transition.domain_key]) {
        accumulator[transition.domain_key] = transition;
      }
      return accumulator;
    }, {});

    setMaturityDomains(domains);
    setLatestMaturitySnapshotsByDomain(latestSnapshots);
    setLatestMaturityTransitionsByDomain(latestTransitions);
    setRecentMaturityTransitions(transitions);
    setMaturityBackendUnavailable(false);
    setLoadingMaturityReview(false);
  }, []);

  useEffect(() => {
    void loadMaturityReview();
  }, [loadMaturityReview]);

  const handleRefreshAllMaturitySnapshots = useCallback(async () => {
    if (!profile?.id || maturityBackendUnavailable) return;

    setRefreshingAllMaturitySnapshots(true);

    const { error } = await supabase.rpc('capture_all_governance_domain_maturity_snapshots', {
      snapshot_source: 'steward_manual_refresh',
      measured_by_profile_id: profile.id,
      snapshot_notes: 'Manual snapshot refresh from governance admin maturity panel',
    });

    if (error) {
      console.error('Failed to refresh all maturity snapshots:', error);
      toast.error('Could not refresh domain maturity snapshots.');
      setRefreshingAllMaturitySnapshots(false);
      return;
    }

    await loadMaturityReview();
    setRefreshingAllMaturitySnapshots(false);
    toast.success('Domain maturity snapshots refreshed.');
  }, [loadMaturityReview, maturityBackendUnavailable, profile?.id]);

  const handleRefreshDomainMaturitySnapshot = useCallback(async (domainKey: string) => {
    if (!profile?.id || maturityBackendUnavailable) return;

    setRefreshingDomainMaturityKey(domainKey);

    const { error } = await supabase.rpc('capture_governance_domain_maturity_snapshot', {
      requested_domain_key: domainKey,
      snapshot_source: 'steward_manual_refresh',
      measured_by_profile_id: profile.id,
      snapshot_notes: `Manual snapshot refresh from governance admin maturity panel for ${domainKey}`,
    });

    if (error) {
      console.error('Failed to refresh domain maturity snapshot:', { domainKey, error });
      toast.error(`Could not refresh maturity snapshot for ${domainKey}.`);
      setRefreshingDomainMaturityKey(null);
      return;
    }

    await loadMaturityReview();
    setRefreshingDomainMaturityKey(null);
    toast.success(`Domain maturity snapshot refreshed for ${domainKey}.`);
  }, [loadMaturityReview, maturityBackendUnavailable, profile?.id]);

  const registerCitizenKey = useCallback(async () => {
    if (!profile?.id) return;

    setGeneratingCitizenKey(true);
    try {
      const signingKey = await generateCitizenSigningKey();
      storeCitizenSigningKey(profile.id, signingKey);

      const { error } = await supabase
        .from('profiles')
        .update({
          citizen_signing_public_key: signingKey.publicKey,
          citizen_signing_key_algorithm: signingKey.algorithm,
          citizen_signing_key_registered_at: signingKey.createdAt,
        })
        .eq('id', profile.id);

      if (error) {
        clearStoredCitizenSigningKey(profile.id);
        console.error('Failed to register citizen signing key:', error);
        toast.error(t('governance.keyRegisterFailed'));
        return;
      }

      await refreshProfile();
      refreshCitizenKeyStatus();
      toast.success(t('governance.keyRegisteredSuccess'));
    } catch (error) {
      console.error('Failed to generate citizen signing key:', error);
      toast.error(t('governance.keyRegisterFailed'));
    } finally {
      setGeneratingCitizenKey(false);
    }
  }, [profile?.id, refreshCitizenKeyStatus, refreshProfile, t]);

  const removeLocalCitizenKey = useCallback(() => {
    if (!profile?.id) return;
    clearStoredCitizenSigningKey(profile.id);
    refreshCitizenKeyStatus();
    toast.success(t('governance.keyRemovedSuccess'));
  }, [profile?.id, refreshCitizenKeyStatus, t]);

  const formatTimestamp = (value: string | null) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6 pb-24 md:pb-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <AppPageHeader
            title={t('governance.title')}
            subtitle={t('governance.subtitle')}
            fallbackPath="/settings"
            leading={
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
            }
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GovernanceEligibilityCard
            governanceEligibility={governanceEligibility}
            governanceEndorsementCount={governanceEndorsementCount}
            governanceRequirementMessages={governanceRequirementMessages}
            governanceScore={governanceScore}
            isNativeMobileGovernanceDevice={isNativeMobileGovernanceDevice}
            loadingGovernanceEligibility={loadingGovernanceEligibility}
            profileIsVerified={profile?.is_verified}
            t={t}
            governanceEligibilityUnavailable={governanceEligibilityUnavailable}
            minGovernanceScore={MIN_GOVERNANCE_SCORE}
          />

          <GovernanceKeyManagerCard
            citizenKeyFingerprint={citizenKeyFingerprint}
            citizenKeyMismatch={citizenKeyMismatch}
            generatingCitizenKey={generatingCitizenKey}
            governanceIntentBackendUnavailable={governanceIntentBackendUnavailable}
            hasLocalCitizenKey={hasLocalCitizenKey}
            profileId={profile?.id}
            registeredPublicKey={profile?.citizen_signing_public_key}
            t={t}
            onRegisterCitizenKey={() => void registerCitizenKey()}
            onRemoveLocalCitizenKey={removeLocalCitizenKey}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <GovernanceMaturityReviewCard
            domains={maturityDomains}
            latestSnapshotsByDomain={latestMaturitySnapshotsByDomain}
            latestTransitionsByDomain={latestMaturityTransitionsByDomain}
            recentTransitions={recentMaturityTransitions}
            loading={loadingMaturityReview}
            backendUnavailable={maturityBackendUnavailable}
            refreshingAll={refreshingAllMaturitySnapshots}
            refreshingDomainKey={refreshingDomainMaturityKey}
            formatTimestamp={formatTimestamp}
            onRefreshAll={() => void handleRefreshAllMaturitySnapshots()}
            onRefreshDomain={(domainKey) => void handleRefreshDomainMaturitySnapshot(domainKey)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <GovernanceProgramReadinessCard
            reviews={activationReviews}
            latestEvidenceByReviewId={latestActivationEvidenceByReviewId}
            latestDecisionByReviewId={latestActivationDecisionByReviewId}
            loading={loadingActivationReview}
            backendUnavailable={activationReviewBackendUnavailable}
            recordingDecisionReviewId={recordingActivationDecisionReviewId}
            formatTimestamp={formatTimestamp}
            onRecordDecision={(args) => void handleRecordActivationDecision(args)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <GovernanceGuardianMultisigCard
            loading={loadingGuardianMultisig}
            backendUnavailable={guardianMultisigBackendUnavailable}
            savingPolicy={savingGuardianPolicy}
            addingSigner={addingGuardianSigner}
            togglingSignerId={togglingSignerId}
            policy={guardianPolicy}
            signers={guardianSigners}
            activeSignerCount={activeSignerCount}
            formatTimestamp={formatTimestamp}
            onRefresh={() => void refreshGuardianMultisig()}
            onSavePolicy={(draft) => void saveGuardianPolicy(draft)}
            onAddSigner={(draft) => void addGuardianSigner(draft)}
            onSetSignerActive={(signerId, isActive) => void setGuardianSignerActive(signerId, isActive)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30 }}
        >
          <GovernancePublicAuditAnchoringCard
            batches={publicAuditBatches}
            chainStatus={publicAuditChainStatus}
            loading={loadingPublicAudit}
            backendUnavailable={publicAuditBackendUnavailable}
            creatingBatch={creatingPublicAuditBatch}
            recordingAnchor={recordingPublicAuditAnchor}
            anchorNetwork={publicAuditAnchorNetwork}
            anchorReference={publicAuditAnchorReference}
            formatTimestamp={formatTimestamp}
            onCreateBatch={() => void handleCapturePublicAuditBatch()}
            onRecordAnchor={() => void handleRecordLatestPublicAuditAnchor()}
            onAnchorNetworkChange={setPublicAuditAnchorNetwork}
            onAnchorReferenceChange={setPublicAuditAnchorReference}
          />
        </motion.div>
      </div>
    </AppLayout>
  );
}

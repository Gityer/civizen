import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { APP_RELEASE_ID, APP_VERSION, ANDROID_VERSION_CODE } from '@/lib/app-release';
import { advanceAssistedBallot, assertDistinctAssistedRoles, attestVotingClient, buildDuressVoidBallot, canSubmitChallenge, castConsultationBallot, checkBoothUnlockPin, checkConsultationReceipt, computeCoolingOffUntil, deriveDefaultChallengeWindow, electionTitleWithoutCountryLabel, enrollDuressPin, evaluateCivicVotingEligibility, evaluateSessionGates, isCoolingOffActive, isOrdinaryConsultationElection, loadCivicElectionCountryStats, loadCivicElectionDetail, loadCivicElectionPublicDirectory, loadCivicElectionPublicTallies, loadCivicElectionVerificationSplit, myConsultationBallot, myConsultationEligibility, myConsultationPublicPresence, openVoteWindow, remainingWindowSeconds, resolveVotingWindow, securityClassGatePolicy, setConsultationPublicPresence, toConsultationReasonCode, withdrawConsultationBallot, type CivicCountryStatRow, type CivicElectionSecurityClass, type CivicPublicDirectoryRow, type CivicPublicTallyRow, type CivicVerificationSplit, type CivicVerificationCheckKind, type CivicElectionDetail } from '@/lib/civic-voting';
import { MIN_GOVERNANCE_SCORE, isNativeGovernanceApp } from '@/lib/governance-eligibility';
import { toast } from 'sonner';
import { type DemoGateState, VOTING_MANIFEST } from '@/pages/governance/civic-voting-election/civic-voting-election-shared';

export function useCivicVotingElection() {
  const { electionId = '' } = useParams();
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const [detail, setDetail] = useState<CivicElectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [tallies, setTallies] = useState<CivicPublicTallyRow[]>([]);
  const [tallyTotal, setTallyTotal] = useState(0);
  const [tallyError, setTallyError] = useState<string | null>(null);
  const [countryStats, setCountryStats] = useState<CivicCountryStatRow[]>([]);
  const [directory, setDirectory] = useState<CivicPublicDirectoryRow[]>([]);
  const [verificationSplit, setVerificationSplit] = useState<CivicVerificationSplit | null>(null);
  const [directoryVisible, setDirectoryVisible] = useState(false);
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [myOption, setMyOption] = useState<string | null>(null);
  const [myOptions, setMyOptions] = useState<string[]>([]);
  const [myReceipt, setMyReceipt] = useState<string | null>(null);
  // D2: an unverified member's ballot is recorded as advisory; the eligibility call announces it up front.
  const [myBallotAdvisory, setMyBallotAdvisory] = useState(false);
  const [advisoryVoter, setAdvisoryVoter] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [casting, setCasting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const refreshPublicParticipation = async (id: string, signedIn: boolean) => {
    const [tallyResult, countryResult, directoryResult, splitResult] = await Promise.all([
      loadCivicElectionPublicTallies(id),
      loadCivicElectionCountryStats(id),
      loadCivicElectionPublicDirectory(id),
      loadCivicElectionVerificationSplit(id),
    ]);
    setVerificationSplit(splitResult);
    setTallies(tallyResult.tallies);
    setTallyTotal(tallyResult.totalCountable);
    setTallyError(tallyResult.error);
    setCountryStats(countryResult.rows);
    setDirectory(directoryResult.rows);
    if (signedIn) {
      const [ballot, visible, eligibility] = await Promise.all([
        myConsultationBallot(id),
        myConsultationPublicPresence(id),
        myConsultationEligibility(id),
      ]);
      setMyOption(ballot?.optionKey ?? null);
      setMyOptions(ballot?.optionKeys ?? []);
      setMyReceipt(ballot?.receipt ?? null);
      setMyBallotAdvisory(ballot?.advisory ?? false);
      setAdvisoryVoter(eligibility?.advisory ?? false);
      setDirectoryVisible(visible);
      setEligibilityReason(eligibility?.reason ?? null);
    } else {
      setMyOption(null);
      setMyOptions([]);
      setMyReceipt(null);
      setMyBallotAdvisory(false);
      setAdvisoryVoter(false);
      setDirectoryVisible(false);
      setEligibilityReason(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      const result = await loadCivicElectionDetail(electionId);
      if (cancelled) return;
      setDetail(result.detail);
      setDetailError(result.error);
      setDetailLoading(false);
      if (result.detail) {
        await refreshPublicParticipation(electionId, Boolean(user));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [electionId, user]);

  const securityClass: CivicElectionSecurityClass = detail?.election.securityClass ?? 'ordinary';
  const optionKeys = detail?.contests.flatMap((contest) =>
    contest.candidates.map((candidate) => candidate.optionKey),
  );
  const isConsultation = detail
    ? isOrdinaryConsultationElection(detail.election, optionKeys)
    : false;
  const votingWindow = detail ? resolveVotingWindow(detail.election) : null;
  const votingOpen = votingWindow?.state === 'open';
  const votingClosed = votingWindow?.state === 'closed';

  const explainError = (error: unknown, fallbackKey: string) => {
    const code = toConsultationReasonCode(error);
    if (code) return t(`civicBallot.reason.${code}`);
    return error instanceof Error && error.message ? error.message : t(fallbackKey);
  };

  const castConsultation = async (choice: string | string[]) => {
    if (!electionId || casting || withdrawing) return;
    const keys = Array.isArray(choice) ? choice : [choice];
    setCasting(true);
    try {
      const result = await castConsultationBallot(electionId, keys);
      setMyOption(keys[0] ?? null);
      setMyOptions(keys);
      setMyReceipt(result.receipt || null);
      setMyBallotAdvisory(advisoryVoter);
      toast.success(t(advisoryVoter ? 'civicBallot.advisorySaved' : 'civicVoting.proposals.castSaved'));
      await refreshPublicParticipation(electionId, true);
    } catch (error) {
      toast.error(explainError(error, 'civicVoting.proposals.castFailed'));
    } finally {
      setCasting(false);
    }
  };

  const withdrawConsultation = async () => {
    if (!electionId || casting || withdrawing) return;
    setWithdrawing(true);
    try {
      await withdrawConsultationBallot(electionId);
      setMyOption(null);
      setMyOptions([]);
      setMyReceipt(null);
      setMyBallotAdvisory(false);
      setDirectoryVisible(false);
      toast.success(t('civicVoting.proposals.withdrawn'));
      await refreshPublicParticipation(electionId, true);
    } catch (error) {
      toast.error(explainError(error, 'civicVoting.proposals.withdrawFailed'));
    } finally {
      setWithdrawing(false);
    }
  };

  const verifyReceipt = async () => {
    if (!electionId || !myReceipt) return;
    try {
      const included = await checkConsultationReceipt(electionId, myReceipt);
      if (included) toast.success(t('civicBallot.receiptIncluded'));
      else toast.error(t('civicBallot.receiptMissing'));
    } catch {
      toast.error(t('civicBallot.receiptCheckFailed'));
    }
  };

  const toggleDirectoryPresence = async (next: boolean) => {
    if (!electionId || directoryBusy) return;
    setDirectoryBusy(true);
    try {
      const visible = await setConsultationPublicPresence(electionId, next);
      setDirectoryVisible(visible);
      const directoryResult = await loadCivicElectionPublicDirectory(electionId);
      setDirectory(directoryResult.rows);
      toast.success(
        visible
          ? t('civicVoting.participation.directoryEnabled')
          : t('civicVoting.participation.directoryWithdrawn'),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('civicVoting.participation.directoryFailed'),
      );
    } finally {
      setDirectoryBusy(false);
    }
  };
  const title = detail?.election.title ?? t('civicVoting.unknownElection');
  const displayTitle = electionTitleWithoutCountryLabel(
    title,
    detail?.election.scopeCountryCode,
    language,
  );
  const policy = securityClassGatePolicy(securityClass);

  const homeChangedAt = useMemo(() => new Date(Date.now() - 12 * 60 * 60 * 1000), []);
  const coolingOffUntil = computeCoolingOffUntil({
    changedAt: homeChangedAt,
    securityClass,
    source: 'home_address_change',
  });
  const coolingOffActive = isCoolingOffActive({ now: new Date(), coolingOffUntil });

  const attestation = attestVotingClient({
    appVersion: APP_VERSION,
    appReleaseId: APP_RELEASE_ID,
    androidVersionCode: ANDROID_VERSION_CODE,
    packageFingerprint: 'demo-fingerprint',
    manifest: VOTING_MANIFEST,
  });

  const challengePeriod = deriveDefaultChallengeWindow({
    votingOpensAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    challengeDays: 7,
  });
  const challengeOpen = canSubmitChallenge(new Date(), challengePeriod);

  const eligibility = useMemo(
    () =>
      evaluateCivicVotingEligibility({
        isVerified: Boolean(profile?.is_verified),
        role: profile?.role,
        score:
          profile?.is_governance_eligible || profile?.is_verified ? MIN_GOVERNANCE_SCORE : null,
        isNativeMobileApp: isNativeGovernanceApp(),
        isOnEligibilityRoster: true,
        alreadyVoted: false,
        homeCoolingOffActive: false,
        clientAttestationFailed: !attestation.ok,
        securityClass,
      }),
    [attestation.ok, securityClass, profile?.is_governance_eligible, profile?.is_verified, profile?.role],
  );

  const [gates, setGates] = useState<DemoGateState>(() => {
    const initial = {} as DemoGateState;
    for (const kind of eligibility.requiredGates) {
      initial[kind] = kind === 'eligibility' ? eligibility.eligible : false;
    }
    return initial;
  });
  const [windowOpen, setWindowOpen] = useState(false);
  const [notifiedAt, setNotifiedAt] = useState<Date | null>(null);
  const [boothOpen, setBoothOpen] = useState(false);
  const [castComplete, setCastComplete] = useState(false);
  const [castWasDuress, setCastWasDuress] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [duressEnrollment, setDuressEnrollment] = useState<{ pinHash: string; pinSalt: string } | null>(
    null,
  );
  const [normalEnrollment, setNormalEnrollment] = useState<{ pinHash: string; pinSalt: string } | null>(
    null,
  );
  const [assistedStatus, setAssistedStatus] = useState<
    'draft' | 'awaiting_witness' | 'awaiting_steward' | 'accepted' | 'rejected' | 'voided'
  >('draft');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const voteWindow = notifiedAt ? openVoteWindow(notifiedAt, policy.primaryWindowSeconds) : null;
  const secondsLeft = voteWindow ? remainingWindowSeconds(new Date(), voteWindow) : 0;
  const gateList = eligibility.requiredGates.map((kind) => ({
    kind,
    passed: Boolean(gates[kind]),
  }));
  const { canOpenBooth, failed } = evaluateSessionGates(gateList);

  const startSimulatedWindow = () => {
    const now = new Date();
    setNotifiedAt(now);
    setWindowOpen(true);
    setBoothOpen(false);
    setCastComplete(false);
    setCastWasDuress(false);
    setGates((prev) => ({
      ...prev,
      eligibility: eligibility.eligible,
    }));
  };

  const toggleGate = (kind: CivicVerificationCheckKind) => {
    setGates((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const tryOpenBooth = () => {
    if (!windowOpen || secondsLeft <= 0) return;
    if (!canOpenBooth) return;
    setBoothOpen(true);
  };

  const enrollPins = async () => {
    const normal = await enrollDuressPin('135790', 'normal-demo-salt');
    const duress = await enrollDuressPin('246813', 'duress-demo-salt');
    setNormalEnrollment(normal);
    setDuressEnrollment(duress);
    setPinMessage(t('civicVoting.extras.pinsEnrolled'));
  };

  const unlockWithPin = async () => {
    if (!normalEnrollment || !duressEnrollment) {
      setPinMessage(t('civicVoting.extras.enrollPinsFirst'));
      return;
    }
    const result = await checkBoothUnlockPin({
      enteredPin: pinInput,
      normalPinHash: normalEnrollment.pinHash,
      normalPinSalt: normalEnrollment.pinSalt,
      duressPinHash: duressEnrollment.pinHash,
      duressPinSalt: duressEnrollment.pinSalt,
    });
    if (result.mode === 'invalid') {
      setPinMessage(t('civicVoting.extras.pinInvalid'));
      return;
    }
    setBoothOpen(true);
    setCastWasDuress(result.mode === 'duress');
    setPinMessage(t('civicVoting.extras.boothUnlocked'));
  };

  const castSimulatedBallot = async () => {
    if (castWasDuress) {
      await buildDuressVoidBallot({
        sessionId: 'demo-session',
        electionId,
      });
    }
    setCastComplete(true);
    setBoothOpen(false);
  };

  const runAssistedStep = (action: 'assistant_confirm' | 'witness_confirm' | 'steward_accept') => {
    const roles = {
      voterProfileId: profile?.id || 'voter',
      assistantProfileId: 'assistant-demo',
      witnessProfileId: 'witness-demo',
    };
    if (!assertDistinctAssistedRoles(roles).ok) return;
    const next = advanceAssistedBallot({ status: assistedStatus, action, roles });
    if (next.ok) setAssistedStatus(next.nextStatus);
  };

  return {
    detail, detailLoading, detailError, electionId, t, language, user, isConsultation, title,
    displayTitle, verificationSplit, tallies, tallyTotal, tallyError, countryStats, directory, directoryVisible,
    directoryBusy, myOption, myOptions, myReceipt, myBallotAdvisory, advisoryVoter, eligibilityReason, votingWindow, casting, withdrawing,
    votingOpen, votingClosed, castConsultation, withdrawConsultation, verifyReceipt, toggleDirectoryPresence, gates, windowOpen, boothOpen, castComplete,
    pinInput, setPinInput, assistedStatus, pinMessage, canOpenBooth, failed, policy,
    coolingOffUntil, coolingOffActive, attestation, challengeOpen, eligibility, secondsLeft,
    startSimulatedWindow, toggleGate, tryOpenBooth, enrollPins, unlockWithPin, castSimulatedBallot,
    runAssistedStep,
  };
}

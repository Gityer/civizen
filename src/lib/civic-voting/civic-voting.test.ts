// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  evaluateCivicVotingEligibility,
  evaluateFaceAndLiveness,
  evaluateSessionGates,
  evaluateSolitude,
  openVoteWindow,
  isWithinVoteWindow,
  remainingWindowSeconds,
  scheduleRetryAttempt,
  pickRandomHomePresenceTime,
  isInsideHomeGeofence,
  securityClassGatePolicy,
  recommendedSecurityClassForTier,
  hashVotingEvent,
  ballotInclusionCode,
  DEFAULT_PRIMARY_WINDOW_SECONDS,
  enrollDuressPin,
  checkBoothUnlockPin,
  buildDuressVoidBallot,
  computeObserverMetrics,
  sanitizeObserverPayload,
  evaluateRiskSignals,
  detectVelocityAnomaly,
  detectDeviceFarmSignal,
  detectIdenticalGpsCluster,
  detectImpossibleTravel,
  assertDistinctAssistedRoles,
  advanceAssistedBallot,
  assistedBallotIsCountable,
  deriveDefaultChallengeWindow,
  canSubmitChallenge,
  resolveChallenge,
  filterCandidatesAfterChallenges,
  computeCoolingOffUntil,
  isCoolingOffActive,
  remainingCoolingOffHours,
  attestVotingClient,
  buildVotingManifestFromRelease,
  releaseIdLooksReproducible,
  planCanvassSamples,
  advanceCanvassSample,
  sanitizeCanvassNotes,
  electionTitleWithoutCountryLabel,
} from './index';

describe('securityClassGatePolicy', () => {
  it('requires home, solitude, and face for constitutional contests', () => {
    const policy = securityClassGatePolicy('constitutional');
    expect(policy.requireHomePresence).toBe(true);
    expect(policy.requireSolitude).toBe(true);
    expect(policy.requireFaceLiveness).toBe(true);
    expect(policy.primaryWindowSeconds).toBe(DEFAULT_PRIMARY_WINDOW_SECONDS);
    expect(policy.maxAttempts).toBe(3);
    expect(policy.retrySpacingHours).toBe(48);
  });

  it('recommends constitutional for national executive offices', () => {
    expect(recommendedSecurityClassForTier('national', true)).toBe('constitutional');
    expect(recommendedSecurityClassForTier('local', false)).toBe('ordinary');
  });
});

describe('session windows', () => {
  it('opens a 5-minute vote window from notification time', () => {
    const notifiedAt = new Date('2026-07-31T18:00:00Z');
    const window = openVoteWindow(notifiedAt);
    expect(window.durationSeconds).toBe(300);
    expect(window.closesAt.toISOString()).toBe('2026-07-31T18:05:00.000Z');
    expect(isWithinVoteWindow(new Date('2026-07-31T18:02:00Z'), window)).toBe(true);
    expect(isWithinVoteWindow(new Date('2026-07-31T18:06:00Z'), window)).toBe(false);
    expect(remainingWindowSeconds(new Date('2026-07-31T18:03:00Z'), window)).toBe(120);
  });

  it('schedules retries every other day until attempts are exhausted', () => {
    const failedAt = new Date('2026-07-31T18:05:00Z');
    const votingClosesAt = new Date('2026-08-20T00:00:00Z');

    const first = scheduleRetryAttempt({
      failedAt,
      attemptNumber: 1,
      maxAttempts: 3,
      retrySpacingHours: 48,
      votingClosesAt,
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.attemptNumber).toBe(2);
      expect(first.scheduledFor.toISOString()).toBe('2026-08-02T18:05:00.000Z');
    }

    const exhausted = scheduleRetryAttempt({
      failedAt,
      attemptNumber: 3,
      maxAttempts: 3,
      retrySpacingHours: 48,
      votingClosesAt,
    });
    expect(exhausted).toEqual({ ok: false, reason: 'attempts_exhausted' });
  });

  it('rejects retries past election close', () => {
    const result = scheduleRetryAttempt({
      failedAt: new Date('2026-08-19T20:00:00Z'),
      attemptNumber: 1,
      maxAttempts: 3,
      retrySpacingHours: 48,
      votingClosesAt: new Date('2026-08-20T00:00:00Z'),
    });
    expect(result).toEqual({ ok: false, reason: 'past_election_close' });
  });

  it('picks a time inside the election window using presence slots', () => {
    const time = pickRandomHomePresenceTime({
      votingOpensAt: new Date('2026-08-01T00:00:00Z'),
      votingClosesAt: new Date('2026-08-10T00:00:00Z'),
      presenceSlots: [{ hourStart: 19, hourEnd: 22, probability: 0.8 }],
      random: () => 0.1,
    });
    expect(time.getTime()).toBeGreaterThanOrEqual(new Date('2026-08-01T00:00:00Z').getTime());
    expect(time.getTime()).toBeLessThan(new Date('2026-08-10T00:00:00Z').getTime());
  });

  it('detects home geofence membership', () => {
    const home = { latitude: 40.7128, longitude: -74.006 };
    expect(
      isInsideHomeGeofence({
        current: { latitude: 40.713, longitude: -74.0062 },
        home,
        radiusMeters: 120,
      }),
    ).toBe(true);
    expect(
      isInsideHomeGeofence({
        current: { latitude: 40.8, longitude: -74.0 },
        home,
        radiusMeters: 120,
      }),
    ).toBe(false);
  });
});

describe('eligibility and gates', () => {
  it('blocks unverified and non-native voters for constitutional elections', () => {
    const result = evaluateCivicVotingEligibility({
      isVerified: false,
      score: 80,
      isNativeMobileApp: false,
      securityClass: 'constitutional',
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('verified_required');
    expect(result.reasons).toContain('mobile_app_required');
    expect(result.requiredGates).toEqual(
      expect.arrayContaining(['location_home', 'solitude', 'liveness', 'face_match']),
    );
  });

  it('allows a verified native voter with roster membership', () => {
    const result = evaluateCivicVotingEligibility({
      isVerified: true,
      score: 80,
      isNativeMobileApp: true,
      isOnEligibilityRoster: true,
      alreadyVoted: false,
      securityClass: 'ordinary',
    });
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('requires all hard gates before opening the booth', () => {
    const { canOpenBooth, failed } = evaluateSessionGates([
      { kind: 'eligibility', passed: true },
      { kind: 'location_home', passed: false },
      { kind: 'solitude', passed: true },
      { kind: 'liveness', passed: true },
      { kind: 'face_match', passed: true },
    ]);
    expect(canOpenBooth).toBe(false);
    expect(failed).toEqual(['location_home']);
  });

  it('evaluates solitude and face/liveness signals', () => {
    expect(
      evaluateSolitude({
        faceCount: 1,
        dominantFaceConfidence: 0.9,
        secondaryFaceMaxConfidence: 0,
      }).alone,
    ).toBe(true);

    expect(
      evaluateSolitude({
        faceCount: 2,
        dominantFaceConfidence: 0.9,
        secondaryFaceMaxConfidence: 0.6,
      }).alone,
    ).toBe(false);

    expect(
      evaluateFaceAndLiveness({ matchScore: 0.91, livenessPassed: true }).passed,
    ).toBe(true);
    expect(
      evaluateFaceAndLiveness({ matchScore: 0.5, livenessPassed: true }).reasons,
    ).toContain('face_match_failed');
  });
});

describe('transparency hashing', () => {
  it('produces stable event and inclusion hashes', async () => {
    const hash = await hashVotingEvent({
      electionId: 'e1',
      sessionId: 's1',
      actorId: 'u1',
      eventType: 'session_notified',
      payload: { attempt: 1 },
      prevEventHash: null,
      createdAt: '2026-07-31T18:00:00.000Z',
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    const inclusion = await ballotInclusionCode('ballot-1', 'salt-xyz');
    expect(inclusion).toMatch(/^[a-f0-9]{64}$/);
    expect(inclusion).not.toEqual(hash);
  });
});

describe('duress PIN', () => {
  it('enrolls and matches a duress PIN without exposing it as a normal unlock', async () => {
    const enrolled = await enrollDuressPin('246813');
    const normal = await enrollDuressPin('135790', 'normal-salt');

    const duressCheck = await checkBoothUnlockPin({
      enteredPin: '246813',
      normalPinHash: normal.pinHash,
      normalPinSalt: normal.pinSalt,
      duressPinHash: enrolled.pinHash,
      duressPinSalt: enrolled.pinSalt,
    });
    expect(duressCheck).toEqual({ matched: true, mode: 'duress' });

    const normalCheck = await checkBoothUnlockPin({
      enteredPin: '135790',
      normalPinHash: normal.pinHash,
      normalPinSalt: normal.pinSalt,
      duressPinHash: enrolled.pinHash,
      duressPinSalt: enrolled.pinSalt,
    });
    expect(normalCheck).toEqual({ matched: false, mode: 'normal' });

    const voidBallot = await buildDuressVoidBallot({
      sessionId: 's1',
      electionId: 'e1',
    });
    expect(voidBallot.isCountable).toBe(false);
    expect(voidBallot.isDuress).toBe(true);
    expect(voidBallot.voterVisibleEventType).toBe('session.ballot_cast');
    expect(voidBallot.silentAlert.shouldNotifyWatchers).toBe(true);
  });
});

describe('observer metrics', () => {
  it('computes turnout and gate fail rates without needing PII', () => {
    const metrics = computeObserverMetrics({
      eligibleRosterCount: 100,
      sessions: [
        { status: 'cast', attemptNumber: 1 },
        { status: 'cast', attemptNumber: 2 },
        { status: 'missed', attemptNumber: 1 },
        { status: 'failed', attemptNumber: 1 },
      ],
      gateChecks: [
        { checkKind: 'liveness', result: 'passed' },
        { checkKind: 'liveness', result: 'failed' },
        { checkKind: 'location_home', result: 'failed' },
      ],
    });
    expect(metrics.sessionsCast).toBe(2);
    expect(metrics.turnoutRate).toBe(0.02);
    expect(metrics.gateFailRates.liveness).toBe(0.5);
    expect(metrics.averageAttemptsAmongCast).toBe(1.5);
    expect(sanitizeObserverPayload({ turnoutRate: 0.2, profile_id: 'secret', email: 'x' })).toEqual({
      turnoutRate: 0.2,
    });
  });
});

describe('risk engine', () => {
  it('flags velocity, device farm, GPS clusters, and impossible travel', () => {
    const evaluation = evaluateRiskSignals([
      detectVelocityAnomaly({ sessionsInLastHour: 10 }),
      detectDeviceFarmSignal({ distinctProfilesOnFingerprint: 4 }),
      detectIdenticalGpsCluster({
        points: [
          { latitude: 1, longitude: 1 },
          { latitude: 1.00001, longitude: 1.00001 },
          { latitude: 1.00002, longitude: 1.00002 },
          { latitude: 1.00003, longitude: 1.00003 },
        ],
        radiusMeters: 50,
        minClusterSize: 4,
      }),
      detectImpossibleTravel({
        from: { latitude: 40.7, longitude: -74.0, at: new Date('2026-07-31T10:00:00Z') },
        to: { latitude: 34.0, longitude: -118.2, at: new Date('2026-07-31T10:20:00Z') },
      }),
    ]);
    expect(evaluation.signals.length).toBeGreaterThanOrEqual(3);
    expect(evaluation.blockSession).toBe(true);
    expect(['high', 'critical']).toContain(evaluation.maxSeverity);
  });
});

describe('assisted ballot dual control', () => {
  it('requires distinct roles and walks assistant → witness → steward', () => {
    const roles = {
      voterProfileId: 'v1',
      assistantProfileId: 'a1',
      witnessProfileId: 'w1',
    };
    expect(assertDistinctAssistedRoles({ ...roles, assistantProfileId: 'v1' }).ok).toBe(false);

    const afterAssistant = advanceAssistedBallot({
      status: 'draft',
      action: 'assistant_confirm',
      roles,
    });
    expect(afterAssistant).toEqual({ ok: true, nextStatus: 'awaiting_witness' });

    const afterWitness = advanceAssistedBallot({
      status: 'awaiting_witness',
      action: 'witness_confirm',
      roles,
    });
    expect(afterWitness).toEqual({ ok: true, nextStatus: 'awaiting_steward' });

    const accepted = advanceAssistedBallot({
      status: 'awaiting_steward',
      action: 'steward_accept',
      roles,
    });
    expect(accepted).toEqual({ ok: true, nextStatus: 'accepted' });
    expect(assistedBallotIsCountable('accepted')).toBe(true);
  });
});

describe('challenge period', () => {
  it('opens a challenge window before voting and filters upheld candidates', () => {
    const votingOpensAt = new Date('2026-08-10T00:00:00Z');
    const period = deriveDefaultChallengeWindow({ votingOpensAt, challengeDays: 7 });
    expect(canSubmitChallenge(new Date('2026-08-05T00:00:00Z'), period)).toBe(true);
    expect(canSubmitChallenge(new Date('2026-08-10T00:00:00Z'), period)).toBe(false);
    expect(resolveChallenge({ status: 'open', decision: 'upheld' })).toEqual({
      ok: true,
      nextStatus: 'upheld',
    });
    expect(
      filterCandidatesAfterChallenges({
        candidates: [{ id: 'c1' }, { id: 'c2' }],
        upheldCandidateIds: ['c1'],
      }),
    ).toEqual([{ id: 'c2' }]);
  });
});

describe('cooling-off', () => {
  it('applies longer cooling-off for constitutional home changes', () => {
    const changedAt = new Date('2026-07-31T00:00:00Z');
    const until = computeCoolingOffUntil({
      changedAt,
      securityClass: 'constitutional',
      source: 'home_address_change',
    });
    expect(until?.toISOString()).toBe('2026-08-03T00:00:00.000Z');
    expect(
      isCoolingOffActive({ now: new Date('2026-08-01T00:00:00Z'), coolingOffUntil: until }),
    ).toBe(true);
    expect(remainingCoolingOffHours({ now: new Date('2026-08-02T12:00:00Z'), coolingOffUntil: until })).toBe(12);
  });
});

describe('client attestation', () => {
  it('accepts matching reproducible voting builds and rejects mismatches', () => {
    const manifest = buildVotingManifestFromRelease({
      appVersion: '0.1.47',
      appReleaseId: '20260731-v0.1.47',
      androidVersionCode: 49,
      packageFingerprints: ['abc123'],
    });
    expect(releaseIdLooksReproducible(manifest.appReleaseId, manifest.appVersion)).toBe(true);
    expect(
      attestVotingClient({
        appVersion: '0.1.47',
        appReleaseId: '20260731-v0.1.47',
        androidVersionCode: 49,
        packageFingerprint: 'abc123',
        manifest,
      }).ok,
    ).toBe(true);
    expect(
      attestVotingClient({
        appVersion: '0.1.46',
        appReleaseId: 'old',
        androidVersionCode: 48,
        packageFingerprint: 'nope',
        manifest,
      }).reasons,
    ).toEqual(
      expect.arrayContaining([
        'release_id_mismatch',
        'version_mismatch',
        'version_code_mismatch',
        'package_fingerprint_mismatch',
      ]),
    );
  });
});

describe('post-election canvass', () => {
  it('samples cast sessions and redacts ballot-choice language from notes', () => {
    const plan = planCanvassSamples({
      sessions: [
        { sessionId: 's1', status: 'cast' },
        { sessionId: 's2', status: 'cast' },
        { sessionId: 's3', status: 'missed' },
        { sessionId: 's4', status: 'cast' },
        { sessionId: 's5', status: 'cast' },
        { sessionId: 's6', status: 'cast' },
        { sessionId: 's7', status: 'cast' },
        { sessionId: 's8', status: 'cast' },
        { sessionId: 's9', status: 'cast' },
        { sessionId: 's10', status: 'cast' },
        { sessionId: 's11', status: 'cast' },
        { sessionId: 's12', status: 'cast' },
        { sessionId: 's13', status: 'cast' },
        { sessionId: 's14', status: 'cast' },
        { sessionId: 's15', status: 'cast' },
        { sessionId: 's16', status: 'cast' },
        { sessionId: 's17', status: 'cast' },
        { sessionId: 's18', status: 'cast' },
        { sessionId: 's19', status: 'cast' },
        { sessionId: 's20', status: 'cast' },
      ],
      sampleRate: 0.1,
      highRiskSessionIds: ['s2'],
      random: () => 0.2,
    });
    expect(plan.targetCount).toBe(2);
    expect(plan.samples.some((s) => s.sessionId === 's2' && s.sampleBucket === 'high_risk')).toBe(true);
    expect(advanceCanvassSample({ status: 'selected', action: 'start_review' })).toEqual({
      ok: true,
      nextStatus: 'in_review',
    });
    expect(sanitizeCanvassNotes('Reviewed choice and candidate paperwork')).toContain('[redacted]');
  });
});

describe('electionTitleWithoutCountryLabel', () => {
  it('replaces leading U.S. / United States wording when the flag is shown', () => {
    expect(electionTitleWithoutCountryLabel('U.S. Senate — California (2024)', 'US')).toBe(
      'Senate — California (2024)',
    );
    expect(electionTitleWithoutCountryLabel('United States President (2024)', 'US')).toBe(
      'President (2024)',
    );
  });

  it('strips country suffixes used in EP-style titles', () => {
    expect(electionTitleWithoutCountryLabel('European Parliament — France (2024)', 'FR')).toBe(
      'European Parliament (2024)',
    );
  });

  it('leaves titles without country wording unchanged', () => {
    expect(electionTitleWithoutCountryLabel('Boston City Council District 7 (2021)', 'US')).toBe(
      'Boston City Council District 7 (2021)',
    );
  });
});

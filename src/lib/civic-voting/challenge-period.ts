/**
 * Candidate / measure challenge period before voting opens.
 */

export type ChallengePeriod = {
  challengeOpensAt: Date;
  challengeClosesAt: Date;
  votingOpensAt: Date;
};

export type ChallengePeriodPhase = 'before_challenge' | 'challenge_open' | 'challenge_closed' | 'voting_open';

export type ChallengeStatus = 'open' | 'upheld' | 'dismissed' | 'withdrawn';

export function deriveDefaultChallengeWindow(input: {
  votingOpensAt: Date;
  challengeDays?: number;
}): ChallengePeriod {
  const days = input.challengeDays ?? 7;
  const challengeClosesAt = new Date(input.votingOpensAt.getTime());
  const challengeOpensAt = new Date(input.votingOpensAt.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    challengeOpensAt,
    challengeClosesAt,
    votingOpensAt: input.votingOpensAt,
  };
}

export function challengePeriodPhase(now: Date, period: ChallengePeriod): ChallengePeriodPhase {
  if (now.getTime() >= period.votingOpensAt.getTime()) return 'voting_open';
  if (now.getTime() < period.challengeOpensAt.getTime()) return 'before_challenge';
  if (now.getTime() < period.challengeClosesAt.getTime()) return 'challenge_open';
  return 'challenge_closed';
}

export function canSubmitChallenge(now: Date, period: ChallengePeriod): boolean {
  return challengePeriodPhase(now, period) === 'challenge_open';
}

export function canResolveChallenge(status: ChallengeStatus): boolean {
  return status === 'open';
}

export type ChallengeResolution =
  | { ok: true; nextStatus: Exclude<ChallengeStatus, 'open'>; reason?: undefined }
  | { ok: false; reason: string };

export function resolveChallenge(input: {
  status: ChallengeStatus;
  decision: 'upheld' | 'dismissed' | 'withdrawn';
}): ChallengeResolution {
  if (!canResolveChallenge(input.status)) {
    return { ok: false, reason: 'challenge_not_open' };
  }
  return { ok: true, nextStatus: input.decision };
}

/** Candidates with upheld challenges should be excluded from the ballot. */
export function filterCandidatesAfterChallenges<T extends { id: string }>(input: {
  candidates: T[];
  upheldCandidateIds: string[];
}): T[] {
  const blocked = new Set(input.upheldCandidateIds);
  return input.candidates.filter((c) => !blocked.has(c.id));
}

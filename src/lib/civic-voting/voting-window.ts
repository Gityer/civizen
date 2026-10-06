import type { CivicElection } from './types';

export type VotingWindowState = 'scheduled' | 'open' | 'closed';

export type VotingWindow = {
  state: VotingWindowState;
  opensAt: Date;
  closesAt: Date;
};

/**
 * Whether ballots can be cast right now. The status column alone is not enough: an election
 * whose window has passed stays `open` until the close tick runs, and the server refuses
 * ballots after `voting_closes_at` regardless.
 */
export function resolveVotingWindow(
  election: Pick<CivicElection, 'status' | 'votingOpensAt' | 'votingClosesAt'>,
  now: Date = new Date(),
): VotingWindow {
  const opensAt = new Date(election.votingOpensAt);
  const closesAt = new Date(election.votingClosesAt);
  if (election.status === 'closed' || election.status === 'certified' || election.status === 'cancelled') {
    return { state: 'closed', opensAt, closesAt };
  }
  if (election.status !== 'open') {
    return { state: 'scheduled', opensAt, closesAt };
  }
  if (!Number.isNaN(opensAt.getTime()) && now < opensAt) {
    return { state: 'scheduled', opensAt, closesAt };
  }
  if (!Number.isNaN(closesAt.getTime()) && now > closesAt) {
    return { state: 'closed', opensAt, closesAt };
  }
  return { state: 'open', opensAt, closesAt };
}

/** Error codes raised by the consultation RPCs that have a member-facing explanation. */
export const CONSULTATION_REASON_CODES = [
  'not_authenticated',
  'profile_unavailable',
  'voter_blocked',
  'verification_required',
  'age_unknown',
  'under_age',
  'outside_scope',
  'election_not_open',
  'demo_not_votable',
  'consultation_cast_ordinary_only',
  'invalid_option',
  'option_not_found',
  'ballot_not_found',
  'election_not_found',
] as const;

export type ConsultationReasonCode = (typeof CONSULTATION_REASON_CODES)[number];

export function toConsultationReasonCode(value: unknown): ConsultationReasonCode | null {
  const text = value instanceof Error ? value.message : typeof value === 'string' ? value : '';
  const code = text.trim();
  return (CONSULTATION_REASON_CODES as readonly string[]).includes(code)
    ? (code as ConsultationReasonCode)
    : null;
}

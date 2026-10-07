/** Outcome the lifecycle tick stores in `civic_elections.metadata.final_outcome`. */
export type ConsultationOutcome = {
  totalCountable: number;
  quorum: number | null;
  quorumMet: boolean;
  passThresholdPercent: number;
  supportSharePercent: number | null;
  /** null when the ballot has no Support/Oppose pair (custom options). */
  passed: boolean | null;
  leadingOptionKey: string | null;
  ballotMethod: 'single' | 'approval' | 'ranked';
  /** Approval ballots: every pick counted; null on single-choice ballots. */
  approvalsTotal: number | null;
  /** Ranked ballots: instant run-off rounds as stored by the server; null otherwise. */
  rankedRounds: number | null;
};

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function readConsultationOutcome(metadata: Record<string, unknown> | null | undefined): ConsultationOutcome | null {
  const raw = metadata?.final_outcome;
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    totalCountable: num(row.total_countable) ?? 0,
    quorum: num(row.quorum),
    quorumMet: row.quorum_met !== false,
    passThresholdPercent: num(row.pass_threshold_percent) ?? 50,
    supportSharePercent: num(row.support_share_percent),
    passed: typeof row.passed === 'boolean' ? row.passed : null,
    leadingOptionKey: row.leading_option_key ? String(row.leading_option_key) : null,
    ballotMethod: row.ballot_method === 'approval' || row.ballot_method === 'ranked' ? row.ballot_method : 'single',
    approvalsTotal: num(row.approvals_total),
    rankedRounds: Array.isArray(row.ranked_rounds) ? row.ranked_rounds.length : null,
  };
}

/** Ballot option labels: the three standard options are translated, custom ones use their stored label. */
export function consultationOptionLabel(
  t: (key: string) => string,
  optionKey: string | null | undefined,
  displayName?: string | null,
): string {
  switch ((optionKey || '').toLowerCase()) {
    case 'support':
      return t('civicVoting.proposals.castSupport');
    case 'oppose':
      return t('civicVoting.proposals.castOppose');
    case 'abstain':
      return t('civicVoting.proposals.castAbstain');
    default:
      return displayName || optionKey || '';
  }
}

export type OutcomeLine = { key: string; params?: Record<string, string> };

/** The one sentence that summarises a closed consultation; keys live under `civicBallot`. */
export function describeConsultationOutcome(
  outcome: ConsultationOutcome,
  optionLabel: (optionKey: string) => string,
): OutcomeLine {
  if (outcome.totalCountable === 0) return { key: 'civicBallot.outcomeNoBallots' };
  if (!outcome.quorumMet) {
    return {
      key: 'civicBallot.outcomeQuorumNotMet',
      params: { count: String(outcome.totalCountable), quorum: String(outcome.quorum ?? 0) },
    };
  }
  if (outcome.ballotMethod === 'ranked') {
    return outcome.leadingOptionKey
      ? { key: 'civicBallot.outcomeRankedWinner', params: { option: optionLabel(outcome.leadingOptionKey), rounds: String(outcome.rankedRounds ?? 1) } }
      : { key: 'civicBallot.outcomeRankedNoWinner' };
  }
  if (outcome.passed === null || outcome.supportSharePercent === null) {
    return {
      key: 'civicBallot.outcomeLeading',
      params: { option: outcome.leadingOptionKey ? optionLabel(outcome.leadingOptionKey) : '' },
    };
  }
  return {
    key: outcome.passed ? 'civicBallot.outcomePassed' : 'civicBallot.outcomeFailed',
    params: {
      share: String(outcome.supportSharePercent),
      threshold: String(outcome.passThresholdPercent),
    },
  };
}

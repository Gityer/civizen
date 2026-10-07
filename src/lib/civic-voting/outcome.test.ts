import { describe, expect, it } from 'vitest';

import { consultationOptionLabel, describeConsultationOutcome, readConsultationOutcome } from './outcome';

const t = (key: string) => key;

describe('consultation outcome', () => {
  it('reads the stored outcome and tolerates missing fields', () => {
    const outcome = readConsultationOutcome({
      final_outcome: { total_countable: '12', quorum: 10, quorum_met: true, pass_threshold_percent: 60, support_share_percent: '58.3', passed: false, leading_option_key: 'support' },
    });
    expect(outcome).toEqual({
      totalCountable: 12,
      quorum: 10,
      quorumMet: true,
      passThresholdPercent: 60,
      supportSharePercent: 58.3,
      passed: false,
      leadingOptionKey: 'support',
      ballotMethod: 'single',
      approvalsTotal: null,
    });
    expect(readConsultationOutcome({})).toBeNull();
    expect(readConsultationOutcome({ final_outcome: { total_countable: 2, ballot_method: 'approval', approvals_total: 3, leading_option_key: 'library' } })).toMatchObject({
      totalCountable: 2,
      ballotMethod: 'approval',
      approvalsTotal: 3,
      passed: null,
      leadingOptionKey: 'library',
    });
  });

  it('describes quorum failure, pass, fail and custom-option leaders', () => {
    const label = (key: string) => `#${key}`;
    expect(describeConsultationOutcome({ totalCountable: 0, quorum: null, quorumMet: true, passThresholdPercent: 50, supportSharePercent: null, passed: null, leadingOptionKey: null, ballotMethod: 'single', approvalsTotal: null }, label).key).toBe('civicBallot.outcomeNoBallots');
    expect(describeConsultationOutcome({ totalCountable: 3, quorum: 10, quorumMet: false, passThresholdPercent: 50, supportSharePercent: 100, passed: false, leadingOptionKey: 'support', ballotMethod: 'single', approvalsTotal: null }, label)).toEqual({ key: 'civicBallot.outcomeQuorumNotMet', params: { count: '3', quorum: '10' } });
    expect(describeConsultationOutcome({ totalCountable: 9, quorum: null, quorumMet: true, passThresholdPercent: 50, supportSharePercent: 66.7, passed: true, leadingOptionKey: 'support', ballotMethod: 'single', approvalsTotal: null }, label)).toEqual({ key: 'civicBallot.outcomePassed', params: { share: '66.7', threshold: '50' } });
    expect(describeConsultationOutcome({ totalCountable: 9, quorum: null, quorumMet: true, passThresholdPercent: 60, supportSharePercent: 55, passed: false, leadingOptionKey: 'support', ballotMethod: 'single', approvalsTotal: null }, label)).toEqual({ key: 'civicBallot.outcomeFailed', params: { share: '55', threshold: '60' } });
    expect(describeConsultationOutcome({ totalCountable: 4, quorum: null, quorumMet: true, passThresholdPercent: 50, supportSharePercent: null, passed: null, leadingOptionKey: 'change_it', ballotMethod: 'single', approvalsTotal: null }, label)).toEqual({ key: 'civicBallot.outcomeLeading', params: { option: '#change_it' } });
    expect(describeConsultationOutcome({ totalCountable: 2, quorum: null, quorumMet: true, passThresholdPercent: 50, supportSharePercent: null, passed: null, leadingOptionKey: 'library', ballotMethod: 'approval', approvalsTotal: 3 }, label)).toEqual({ key: 'civicBallot.outcomeLeading', params: { option: '#library' } });
  });

  it('translates the standard options and keeps custom labels', () => {
    expect(consultationOptionLabel(t, 'support')).toBe('civicVoting.proposals.castSupport');
    expect(consultationOptionLabel(t, 'ABSTAIN')).toBe('civicVoting.proposals.castAbstain');
    expect(consultationOptionLabel(t, 'change_it', 'Change it')).toBe('Change it');
    expect(consultationOptionLabel(t, null)).toBe('');
  });
});

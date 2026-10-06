import { describe, expect, it, vi } from 'vitest';

import {
  appointConstitutionalOfficeHolder,
  classifyOfficeChangeError,
  endConstitutionalOfficeAssignment,
  fetchConstitutionalOfficeAssignments,
  fetchGovernanceProposalResults,
  fetchGovernanceProposals,
  fetchMyGovernanceVotes,
  findProfileByUsername,
  summarizeGovernanceResults,
  transferConstitutionalOffice,
} from '@/lib/governance-ui-utils';
import type { GovernanceProposal } from '@/lib/governance-ui.types';
import { argsOf, createRecordingClient } from '@/test/create-recording-client';

const proposal = (overrides: Partial<GovernanceProposal> = {}) =>
  ({ id: 'p-1', required_quorum: 3, ...overrides }) as GovernanceProposal;

describe('governance proposals and results', () => {
  it('lists open proposals by status, newest first', async () => {
    const { client, calls } = createRecordingClient({ governance_proposals: [{ data: [{ id: 'p-1' }] }] });

    const rows = await fetchGovernanceProposals(client, 'open', 10);

    expect(rows).toEqual([{ id: 'p-1' }]);
    expect(argsOf(calls, 'governance_proposals', 'eq')).toEqual(['status', 'open']);
    expect(argsOf(calls, 'governance_proposals', 'order')).toEqual(['created_at', { ascending: false }]);
    expect(argsOf(calls, 'governance_proposals', 'limit')).toEqual([10]);
  });

  it('lists closed proposals as approved, rejected or cancelled and all proposals unfiltered', async () => {
    const closed = createRecordingClient({ governance_proposals: [{ data: [] }] });
    await fetchGovernanceProposals(closed.client, 'closed');
    expect(argsOf(closed.calls, 'governance_proposals', 'in')).toEqual(['status', ['approved', 'rejected', 'cancelled']]);

    const all = createRecordingClient({ governance_proposals: [{ data: [] }] });
    await fetchGovernanceProposals(all.client, 'all');
    expect(argsOf(all.calls, 'governance_proposals', 'eq')).toBeUndefined();
    expect(argsOf(all.calls, 'governance_proposals', 'in')).toBeUndefined();
  });

  it('throws when the proposals query fails so the UI can show an error', async () => {
    const { client } = createRecordingClient({ governance_proposals: [{ error: { message: 'boom' } }] });
    await expect(fetchGovernanceProposals(client)).rejects.toEqual({ message: 'boom' });
  });

  describe('summarizeGovernanceResults', () => {
    it('weights votes and reports percentages of decisive votes only', () => {
      const results = summarizeGovernanceResults(proposal({ required_quorum: 3 }), [
        { choice: 'approve', weight: 1 },
        { choice: 'approve', weight: 1 },
        { choice: 'reject', weight: 1 },
        { choice: 'abstain', weight: 1 },
        { choice: 'approve', weight: 0 },
      ]);

      expect(results).toMatchObject({
        approvals: 2,
        rejections: 1,
        abstentions: 1,
        totalVotes: 4,
        decisiveVotes: 3,
        approvalPercentage: 67,
        rejectionPercentage: 33,
        requiredQuorum: 3,
        quorumMet: true,
      });
    });

    it('measures quorum on decisive weight, not abstentions', () => {
      const results = summarizeGovernanceResults(proposal({ required_quorum: 2 }), [
        { choice: 'approve', weight: 1 },
        { choice: 'abstain', weight: 1 },
        { choice: 'abstain', weight: 1 },
      ]);
      expect(results.quorumMet).toBe(false);
    });

    it('reports zero percentages with no decisive votes', () => {
      expect(summarizeGovernanceResults(proposal(), [])).toMatchObject({
        approvalPercentage: 0,
        rejectionPercentage: 0,
        quorumMet: false,
      });
    });
  });

  it('computes results for many proposals with one votes query', async () => {
    const { client, calls } = createRecordingClient({
      governance_proposal_votes: [
        {
          data: [
            { proposal_id: 'a', choice: 'approve', weight: 1 },
            { proposal_id: 'a', choice: 'reject', weight: 1 },
            { proposal_id: 'b', choice: 'approve', weight: 1 },
          ],
        },
      ],
    });

    const results = await fetchGovernanceProposalResults(client, [
      proposal({ id: 'a', required_quorum: 1 }),
      proposal({ id: 'b', required_quorum: 1 }),
      proposal({ id: 'c', required_quorum: 1 }),
    ]);

    expect(calls.filter((call) => call.table === 'governance_proposal_votes')).toHaveLength(1);
    expect(results.a).toMatchObject({ approvals: 1, rejections: 1, approvalPercentage: 50 });
    expect(results.b).toMatchObject({ approvals: 1, approvalPercentage: 100 });
    expect(results.c).toMatchObject({ totalVotes: 0 });
  });

  it('skips the votes query entirely when there are no proposals', async () => {
    const { client, calls } = createRecordingClient();
    expect(await fetchGovernanceProposalResults(client, [])).toEqual({});
    expect(await fetchMyGovernanceVotes(client, 'me', [])).toEqual({});
    expect(calls).toHaveLength(0);
  });

  it("returns the signed-in member's own choice per proposal", async () => {
    const { client, calls } = createRecordingClient({
      governance_proposal_votes: [{ data: [{ proposal_id: 'a', choice: 'approve' }, { proposal_id: 'b', choice: 'abstain' }] }],
    });

    expect(await fetchMyGovernanceVotes(client, 'me', ['a', 'b'])).toEqual({ a: 'approve', b: 'abstain' });
    expect(argsOf(calls, 'governance_proposal_votes', 'eq')).toEqual(['voter_id', 'me']);
  });
});

describe('constitutional offices', () => {
  it('lists assignments with active ones first', async () => {
    const { client, calls } = createRecordingClient({ constitutional_offices: [{ data: [{ id: 'o-1' }] }] });

    expect(await fetchConstitutionalOfficeAssignments(client)).toEqual([{ id: 'o-1' }]);
    const orders = calls[0].ops.filter(([method]) => method === 'order').map(([, args]) => args);
    expect(orders).toEqual([
      ['is_active', { ascending: false }],
      ['assigned_at', { ascending: false }],
    ]);
  });

  it('finds a member by username and ignores blank input', async () => {
    const { client, calls } = createRecordingClient({ profiles: [{ data: { id: 'u-1', full_name: 'A', username: 'armen' } }] });

    expect(await findProfileByUsername(client, '  Armen ')).toEqual({ id: 'u-1', full_name: 'A', username: 'armen' });
    expect(argsOf(calls, 'profiles', 'ilike')).toEqual(['username', 'Armen']);
    expect(await findProfileByUsername(client, '   ')).toBeNull();
  });

  describe('classifyOfficeChangeError', () => {
    it.each([
      [{ code: '42501' }, 'not_permitted'],
      [{ code: '23505', message: 'duplicate key value violates unique constraint "idx_constitutional_offices_active_office"' }, 'office_occupied'],
      [{ code: '23505', message: 'violates unique constraint "idx_constitutional_offices_active_profile_office"' }, 'already_holds_office'],
      [{ code: 'XX000', message: 'other' }, 'failed'],
    ])('maps %j to %s', (error, expected) => {
      expect(classifyOfficeChangeError(error)).toBe(expected);
    });
  });

  it('appoints a holder as an active assignment with trimmed notes', async () => {
    const { client, calls } = createRecordingClient();

    const result = await appointConstitutionalOfficeHolder(client, {
      officeKey: 'founder',
      profileId: 'u-1',
      assignedBy: 'admin-1',
      notes: '  Transfer approved  ',
    });

    expect(result).toEqual({ ok: true });
    expect(argsOf(calls, 'constitutional_offices', 'insert')).toEqual([
      { office_key: 'founder', profile_id: 'u-1', assigned_by: 'admin-1', notes: 'Transfer approved', is_active: true },
    ]);
  });

  it('explains why an appointment was refused', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { client } = createRecordingClient({
      constitutional_offices: [{ error: { code: '23505', message: 'idx_constitutional_offices_active_office' } }],
    });

    expect(
      await appointConstitutionalOfficeHolder(client, { officeKey: 'founder', profileId: 'u-1', assignedBy: 'a' }),
    ).toEqual({ ok: false, reason: 'office_occupied' });
  });

  describe('transferConstitutionalOffice', () => {
    it('hands the office over with one atomic database call and trimmed text', async () => {
      const { client, calls } = createRecordingClient();

      const result = await transferConstitutionalOffice(client, {
        officeKey: 'founder',
        newHolderId: 'u-2',
        reason: '  Handover  ',
        notes: '   ',
      });

      expect(result).toEqual({ ok: true });
      expect(calls).toHaveLength(1);
      expect(argsOf(calls, 'rpc:transfer_constitutional_office', 'rpc')).toEqual([
        { p_office_key: 'founder', p_new_holder: 'u-2', p_reason: 'Handover', p_notes: null },
      ]);
    });

    it.each([
      [{ code: '42501' }, 'not_permitted'],
      [{ code: '23505', message: 'This member already holds this office (idx_constitutional_offices_active_profile_office)' }, 'already_holds_office'],
      [{ code: '23503' }, 'unknown_holder'],
    ])('explains a refused transfer (%j) as %s', async (error, expected) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { client } = createRecordingClient({ 'rpc:transfer_constitutional_office': [{ error }] });

      expect(await transferConstitutionalOffice(client, { officeKey: 'founder', newHolderId: 'u-2' })).toEqual({
        ok: false,
        reason: expected,
      });
    });
  });

  describe('endConstitutionalOfficeAssignment', () => {
    const now = new Date('2026-10-05T12:00:00.000Z');

    it('ends the assignment and keeps earlier metadata', async () => {
      const { client, calls } = createRecordingClient({
        constitutional_offices: [
          { data: { metadata: { source: 'legacy_founder_role' } } },
          { data: [{ id: 'o-1' }] },
        ],
      });

      const result = await endConstitutionalOfficeAssignment(client, {
        assignmentId: 'o-1',
        endedBy: 'admin-1',
        reason: ' Handover ',
        now,
      });

      expect(result).toEqual({ ok: true });
      const update = calls[1].ops.find(([method]) => method === 'update')?.[1][0];
      expect(update).toEqual({
        is_active: false,
        ended_at: '2026-10-05T12:00:00.000Z',
        metadata: { source: 'legacy_founder_role', ended_by: 'admin-1', end_reason: 'Handover' },
      });
    });

    it('treats an update that changed nothing as a failure (row-level security hides rows silently)', async () => {
      const { client } = createRecordingClient({
        constitutional_offices: [{ data: { metadata: {} } }, { data: [] }],
      });

      expect(await endConstitutionalOfficeAssignment(client, { assignmentId: 'o-1', endedBy: 'a', now })).toEqual({
        ok: false,
        reason: 'failed',
      });
    });

    it('fails when the assignment does not exist', async () => {
      const { client } = createRecordingClient({ constitutional_offices: [{ data: null }] });
      expect(await endConstitutionalOfficeAssignment(client, { assignmentId: 'missing', endedBy: 'a', now })).toEqual({
        ok: false,
        reason: 'failed',
      });
    });
  });
});

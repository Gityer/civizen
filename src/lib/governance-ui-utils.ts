import type { SupabaseClient } from '@supabase/supabase-js';

import type { UntypedSupabaseClient } from '@/integrations/supabase/untyped';
import type { Database } from '@/integrations/supabase/types';
import { tallyGovernanceVotes } from '@/lib/governance-proposals';
import type {
  ConstitutionalOfficeAssignment,
  ConstitutionalOfficeKey,
  GovernanceProposal,
  GovernanceProposalFilter,
  GovernanceProposalResults,
  GovernanceVote,
  GovernanceVoteChoice,
} from '@/lib/governance-ui.types';

/**
 * Read and office-assignment API for the governance dashboard and steward console, over the real
 * tables (`governance_proposals`, `governance_proposal_votes`, `constitutional_offices`).
 * Recording a vote is deliberately NOT here: it lives in `governance-voting-service.ts` so there is
 * one voting path. Every function takes the client so it can be tested without a database.
 */

type Client = SupabaseClient<Database>;

const CLOSED_STATUSES = ['approved', 'rejected', 'cancelled'] as const;

// ---------------------------------------------------------------- proposals and results

export async function fetchGovernanceProposals(
  client: Client,
  filter: GovernanceProposalFilter = 'open',
  limit = 50,
): Promise<GovernanceProposal[]> {
  let query = client.from('governance_proposals').select('*').order('created_at', { ascending: false }).limit(limit);
  if (filter === 'open') query = query.eq('status', 'open');
  if (filter === 'closed') query = query.in('status', [...CLOSED_STATUSES]);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Weighted results for one proposal. Quorum is measured on decisive (approve + reject) weight, as in the resolution rules. */
export function summarizeGovernanceResults(
  proposal: Pick<GovernanceProposal, 'required_quorum'>,
  votes: Pick<GovernanceVote, 'choice' | 'weight'>[],
): GovernanceProposalResults {
  const tally = tallyGovernanceVotes(votes as GovernanceVote[]);
  const requiredQuorum = Math.max(1, proposal.required_quorum);
  const percentOfDecisive = (part: number) =>
    tally.decisiveVotes > 0 ? Math.round((part / tally.decisiveVotes) * 100) : 0;

  return {
    ...tally,
    approvalPercentage: percentOfDecisive(tally.approvals),
    rejectionPercentage: percentOfDecisive(tally.rejections),
    requiredQuorum,
    quorumMet: tally.decisiveVotes >= requiredQuorum,
  };
}

/** Results for many proposals in one query (no per-proposal round trips). */
export async function fetchGovernanceProposalResults(
  client: Client,
  proposals: GovernanceProposal[],
): Promise<Record<string, GovernanceProposalResults>> {
  if (proposals.length === 0) return {};

  const { data, error } = await client
    .from('governance_proposal_votes')
    .select('proposal_id, choice, weight')
    .in(
      'proposal_id',
      proposals.map((proposal) => proposal.id),
    );
  if (error) throw error;

  const votesByProposal = new Map<string, Pick<GovernanceVote, 'choice' | 'weight'>[]>();
  for (const vote of data ?? []) {
    const list = votesByProposal.get(vote.proposal_id) ?? [];
    list.push(vote);
    votesByProposal.set(vote.proposal_id, list);
  }

  return Object.fromEntries(
    proposals.map((proposal) => [proposal.id, summarizeGovernanceResults(proposal, votesByProposal.get(proposal.id) ?? [])]),
  );
}

/** The signed-in member's own choice per proposal, so the UI can show "Your vote" after a reload. */
export async function fetchMyGovernanceVotes(
  client: Client,
  voterId: string,
  proposalIds: string[],
): Promise<Record<string, GovernanceVoteChoice>> {
  if (proposalIds.length === 0) return {};

  const { data, error } = await client
    .from('governance_proposal_votes')
    .select('proposal_id, choice')
    .eq('voter_id', voterId)
    .in('proposal_id', proposalIds);
  if (error) throw error;

  return Object.fromEntries((data ?? []).map((row) => [row.proposal_id, row.choice]));
}

// ---------------------------------------------------------------- constitutional offices

type HolderRow = { id: string; full_name: string | null; username: string | null };

/** Office assignments with the holder's name. Active assignments first, then history (newest first). */
export async function fetchConstitutionalOfficeAssignments(client: Client): Promise<ConstitutionalOfficeAssignment[]> {
  const { data, error } = await client
    .from('constitutional_offices')
    .select('*, holder:profiles!profile_id(id, full_name, username)')
    .order('is_active', { ascending: false })
    .order('assigned_at', { ascending: false });
  if (error) throw error;

  return (data ?? []) as unknown as ConstitutionalOfficeAssignment[];
}

/** Finds a member by exact username (case-insensitive) for the appointment form. */
export async function findProfileByUsername(client: Client, username: string): Promise<HolderRow | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, username')
    .ilike('username', trimmed)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type OfficeChangeFailure = 'not_permitted' | 'office_occupied' | 'already_holds_office' | 'unknown_holder' | 'failed';
export type OfficeChangeResult = { ok: true } | { ok: false; reason: OfficeChangeFailure };

/** Maps database errors to a reason the UI can explain. The unique indexes enforce one active holder per office. */
export function classifyOfficeChangeError(error: { code?: string | null; message?: string | null }): OfficeChangeFailure {
  if (error.code === '42501') return 'not_permitted';
  if (error.code === '23503') return 'unknown_holder';
  if (error.code === '23505') {
    return (error.message ?? '').includes('active_profile_office') ? 'already_holds_office' : 'office_occupied';
  }
  return 'failed';
}

export async function appointConstitutionalOfficeHolder(
  client: Client,
  input: { officeKey: ConstitutionalOfficeKey; profileId: string; assignedBy: string; notes?: string | null },
): Promise<OfficeChangeResult> {
  const { error } = await client.from('constitutional_offices').insert({
    office_key: input.officeKey,
    profile_id: input.profileId,
    assigned_by: input.assignedBy,
    notes: input.notes?.trim() || null,
    is_active: true,
  });

  if (error) {
    console.error('Failed to appoint office holder:', error);
    return { ok: false, reason: classifyOfficeChangeError(error) };
  }
  return { ok: true };
}

/**
 * Hands an office to another member in ONE database transaction (`transfer_constitutional_office`):
 * the current holder's assignment ends and the new one starts, or nothing changes. Prefer this over
 * calling end + appoint separately, which can leave the office vacant if the second write fails.
 */
export async function transferConstitutionalOffice(
  client: Client,
  input: { officeKey: ConstitutionalOfficeKey; newHolderId: string; reason?: string | null; notes?: string | null },
): Promise<OfficeChangeResult> {
  // The function is newer than the generated types, so the call goes through the untyped client shape.
  const rpc = (client as unknown as UntypedSupabaseClient).rpc.bind(client);
  const { error } = await rpc('transfer_constitutional_office', {
    p_office_key: input.officeKey,
    p_new_holder: input.newHolderId,
    p_reason: input.reason?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });

  if (error) {
    console.error('Failed to transfer office:', error);
    return { ok: false, reason: classifyOfficeChangeError(error) };
  }
  return { ok: true };
}

/**
 * Ends an assignment (it stays in the history). The reason and who ended it are appended to the
 * assignment's metadata so earlier notes and the original source are never overwritten.
 */
export async function endConstitutionalOfficeAssignment(
  client: Client,
  input: { assignmentId: string; endedBy: string; reason?: string | null; now?: Date },
): Promise<OfficeChangeResult> {
  const { data: current, error: readError } = await client
    .from('constitutional_offices')
    .select('metadata')
    .eq('id', input.assignmentId)
    .maybeSingle();
  if (readError || !current) {
    if (readError) console.error('Failed to read office assignment:', readError);
    return { ok: false, reason: readError ? classifyOfficeChangeError(readError) : 'failed' };
  }

  const endedAt = (input.now ?? new Date()).toISOString();
  const previousMetadata = current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata) ? current.metadata : {};

  const { data: updated, error } = await client
    .from('constitutional_offices')
    .update({
      is_active: false,
      ended_at: endedAt,
      metadata: {
        ...previousMetadata,
        ended_by: input.endedBy,
        end_reason: input.reason?.trim() || null,
      },
    })
    .eq('id', input.assignmentId)
    .eq('is_active', true)
    .select('id');

  if (error) {
    console.error('Failed to end office assignment:', error);
    return { ok: false, reason: classifyOfficeChangeError(error) };
  }
  // Row-level security filters rows silently: nothing updated means it was already ended or not allowed.
  if ((updated ?? []).length === 0) return { ok: false, reason: 'failed' };
  return { ok: true };
}

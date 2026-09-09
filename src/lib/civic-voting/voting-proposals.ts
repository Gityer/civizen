import { supabase } from '@/integrations/supabase/client';

/** Civic voting proposal tables / RPCs are not yet in generated Database types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type VotingProposalStatus = 'draft' | 'published' | 'closed' | 'withdrawn';

export type VotingProposal = {
  id: string;
  matterId: string;
  title: string;
  summary: string;
  body: string;
  status: VotingProposalStatus;
  consultationKind: 'nonbinding';
  scopeKind: 'global' | 'country' | 'region' | 'locality';
  scopeCountryCode: string | null;
  electionId: string | null;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  createdByProfileId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProposalRow = {
  id: string;
  matter_id: string;
  title: string;
  summary: string;
  body: string;
  status: string;
  consultation_kind: string;
  scope_kind: string;
  scope_country_code: string | null;
  election_id: string | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  created_by_profile_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapProposal(row: ProposalRow): VotingProposal {
  return {
    id: row.id,
    matterId: row.matter_id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    status: row.status as VotingProposalStatus,
    consultationKind: 'nonbinding',
    scopeKind: row.scope_kind as VotingProposal['scopeKind'],
    scopeCountryCode: row.scope_country_code,
    electionId: row.election_id,
    votingOpensAt: row.voting_opens_at,
    votingClosesAt: row.voting_closes_at,
    createdByProfileId: row.created_by_profile_id,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVotingProposals(): Promise<VotingProposal[]> {
  const { data, error } = await db
    .from('civic_voting_proposals')
    .select(
      'id, matter_id, title, summary, body, status, consultation_kind, scope_kind, scope_country_code, election_id, voting_opens_at, voting_closes_at, created_by_profile_id, published_at, created_at, updated_at',
    )
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as ProposalRow[]).map(mapProposal);
}

export async function getVotingProposal(proposalId: string): Promise<VotingProposal | null> {
  const { data, error } = await db
    .from('civic_voting_proposals')
    .select(
      'id, matter_id, title, summary, body, status, consultation_kind, scope_kind, scope_country_code, election_id, voting_opens_at, voting_closes_at, created_by_profile_id, published_at, created_at, updated_at',
    )
    .eq('id', proposalId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapProposal(data as ProposalRow) : null;
}

export async function listVotingProposalsForMatter(matterId: string): Promise<VotingProposal[]> {
  const { data, error } = await db
    .from('civic_voting_proposals')
    .select(
      'id, matter_id, title, summary, body, status, consultation_kind, scope_kind, scope_country_code, election_id, voting_opens_at, voting_closes_at, created_by_profile_id, published_at, created_at, updated_at',
    )
    .eq('matter_id', matterId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as ProposalRow[]).map(mapProposal);
}

export async function createVotingProposalFromMatter(input: {
  matterId: string;
  title: string;
  summary: string;
  body: string;
  votingClosesAt?: string | null;
}): Promise<string> {
  const { data, error } = await db.rpc('create_voting_proposal_from_matter', {
    p_matter_id: input.matterId,
    p_title: input.title,
    p_summary: input.summary,
    p_body: input.body,
    p_voting_closes_at: input.votingClosesAt || null,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function publishVotingProposal(proposalId: string): Promise<string> {
  const { data, error } = await db.rpc('publish_voting_proposal', {
    p_proposal_id: proposalId,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function castConsultationBallot(electionId: string, optionKey: string): Promise<string> {
  const { data, error } = await db.rpc('cast_consultation_ballot', {
    p_election_id: electionId,
    p_option_key: optionKey,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function withdrawConsultationBallot(electionId: string): Promise<boolean> {
  const { data, error } = await db.rpc('withdraw_consultation_ballot', {
    p_election_id: electionId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function myConsultationBallotOption(electionId: string): Promise<string | null> {
  const { data, error } = await db.rpc('my_consultation_ballot_option', {
    p_election_id: electionId,
  });
  if (error) return null;
  return data ? String(data) : null;
}

export function canManageVotingProposals(role: string | null | undefined): boolean {
  return role === 'founder' || role === 'admin' || role === 'system';
}

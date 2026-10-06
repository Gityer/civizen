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
  /** Raw metadata: open_for_support, support_threshold, … */
  metadata: Record<string, unknown>;
  openForSupport: boolean;
  supportThreshold: number;
  /** Custom ballot options; empty means the default Support / Oppose / Abstain. */
  options: ProposalOption[];
  quorum: number | null;
  passThresholdPercent: number | null;
};

export type ProposalOption = { key: string; label: string };

function readOptions(metadata: Record<string, unknown>): ProposalOption[] {
  const raw = metadata.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return { key: String(row.key ?? ''), label: String(row.label ?? row.key ?? '') };
    })
    .filter((row) => row.key !== '');
}

function readNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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
  metadata?: Record<string, unknown> | null;
};

function mapProposal(row: ProposalRow): VotingProposal {
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
  const threshold = Number(metadata.support_threshold);
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
    metadata,
    openForSupport: Boolean(metadata.open_for_support),
    supportThreshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 10,
    options: readOptions(metadata),
    quorum: readNumber(metadata.quorum),
    passThresholdPercent: readNumber(metadata.pass_threshold_percent),
  };
}

export async function listVotingProposals(): Promise<VotingProposal[]> {
  const { data, error } = await db
    .from('civic_voting_proposals')
    .select(
      'id, matter_id, title, summary, body, status, consultation_kind, scope_kind, scope_country_code, election_id, voting_opens_at, voting_closes_at, created_by_profile_id, published_at, created_at, updated_at, metadata',
    )
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as ProposalRow[]).map(mapProposal);
}

export async function getVotingProposal(proposalId: string): Promise<VotingProposal | null> {
  const { data, error } = await db
    .from('civic_voting_proposals')
    .select(
      'id, matter_id, title, summary, body, status, consultation_kind, scope_kind, scope_country_code, election_id, voting_opens_at, voting_closes_at, created_by_profile_id, published_at, created_at, updated_at, metadata',
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
      'id, matter_id, title, summary, body, status, consultation_kind, scope_kind, scope_country_code, election_id, voting_opens_at, voting_closes_at, created_by_profile_id, published_at, created_at, updated_at, metadata',
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

export type ConsultationCastResult = { ballotId: string; receipt: string };

export async function castConsultationBallot(
  electionId: string,
  optionKey: string,
): Promise<ConsultationCastResult> {
  const { data, error } = await db.rpc('cast_consultation_ballot', {
    p_election_id: electionId,
    p_option_key: optionKey,
  });
  if (error) throw new Error(error.message);
  const row = (data || {}) as { ballot_id?: string; receipt?: string };
  return { ballotId: String(row.ballot_id ?? ''), receipt: String(row.receipt ?? '') };
}

export async function withdrawConsultationBallot(electionId: string): Promise<boolean> {
  const { data, error } = await db.rpc('withdraw_consultation_ballot', {
    p_election_id: electionId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export type MyConsultationBallot = { optionKey: string | null; receipt: string | null; castAt: string | null };

/** The member's own counted ballot (choice unsealed server-side for the owner only). */
export async function myConsultationBallot(electionId: string): Promise<MyConsultationBallot | null> {
  const { data, error } = await db.rpc('my_consultation_ballot', { p_election_id: electionId });
  if (error || !data) return null;
  const row = data as { option_key?: string | null; receipt?: string | null; cast_at?: string | null };
  return {
    optionKey: row.option_key ? String(row.option_key) : null,
    receipt: row.receipt ? String(row.receipt) : null,
    castAt: row.cast_at ? String(row.cast_at) : null,
  };
}

export async function myConsultationBallotOption(electionId: string): Promise<string | null> {
  const ballot = await myConsultationBallot(electionId);
  return ballot?.optionKey ?? null;
}

export type ConsultationEligibility = { eligible: boolean; reason: string | null };

/** Server-side eligibility for the signed-in member (null reason means eligible). */
export async function myConsultationEligibility(electionId: string): Promise<ConsultationEligibility | null> {
  const { data, error } = await db.rpc('my_consultation_eligibility', { p_election_id: electionId });
  if (error || !data) return null;
  const row = data as { eligible?: boolean; reason?: string | null };
  return { eligible: Boolean(row.eligible), reason: row.reason ? String(row.reason) : null };
}

/** Public inclusion check: is this receipt among the counted ballots? */
export async function checkConsultationReceipt(electionId: string, receipt: string): Promise<boolean> {
  const { data, error } = await db.rpc('civic_election_receipt_included', {
    p_election_id: electionId,
    p_receipt: receipt,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export type VotingProposalSupport = {
  count: number;
  threshold: number;
  openForSupport: boolean;
  supported: boolean;
  ready: boolean;
};

function mapSupport(data: unknown): VotingProposalSupport {
  const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    count: Number(row.count) || 0,
    threshold: Number(row.threshold) || 10,
    openForSupport: Boolean(row.open_for_support),
    supported: Boolean(row.supported),
    ready: Boolean(row.ready),
  };
}

export async function getVotingProposalSupport(proposalId: string): Promise<VotingProposalSupport | null> {
  const { data, error } = await db.rpc('voting_proposal_support_summary', { p_proposal_id: proposalId });
  if (error || !data) return null;
  return mapSupport(data);
}

export async function openVotingProposalForSupport(
  proposalId: string,
  threshold?: number | null,
): Promise<VotingProposalSupport> {
  const { data, error } = await db.rpc('open_voting_proposal_for_support', {
    p_proposal_id: proposalId,
    p_threshold: threshold ?? null,
  });
  if (error) throw new Error(error.message);
  return mapSupport(data);
}

export async function toggleVotingProposalSupport(proposalId: string): Promise<VotingProposalSupport> {
  const { data, error } = await db.rpc('toggle_voting_proposal_support', { p_proposal_id: proposalId });
  if (error) throw new Error(error.message);
  return mapSupport(data);
}

export async function updateVotingProposalSettings(input: {
  proposalId: string;
  scopeKind: 'global' | 'country';
  scopeCountryCode?: string | null;
  votingOpensAt?: string | null;
  votingClosesAt?: string | null;
  /** Empty or omitted resets to the default Support / Oppose / Abstain. */
  options?: Array<{ key?: string; label: string }> | null;
  quorum?: number | null;
  passThresholdPercent?: number | null;
}): Promise<void> {
  const { error } = await db.rpc('update_voting_proposal_settings', {
    p_proposal_id: input.proposalId,
    p_scope_kind: input.scopeKind,
    p_scope_country_code: input.scopeCountryCode || null,
    p_voting_opens_at: input.votingOpensAt || null,
    p_voting_closes_at: input.votingClosesAt || null,
    p_options: input.options && input.options.length > 0 ? input.options : null,
    p_quorum: input.quorum ?? null,
    p_pass_threshold: input.passThresholdPercent ?? null,
  });
  if (error) throw new Error(error.message);
}

/** True when this member may publish: managers always, authors once the support threshold is met. */
export function canPublishVotingProposal(input: {
  role: string | null | undefined;
  profileId: string | null | undefined;
  proposal: Pick<VotingProposal, 'createdByProfileId' | 'status'>;
  support: Pick<VotingProposalSupport, 'ready'> | null;
}): boolean {
  if (input.proposal.status !== 'draft') return false;
  if (canManageVotingProposals(input.role)) return true;
  return Boolean(input.profileId && input.profileId === input.proposal.createdByProfileId && input.support?.ready);
}

export function canManageVotingProposals(role: string | null | undefined): boolean {
  return role === 'founder' || role === 'admin' || role === 'system';
}

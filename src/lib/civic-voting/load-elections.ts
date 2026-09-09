import { supabase } from '@/integrations/supabase/client';
import {
  securityClassGatePolicy,
  type CivicCandidate,
  type CivicContest,
  type CivicElection,
  type CivicElectionSecurityClass,
  type CivicElectionStatus,
  type CivicElectionTier,
} from '@/lib/civic-voting';

/** Civic voting tables are not yet in generated Database types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type ElectionRow = {
  id: string;
  title: string;
  summary: string;
  body: string;
  tier: string;
  security_class: string;
  status: string;
  scope_country_code: string | null;
  scope_region_code: string | null;
  scope_locality_code: string | null;
  voting_opens_at: string;
  voting_closes_at: string;
  primary_window_seconds: number;
  max_attempts: number;
  retry_spacing_hours: number;
  require_home_presence: boolean;
  require_solitude: boolean;
  require_face_liveness: boolean;
  metadata: Record<string, unknown> | null;
};

type ContestRow = {
  id: string;
  election_id: string;
  title: string;
  summary: string;
  contest_kind: string;
  office_key: string | null;
  seat_count: number;
  allow_abstain: boolean;
  sort_order: number;
};

type CandidateRow = {
  id: string;
  contest_id: string;
  display_name: string;
  statement: string;
  profile_id: string | null;
  option_key: string | null;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

export type CivicElectionDetail = {
  election: CivicElection;
  contests: Array<CivicContest & { candidates: CivicCandidate[] }>;
  body: string;
  metadata: Record<string, unknown>;
  scopeRegionCode: string | null;
  scopeLocalityCode: string | null;
};

function mapElection(row: ElectionRow): CivicElection {
  const securityClass = row.security_class as CivicElectionSecurityClass;
  const policy = securityClassGatePolicy(securityClass);
  const metadata = (row.metadata || {}) as Record<string, unknown>;
  const sampleBatch =
    typeof metadata.sample_batch === 'string' && metadata.sample_batch.trim()
      ? metadata.sample_batch.trim()
      : null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    tier: row.tier as CivicElectionTier,
    securityClass,
    status: row.status as CivicElectionStatus,
    scopeCountryCode: row.scope_country_code,
    scopeRegionCode: row.scope_region_code,
    scopeLocalityCode: row.scope_locality_code,
    votingOpensAt: row.voting_opens_at,
    votingClosesAt: row.voting_closes_at,
    primaryWindowSeconds: row.primary_window_seconds || policy.primaryWindowSeconds,
    maxAttempts: row.max_attempts || policy.maxAttempts,
    retrySpacingHours: row.retry_spacing_hours || policy.retrySpacingHours,
    requireHomePresence: row.require_home_presence,
    requireSolitude: row.require_solitude,
    requireFaceLiveness: row.require_face_liveness,
    sampleBatch,
    metadata,
  };
}

export async function listCivicElections(): Promise<{
  elections: CivicElection[];
  error: string | null;
  backendUnavailable: boolean;
}> {
  const { data, error } = await db
    .from('civic_elections')
    .select(
      'id, title, summary, body, tier, security_class, status, scope_country_code, scope_region_code, scope_locality_code, voting_opens_at, voting_closes_at, primary_window_seconds, max_attempts, retry_spacing_hours, require_home_presence, require_solitude, require_face_liveness, metadata',
    )
    .order('tier', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    const message = error.message || 'load_failed';
    const backendUnavailable =
      /relation .* does not exist|could not find the table|schema cache/i.test(message);
    return { elections: [], error: message, backendUnavailable };
  }

  return {
    elections: ((data || []) as ElectionRow[]).map(mapElection),
    error: null,
    backendUnavailable: false,
  };
}

export async function loadCivicElectionDetail(electionId: string): Promise<{
  detail: CivicElectionDetail | null;
  error: string | null;
}> {
  const { data: electionRow, error: electionError } = await db
    .from('civic_elections')
    .select(
      'id, title, summary, body, tier, security_class, status, scope_country_code, scope_region_code, scope_locality_code, voting_opens_at, voting_closes_at, primary_window_seconds, max_attempts, retry_spacing_hours, require_home_presence, require_solitude, require_face_liveness, metadata',
    )
    .eq('id', electionId)
    .maybeSingle();

  if (electionError) {
    return { detail: null, error: electionError.message };
  }
  if (!electionRow) {
    return { detail: null, error: 'not_found' };
  }

  const { data: contestRows, error: contestError } = await db
    .from('civic_contests')
    .select('id, election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order')
    .eq('election_id', electionId)
    .order('sort_order', { ascending: true });

  if (contestError) {
    return { detail: null, error: contestError.message };
  }

  const contests = (contestRows || []) as ContestRow[];
  const contestIds = contests.map((c) => c.id);
  let candidates: CandidateRow[] = [];

  if (contestIds.length > 0) {
    const { data: candidateRows, error: candidateError } = await db
      .from('civic_candidates')
      .select('id, contest_id, display_name, statement, profile_id, option_key, sort_order, metadata')
      .in('contest_id', contestIds)
      .order('sort_order', { ascending: true });

    if (candidateError) {
      return { detail: null, error: candidateError.message };
    }
    candidates = (candidateRows || []) as CandidateRow[];
  }

  const election = mapElection(electionRow as ElectionRow);

  return {
    detail: {
      election,
      body: (electionRow as ElectionRow).body || '',
      metadata: ((electionRow as ElectionRow).metadata || {}) as Record<string, unknown>,
      scopeRegionCode: (electionRow as ElectionRow).scope_region_code,
      scopeLocalityCode: (electionRow as ElectionRow).scope_locality_code,
      contests: contests.map((contest) => ({
        id: contest.id,
        electionId: contest.election_id,
        title: contest.title,
        contestKind: contest.contest_kind as CivicContest['contestKind'],
        officeKey: contest.office_key,
        seatCount: contest.seat_count,
        allowAbstain: contest.allow_abstain,
        sortOrder: contest.sort_order,
        candidates: candidates
          .filter((candidate) => candidate.contest_id === contest.id)
          .map((candidate) => ({
            id: candidate.id,
            contestId: candidate.contest_id,
            displayName: candidate.display_name,
            statement: candidate.statement,
            profileId: candidate.profile_id,
            optionKey: candidate.option_key,
            sortOrder: candidate.sort_order,
          })),
      })),
    },
    error: null,
  };
}

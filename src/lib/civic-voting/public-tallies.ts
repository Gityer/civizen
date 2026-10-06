import { supabase } from '@/integrations/supabase/client';

/** Civic voting tables / RPCs are not yet in generated Database types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type CivicPublicTallyRow = {
  candidateId: string;
  optionKey: string | null;
  displayName: string;
  voteCount: number;
};

export type CivicVerificationSplit = {
  verified: number;
  unverified: number;
};

export type CivicCountryStatRow = {
  countryCode: string;
  participantCount: number;
};

export type CivicPublicDirectoryRow = {
  displayName: string;
  countryCode: string | null;
};

/**
 * Public aggregate tallies for an election (no individual ballot disclosure).
 * Counts countable non-duress selections that store a clear candidate_id.
 */
export async function loadCivicElectionPublicTallies(electionId: string): Promise<{
  tallies: CivicPublicTallyRow[];
  totalCountable: number;
  error: string | null;
}> {
  const { data, error } = await db.rpc('civic_election_public_tallies', {
    p_election_id: electionId,
  });

  if (error) {
    return { tallies: [], totalCountable: 0, error: error.message };
  }

  const rows = (data || []) as Array<{
    candidate_id: string;
    option_key: string | null;
    display_name: string;
    vote_count: number | string;
  }>;

  const tallies = rows.map((row) => ({
    candidateId: row.candidate_id,
    optionKey: row.option_key,
    displayName: row.display_name,
    voteCount: Number(row.vote_count) || 0,
  }));

  return {
    tallies,
    totalCountable: tallies.reduce((sum, row) => sum + row.voteCount, 0),
    error: null,
  };
}

/**
 * Self-declared country-of-residence participant counts.
 * Suppressed until ≥25 voters have a country; individual countries need ≥5.
 * Never returns ballot choices.
 */
export async function loadCivicElectionCountryStats(electionId: string): Promise<{
  rows: CivicCountryStatRow[];
  error: string | null;
}> {
  const { data, error } = await db.rpc('civic_election_country_stats', {
    p_election_id: electionId,
  });
  if (error) {
    return { rows: [], error: error.message };
  }
  const rows = ((data || []) as Array<{ country_code: string; participant_count: number | string }>).map(
    (row) => ({
      countryCode: row.country_code,
      participantCount: Number(row.participant_count) || 0,
    }),
  );
  return { rows, error: null };
}

/**
 * Optional consented public directory: display name + country only.
 */
export async function loadCivicElectionPublicDirectory(electionId: string): Promise<{
  rows: CivicPublicDirectoryRow[];
  error: string | null;
}> {
  const { data, error } = await db.rpc('civic_election_public_directory', {
    p_election_id: electionId,
  });
  if (error) {
    return { rows: [], error: error.message };
  }
  const rows = ((data || []) as Array<{ display_name: string; country_code: string | null }>).map(
    (row) => ({
      displayName: row.display_name,
      countryCode: row.country_code,
    }),
  );
  return { rows, error: null };
}

export async function myConsultationPublicPresence(electionId: string): Promise<boolean> {
  const { data, error } = await db.rpc('my_consultation_public_presence', {
    p_election_id: electionId,
  });
  if (error) return false;
  return Boolean(data);
}

export async function setConsultationPublicPresence(
  electionId: string,
  visible: boolean,
): Promise<boolean> {
  const { data, error } = await db.rpc('set_consultation_public_presence', {
    p_election_id: electionId,
    p_visible: visible,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/**
 * Countable ballots split by whether the voting account is identity-verified.
 * Aggregate only; never returns choices.
 */
export async function loadCivicElectionVerificationSplit(
  electionId: string,
): Promise<CivicVerificationSplit | null> {
  const { data, error } = await db.rpc('civic_election_verification_split', {
    p_election_id: electionId,
  });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { verified_count: number | string; unverified_count: number | string }
    | undefined;
  if (!row) return null;
  return {
    verified: Number(row.verified_count) || 0,
    unverified: Number(row.unverified_count) || 0,
  };
}
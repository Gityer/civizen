/**
 * Civic voting domain types — see docs/01-governance/participation/civic-voting-system-design-v0.1.md
 */

export type CivicElectionTier =
  | 'neighborhood'
  | 'local'
  | 'district'
  | 'regional'
  | 'national'
  | 'supranational';

export type CivicElectionSecurityClass = 'ordinary' | 'elevated' | 'constitutional';

export type CivicElectionStatus =
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'closed'
  | 'certified'
  | 'cancelled';

export type CivicContestKind = 'office' | 'measure' | 'open_nomination';

export type CivicVoteSessionStatus =
  | 'scheduled'
  | 'notified'
  | 'in_progress'
  | 'cast'
  | 'missed'
  | 'failed'
  | 'voided'
  | 'exhausted';

export type CivicVerificationCheckKind =
  | 'eligibility'
  | 'device'
  | 'location_home'
  | 'solitude'
  | 'liveness'
  | 'face_match'
  | 'attestation';

export type CivicVerificationCheckResult = 'passed' | 'failed' | 'skipped' | 'inconclusive';

export type CivicRiskSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type CivicElection = {
  id: string;
  title: string;
  summary: string;
  tier: CivicElectionTier;
  securityClass: CivicElectionSecurityClass;
  status: CivicElectionStatus;
  scopeCountryCode: string | null;
  scopeRegionCode: string | null;
  scopeLocalityCode: string | null;
  votingOpensAt: string;
  votingClosesAt: string;
  primaryWindowSeconds: number;
  maxAttempts: number;
  retrySpacingHours: number;
  requireHomePresence: boolean;
  requireSolitude: boolean;
  requireFaceLiveness: boolean;
  /** Present when this row is a demo / historical sample batch. */
  sampleBatch: string | null;
  metadata: Record<string, unknown>;
};

export type CivicContest = {
  id: string;
  electionId: string;
  title: string;
  contestKind: CivicContestKind;
  officeKey: string | null;
  seatCount: number;
  allowAbstain: boolean;
  sortOrder: number;
};

export type CivicCandidate = {
  id: string;
  contestId: string;
  displayName: string;
  statement: string;
  profileId: string | null;
  optionKey: string | null;
  sortOrder: number;
};

/** Demo / Wikipedia samples tagged in metadata.sample_batch. */
export function isCivicElectionSample(election: Pick<CivicElection, 'sampleBatch'>): boolean {
  return Boolean(election.sampleBatch?.trim());
}

/** Live catalog: non-sample open or scheduled contests. */
export function isCivicElectionActiveCatalog(election: CivicElection): boolean {
  if (isCivicElectionSample(election)) return false;
  return election.status === 'open' || election.status === 'scheduled';
}

/** History: samples plus closed / certified / cancelled (non-draft) contests. */
export function isCivicElectionHistoryCatalog(election: CivicElection): boolean {
  if (isCivicElectionSample(election)) return true;
  return (
    election.status === 'closed' ||
    election.status === 'certified' ||
    election.status === 'cancelled'
  );
}

/** Ordinary nonbinding consultation published from a voting proposal. */
export function isOrdinaryConsultationElection(
  election: Pick<CivicElection, 'securityClass' | 'metadata'>,
  optionKeys?: Array<string | null | undefined>,
): boolean {
  if (election.securityClass !== 'ordinary') return false;
  const kind = election.metadata?.consultation_kind;
  if (kind === 'nonbinding') return true;
  if (!optionKeys?.length) return false;
  const keys = new Set(
    optionKeys.map((key) => (key || '').trim().toLowerCase()).filter(Boolean),
  );
  return keys.has('support') && keys.has('oppose') && keys.has('abstain');
}

export const CIVIC_ELECTION_TIER_LABELS: Record<CivicElectionTier, string> = {
  neighborhood: 'Neighborhood',
  local: 'Local authority',
  district: 'District',
  regional: 'Regional',
  national: 'National',
  supranational: 'Supranational',
};

export const CIVIC_SECURITY_CLASS_LABELS: Record<CivicElectionSecurityClass, string> = {
  ordinary: 'Ordinary',
  elevated: 'Elevated',
  constitutional: 'Constitutional',
};

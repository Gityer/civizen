import type { Database } from '@/integrations/supabase/types';
import type { GovernanceVoteTally } from '@/lib/governance-proposals';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

/** A governance proposal exactly as stored (`governance_proposals`). */
export type GovernanceProposal = Tables['governance_proposals']['Row'];
export type GovernanceVote = Tables['governance_proposal_votes']['Row'];
export type GovernanceVoteChoice = Enums['governance_vote_choice'];
export type GovernanceProposalStatus = Enums['governance_proposal_status'];

/** `open` = voting can still happen; `closed` = approved, rejected or cancelled. */
export type GovernanceProposalFilter = 'open' | 'closed' | 'all';

/** Weighted tally plus the figures the UI shows. Percentages are of decisive (approve + reject) weight. */
export type GovernanceProposalResults = GovernanceVoteTally & {
  approvalPercentage: number;
  rejectionPercentage: number;
  requiredQuorum: number;
  quorumMet: boolean;
};

export type ConstitutionalOfficeKey = Enums['constitutional_office_key'];

/** One assignment of a constitutional office to a profile (`constitutional_offices`). */
export type ConstitutionalOfficeAssignment = Tables['constitutional_offices']['Row'] & {
  holder: { id: string; full_name: string | null; username: string | null } | null;
};

export type GovernancePermissions = {
  /** Eligible under the governance rules and not blocked by a sanction. */
  canVote: boolean;
  canCreateProposals: boolean;
  /** Matches the RLS policy on `constitutional_offices` (role.assign or settings.manage). */
  canManageOffices: boolean;
  isOfficeHolder: boolean;
  /** Office holders and administrators see the steward console. */
  canAccessStewardConsole: boolean;
};

import {
  isCivicElectionSample,
  resolveVotingWindow,
  type CivicElection,
  type MyConsultationBallot,
  type VotingProposal,
} from '@/lib/civic-voting';
import { permissionListHasAny } from '@/lib/access-control';

export type FinalTallyRow = { optionKey: string; displayName: string; voteCount: number };

/** The tally the close tick stored in `metadata.final_tally`, or an empty list. */
export function readFinalTally(metadata: Record<string, unknown> | null | undefined): FinalTallyRow[] {
  const raw = metadata?.final_tally;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      return {
        optionKey: String(item.option_key ?? ''),
        displayName: String(item.display_name ?? item.option_key ?? ''),
        voteCount: Number(item.vote_count) || 0,
      };
    })
    .filter((row) => row.optionKey !== '');
}

export type ElectionGroups = {
  open: CivicElection[];
  scheduled: CivicElection[];
  closed: CivicElection[];
};

/** Live (non-sample) elections grouped by their real voting window. */
export function groupElections(elections: CivicElection[], now: Date = new Date()): ElectionGroups {
  const groups: ElectionGroups = { open: [], scheduled: [], closed: [] };
  for (const election of elections) {
    if (isCivicElectionSample(election)) continue;
    if (election.status === 'draft' || election.status === 'cancelled') continue;
    if (String(election.metadata?.catalog ?? 'live') === 'demo') continue;
    const window = resolveVotingWindow(election, now);
    groups[window.state].push(election);
  }
  const byClose = (a: CivicElection, b: CivicElection) =>
    new Date(a.votingClosesAt).getTime() - new Date(b.votingClosesAt).getTime();
  groups.open.sort(byClose);
  groups.scheduled.sort(byClose);
  groups.closed.sort((a, b) => byClose(b, a));
  return groups;
}

export type ProposalGroups = {
  openForSupport: VotingProposal[];
  mine: VotingProposal[];
  published: VotingProposal[];
  closed: VotingProposal[];
};

export function groupProposals(proposals: VotingProposal[], profileId: string | null | undefined): ProposalGroups {
  const groups: ProposalGroups = { openForSupport: [], mine: [], published: [], closed: [] };
  for (const proposal of proposals) {
    if (proposal.status === 'draft') {
      if (profileId && proposal.createdByProfileId === profileId) groups.mine.push(proposal);
      else if (proposal.openForSupport) groups.openForSupport.push(proposal);
    } else if (proposal.status === 'published') {
      groups.published.push(proposal);
    } else {
      groups.closed.push(proposal);
    }
  }
  return groups;
}

const TOOL_ROLES = new Set(['founder', 'admin', 'system']);
const TOOL_PERMISSIONS = ['role.assign', 'settings.manage'];

/** Steward / workspace tools are advanced depth: shown only to people who can act there. */
export function canAccessGovernanceTools(input: {
  role: string | null | undefined;
  permissions: readonly string[] | null | undefined;
  officeKeys: readonly string[] | null | undefined;
}): boolean {
  if (input.role && TOOL_ROLES.has(input.role)) return true;
  if (permissionListHasAny(input.permissions ?? [], TOOL_PERMISSIONS)) return true;
  return Boolean(input.officeKeys && input.officeKeys.length > 0);
}

/** Open votes · My votes · Proposals · Results · Tools (step 2.3). `votes` is the pre-2.3 name of `open`. */
export type GovernanceMemberTab = 'open' | 'mine' | 'proposals' | 'results' | 'tools';

export function readGovernanceTab(search: string, toolsAllowed: boolean): GovernanceMemberTab {
  const value = new URLSearchParams(search).get('tab');
  if (value === 'mine') return 'mine';
  if (value === 'proposals') return 'proposals';
  if (value === 'results') return 'results';
  if (value === 'tools' && toolsAllowed) return 'tools';
  return 'open';
}

/** Elections (open or closed) the member has a ballot in, newest closing first. */
export function electionsWithMyBallot(
  groups: ElectionGroups,
  ballots: Record<string, Pick<MyConsultationBallot, 'optionKey'> | null | undefined>,
): { open: CivicElection[]; closed: CivicElection[] } {
  const voted = (election: CivicElection) => Boolean(ballots[election.id]?.optionKey);
  return { open: groups.open.filter(voted), closed: groups.closed.filter(voted) };
}

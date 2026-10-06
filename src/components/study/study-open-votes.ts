import { isCivicElectionActiveCatalog, type CivicElection } from '@/lib/civic-voting';

const MAX_ROWS = 5;

/** Live, open, non-sample elections for the Study "Open votes" card. */
export function selectOpenVotes(elections: CivicElection[]): CivicElection[] {
  return elections
    .filter((election) => election.status === 'open' && isCivicElectionActiveCatalog(election))
    .slice(0, MAX_ROWS);
}

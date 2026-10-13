import { callRpc } from '@/lib/supabase-rpc';

/** Election administration (v2 step C2). Server rules: `20261013170000_election_administration.sql`. */

export type ElectionAdminStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'certified' | 'cancelled';

export type ElectionAdminItem = {
  electionId: string;
  title: string;
  status: ElectionAdminStatus;
  opensAt: string | null;
  closesAt: string | null;
  proposalId: string | null;
  countableBallots: number;
  certificationRequestedBy: string | null;
  certificationRequestedAt: string | null;
  certificationRequestedByMe: boolean;
  cancelReason: string | null;
};

export type ElectionAdminAction = 'reschedule' | 'extend' | 'cancel' | 'requestCertification' | 'certify';

export type ElectionAdminHistoryEntry = {
  eventType: string;
  actorUsername: string | null;
  reason: string | null;
  createdAt: string;
};

/** Extension limit enforced by the server: at most 14 days more at once. */
export const ELECTION_MAX_EXTENSION_DAYS = 14;

/** Which actions an administrator may take on an election in its current state. */
export function availableElectionAdminActions(item: ElectionAdminItem, now = Date.now()): ElectionAdminAction[] {
  const closesAt = item.closesAt ? Date.parse(item.closesAt) : NaN;
  switch (item.status) {
    case 'scheduled':
      return ['reschedule', 'extend', 'cancel'];
    case 'open':
      return Number.isFinite(closesAt) && closesAt > now ? ['extend', 'cancel'] : [];
    case 'closed':
      if (!item.certificationRequestedAt) return ['requestCertification'];
      return item.certificationRequestedByMe ? [] : ['certify'];
    default:
      return [];
  }
}


export async function canAdministerElections(): Promise<boolean> {
  try {
    return Boolean(await callRpc('my_can_administer_elections'));
  } catch {
    return false;
  }
}

type ListRow = {
  election_id: string;
  title: string;
  status: ElectionAdminStatus;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  proposal_id: string | null;
  countable_ballots: number | string;
  certification_requested_by: string | null;
  certification_requested_at: string | null;
  certification_requested_by_me: boolean | null;
  cancel_reason: string | null;
};

export async function listElectionsForAdministration(): Promise<ElectionAdminItem[]> {
  const rows = ((await callRpc('election_admin_list')) ?? []) as unknown as ListRow[];
  return rows.map((row) => ({
    electionId: row.election_id,
    title: row.title,
    status: row.status,
    opensAt: row.voting_opens_at,
    closesAt: row.voting_closes_at,
    proposalId: row.proposal_id,
    countableBallots: Number(row.countable_ballots) || 0,
    certificationRequestedBy: row.certification_requested_by,
    certificationRequestedAt: row.certification_requested_at,
    certificationRequestedByMe: Boolean(row.certification_requested_by_me),
    cancelReason: row.cancel_reason,
  }));
}

type HistoryRow = { event_type: string; actor_username: string | null; payload: Record<string, unknown> | null; created_at: string };

export async function loadElectionAdminHistory(electionId: string): Promise<ElectionAdminHistoryEntry[]> {
  const rows = ((await callRpc('election_admin_history', { p_election_id: electionId })) ?? []) as unknown as HistoryRow[];
  return rows.map((row) => ({
    eventType: row.event_type,
    actorUsername: row.actor_username,
    reason: typeof row.payload?.reason === 'string' ? row.payload.reason : typeof row.payload?.note === 'string' ? row.payload.note : null,
    createdAt: row.created_at,
  }));
}

export async function rescheduleElection(electionId: string, opensAt: string, closesAt: string, reason: string): Promise<void> {
  await callRpc('admin_reschedule_election', { p_election_id: electionId, p_opens_at: opensAt, p_closes_at: closesAt, p_reason: reason });
}

export async function extendElection(electionId: string, closesAt: string, reason: string): Promise<void> {
  await callRpc('admin_extend_election', { p_election_id: electionId, p_closes_at: closesAt, p_reason: reason });
}

export async function cancelElection(electionId: string, reason: string): Promise<void> {
  await callRpc('admin_cancel_election', { p_election_id: electionId, p_reason: reason });
}

export async function requestElectionCertification(electionId: string, note: string): Promise<void> {
  await callRpc('request_election_certification', { p_election_id: electionId, p_note: note || undefined });
}

export async function certifyElection(electionId: string): Promise<void> {
  await callRpc('certify_election', { p_election_id: electionId });
}

/** Server error code → translation key under `electionAdmin.errors`. */
export function electionAdminErrorKey(message: string): string {
  const known = [
    'reason_required', 'extension_must_be_later', 'extension_too_long', 'election_already_closed', 'opens_in_past',
    'window_too_short', 'window_too_long', 'second_person_required', 'certification_already_requested',
  ];
  const code = known.find((candidate) => message.includes(candidate));
  return code ? `electionAdmin.errors.${code}` : 'electionAdmin.errors.generic';
}

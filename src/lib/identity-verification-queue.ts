import { supabase } from '@/integrations/supabase/client';
import { callRpc } from '@/lib/supabase-rpc';
import type { IdentityVerificationArtifactRow } from '@/lib/identity-verification-types';

/** Reasons a reviewer gives when rejecting or asking for more information (v2 step C1). Same list as the server. */
export const IDENTITY_REVIEW_REASON_CODES = [
  'document_unreadable',
  'document_expired',
  'document_missing',
  'selfie_unclear',
  'selfie_mismatch',
  'details_mismatch',
  'underage',
  'duplicate_identity',
  'other',
] as const;
export type IdentityReviewReasonCode = (typeof IDENTITY_REVIEW_REASON_CODES)[number];

/** Target from decision E7: a verification is decided within 48 hours of submission. */
export const IDENTITY_REVIEW_TARGET_HOURS = 48;

export type IdentityReviewQueueItem = {
  caseId: string;
  profileId: string;
  username: string | null;
  fullName: string | null;
  country: string | null;
  status: 'submitted' | 'in_review';
  submittedAt: string | null;
  ageHours: number;
  assignedTo: string | null;
  assignedUsername: string | null;
  infoRequestCount: number;
  resubmission: boolean;
  noteCount: number;
  artifacts: IdentityVerificationArtifactRow[];
};

export type IdentityReviewQueueFilter = 'all' | 'unassigned' | 'mine' | 'overdue';

export type IdentityReviewHistoryEntry = {
  id: string;
  kind: string;
  reasonCode: string | null;
  note: string | null;
  actorUsername: string | null;
  createdAt: string;
};

export function isIdentityReviewOverdue(ageHours: number): boolean {
  return ageHours >= IDENTITY_REVIEW_TARGET_HOURS;
}

export function filterIdentityReviewQueue(
  items: IdentityReviewQueueItem[],
  filter: IdentityReviewQueueFilter,
  selfId: string | null | undefined,
): IdentityReviewQueueItem[] {
  switch (filter) {
    case 'unassigned':
      return items.filter((item) => !item.assignedTo);
    case 'mine':
      return items.filter((item) => Boolean(selfId) && item.assignedTo === selfId);
    case 'overdue':
      return items.filter((item) => isIdentityReviewOverdue(item.ageHours));
    default:
      return items;
  }
}


/** True when the signed-in member may review identity verifications (staff or Identity Verification domain). */
export async function canReviewIdentityVerification(): Promise<boolean> {
  try {
    return Boolean(await callRpc('can_review_identity_verification_storage'));
  } catch {
    return false;
  }
}

type QueueRow = {
  case_id: string;
  profile_id: string;
  username: string | null;
  full_name: string | null;
  country: string | null;
  status: 'submitted' | 'in_review';
  submitted_at: string | null;
  age_hours: number | string;
  assigned_to: string | null;
  assigned_username: string | null;
  info_request_count: number;
  resubmission: boolean;
  note_count: number;
};

export async function listIdentityReviewQueue(): Promise<IdentityReviewQueueItem[]> {
  const rows = ((await callRpc('identity_verification_queue')) ?? []) as unknown as QueueRow[];
  if (rows.length === 0) return [];
  const { data: artifacts, error } = await supabase
    .from('identity_verification_artifacts')
    .select('*')
    .in('case_id', rows.map((row) => row.case_id))
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const byCase = new Map<string, IdentityVerificationArtifactRow[]>();
  for (const artifact of artifacts ?? []) {
    byCase.set(artifact.case_id, [...(byCase.get(artifact.case_id) ?? []), artifact]);
  }
  return rows.map((row) => ({
    caseId: row.case_id,
    profileId: row.profile_id,
    username: row.username,
    fullName: row.full_name,
    country: row.country,
    status: row.status,
    submittedAt: row.submitted_at,
    ageHours: Number(row.age_hours) || 0,
    assignedTo: row.assigned_to,
    assignedUsername: row.assigned_username,
    infoRequestCount: row.info_request_count ?? 0,
    resubmission: Boolean(row.resubmission),
    noteCount: row.note_count ?? 0,
    artifacts: byCase.get(row.case_id) ?? [],
  }));
}

export async function releaseIdentityVerificationCase(caseId: string): Promise<void> {
  await callRpc('release_identity_verification_case', { p_case_id: caseId });
}

export async function requestIdentityVerificationInfo(caseId: string, reasonCode: IdentityReviewReasonCode, message: string): Promise<void> {
  await callRpc('request_identity_verification_info', { p_case_id: caseId, p_reason_code: reasonCode, p_message: message });
}

export async function addIdentityVerificationCaseNote(caseId: string, note: string): Promise<void> {
  await callRpc('add_identity_verification_case_note', { p_case_id: caseId, p_note: note });
}

type HistoryRow = { id: string; kind: string; reason_code: string | null; note: string | null; actor_username: string | null; created_at: string };

export async function loadIdentityVerificationCaseHistory(caseId: string): Promise<IdentityReviewHistoryEntry[]> {
  const rows = ((await callRpc('identity_verification_case_history', { p_case_id: caseId })) ?? []) as unknown as HistoryRow[];
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    reasonCode: row.reason_code,
    note: row.note,
    actorUsername: row.actor_username,
    createdAt: row.created_at,
  }));
}

/** What the member was last told about their case (shown on their verification settings). */
export type IdentityVerificationLastDecision = {
  kind: 'info_requested' | 'rejected' | 'approved';
  reasonCode: string | null;
  message: string | null;
};

export function readLastIdentityDecision(metadata: unknown): IdentityVerificationLastDecision | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).last_decision;
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const kind = value.kind;
  if (kind !== 'info_requested' && kind !== 'rejected' && kind !== 'approved') return null;
  return {
    kind,
    reasonCode: typeof value.reason_code === 'string' ? value.reason_code : null,
    message: typeof value.message === 'string' ? value.message : null,
  };
}

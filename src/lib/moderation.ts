import { supabase } from '@/integrations/supabase/client';

/** What can be reported (v2 step A6). Message reports keep their own flow in the chat. */
export const MODERATION_TARGET_KINDS = ['post', 'post_comment', 'matter', 'matter_comment', 'solution_comment', 'job_listing', 'user'] as const;
export type ModerationTargetKind = (typeof MODERATION_TARGET_KINDS)[number];

/** Same list as public.moderation_reason_codes(); the order is the order shown in the report dialog. */
export const MODERATION_REASON_CODES = ['spam', 'harassment', 'hate', 'violence', 'sexual', 'misinformation', 'privacy', 'illegal', 'other'] as const;
export type ModerationReasonCode = (typeof MODERATION_REASON_CODES)[number];

export type ModerationQueueItem = {
  targetKind: ModerationTargetKind;
  targetId: string;
  authorProfileId: string | null;
  authorUsername: string | null;
  excerpt: string;
  reportCount: number;
  reasonCodes: string[];
  firstReportedAt: string;
  lastReportedAt: string;
  claimedBy: string | null;
  claimedByUsername: string | null;
};

export type ModerationAction = {
  id: string;
  targetKind: ModerationTargetKind;
  targetId: string;
  excerpt: string;
  reasonCode: string;
  note: string | null;
  createdAt: string;
  moderatorProfileId: string | null;
  authorProfileId: string | null;
  authorUsername: string | null;
  restoredAt: string | null;
  appealText: string | null;
  appealedAt: string | null;
  appealDecision: 'upheld' | 'overturned' | null;
  appealNote: string | null;
  appealDecidedAt: string | null;
};

export function isReasonCode(value: string): value is ModerationReasonCode {
  return (MODERATION_REASON_CODES as readonly string[]).includes(value);
}

/** Where the moderator opens the reported item. */
export function moderationTargetRoute(kind: ModerationTargetKind, id: string): string | null {
  switch (kind) {
    case 'matter':
      return `/contribute/matters/${id}`;
    case 'user':
      return `/user/${id}`;
    case 'job_listing':
      return '/market?section=jobs';
    default:
      return null;
  }
}

function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || 'moderation_failed');
}

export async function reportContent(kind: ModerationTargetKind, id: string, reason: ModerationReasonCode, details?: string): Promise<string> {
  const { data, error } = await supabase.rpc('report_content', {
    p_target_kind: kind,
    p_target_id: id,
    p_reason_code: reason,
    p_details: details?.trim() || undefined,
  });
  if (error) fail(error);
  return String(data);
}

export async function loadModerationQueue(): Promise<ModerationQueueItem[]> {
  const { data, error } = await supabase.rpc('moderation_queue');
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    targetKind: row.target_kind as ModerationTargetKind,
    targetId: row.target_id,
    authorProfileId: row.author_profile_id,
    authorUsername: row.author_username,
    excerpt: row.excerpt ?? '',
    reportCount: row.report_count,
    reasonCodes: row.reason_codes ?? [],
    firstReportedAt: row.first_reported_at,
    lastReportedAt: row.last_reported_at,
    claimedBy: row.claimed_by,
    claimedByUsername: row.claimed_by_username,
  }));
}

export async function claimModerationTarget(kind: ModerationTargetKind, id: string): Promise<void> {
  const { error } = await supabase.rpc('moderation_claim', { p_target_kind: kind, p_target_id: id });
  if (error) fail(error);
}

export async function hideModerationTarget(kind: ModerationTargetKind, id: string, reason: ModerationReasonCode, note?: string): Promise<void> {
  const { error } = await supabase.rpc('moderation_hide', {
    p_target_kind: kind,
    p_target_id: id,
    p_reason_code: reason,
    p_note: note?.trim() || undefined,
  });
  if (error) fail(error);
}

export async function dismissModerationTarget(kind: ModerationTargetKind, id: string, note?: string): Promise<void> {
  const { error } = await supabase.rpc('moderation_dismiss', { p_target_kind: kind, p_target_id: id, p_note: note?.trim() || undefined });
  if (error) fail(error);
}

export async function appealModerationAction(actionId: string, text: string): Promise<void> {
  const { error } = await supabase.rpc('moderation_appeal', { p_action_id: actionId, p_text: text });
  if (error) fail(error);
}

export async function decideModerationAppeal(actionId: string, overturn: boolean, note?: string): Promise<void> {
  const { error } = await supabase.rpc('moderation_decide_appeal', {
    p_action_id: actionId,
    p_overturn: overturn,
    p_note: note?.trim() || undefined,
  });
  if (error) fail(error);
}

export async function loadModerationActions(scope: 'mine' | 'appeals'): Promise<ModerationAction[]> {
  const { data, error } = await supabase.rpc('moderation_actions_list', { p_scope: scope });
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    targetKind: row.target_kind as ModerationTargetKind,
    targetId: row.target_id,
    excerpt: row.excerpt ?? '',
    reasonCode: row.reason_code,
    note: row.note,
    createdAt: row.created_at,
    moderatorProfileId: row.moderator_profile_id,
    authorProfileId: row.author_profile_id,
    authorUsername: row.author_username,
    restoredAt: row.restored_at,
    appealText: row.appeal_text,
    appealedAt: row.appealed_at,
    appealDecision: (row.appeal_decision as ModerationAction['appealDecision']) ?? null,
    appealNote: row.appeal_note,
    appealDecidedAt: row.appeal_decided_at,
  }));
}

/** Server error codes the UI explains in plain words; anything else is a generic failure. */
export function moderationErrorKey(message: string): string {
  const known = ['cannot_report_own_content', 'already_hidden', 'appeal_needs_another_moderator', 'already_appealed', 'cannot_moderate_own_content'];
  const hit = known.find((code) => message.includes(code));
  return hit ? `moderation.errors.${hit}` : 'moderation.errors.generic';
}

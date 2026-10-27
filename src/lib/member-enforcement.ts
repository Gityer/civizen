import { supabase } from '@/integrations/supabase/client';
import { errorWithFields } from '@/lib/rate-limit';
import type { ModerationReasonCode } from '@/lib/moderation';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Enforcement steps for members (PM decision TD2), lowest first. Removal is not available yet. */
export const ENFORCEMENT_STEPS = ['note', 'warning', 'content_restriction', 'messaging_restriction', 'suspension'] as const;
export type EnforcementStep = (typeof ENFORCEMENT_STEPS)[number];

/** Guidelines items for which a moderator may skip rungs (violence, sexual content involving minors, private information, illegal content). */
export const SEVERE_REASONS: readonly ModerationReasonCode[] = ['violence', 'sexual', 'privacy', 'illegal'];

export type EnforcementAction = {
  id: string;
  profileId: string;
  username: string | null;
  step: EnforcementStep;
  reasonCode: string;
  note: string | null;
  moderatorProfileId: string | null;
  createdAt: string;
  endsAt: string | null;
  liftedAt: string | null;
  appealText: string | null;
  appealedAt: string | null;
  appealDecision: 'upheld' | 'overturned' | null;
  appealNote: string | null;
  appealDecidedAt: string | null;
};

export function isEnforcementStep(value: string): value is EnforcementStep {
  return (ENFORCEMENT_STEPS as readonly string[]).includes(value);
}

/** True while the step still applies: notes and warnings stand until overturned; restrictions until they end. */
export function isStanding(action: Pick<EnforcementAction, 'endsAt' | 'liftedAt' | 'appealDecision'>, now: Date = new Date()): boolean {
  if (action.liftedAt || action.appealDecision === 'overturned') return false;
  return action.endsAt === null || new Date(action.endsAt).getTime() > now.getTime();
}

/** The highest step a moderator may apply next for a non-severe reason (a first step may be a note or a warning). */
export function highestAllowedStep(history: EnforcementAction[]): EnforcementStep {
  // as the server counts it: every step not lifted or overturned, ended restrictions included
  const standing = history
    .filter((action) => action.appealDecision !== 'overturned' && !action.liftedAt)
    .map((action) => ENFORCEMENT_STEPS.indexOf(action.step));
  const top = standing.length ? Math.max(...standing) : 0;
  return ENFORCEMENT_STEPS[Math.min(Math.max(top, 0) + 1, ENFORCEMENT_STEPS.length - 1)];
}

function mapAction(row: Record<string, unknown>): EnforcementAction {
  const text = (value: unknown) => (typeof value === 'string' ? value : null);
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    username: text(row.username),
    step: (isEnforcementStep(String(row.step)) ? row.step : 'note') as EnforcementStep,
    reasonCode: String(row.reason_code ?? ''),
    note: text(row.note),
    moderatorProfileId: text(row.moderator_profile_id),
    createdAt: String(row.created_at ?? ''),
    endsAt: text(row.ends_at),
    liftedAt: text(row.lifted_at),
    appealText: text(row.appeal_text),
    appealedAt: text(row.appealed_at),
    appealDecision: row.appeal_decision === 'upheld' || row.appeal_decision === 'overturned' ? row.appeal_decision : null,
    appealNote: text(row.appeal_note),
    appealDecidedAt: text(row.appeal_decided_at),
  };
}

function fail(error: { message?: string; code?: unknown; details?: unknown; hint?: unknown } | null): never {
  throw errorWithFields(error?.message || 'moderation_failed', error);
}

export async function loadEnforcementActions(scope: 'mine' | 'appeals' | 'member', profileId?: string): Promise<EnforcementAction[]> {
  const { data, error } = await supabase.rpc('moderation_enforcement_list', { p_scope: scope, p_profile: profileId });
  if (error) fail(error);
  return ((data ?? []) as Record<string, unknown>[]).map(mapAction);
}

export async function enforceMember(profileId: string, step: EnforcementStep, reason: ModerationReasonCode, note?: string): Promise<string> {
  const { data, error } = await supabase.rpc('moderation_enforce', {
    p_profile: profileId,
    p_step: step,
    p_reason_code: reason,
    p_note: note?.trim() || undefined,
  });
  if (error) fail(error);
  return String(data);
}

export async function appealEnforcement(actionId: string, text: string): Promise<void> {
  const { error } = await supabase.rpc('moderation_enforcement_appeal', { p_action_id: actionId, p_text: text });
  if (error) fail(error);
}

export async function decideEnforcementAppeal(actionId: string, overturn: boolean, note?: string): Promise<void> {
  const { error } = await supabase.rpc('moderation_enforcement_decide_appeal', {
    p_action_id: actionId,
    p_overturn: overturn,
    p_note: note?.trim() || undefined,
  });
  if (error) fail(error);
}

/**
 * The member-facing sentence when a write was refused because of a standing restriction (SQLSTATE PT403: the
 * restriction in `details`, its end in `hint`), or null for any other error.
 */
export function restrictionMessage(value: unknown, t: Translate, language?: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const error = value as { code?: unknown; details?: unknown; hint?: unknown };
  if (error.code !== 'PT403') return null;
  const kind = error.details === 'suspension' || error.details === 'messaging_restriction' ? error.details : 'content_restriction';
  const until = typeof error.hint === 'string' ? new Date(error.hint) : null;
  const date = until && !Number.isNaN(until.getTime())
    ? until.toLocaleString(language || undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
  return t(`memberEnforcement.refused.${kind}`, { date });
}

/** True when sign-in failed because the account is suspended (GoTrue answers `user_banned`). */
export function isSuspendedSignInError(error: { code?: unknown; message?: unknown } | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'user_banned' || (typeof error.message === 'string' && /banned/i.test(error.message));
}

const ENFORCEMENT_ERRORS = ['step_too_high', 'note_required', 'cannot_moderate_self', 'member_not_found'];

/** i18n key for a failed enforcement call: the ladder's own errors first, then the shared moderation ones. */
export function enforcementErrorKey(message: string, fallback: (message: string) => string): string {
  const hit = ENFORCEMENT_ERRORS.find((code) => message.includes(code));
  return hit ? `memberEnforcement.errors.${hit}` : fallback(message);
}

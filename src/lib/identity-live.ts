import { supabase } from '@/integrations/supabase/client';
import type { FaceMatchResult, LivenessResult, Move } from '@/lib/face-checks';

/**
 * In-house live identity verification (see docs/04-operations/dev/identity-verification-manual.md): a random challenge
 * from the server, a live recording, the document photo and its machine-readable zone, the device's liveness and face
 * match results, and explicit consent; reviewers decide. Required before posting, commenting, messaging people,
 * supporting and voting.
 */
export const IDENTITY_CONSENT_VERSION = 'identity-live-2026-10-30';
export { VERIFICATION_REQUIRED_EVENT, requestVerification } from '@/lib/verification-signal';

export type LiveChallenge = { code: string; moves: Move[]; expiresAt: string };
export type LiveStart =
  | { status: 'verified' }
  | { status: 'submitted' | 'in_review'; caseId: string; submittedAt: string | null; reverification: boolean }
  | { status: 'draft'; caseId: string; challenge: LiveChallenge; reverification: boolean };

export type VerificationState = {
  verified: boolean;
  status: string | null;
  submittedAt: string | null;
  /** The latest check was a re-verification of an already verified member: it never changes the current status. */
  reverification: boolean;
  lastDecision: { decision?: string; reason_code?: string; notes?: string } | null;
};

type Row = Record<string, unknown>;
const str = (value: unknown): string => (typeof value === 'string' ? value : '');

export function parseLiveStart(raw: unknown): LiveStart {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Row;
  const status = str(r.status);
  if (status === 'verified') return { status: 'verified' };
  const reverification = r.reverification === true;
  if (status === 'submitted' || status === 'in_review') return { status, caseId: str(r.case_id), submittedAt: str(r.submitted_at) || null, reverification };
  const c = (r.challenge && typeof r.challenge === 'object' ? r.challenge : {}) as Row;
  const moves = Array.isArray(c.moves) ? (c.moves as unknown[]).map(str).filter((m): m is Move => ['left', 'right', 'up', 'down'].includes(m)) : [];
  return { status: 'draft', caseId: str(r.case_id), challenge: { code: str(c.code), moves, expiresAt: str(c.expires_at) }, reverification };
}

function fail(error: { message?: string; details?: string } | null): void {
  if (error) throw Object.assign(new Error(error.message || 'request_failed'), { details: error.details });
}

/** Starts (or resumes) the live check; reverify lets an already verified member check again without losing the status. */
export async function startLiveVerification(reverify = false): Promise<LiveStart> {
  const { data, error } = await supabase.rpc('start_live_verification', { p_reverify: reverify });
  fail(error);
  return parseLiveStart(data);
}

export async function uploadIdentityMedia(profileId: string, caseId: string, name: string, blob: Blob): Promise<string> {
  const path = `${profileId}/${caseId}/${name}`;
  const { error } = await supabase.storage.from('identity-verification').upload(path, blob, { contentType: blob.type || undefined, upsert: true });
  fail(error);
  return path;
}

export async function submitLiveVerification(input: {
  videoPath: string;
  documentPath: string;
  mrz: string;
  liveness: LivenessResult;
  faceMatch: FaceMatchResult;
}): Promise<{ status: string; flags: string[] }> {
  const { data, error } = await supabase.rpc('submit_live_verification', {
    p_video_path: input.videoPath, p_document_path: input.documentPath, p_mrz: input.mrz,
    p_consent_version: IDENTITY_CONSENT_VERSION, p_device_checks: { liveness: input.liveness, face_match: input.faceMatch },
  });
  fail(error);
  const r = (data ?? {}) as Row;
  return { status: str(r.status), flags: Array.isArray(r.flags) ? (r.flags as unknown[]).map(str) : [] };
}

export async function loadMyVerificationState(): Promise<VerificationState> {
  const { data, error } = await supabase.rpc('my_verification_state');
  fail(error);
  const r = (data ?? {}) as Row;
  return {
    verified: r.verified === true, status: str(r.status) || null, submittedAt: str(r.submitted_at) || null, reverification: r.reverification === true,
    lastDecision: r.last_decision && typeof r.last_decision === 'object' ? (r.last_decision as VerificationState['lastDecision']) : null,
  };
}

/** Whether a refused write (or a vote) was refused because the member's identity is not verified yet. */
export function isVerificationRequired(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; details?: string; message?: string };
  return e.details === 'verification_required' || e.message === 'verification_required'
    || (typeof e.message === 'string' && e.message.includes('verification_required'));
}

/** The path that brings the member through verification and back; reverify starts a re-verification. */
export function verifyPath(next: string, reverify = false): string {
  return `/verify?next=${encodeURIComponent(next.startsWith('/') && !next.startsWith('//') ? next : '/')}${reverify ? '&reverify=1' : ''}`;
}

const VERIFY_ERRORS = ['mrz_invalid', 'document_expired', 'media_missing', 'consent_required', 'challenge_expired', 'start_first'];

export function verificationErrorKey(message: string): string {
  const hit = VERIFY_ERRORS.find((code) => message.includes(code));
  return hit ? `verify.errors.${hit}` : 'verify.errors.generic';
}

/** Whether a stored file is a recording rather than a photo (live checks store a short clip). */
export function isVideoPath(path: string | null | undefined): boolean {
  return Boolean(path && /\.(webm|mp4)$/i.test(path));
}

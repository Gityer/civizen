import { supabase } from '@/integrations/supabase/client';
import {
  IDENTITY_VERIFICATION_BUCKET,
  type IdentityVerificationArtifactKind,
  type IdentityVerificationArtifactRow,
  type IdentityVerificationDecision,
  type PendingIdentityVerificationCase,
} from '@/lib/identity-verification-types';

export async function createSignedIdentityArtifactUrl(
  storagePath: string,
  expiresInSeconds = 60 * 15,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(IDENTITY_VERIFICATION_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data?.signedUrl ?? null;
}

export async function listPendingIdentityVerificationCases(): Promise<PendingIdentityVerificationCase[]> {
  const { data: cases, error } = await supabase
    .from('identity_verification_cases')
    .select('*')
    .in('status', ['submitted', 'in_review'])
    .order('submitted_at', { ascending: true });

  if (error) {
    throw error;
  }

  if (!cases?.length) {
    return [];
  }

  const profileIds = [...new Set(cases.map((row) => row.profile_id))];
  const caseIds = cases.map((row) => row.id);

  const [{ data: profiles, error: profilesError }, { data: artifacts, error: artifactsError }] = await Promise.all([
    supabase.from('profiles').select('id, username, full_name').in('id', profileIds),
    supabase.from('identity_verification_artifacts').select('*').in('case_id', caseIds).order('created_at', { ascending: false }),
  ]);

  if (profilesError) {
    throw profilesError;
  }
  if (artifactsError) {
    throw artifactsError;
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const artifactsByCase = new Map<string, IdentityVerificationArtifactRow[]>();
  for (const artifact of artifacts ?? []) {
    const list = artifactsByCase.get(artifact.case_id) ?? [];
    list.push(artifact);
    artifactsByCase.set(artifact.case_id, list);
  }

  return cases.map((caseRow) => {
    const profile = profileById.get(caseRow.profile_id);
    return {
      caseRow,
      profileId: caseRow.profile_id,
      profileUsername: profile?.username ?? null,
      profileFullName: profile?.full_name ?? null,
      artifacts: artifactsByCase.get(caseRow.id) ?? [],
    };
  });
}

/** Decide a submitted case (Phase 3 step 3.3): the server assigns it, runs the duplicate-identity check, records the review and notifies the member. */
export async function reviewIdentityVerificationCase(args: {
  caseId: string;
  reviewerId: string;
  decision: Extract<IdentityVerificationDecision, 'approved' | 'rejected'>;
  notes?: string | null;
}): Promise<void> {
  const { data, error } = await supabase.rpc('decide_identity_verification_case', {
    p_case_id: args.caseId,
    p_decision: args.decision,
    p_notes: args.notes ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
  const status = (data as { status?: string } | null)?.status;
  if (status === 'duplicate_identity') {
    throw new Error('duplicate_identity');
  }
}

/** Reviewer takes a case (status in_review, assignment recorded). */
export async function assignIdentityVerificationCase(caseId: string): Promise<void> {
  const { error } = await supabase.rpc('assign_identity_verification_case', { p_case_id: caseId });
  if (error) throw new Error(error.message);
}

/** Users admin emergency override: always with a reason, always logged server-side. */
export async function setProfileVerifiedOverride(profileId: string, verified: boolean, reason: string): Promise<void> {
  const { error } = await supabase.rpc('set_profile_verified_override', {
    p_profile_id: profileId,
    p_verified: verified,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export function latestArtifactOfKind(
  artifacts: IdentityVerificationArtifactRow[],
  kind: IdentityVerificationArtifactKind,
): IdentityVerificationArtifactRow | null {
  return artifacts.find((artifact) => artifact.artifact_kind === kind && Boolean(artifact.storage_path)) ?? null;
}

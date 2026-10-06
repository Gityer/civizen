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

export async function reviewIdentityVerificationCase(args: {
  caseId: string;
  reviewerId: string;
  decision: Extract<IdentityVerificationDecision, 'approved' | 'rejected'>;
  notes?: string | null;
}): Promise<void> {
  if (args.decision === 'approved' || args.decision === 'rejected') {
    const { error: statusError } = await supabase
      .from('identity_verification_cases')
      .update({ status: 'in_review' })
      .eq('id', args.caseId)
      .in('status', ['submitted', 'in_review']);

    if (statusError) {
      throw statusError;
    }
  }

  const { error } = await supabase.from('identity_verification_reviews').insert({
    case_id: args.caseId,
    reviewer_id: args.reviewerId,
    decision: args.decision,
    notes: args.notes ?? null,
  });

  if (error) {
    throw error;
  }
}

export function latestArtifactOfKind(
  artifacts: IdentityVerificationArtifactRow[],
  kind: IdentityVerificationArtifactKind,
): IdentityVerificationArtifactRow | null {
  return artifacts.find((artifact) => artifact.artifact_kind === kind && Boolean(artifact.storage_path)) ?? null;
}

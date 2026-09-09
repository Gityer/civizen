import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export const IDENTITY_VERIFICATION_BUCKET = 'identity-verification';

export type IdentityVerificationCaseStatus = Database['public']['Enums']['identity_verification_case_status'];
export type IdentityVerificationArtifactKind = Database['public']['Enums']['identity_verification_artifact_kind'];
export type IdentityVerificationDecision = Database['public']['Enums']['identity_verification_decision'];

export type IdentityVerificationCaseRow = Database['public']['Tables']['identity_verification_cases']['Row'];
export type IdentityVerificationArtifactRow = Database['public']['Tables']['identity_verification_artifacts']['Row'];

export type IdentityVerificationProfileFields = {
  full_name?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  username?: string | null;
  phone_e164?: string | null;
  phone_number?: string | null;
};

export type IdentityVerificationBundle = {
  caseRow: IdentityVerificationCaseRow;
  artifacts: IdentityVerificationArtifactRow[];
  hasIdDocument: boolean;
  hasSelfie: boolean;
  personalInfoCompleted: boolean;
  contactInfoCompleted: boolean;
  canSubmit: boolean;
};

export type PendingIdentityVerificationCase = {
  caseRow: IdentityVerificationCaseRow;
  profileId: string;
  profileUsername: string | null;
  profileFullName: string | null;
  artifacts: IdentityVerificationArtifactRow[];
};

const ID_ARTIFACT_KIND: IdentityVerificationArtifactKind = 'supporting_document';
const SELFIE_ARTIFACT_KIND: IdentityVerificationArtifactKind = 'live_presence';

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

export function isPersonalInfoCompleted(profile: IdentityVerificationProfileFields): boolean {
  return Boolean(
    nullifTrim(profile.full_name)
    && nullifTrim(profile.country)
    && nullifTrim(profile.date_of_birth),
  );
}

export function isContactInfoCompleted(profile: IdentityVerificationProfileFields): boolean {
  return Boolean(
    nullifTrim(profile.phone_e164)
    || nullifTrim(profile.phone_number)
    || nullifTrim(profile.username),
  );
}

export function hasArtifactKind(
  artifacts: Array<Pick<IdentityVerificationArtifactRow, 'artifact_kind' | 'storage_path'>>,
  kind: IdentityVerificationArtifactKind,
): boolean {
  return artifacts.some((artifact) => artifact.artifact_kind === kind && Boolean(artifact.storage_path));
}

export function canSubmitIdentityVerification(args: {
  personalInfoCompleted: boolean;
  contactInfoCompleted: boolean;
  hasIdDocument: boolean;
  hasSelfie: boolean;
  status: IdentityVerificationCaseStatus;
}): boolean {
  if (args.status === 'submitted' || args.status === 'in_review' || args.status === 'approved') {
    return false;
  }
  return args.personalInfoCompleted && args.contactInfoCompleted && args.hasIdDocument && args.hasSelfie;
}

function nullifTrim(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function getFileExtension(file: File): string {
  const rawExtension = file.name.split('.').pop()?.trim().toLowerCase();
  if (rawExtension && rawExtension.length <= 5) {
    return rawExtension;
  }
  return IMAGE_MIME_TO_EXT[file.type] || 'jpg';
}

function buildStoragePath(args: {
  profileId: string;
  caseId: string;
  kind: IdentityVerificationArtifactKind;
  file: File;
}): string {
  const extension = getFileExtension(args.file);
  return `${args.profileId}/${args.caseId}/${args.kind}-${crypto.randomUUID()}.${extension}`;
}

function toBundle(
  caseRow: IdentityVerificationCaseRow,
  artifacts: IdentityVerificationArtifactRow[],
  profile: IdentityVerificationProfileFields,
): IdentityVerificationBundle {
  const personalInfoCompleted = isPersonalInfoCompleted(profile);
  const contactInfoCompleted = isContactInfoCompleted(profile);
  const hasIdDocument = hasArtifactKind(artifacts, ID_ARTIFACT_KIND);
  const hasSelfie = hasArtifactKind(artifacts, SELFIE_ARTIFACT_KIND);

  return {
    caseRow,
    artifacts,
    hasIdDocument,
    hasSelfie,
    personalInfoCompleted,
    contactInfoCompleted,
    canSubmit: canSubmitIdentityVerification({
      personalInfoCompleted,
      contactInfoCompleted,
      hasIdDocument,
      hasSelfie,
      status: caseRow.status,
    }),
  };
}

export async function loadIdentityVerificationBundle(
  profileId: string,
  profile: IdentityVerificationProfileFields,
): Promise<IdentityVerificationBundle | null> {
  const { data: caseRow, error } = await supabase
    .from('identity_verification_cases')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!caseRow) {
    return null;
  }

  const { data: artifacts, error: artifactsError } = await supabase
    .from('identity_verification_artifacts')
    .select('*')
    .eq('case_id', caseRow.id)
    .order('created_at', { ascending: false });

  if (artifactsError) {
    throw artifactsError;
  }

  return toBundle(caseRow, artifacts ?? [], profile);
}

export async function ensureIdentityVerificationCase(
  profileId: string,
  profile: IdentityVerificationProfileFields,
): Promise<IdentityVerificationBundle> {
  const existing = await loadIdentityVerificationBundle(profileId, profile);
  if (existing) {
    const personalInfoCompleted = isPersonalInfoCompleted(profile);
    const contactInfoCompleted = isContactInfoCompleted(profile);
    if (
      existing.caseRow.personal_info_completed !== personalInfoCompleted
      || existing.caseRow.contact_info_completed !== contactInfoCompleted
    ) {
      const { data: updated, error } = await supabase
        .from('identity_verification_cases')
        .update({
          personal_info_completed: personalInfoCompleted,
          contact_info_completed: contactInfoCompleted,
        })
        .eq('id', existing.caseRow.id)
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return toBundle(updated, existing.artifacts, profile);
    }
    return existing;
  }

  const personalInfoCompleted = isPersonalInfoCompleted(profile);
  const contactInfoCompleted = isContactInfoCompleted(profile);

  const { data: inserted, error } = await supabase
    .from('identity_verification_cases')
    .insert({
      profile_id: profileId,
      status: 'draft',
      verification_method: 'manual_id_selfie',
      personal_info_completed: personalInfoCompleted,
      contact_info_completed: contactInfoCompleted,
      live_verification_completed: false,
      notes: 'Member-started manual ID and selfie verification',
      metadata: { source: 'member_profile_settings' },
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toBundle(inserted, [], profile);
}

async function uploadArtifact(args: {
  profileId: string;
  caseId: string;
  kind: IdentityVerificationArtifactKind;
  file: File;
}): Promise<IdentityVerificationArtifactRow> {
  const storagePath = buildStoragePath(args);
  const { error: uploadError } = await supabase.storage
    .from(IDENTITY_VERIFICATION_BUCKET)
    .upload(storagePath, args.file, {
      contentType: args.file.type || undefined,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: artifact, error } = await supabase
    .from('identity_verification_artifacts')
    .insert({
      case_id: args.caseId,
      artifact_kind: args.kind,
      storage_path: storagePath,
      created_by: args.profileId,
      metadata: {
        original_name: args.file.name,
        content_type: args.file.type || null,
        size: args.file.size,
      },
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return artifact;
}

export async function uploadIdentityDocument(args: {
  profileId: string;
  caseId: string;
  file: File;
}): Promise<IdentityVerificationArtifactRow> {
  return uploadArtifact({
    profileId: args.profileId,
    caseId: args.caseId,
    kind: ID_ARTIFACT_KIND,
    file: args.file,
  });
}

export async function uploadIdentitySelfie(args: {
  profileId: string;
  caseId: string;
  file: File;
}): Promise<IdentityVerificationArtifactRow> {
  const artifact = await uploadArtifact({
    profileId: args.profileId,
    caseId: args.caseId,
    kind: SELFIE_ARTIFACT_KIND,
    file: args.file,
  });

  const { error } = await supabase
    .from('identity_verification_cases')
    .update({ live_verification_completed: true })
    .eq('id', args.caseId);

  if (error) {
    throw error;
  }

  return artifact;
}

export async function submitIdentityVerificationCase(args: {
  caseId: string;
  profile: IdentityVerificationProfileFields;
}): Promise<IdentityVerificationCaseRow> {
  const { data: caseRow, error: caseError } = await supabase
    .from('identity_verification_cases')
    .select('*')
    .eq('id', args.caseId)
    .single();

  if (caseError) {
    throw caseError;
  }

  const { data: artifacts, error: artifactsError } = await supabase
    .from('identity_verification_artifacts')
    .select('*')
    .eq('case_id', args.caseId);

  if (artifactsError) {
    throw artifactsError;
  }

  const personalInfoCompleted = isPersonalInfoCompleted(args.profile);
  const contactInfoCompleted = isContactInfoCompleted(args.profile);
  const hasIdDocument = hasArtifactKind(artifacts ?? [], ID_ARTIFACT_KIND);
  const hasSelfie = hasArtifactKind(artifacts ?? [], SELFIE_ARTIFACT_KIND);

  if (
    !canSubmitIdentityVerification({
      personalInfoCompleted,
      contactInfoCompleted,
      hasIdDocument,
      hasSelfie,
      status: caseRow.status,
    })
  ) {
    throw new Error('Identity verification is not ready to submit');
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('identity_verification_cases')
    .update({
      status: 'submitted',
      submitted_at: now,
      personal_info_completed: personalInfoCompleted,
      contact_info_completed: contactInfoCompleted,
      live_verification_completed: true,
      verification_method: 'manual_id_selfie',
    })
    .eq('id', args.caseId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return updated;
}

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

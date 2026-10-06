import { supabase } from '@/integrations/supabase/client';
import {
  IDENTITY_VERIFICATION_BUCKET,
  type IdentityVerificationArtifactKind,
  type IdentityVerificationArtifactRow,
  type IdentityVerificationBundle,
  type IdentityVerificationCaseRow,
  type IdentityVerificationCaseStatus,
  type IdentityVerificationProfileFields,
} from '@/lib/identity-verification-types';

export * from '@/lib/identity-verification-types';
export * from '@/lib/identity-verification-review';

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


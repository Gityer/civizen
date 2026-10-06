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


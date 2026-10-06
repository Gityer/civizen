import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { LanguageCode } from '@/lib/i18n';
import type { AppPermission, AppRole } from '@/lib/access-control';
import type { KnownAccountSession } from '@/contexts/auth-session-storage';

/** Shapes shared by AuthContext and its consumers; kept apart so the provider file stays focused on behaviour. */
type CitizenshipStatus = Database['public']['Enums']['citizenship_status'];

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth?: string | null;
  place_of_birth?: string | null;
  sex?: string | null;
  country: string | null;
  country_code?: string | null;
  city?: string | null;
  region_code?: string | null;
  language_code: LanguageCode | null;
  phone_country_code?: string | null;
  phone_number?: string | null;
  phone_e164?: string | null;
  official_id?: string | null;
  social_security_number?: string | null;
  citizen_signing_public_key?: string | null;
  citizen_signing_key_algorithm?: string | null;
  citizen_signing_key_registered_at?: string | null;
  citizenship_status?: CitizenshipStatus;
  citizenship_accepted_at?: string | null;
  citizenship_acceptance_mode?: string | null;
  citizenship_review_cleared_at?: string | null;
  is_active_citizen?: boolean;
  active_citizen_since?: string | null;
  is_governance_eligible?: boolean;
  governance_eligible_at?: string | null;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  full_name_change_count?: number | null;
  full_name_last_changed_at?: string | null;
  username_last_changed_at?: string | null;
  last_active_at?: string | null;
  terms_version?: string | null;
  terms_accepted_at?: string | null;
  terms_acceptance_method?: string | null;
  is_verified: boolean;
  is_admin: boolean;
  role: AppRole;
  custom_permissions: AppPermission[];
  granted_permissions: AppPermission[];
  denied_permissions: AppPermission[];
  effective_permissions: AppPermission[];
  created_at: string;
  updated_at: string;
}

export type SignInOptions = {
  preserveCurrentSession?: boolean;
};

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Session exists but the latest profile refresh returned no usable row. */
  profileLoadFailed: boolean;
  signUp: (
    credentials: {
      email?: string;
      phoneNumber?: string;
      phoneCountryCode?: string;
    },
    password: string,
    metadata?: {
      full_name?: string;
      date_of_birth?: string;
      country?: string;
      country_code?: string;
      language_code?: LanguageCode;
      phone_country_code?: string;
      phone_number?: string;
      phone_e164?: string;
      terms_accepted_at?: string;
      terms_version?: string;
      terms_acceptance_method?: string;
    },
    options?: { redirectPath?: string },
  ) => Promise<{ error: Error | null }>;
  signIn: (identifier: string, password: string, options?: SignInOptions) => Promise<{ error: Error | null }>;
  signInWithBiometrics: (options?: { reason?: string }) => Promise<{ error: Error | null }>;
  signInWithOtp: (
    payload: { email: string; token: string; type: 'magiclink' },
    options?: SignInOptions,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchBackToPreviousAccount: () => Promise<{ error: Error | null }>;
  switchToKnownAccount: (targetUserId: string, options?: SignInOptions) => Promise<{ error: Error | null }>;
  canSwitchBack: boolean;
  knownAccountSessions: KnownAccountSession[];
  pruneKnownAccountSessions: (validProfileIds: string[]) => void;
}

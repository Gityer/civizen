/** Terms of Use acceptance version recorded on `profiles.terms_version`. */
export const TERMS_ACCEPTANCE_VERSION = '2026-08-01-purpose-alignment-v1';

export type TermsAcceptanceMethod = 'signup' | 'reconsent';

/**
 * Paths a signed-in user may open while Terms re-consent is required.
 * Sign-out is offered on the re-consent screen itself.
 */
export const TERMS_RECONSENT_ALLOWED_PATHS = [
  '/terms',
  '/privacy',
  '/guidelines',
  '/settings/legal',
  '/about/legal-status',
  '/settings/privacy',
  '/settings/help',
  '/fund/support',
  '/forgot-password',
  '/reset-password',
] as const;

export type TermsReconsentGateDecision =
  | 'pass-through'
  | 'wait-for-profile'
  | 'profile-unavailable'
  | 'show-reconsent';

/** Max time to wait for the first profile row before offering sign-out recovery. */
export const PROFILE_LOAD_WAIT_MS = 10_000;

export function hasAcceptedCurrentTerms(termsVersion: string | null | undefined): boolean {
  return termsVersion === TERMS_ACCEPTANCE_VERSION;
}

export function isTermsReconsentAllowedPath(pathname: string): boolean {
  const path = pathname.split('?')[0]?.replace(/\/+$/, '') || '/';
  return TERMS_RECONSENT_ALLOWED_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

export function needsTermsReconsent(termsVersion: string | null | undefined): boolean {
  return !hasAcceptedCurrentTerms(termsVersion);
}

export function buildTermsAcceptanceProfilePatch(
  method: TermsAcceptanceMethod,
  acceptedAt: string = new Date().toISOString(),
) {
  return {
    terms_version: TERMS_ACCEPTANCE_VERSION,
    terms_accepted_at: acceptedAt,
    terms_acceptance_method: method,
  };
}

/**
 * Decide whether ProtectedRoute children may render, or the blocking re-consent UI.
 * Never records acceptance — callers write the profile only on explicit Accept.
 */
export function resolveTermsReconsentGate(input: {
  loading: boolean;
  hasUser: boolean;
  profileLoaded: boolean;
  /** True when a profile refresh finished without a usable profile row. */
  profileLoadFailed?: boolean;
  /** True when waiting for profile exceeded PROFILE_LOAD_WAIT_MS. */
  profileLoadTimedOut?: boolean;
  termsVersion: string | null | undefined;
  pathname: string;
}): TermsReconsentGateDecision {
  if (input.loading || !input.hasUser) {
    return 'pass-through';
  }

  if (input.profileLoadFailed || input.profileLoadTimedOut) {
    return 'profile-unavailable';
  }

  if (!input.profileLoaded) {
    return 'wait-for-profile';
  }

  if (hasAcceptedCurrentTerms(input.termsVersion) || isTermsReconsentAllowedPath(input.pathname)) {
    return 'pass-through';
  }

  if (needsTermsReconsent(input.termsVersion)) {
    return 'show-reconsent';
  }

  return 'pass-through';
}

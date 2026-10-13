/** Fields the server locks once a member is verified (v2 step A7, finding H2): eligibility depends on them. */
export const VERIFIED_LOCKED_FIELDS = ['date_of_birth', 'country', 'country_code'] as const;

type LockedField = (typeof VERIFIED_LOCKED_FIELDS)[number];
type ProfileLike = Partial<Record<LockedField, string | null>> & { is_verified?: boolean | null };

/**
 * For a verified member, drops the locked fields from an autosave patch and says whether the member tried to change
 * one, so the page can put the stored value back and explain why. Unverified members save everything.
 */
export function withoutLockedIdentityFields<T extends Record<string, unknown>>(
  patch: T,
  profile: ProfileLike | null | undefined,
): { patch: T; attemptedChange: boolean } {
  if (!profile?.is_verified) return { patch, attemptedChange: false };
  const next = { ...patch };
  let attemptedChange = false;
  for (const field of VERIFIED_LOCKED_FIELDS) {
    if (!(field in next)) continue;
    if ((next[field] ?? null) !== (profile[field] ?? null)) attemptedChange = true;
    delete next[field];
  }
  return { patch: next, attemptedChange };
}

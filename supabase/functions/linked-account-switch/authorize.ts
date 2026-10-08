// Pure authorization rule for linked-account-switch. Kept free of Deno imports so the web test
// suite can exercise it (src/lib/linked-account-switch-authorize.test.ts).

export type LinkedAccountRelationRow = {
  owner_profile_id: string;
  linked_profile_id: string;
  relationship_type?: string | null;
  established_at?: string | null;
};

export type SwitchAuthorization = 'direct' | 'sibling' | 'denied';

/**
 * A switch is allowed only along established business links: directly between an owner and its
 * business account (either direction), or between two business accounts of the same owner.
 * Rows without `established_at` were never proven and grant nothing.
 */
export function resolveSwitchAuthorization(
  rows: readonly LinkedAccountRelationRow[],
  currentProfileId: string,
  targetProfileId: string,
): SwitchAuthorization {
  if (!currentProfileId || !targetProfileId || currentProfileId === targetProfileId) return 'denied';

  const established = rows.filter(
    (row) => Boolean(row.established_at) && (row.relationship_type ?? 'business') === 'business',
  );

  const direct = established.some(
    (row) =>
      (row.owner_profile_id === currentProfileId && row.linked_profile_id === targetProfileId)
      || (row.linked_profile_id === currentProfileId && row.owner_profile_id === targetProfileId),
  );
  if (direct) return 'direct';

  const currentOwners = established
    .filter((row) => row.linked_profile_id === currentProfileId)
    .map((row) => row.owner_profile_id);
  const targetOwners = established
    .filter((row) => row.linked_profile_id === targetProfileId)
    .map((row) => row.owner_profile_id);
  const sibling = currentOwners.some((ownerId) => targetOwners.includes(ownerId));

  return sibling ? 'sibling' : 'denied';
}

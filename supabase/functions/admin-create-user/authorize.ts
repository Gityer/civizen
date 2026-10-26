// Which roles a caller may hand out through admin-create-user. The function writes the role with the service-role
// client, which skips the founder-guard trigger (it returns early when auth.uid() IS NULL), so the check lives here.
// Founder and admin are privileged: only a caller who holds founder authority (profile_has_founder_authority, via
// the my_founder_authority RPC) may assign them. Everything else requires only role.assign / settings.manage.

export const assignableRoles = new Set([
  'guest',
  'member',
  'citizen',
  'verified_member',
  'certified',
  'moderator',
  'market_manager',
  'founder',
  'admin',
]);

export const founderOnlyRoles = new Set(['founder', 'admin']);

export type RoleDecision =
  | { ok: true; role: string }
  | { ok: false; status: 403; error: string };

export function resolveRequestedRole(requested: unknown, callerHasFounderAuthority: boolean): RoleDecision {
  const role = typeof requested === 'string' && assignableRoles.has(requested) ? requested : 'member';
  if (founderOnlyRoles.has(role) && callerHasFounderAuthority !== true) {
    return { ok: false, status: 403, error: 'Only a founder can assign the founder or admin role.' };
  }
  return { ok: true, role };
}

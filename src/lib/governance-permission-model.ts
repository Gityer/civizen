import type { AppPermission } from '@/lib/access-control';
import { permissionListHasAny } from '@/lib/access-control';
import type { ConstitutionalOfficeKey, GovernancePermissions } from '@/lib/governance-ui.types';

/** Permissions the database policy on `constitutional_offices` accepts for managing office assignments. */
export const OFFICE_MANAGEMENT_PERMISSIONS: AppPermission[] = ['role.assign', 'settings.manage'];

export type GovernancePermissionInput = {
  permissions: readonly string[] | null | undefined;
  /** Result of the governance eligibility rules (verified, minimum score, native app). */
  eligible: boolean;
  voteBlockedBySanction: boolean;
  proposalBlockedBySanction: boolean;
  activeOfficeKeys: readonly ConstitutionalOfficeKey[];
};

/**
 * Derives what the signed-in member may do in governance.
 * Mirrors the real rules: voting and proposing follow eligibility and sanctions; office management
 * follows the same permissions as the database policy, so the UI never offers an action the server
 * would reject.
 */
export function deriveGovernancePermissions(input: GovernancePermissionInput): GovernancePermissions {
  const canManageOffices = permissionListHasAny(input.permissions ?? [], OFFICE_MANAGEMENT_PERMISSIONS);
  const isOfficeHolder = input.activeOfficeKeys.length > 0;

  return {
    canVote: input.eligible && !input.voteBlockedBySanction,
    canCreateProposals: input.eligible && !input.proposalBlockedBySanction,
    canManageOffices,
    isOfficeHolder,
    canAccessStewardConsole: canManageOffices || isOfficeHolder,
  };
}

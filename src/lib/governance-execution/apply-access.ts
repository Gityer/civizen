import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';
import type { SupabaseDbClient } from '@/integrations/supabase/client-type';

import type {
  GovernanceExecutionApplyResult,
  GovernanceExecutionUnitRow,
  GovernanceProposalExecutionSpec,
} from './types';

export async function applyRolePermissionExecution(args: {
  client: SupabaseDbClient;
  spec: Extract<GovernanceProposalExecutionSpec, { actionType: 'grant_role_permission' | 'revoke_role_permission' }>;
}) {
  if (args.spec.actionType === 'grant_role_permission') {
    const { error } = await args.client.from('role_permissions').upsert(
      { role: args.spec.role, permission: args.spec.permission },
      { onConflict: 'role,permission' },
    );

    if (error) {
      return {
        status: 'blocked',
        summary: `Could not grant ${args.spec.permission} to ${args.spec.role}.`,
        details: { action_type: args.spec.actionType, error: error.message, role: args.spec.role, permission: args.spec.permission },
      } satisfies GovernanceExecutionApplyResult;
    }

    return {
      status: 'completed',
      summary: `Granted ${args.spec.permission} to ${args.spec.role}.`,
      details: { action_type: args.spec.actionType, role: args.spec.role, permission: args.spec.permission },
    } satisfies GovernanceExecutionApplyResult;
  }

  const { error } = await args.client
    .from('role_permissions')
    .delete()
    .eq('role', args.spec.role)
    .eq('permission', args.spec.permission);

  if (error) {
    return {
      status: 'blocked',
      summary: `Could not revoke ${args.spec.permission} from ${args.spec.role}.`,
      details: { action_type: args.spec.actionType, error: error.message, role: args.spec.role, permission: args.spec.permission },
    } satisfies GovernanceExecutionApplyResult;
  }

  return {
    status: 'completed',
    summary: `Revoked ${args.spec.permission} from ${args.spec.role}.`,
    details: { action_type: args.spec.actionType, role: args.spec.role, permission: args.spec.permission },
  } satisfies GovernanceExecutionApplyResult;
}

export async function applyUnitMembershipExecution(args: {
  client: SupabaseClient<Database>;
  actorId: string | null;
  unitsByKey: Record<string, GovernanceExecutionUnitRow>;
  spec: Extract<GovernanceProposalExecutionSpec, { actionType: 'assign_unit_member' | 'deactivate_unit_member' }>;
}) {
  const targetUnit = args.unitsByKey[args.spec.targetUnitKey];
  if (!targetUnit) {
    return {
      status: 'blocked',
      summary: `The target unit ${args.spec.targetUnitKey} was not found.`,
      details: { action_type: args.spec.actionType, target_unit_key: args.spec.targetUnitKey, profile_id: args.spec.profileId },
    } satisfies GovernanceExecutionApplyResult;
  }

  if (args.spec.actionType === 'assign_unit_member') {
    const { error } = await args.client.from('governance_execution_unit_memberships').upsert(
      {
        unit_id: targetUnit.id,
        profile_id: args.spec.profileId,
        membership_role: args.spec.membershipRole,
        is_active: true,
        assigned_by: args.actorId,
        notes: args.spec.notes || 'Governance-approved unit assignment',
      },
      { onConflict: 'unit_id,profile_id' },
    );

    if (error) {
      return {
        status: 'blocked',
        summary: `Could not assign the unit member for ${args.spec.targetUnitKey}.`,
        details: { action_type: args.spec.actionType, error: error.message, target_unit_key: args.spec.targetUnitKey, profile_id: args.spec.profileId, membership_role: args.spec.membershipRole },
      } satisfies GovernanceExecutionApplyResult;
    }

    return {
      status: 'completed',
      summary: `Assigned profile ${args.spec.profileId} to ${args.spec.targetUnitKey}.`,
      details: { action_type: args.spec.actionType, target_unit_key: args.spec.targetUnitKey, profile_id: args.spec.profileId, membership_role: args.spec.membershipRole },
    } satisfies GovernanceExecutionApplyResult;
  }

  const { error } = await args.client
    .from('governance_execution_unit_memberships')
    .update({ is_active: false, assigned_by: args.actorId, notes: args.spec.notes || 'Governance-approved unit deactivation' })
    .eq('unit_id', targetUnit.id)
    .eq('profile_id', args.spec.profileId);

  if (error) {
    return {
      status: 'blocked',
      summary: `Could not deactivate the unit member from ${args.spec.targetUnitKey}.`,
      details: { action_type: args.spec.actionType, error: error.message, target_unit_key: args.spec.targetUnitKey, profile_id: args.spec.profileId },
    } satisfies GovernanceExecutionApplyResult;
  }

  return {
    status: 'completed',
    summary: `Deactivated profile ${args.spec.profileId} from ${args.spec.targetUnitKey}.`,
    details: { action_type: args.spec.actionType, target_unit_key: args.spec.targetUnitKey, profile_id: args.spec.profileId },
  } satisfies GovernanceExecutionApplyResult;
}

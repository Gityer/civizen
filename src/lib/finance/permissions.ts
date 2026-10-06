import type { AppPermission } from '@/lib/access-control';
import { permissionListHasAny } from '@/lib/access-control';

export const FINANCE_PERMISSIONS = [
  'finance.view',
  'finance.edit',
  'finance.approve',
  'finance.publish',
  'finance.admin',
] as const;

export type FinancePermission = (typeof FINANCE_PERMISSIONS)[number];

/** Temporary migration bridge: legacy funding managers retain access until roles are split. */
export const FINANCE_LEGACY_COMPAT_PERMISSIONS: AppPermission[] = [
  'settings.manage',
  'role.assign',
];

export function hasFinanceLegacyCompat(permissions: readonly string[] | null | undefined): boolean {
  return permissionListHasAny(permissions || [], FINANCE_LEGACY_COMPAT_PERMISSIONS);
}

export function hasFinancePermission(
  permissions: readonly string[] | null | undefined,
  permission: FinancePermission,
): boolean {
  const list = permissions || [];
  if (list.includes(permission) || list.includes('finance.admin')) {
    // finance.admin implies all finance actions except we still check specifically below for clarity
    if (permission === 'finance.admin') return list.includes('finance.admin') || hasFinanceLegacyCompat(list);
    if (list.includes('finance.admin')) return true;
  }
  if (list.includes(permission)) return true;
  return hasFinanceLegacyCompat(list);
}

export function canFinanceView(permissions: readonly string[] | null | undefined): boolean {
  return (
    hasFinancePermission(permissions, 'finance.view') ||
    hasFinancePermission(permissions, 'finance.edit') ||
    hasFinancePermission(permissions, 'finance.approve') ||
    hasFinancePermission(permissions, 'finance.publish') ||
    hasFinancePermission(permissions, 'finance.admin')
  );
}

export function canFinanceEdit(permissions: readonly string[] | null | undefined): boolean {
  return hasFinancePermission(permissions, 'finance.edit') || hasFinancePermission(permissions, 'finance.admin');
}

export function canFinanceApprove(permissions: readonly string[] | null | undefined): boolean {
  return hasFinancePermission(permissions, 'finance.approve') || hasFinancePermission(permissions, 'finance.admin');
}

export function canFinancePublish(permissions: readonly string[] | null | undefined): boolean {
  return hasFinancePermission(permissions, 'finance.publish') || hasFinancePermission(permissions, 'finance.admin');
}

export function canFinanceAdmin(permissions: readonly string[] | null | undefined): boolean {
  return hasFinancePermission(permissions, 'finance.admin');
}

/** Approver cannot approve their own submission unless finance.admin (or legacy compat). */
export function canApproveOwnSubmission(
  permissions: readonly string[] | null | undefined,
  actorUserId: string | null | undefined,
  submittedBy: string | null | undefined,
): boolean {
  if (!actorUserId || !submittedBy || actorUserId !== submittedBy) return true;
  return canFinanceAdmin(permissions) || hasFinanceLegacyCompat(permissions);
}

export function requiresAllocationOverride(
  amountMinor: number,
  availableMinor: number,
): boolean {
  return amountMinor > availableMinor;
}

export function canPerformAllocationOverride(
  permissions: readonly string[] | null | undefined,
  overrideReason: string | null | undefined,
  amountMinor: number,
  availableMinor: number,
): { ok: true; message?: undefined } | { ok: false; message: string } {
  if (!requiresAllocationOverride(amountMinor, availableMinor)) return { ok: true };
  if (!canFinanceAdmin(permissions) && !hasFinanceLegacyCompat(permissions)) {
    return { ok: false, message: 'allocation override requires finance.admin permission' };
  }
  if (!overrideReason?.trim()) {
    return { ok: false, message: 'allocation override requires a recorded reason' };
  }
  return { ok: true };
}

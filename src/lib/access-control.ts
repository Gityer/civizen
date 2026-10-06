export const APP_ROLES = [
  'guest',
  'member',
  'citizen',
  'verified_member',
  'certified',
  'moderator',
  'market_manager',
  'admin',
  'founder',
  'system',
] as const;

export const APP_PERMISSIONS = [
  'law.read',
  'law.contribute',
  'law.review',
  'content.read',
  'content.contribute_unmoderated',
  'content.contribute_moderated',
  'content.review',
  'content.moderate',
  'profession.verify',
  'build.use',
  'updates.test',
  'profile.read',
  'profile.update_self',
  'profile.update_any',
  'post.create',
  'post.edit_self',
  'post.delete_self',
  'post.moderate',
  'comment.create',
  'comment.edit_self',
  'comment.delete_self',
  'comment.moderate',
  'message.create',
  'message.edit_self',
  'message.moderate',
  'endorsement.create',
  'endorsement.review',
  'endorsement.moderate',
  'report.create',
  'report.review',
  'market.manage',
  'role.assign',
  'settings.manage',
  'finance.view',
  'finance.edit',
  'finance.approve',
  'finance.publish',
  'finance.admin',
  'agreements.create',
  'agreements.sign_org',
  'like.create',
  'like.delete_self',
] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const FOUNDER_BASE_PERMISSIONS: AppPermission[] = [
  'law.read',
  'law.contribute',
  'law.review',
  'content.read',
  'content.contribute_unmoderated',
  'content.contribute_moderated',
  'content.review',
  'content.moderate',
  'profession.verify',
  'build.use',
  'updates.test',
  'profile.read',
  'profile.update_self',
  'post.create',
  'post.edit_self',
  'post.delete_self',
  'post.moderate',
  'comment.create',
  'comment.edit_self',
  'comment.delete_self',
  'comment.moderate',
  'message.create',
  'message.edit_self',
  'message.moderate',
  'endorsement.create',
  'endorsement.review',
  'endorsement.moderate',
  'report.create',
  'report.review',
  'like.create',
  'like.delete_self',
];

export const rolePermissionMap: Record<AppRole, AppPermission[]> = {
  guest: ['content.read', 'profile.read'],
  member: [
    'content.read',
    'content.contribute_unmoderated',
    'law.read',
    'law.contribute',
    'profile.read',
    'profile.update_self',
    'post.create',
    'post.edit_self',
    'post.delete_self',
    'comment.create',
    'comment.edit_self',
    'comment.delete_self',
    'message.create',
    'message.edit_self',
    'endorsement.create',
    'report.create',
    'like.create',
    'like.delete_self',
    'agreements.create',
  ],
  citizen: [
    'content.read',
    'content.contribute_unmoderated',
    'law.read',
    'law.contribute',
    'profile.read',
    'profile.update_self',
    'post.create',
    'post.edit_self',
    'post.delete_self',
    'comment.create',
    'comment.edit_self',
    'comment.delete_self',
    'message.create',
    'message.edit_self',
    'endorsement.create',
    'report.create',
    'like.create',
    'like.delete_self',
    'agreements.create',
  ],
  verified_member: [
    'content.read',
    'content.contribute_unmoderated',
    'law.read',
    'law.contribute',
    'profile.read',
    'profile.update_self',
    'post.create',
    'post.edit_self',
    'post.delete_self',
    'comment.create',
    'comment.edit_self',
    'comment.delete_self',
    'message.create',
    'message.edit_self',
    'endorsement.create',
    'report.create',
    'like.create',
    'like.delete_self',
    'agreements.create',
  ],
  certified: [
    'content.read',
    'content.contribute_unmoderated',
    'content.contribute_moderated',
    'content.review',
    'law.read',
    'law.contribute',
    'profile.read',
    'profile.update_self',
    'post.create',
    'post.edit_self',
    'post.delete_self',
    'comment.create',
    'comment.edit_self',
    'comment.delete_self',
    'message.create',
    'message.edit_self',
    'endorsement.create',
    'report.create',
    'like.create',
    'like.delete_self',
    'agreements.create',
  ],
  moderator: [
    'content.read',
    'content.contribute_unmoderated',
    'content.contribute_moderated',
    'content.review',
    'content.moderate',
    'law.read',
    'law.contribute',
    'law.review',
    'profile.read',
    'profile.update_self',
    'post.create',
    'post.edit_self',
    'post.delete_self',
    'post.moderate',
    'comment.create',
    'comment.edit_self',
    'comment.delete_self',
    'comment.moderate',
    'message.create',
    'message.edit_self',
    'message.moderate',
    'endorsement.create',
    'endorsement.review',
    'endorsement.moderate',
    'report.create',
    'report.review',
    'like.create',
    'like.delete_self',
    'agreements.create',
  ],
  market_manager: [
    'content.read',
    'content.contribute_unmoderated',
    'law.read',
    'law.contribute',
    'profile.read',
    'profile.update_self',
    'post.create',
    'post.edit_self',
    'post.delete_self',
    'comment.create',
    'comment.edit_self',
    'comment.delete_self',
    'message.create',
    'message.edit_self',
    'endorsement.create',
    'report.create',
    'market.manage',
    'like.create',
    'like.delete_self',
    'agreements.create',
  ],
  // Founder retains full access during the bootstrap decentralization stage.
  founder: [...APP_PERMISSIONS],
  admin: [...APP_PERMISSIONS],
  system: [...APP_PERMISSIONS],
};

export function resolveEffectivePermissions(
  role: AppRole,
  basePermissions: AppPermission[] = rolePermissionMap[role],
  grantedPermissions: AppPermission[] = [],
  deniedPermissions: AppPermission[] = [],
  legacyGrantedPermissions: AppPermission[] = [],
): AppPermission[] {
  const denied = new Set(deniedPermissions);
  return Array.from(
    new Set([...basePermissions, ...grantedPermissions, ...legacyGrantedPermissions]),
  ).filter((permission) => !denied.has(permission));
}

/**
 * Prefer live RPC permissions when present. If the RPC fails or returns an empty
 * list for bootstrap authority roles, keep role-derived access so a flaky RPC
 * cannot kick founders/admins out of protected admin routes.
 */
export function coalesceRpcEffectivePermissions(
  role: AppRole,
  rpcPermissions: AppPermission[] | null | undefined,
  options: {
    rpcFailed?: boolean;
    grantedPermissions?: AppPermission[];
    deniedPermissions?: AppPermission[];
    legacyGrantedPermissions?: AppPermission[];
  } = {},
): AppPermission[] {
  const fallback = resolveEffectivePermissions(
    role,
    rolePermissionMap[role],
    options.grantedPermissions || [],
    options.deniedPermissions || [],
    options.legacyGrantedPermissions || [],
  );

  if (options.rpcFailed || !Array.isArray(rpcPermissions)) {
    return fallback;
  }

  const isBootstrapAuthority = role === 'founder' || role === 'admin' || role === 'system';
  if (isBootstrapAuthority && fallback.length > 0) {
    // Empty or incomplete RPC payloads must not strip admin access on refresh.
    if (
      rpcPermissions.length === 0 ||
      !rpcPermissions.includes('role.assign') ||
      !rpcPermissions.includes('settings.manage')
    ) {
      return fallback;
    }
  }

  return rpcPermissions;
}

export function getRolePermissions(
  role: AppRole,
  grantedPermissions: AppPermission[] = [],
  deniedPermissions: AppPermission[] = [],
  basePermissions: AppPermission[] = rolePermissionMap[role],
  legacyGrantedPermissions: AppPermission[] = [],
): AppPermission[] {
  return resolveEffectivePermissions(
    role,
    basePermissions,
    grantedPermissions,
    deniedPermissions,
    legacyGrantedPermissions,
  );
}

export function permissionListHas(
  permissions: AppPermission[],
  permission: AppPermission,
) {
  return permissions.includes(permission);
}

export function permissionListHasAny(
  permissions: readonly string[],
  requestedPermissions: readonly string[],
) {
  return requestedPermissions.some((permission) => permissions.includes(permission));
}

export function hasPermission(
  role: AppRole,
  permission: AppPermission,
  grantedPermissions: AppPermission[] = [],
  deniedPermissions: AppPermission[] = [],
  basePermissions: AppPermission[] = rolePermissionMap[role],
  legacyGrantedPermissions: AppPermission[] = [],
) {
  return getRolePermissions(
    role,
    grantedPermissions,
    deniedPermissions,
    basePermissions,
    legacyGrantedPermissions,
  ).includes(permission);
}

export function hasAnyPermission(
  role: AppRole,
  permissions: AppPermission[],
  grantedPermissions: AppPermission[] = [],
  deniedPermissions: AppPermission[] = [],
  basePermissions: AppPermission[] = rolePermissionMap[role],
  legacyGrantedPermissions: AppPermission[] = [],
) {
  const effectivePermissions = getRolePermissions(
    role,
    grantedPermissions,
    deniedPermissions,
    basePermissions,
    legacyGrantedPermissions,
  );
  return permissions.some((permission) => effectivePermissions.includes(permission));
}

export function isStaffRole(role: AppRole) {
  return role === 'moderator' || role === 'founder' || role === 'admin' || role === 'system';
}

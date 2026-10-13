import { BarChart3, Coins, Fingerprint, KeyRound, Landmark, LayoutGrid, Users } from 'lucide-react';

/** Admin rows on the Settings page (shown with role.assign, settings.manage or finance access). */
export const ADMIN_SETTINGS_ITEMS = [
  { icon: Fingerprint, labelKey: 'settings.adminRoles', descriptionKey: 'settings.adminRolesDescription', path: '/settings/admin/roles' },
  { icon: Users, labelKey: 'settings.adminUsers', descriptionKey: 'settings.adminUsersDescription', path: '/settings/admin/users' },
  { icon: KeyRound, labelKey: 'settings.adminPermissions', descriptionKey: 'settings.adminPermissionsDescription', path: '/settings/admin/permissions' },
  { icon: Landmark, labelKey: 'settings.adminGovernance', descriptionKey: 'settings.adminGovernanceDescription', path: '/settings/admin/governance' },
  { icon: LayoutGrid, labelKey: 'settings.adminModules', descriptionKey: 'settings.adminModulesDescription', path: '/settings/admin/modules' },
  { icon: Coins, labelKey: 'settings.adminFunding', descriptionKey: 'settings.adminFundingDescription', path: '/settings/admin/funding' },
  { icon: BarChart3, labelKey: 'participation.title', descriptionKey: 'participation.subtitle', path: '/settings/admin/participation' },
];

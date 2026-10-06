import type { ComponentType } from 'react';
import { Award, Compass, GraduationCap, ShieldCheck, Sprout } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { APP_ROLES, type AppPermission, type AppRole } from '@/lib/access-control';
import {
  coerceCitizenshipStatus,
  deriveProjectedCitizenshipStatus,
  type CitizenshipStatus,
} from '@/lib/civic-status';
import type { IdentityVerificationCaseStatus } from '@/lib/verification-workflow';

export type ProfileRow = {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  country_code: string | null;
  language_code: string | null;
  official_id: string | null;
  social_security_number: string | null;
  last_active_at?: string | null;
  is_verified: boolean | null;
  is_admin: boolean | null;
  citizenship_status: CitizenshipStatus;
  citizenship_accepted_at: string | null;
  citizenship_acceptance_mode: string | null;
  citizenship_review_cleared_at: string | null;
  is_active_citizen: boolean;
  active_citizen_since: string | null;
  is_governance_eligible: boolean;
  governance_eligible_at: string | null;
  experience_level: UserExperienceLevel;
  role: AppRole;
  custom_permissions: AppPermission[] | null;
  granted_permissions: AppPermission[] | null;
  denied_permissions: AppPermission[] | null;
  created_at: string;
  updated_at: string;
};

export type ProfessionRow = Database['public']['Tables']['professions']['Row'];
export type ProfileProfessionRow = Database['public']['Tables']['profile_professions']['Row'];
export type VerificationCaseRow = Database['public']['Tables']['identity_verification_cases']['Row'];
export type GovernanceSanctionRow = Database['public']['Tables']['governance_sanctions']['Row'];
export type GovernanceSanctionAppealRow = Database['public']['Tables']['governance_sanction_appeals']['Row'];
export type ProfessionVerificationStatus = Database['public']['Enums']['profession_verification_status'];
export type ProfessionStatusMode = ProfessionVerificationStatus | 'unassigned';

export type OverrideMode = 'inherit' | 'grant' | 'deny';
export type UserExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'professional';

export const roleBadgeClassName: Record<AppRole, string> = {
  guest: 'border-border bg-muted text-muted-foreground',
  member: 'border-primary/20 bg-primary/10 text-primary',
  citizen: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  verified_member: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  certified: 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300',
  moderator: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  market_manager: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  founder: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  admin: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  system: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export const citizenshipBadgeClassName: Record<CitizenshipStatus, string> = {
  registered_member: 'border-border bg-muted text-muted-foreground',
  verified_member: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  citizen: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
};

export const manageableRoles = APP_ROLES.filter((role) => role !== 'system');
export const userExperienceLevels: UserExperienceLevel[] = ['entry', 'junior', 'mid', 'senior', 'professional'];
export const userExperienceLevelLabelMap: Record<UserExperienceLevel, string> = {
  entry: 'Entry',
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  professional: 'Pro',
};

export const userExperienceLevelClassMap: Record<UserExperienceLevel, string> = {
  entry: 'border-border bg-muted/70 text-muted-foreground',
  junior: 'border-lime-500/20 bg-lime-500/10 text-lime-700 dark:text-lime-300',
  mid: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  senior: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  professional: 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300',
};

export const userExperienceLevelIconMap = {
  entry: GraduationCap,
  junior: Sprout,
  mid: Compass,
  senior: ShieldCheck,
  professional: Award,
} satisfies Record<UserExperienceLevel, ComponentType<{ className?: string }>>;

export function getInitials(name?: string | null, username?: string | null) {
  const source = name?.trim() || username?.trim() || '?';
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getDisplayNameParts(user: Pick<ProfileRow, 'full_name' | 'username'>) {
  const fullName = user.full_name || '';
  if (/\s+professional$/i.test(fullName)) {
    return {
      name: fullName.replace(/\s+professional$/i, '').trim() || fullName,
      hasProfessionalSuffix: true,
    };
  }

  return {
    name: user.full_name || null,
    hasProfessionalSuffix: false,
  };
}

export type LinkedAccountLink = {
  owner_profile_id: string;
  linked_profile_id: string;
  relationship_type: string;
  business_name_normalized: string | null;
};

export type OrganizationMembership = {
  profile: ProfileRow;
  organizationName: string;
};

export type UserAdminGroup = {
  /** Personal (or unlinked) account shown as the group head. Null for orphan org-only rows. */
  owner: ProfileRow | null;
  organizations: OrganizationMembership[];
};

/** Title-case a `business_name_normalized` slug for display. */
export function humanizeBusinessName(normalized: string | null | undefined): string | null {
  if (!normalized?.trim()) return null;
  return normalized
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Organization label: prefer profile full name, then humanized business slug, then username. */
export function getOrganizationDisplayName(
  profile: Pick<ProfileRow, 'full_name' | 'username'>,
  businessNameNormalized?: string | null,
): string {
  const parts = getDisplayNameParts(profile);
  return parts.name || humanizeBusinessName(businessNameNormalized) || profile.username || 'Organization';
}

export function isBusinessUsername(username?: string | null): boolean {
  return Boolean(username?.trim().toLowerCase().startsWith('biz_'));
}

export function buildBusinessLinkIndex(links: readonly LinkedAccountLink[]) {
  const businessByLinkedId = new Map<string, LinkedAccountLink>();
  const orgsByOwnerId = new Map<string, LinkedAccountLink[]>();

  for (const link of links) {
    if (link.relationship_type !== 'business') continue;
    businessByLinkedId.set(link.linked_profile_id, link);
    const list = orgsByOwnerId.get(link.owner_profile_id) ?? [];
    list.push(link);
    orgsByOwnerId.set(link.owner_profile_id, list);
  }

  return { businessByLinkedId, orgsByOwnerId };
}

/**
 * Groups personal accounts with their business organization profiles.
 * Nested org profiles are omitted from the top level; orphan orgs (owner missing) appear alone.
 */
export function groupUsersWithOrganizations(
  users: readonly ProfileRow[],
  links: readonly LinkedAccountLink[],
): UserAdminGroup[] {
  const byId = new Map(users.map((user) => [user.id, user]));
  const { businessByLinkedId, orgsByOwnerId } = buildBusinessLinkIndex(links);
  const nestedOrgIds = new Set(businessByLinkedId.keys());
  const groups: UserAdminGroup[] = [];
  const ownersWithGroup = new Set<string>();

  for (const user of users) {
    if (nestedOrgIds.has(user.id)) continue;

    const orgLinks = orgsByOwnerId.get(user.id) ?? [];
    const organizations: OrganizationMembership[] = [];
    for (const link of orgLinks) {
      const profile = byId.get(link.linked_profile_id);
      if (!profile) continue;
      organizations.push({
        profile,
        organizationName: getOrganizationDisplayName(profile, link.business_name_normalized),
      });
    }

    groups.push({ owner: user, organizations });
    ownersWithGroup.add(user.id);
  }

  for (const user of users) {
    if (!nestedOrgIds.has(user.id)) continue;
    const link = businessByLinkedId.get(user.id);
    if (!link) continue;
    if (ownersWithGroup.has(link.owner_profile_id)) continue;

    groups.push({
      owner: null,
      organizations: [
        {
          profile: user,
          organizationName: getOrganizationDisplayName(user, link.business_name_normalized),
        },
      ],
    });
  }

  return groups;
}

/** Card title: organization name for business accounts, otherwise personal display name. */
export function getAdminCardTitle(
  user: Pick<ProfileRow, 'full_name' | 'username'>,
  options?: { isOrganization?: boolean; organizationName?: string | null },
): string | null {
  if (options?.isOrganization) {
    return options.organizationName || getOrganizationDisplayName(user) || null;
  }
  return getDisplayNameParts(user).name;
}

export function getNextUserExperienceLevel(level: UserExperienceLevel | null | undefined): UserExperienceLevel {
  const current = level && userExperienceLevels.includes(level) ? level : 'entry';
  const index = userExperienceLevels.indexOf(current);
  return userExperienceLevels[(index + 1) % userExperienceLevels.length];
}

export function getEffectiveCitizenshipStatus(user: Pick<ProfileRow, 'citizenship_status' | 'is_verified' | 'role'>) {
  return coerceCitizenshipStatus(
    user.citizenship_status,
    deriveProjectedCitizenshipStatus(user.role, Boolean(user.is_verified)),
  );
}

export function getEffectiveVerificationStatus(
  user: Pick<ProfileRow, 'is_verified'>,
  verificationCase?: Partial<Pick<VerificationCaseRow, 'status'>> | null,
) {
  if (verificationCase?.status) return verificationCase.status;
  return user.is_verified ? ('approved' satisfies IdentityVerificationCaseStatus) : ('draft' satisfies IdentityVerificationCaseStatus);
}

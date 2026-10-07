import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  APP_PERMISSIONS,
  APP_ROLES,
  resolveEffectivePermissions,
  type AppPermission,
  type AppRole,
} from '@/lib/access-control';
import {
  coerceCitizenshipStatus,
  deriveProjectedCitizenshipStatus,
  getCitizenStatusLabelKey,
} from '@/lib/civic-status';
import { permissionMetadata } from '@/lib/permission-metadata';
import {
  getAdminVerificationDecision,
} from '@/lib/verification-workflow';
import {
  buildGovernanceSanctionScopeFlags,
  type GovernanceSanctionAppealStatus,
  type GovernanceSanctionScopeOption,
} from '@/lib/governance-sanctions';
import { pageRegistry, type PageId, type SectionId } from '@/lib/feature-registry';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase, type Database } from '@/integrations/supabase/client-type';
import { toast } from 'sonner';
import {
  readGovernancePublicAuditExternalExecutionPageBoardRows,
  type GovernancePublicAuditExternalExecutionPageBoardRow,
} from '@/lib/governance-public-audit-automation';
import {
  getEffectiveCitizenshipStatus,
  groupUsersWithOrganizations,
  manageableRoles,
  type LinkedAccountLink,
  type OverrideMode,
  type ProfessionRow,
  type ProfessionStatusMode,
  type ProfileProfessionRow,
  type ProfileRow,
  type UserExperienceLevel,
  userExperienceLevelLabelMap,
  type VerificationCaseRow,
  type GovernanceSanctionAppealRow,
  type GovernanceSanctionRow,
} from '@/lib/users-admin';
import { UsersAdminOverview } from '@/components/admin/UsersAdminOverview';

type EmergencyAccessRequestRow = {
  request_id: string;
  target_profile_id: string;
  target_display_name: string;
  target_username: string | null;
  request_reason: string;
  request_status: 'pending' | 'approved' | 'rejected' | 'expired';
  requested_by: string;
  requested_by_name: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  approved_expires_at: string | null;
  consumed_at: string | null;
  consumed_by: string | null;
  consumed_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type EmergencyAccessEventSummaryRow = {
  lookback_hours: number;
  request_count: number;
  approved_count: number;
  rejected_count: number;
  expired_count: number;
  consumed_count: number;
  pending_count: number;
  latest_event_at: string | null;
};

type EmergencyAccessOpsSummaryRow = {
  pending_count: number;
  stale_pending_count: number;
  approved_unconsumed_count: number;
  near_expiry_approved_count: number;
  consumed_count: number;
  rejected_count: number;
  expired_count: number;
  latest_request_at: string | null;
  latest_event_at: string | null;
};

type EmergencyAccessOpsPolicyRow = {
  policy_key: string;
  policy_name: string;
  pending_max_age_hours: number;
  approved_max_age_minutes: number;
  near_expiry_window_minutes: number;
  escalation_enabled: boolean;
  oncall_channel: string;
  updated_at: string | null;
};

type EmergencyAccessOpsPolicyEventRow = {
  event_id: string;
  policy_key: string;
  event_type: 'created' | 'updated';
  actor_profile_id: string | null;
  actor_name: string | null;
  event_message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  rollback_eligible?: boolean;
  rollback_eligibility_reason?: string | null;
};

const EMERGENCY_OPS_POLICY_SCHEMA_VERSION = '1';
const EMERGENCY_OPS_POLICY_MAX_ROLLBACK_AGE_HOURS = 336;

type EmergencyAccessRequestEventRow = {
  event_id: string;
  request_id: string;
  event_type: 'requested' | 'approved' | 'rejected' | 'expired' | 'consumed' | 'updated';
  event_message: string;
  actor_profile_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type EmergencyAccessEscalationHistoryRow = {
  page_id: string;
  batch_id: string | null;
  page_key: string;
  severity: 'info' | 'warning' | 'critical';
  page_status: 'open' | 'acknowledged' | 'resolved';
  page_message: string;
  oncall_channel: string;
  opened_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  updated_at: string;
};

const UsersAdminSelectedPanel = lazy(() =>
  import('@/components/admin/UsersAdminSelectedPanel').then((module) => ({ default: module.UsersAdminSelectedPanel })),
);

const UsersAdminCreateUserDialog = lazy(() =>
  import('@/components/admin/UsersAdminCreateUserDialog').then((module) => ({ default: module.UsersAdminCreateUserDialog })),
);

const UsersAdminMobileList = lazy(() =>
  import('@/components/admin/UsersAdminMobileList').then((module) => ({ default: module.UsersAdminMobileList })),
);

const UsersAdminDesktopTable = lazy(() =>
  import('@/components/admin/UsersAdminDesktopTable').then((module) => ({ default: module.UsersAdminDesktopTable })),
);

const sectionOrder: SectionId[] = ['home', 'discovery', 'knowledge', 'identity', 'contribution', 'marketplace', 'preferences', 'administration'];
const pageOrder: PageId[] = ['home', 'messaging', 'study', 'features', 'law', 'profile', 'editProfile', 'endorse', 'market', 'settings', 'adminUsers', 'adminPermissions'];

const emptyCreateUserForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  role: 'member' as AppRole,
};

function toOverrideMap(user: ProfileRow): Record<AppPermission, OverrideMode> {
  const granted = new Set([...(user.granted_permissions || []), ...(user.custom_permissions || [])]);
  const denied = new Set(user.denied_permissions || []);

  return Object.fromEntries(
    APP_PERMISSIONS.map((permission) => {
      if (denied.has(permission)) return [permission, 'deny' satisfies OverrideMode];
      if (granted.has(permission)) return [permission, 'grant' satisfies OverrideMode];
      return [permission, 'inherit' satisfies OverrideMode];
    }),
  ) as Record<AppPermission, OverrideMode>;
}

function getOverridePermissionSets(overrideModes: Record<AppPermission, OverrideMode>) {
  return {
    granted_permissions: APP_PERMISSIONS.filter((permission) => overrideModes[permission] === 'grant'),
    denied_permissions: APP_PERMISSIONS.filter((permission) => overrideModes[permission] === 'deny'),
  };
}

function serializeOverrideModes(overrideModes: Record<AppPermission, OverrideMode>) {
  const { granted_permissions, denied_permissions } = getOverridePermissionSets(overrideModes);
  return JSON.stringify({ granted_permissions, denied_permissions });
}

export default function UsersAdmin() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountLink[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<AppRole, AppPermission[]>>(
    Object.fromEntries(APP_ROLES.map((role) => [role, []])) as Record<AppRole, AppPermission[]>,
  );
  const [professions, setProfessions] = useState<ProfessionRow[]>([]);
  const [userProfessions, setUserProfessions] = useState<Record<string, ProfileProfessionRow[]>>({});
  const [verificationCasesByProfile, setVerificationCasesByProfile] = useState<Record<string, VerificationCaseRow>>({});
  const [sanctionsByProfile, setSanctionsByProfile] = useState<Record<string, GovernanceSanctionRow[]>>({});
  const [appealsByProfile, setAppealsByProfile] = useState<Record<string, GovernanceSanctionAppealRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleSavingUserId, setRoleSavingUserId] = useState<string | null>(null);
  const [levelSavingUserId, setLevelSavingUserId] = useState<string | null>(null);
  const [overrideSavingUserId, setOverrideSavingUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [overrideModes, setOverrideModes] = useState<Record<AppPermission, OverrideMode> | null>(null);
  const [overrideSaveError, setOverrideSaveError] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm);
  const [professionSavingKey, setProfessionSavingKey] = useState<string | null>(null);
  const [sanctionSavingUserId, setSanctionSavingUserId] = useState<string | null>(null);
  const [appealSavingId, setAppealSavingId] = useState<string | null>(null);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);
  const [emergencyAccessRequests, setEmergencyAccessRequests] = useState<EmergencyAccessRequestRow[]>([]);
  const [emergencyAccessSummary, setEmergencyAccessSummary] = useState<EmergencyAccessEventSummaryRow | null>(null);
  const [emergencyAccessOpsSummary, setEmergencyAccessOpsSummary] = useState<EmergencyAccessOpsSummaryRow | null>(null);
  const [emergencyAccessOpsPolicy, setEmergencyAccessOpsPolicy] = useState<EmergencyAccessOpsPolicyRow | null>(null);
  const [savingEmergencyAccessOpsPolicy, setSavingEmergencyAccessOpsPolicy] = useState(false);
  const [emergencyAccessOpsPolicyDraft, setEmergencyAccessOpsPolicyDraft] = useState({
    pendingMaxAgeHours: '24',
    approvedMaxAgeMinutes: '120',
    nearExpiryWindowMinutes: '15',
    escalationEnabled: true,
    oncallChannel: 'public_audit_ops',
  });
  const [reviewingEmergencyRequestId, setReviewingEmergencyRequestId] = useState<string | null>(null);
  const [expandedEmergencyRequestId, setExpandedEmergencyRequestId] = useState<string | null>(null);
  const [loadingEmergencyEventsRequestId, setLoadingEmergencyEventsRequestId] = useState<string | null>(null);
  const [emergencyEventsByRequest, setEmergencyEventsByRequest] = useState<Record<string, EmergencyAccessRequestEventRow[]>>({});
  const [emergencyStatusFilter, setEmergencyStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired'>('all');
  const [emergencySearch, setEmergencySearch] = useState('');
  const [emergencyEscalationPages, setEmergencyEscalationPages] = useState<GovernancePublicAuditExternalExecutionPageBoardRow[]>([]);
  const [emergencyEscalationHistory, setEmergencyEscalationHistory] = useState<EmergencyAccessEscalationHistoryRow[]>([]);
  const [acknowledgingEmergencyEscalationPageId, setAcknowledgingEmergencyEscalationPageId] = useState<string | null>(null);
  const [resolvingEmergencyEscalationPageId, setResolvingEmergencyEscalationPageId] = useState<string | null>(null);
  const [emergencyAccessOpsPolicyEvents, setEmergencyAccessOpsPolicyEvents] = useState<EmergencyAccessOpsPolicyEventRow[]>([]);
  const [rollingBackEmergencyAccessOpsPolicyEventId, setRollingBackEmergencyAccessOpsPolicyEventId] = useState<string | null>(null);
  const latestOverrideSignatureRef = useRef<string | null>(null);
  const emergencyAccessOpsPolicyRef = useRef<EmergencyAccessOpsPolicyRow | null>(null);
  const tRef = useRef(t);
  emergencyAccessOpsPolicyRef.current = emergencyAccessOpsPolicy;
  tRef.current = t;

  const loadData = useCallback(async () => {
    setLoading(true);
    const translate = tRef.current;
    const policyForOps = emergencyAccessOpsPolicyRef.current;

    const [
      { data: usersData, error: usersError },
      { data: linkedAccountsData, error: linkedAccountsError },
      { data: matrixData, error: matrixError },
      { data: professionsData, error: professionsError },
      { data: profileProfessionsData, error: profileProfessionsError },
      { data: verificationCasesData, error: verificationCasesError },
      { data: sanctionsData, error: sanctionsError },
      { data: appealsData, error: appealsError },
      { data: emergencyAccessData, error: emergencyAccessError },
      { data: emergencyAccessSummaryData, error: emergencyAccessSummaryError },
      { data: emergencyAccessOpsSummaryData, error: emergencyAccessOpsSummaryError },
      { data: emergencyAccessOpsPolicyData, error: emergencyAccessOpsPolicyError },
      { data: emergencyAccessOpsPolicyEventsData, error: emergencyAccessOpsPolicyEventsError },
      executionPageBoardResponse,
      emergencyEscalationHistoryResponse,
    ] = await Promise.all([
      supabase.from('profiles').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase
        .from('linked_accounts')
        .select('owner_profile_id, linked_profile_id, relationship_type, business_name_normalized')
        .eq('relationship_type', 'business'),
      supabase.from('role_permissions').select('role,permission'),
      supabase.from('professions').select('*').order('label', { ascending: true }),
      supabase.from('profile_professions').select('*'),
      supabase.from('identity_verification_cases').select('*'),
      supabase.from('governance_sanctions').select('*').order('created_at', { ascending: false }),
      supabase.from('governance_sanction_appeals').select('*').order('created_at', { ascending: false }),
      supabase.rpc('governance_emergency_access_request_board', {
        requested_status: null,
        max_requests: 120,
      }),
      supabase.rpc('governance_emergency_access_event_summary', {
        requested_lookback_hours: 168,
      }),
      supabase.rpc('governance_emergency_access_ops_summary', {
        requested_pending_max_age_hours: policyForOps ? policyForOps.pending_max_age_hours : 24,
        requested_near_expiry_window_minutes: policyForOps ? policyForOps.near_expiry_window_minutes : 15,
      }),
      supabase.rpc('governance_emergency_access_ops_policy_summary', {
        requested_policy_key: 'default',
      }),
      supabase.rpc('governance_emergency_access_ops_policy_event_eligibility', {
        requested_policy_key: 'default',
        requested_lookback_hours: 336,
        max_events: 120,
        max_rollback_age_hours: EMERGENCY_OPS_POLICY_MAX_ROLLBACK_AGE_HOURS,
        required_policy_schema_version: EMERGENCY_OPS_POLICY_SCHEMA_VERSION,
      }),
      supabase.rpc('governance_public_audit_external_execution_page_board', {
        max_pages: 120,
      }),
      supabase.rpc('governance_public_audit_external_execution_page_history', {
        requested_page_key_substring: 'governance_emergency_access_ops_escalation',
        requested_lookback_hours: 168,
        max_pages: 240,
      }),
    ]);

    if (usersError) {
      console.error('Error loading users:', usersError);
      toast.error(translate('admin.users.loadFailed'));
    }

    if (linkedAccountsError) {
      console.error('Error loading linked accounts:', linkedAccountsError);
    }

    if (matrixError) {
      console.error('Error loading role permissions:', matrixError);
      toast.error(translate('admin.users.permissionsLoadFailed'));
    }

    if (professionsError) {
      console.error('Error loading professions:', professionsError);
      toast.error(translate('admin.users.professionsLoadFailed'));
    }

    if (profileProfessionsError) {
      console.error('Error loading user professions:', profileProfessionsError);
      toast.error(translate('admin.users.professionAssignmentsLoadFailed'));
    }

    if (verificationCasesError) {
      console.error('Error loading identity verification cases:', verificationCasesError);
      toast.error(translate('admin.users.verificationCasesLoadFailed'));
    }

    if (sanctionsError) {
      console.error('Error loading governance sanctions:', sanctionsError);
      toast.error(translate('admin.users.sanctionsLoadFailed'));
    }

    if (appealsError) {
      console.error('Error loading governance sanction appeals:', appealsError);
      toast.error(translate('admin.users.appealsLoadFailed'));
    }
    if (emergencyAccessError) {
      console.error('Error loading emergency access requests:', emergencyAccessError);
      toast.error('Could not load emergency access requests.');
    }
    if (emergencyAccessSummaryError) {
      console.error('Error loading emergency access summary:', emergencyAccessSummaryError);
      toast.error('Could not load emergency access event summary.');
    }
    if (emergencyAccessOpsSummaryError) {
      console.error('Error loading emergency access operations summary:', emergencyAccessOpsSummaryError);
      toast.error('Could not load emergency access operations summary.');
    }
    if (emergencyAccessOpsPolicyError) {
      console.error('Error loading emergency access operations policy:', emergencyAccessOpsPolicyError);
      toast.error('Could not load emergency access operations policy.');
    }
    if (emergencyAccessOpsPolicyEventsError) {
      console.error('Error loading emergency access operations policy event history:', emergencyAccessOpsPolicyEventsError);
      toast.error('Could not load emergency access operations policy history.');
    }
    if (executionPageBoardResponse.error) {
      console.error('Error loading external execution page board for emergency access stewardship:', executionPageBoardResponse.error);
    }
    if (emergencyEscalationHistoryResponse.error) {
      console.error('Error loading emergency access escalation history:', emergencyEscalationHistoryResponse.error);
      toast.error('Could not load emergency escalation history.');
    }

    const groupedRolePermissions = Object.fromEntries(
      APP_ROLES.map((role) => [
        role,
        (matrixData ?? [])
          .filter((entry) => entry.role === role)
          .map((entry) => entry.permission),
      ]),
    ) as Record<AppRole, AppPermission[]>;

    const nextUsers = ((usersData ?? []) as ProfileRow[]).sort((a, b) => Number(b.is_admin) - Number(a.is_admin));
    const groupedProfessions = (profileProfessionsData ?? []).reduce<Record<string, ProfileProfessionRow[]>>(
      (accumulator, assignment) => {
        if (!accumulator[assignment.profile_id]) {
          accumulator[assignment.profile_id] = [];
        }
        accumulator[assignment.profile_id].push(assignment);
        return accumulator;
      },
      {},
    );
    const verificationCaseMap = (verificationCasesData ?? []).reduce<Record<string, VerificationCaseRow>>(
      (accumulator, verificationCase) => {
        accumulator[verificationCase.profile_id] = verificationCase;
        return accumulator;
      },
      {},
    );
    const sanctionsMap = (sanctionsData ?? []).reduce<Record<string, GovernanceSanctionRow[]>>(
      (accumulator, sanction) => {
        if (!accumulator[sanction.profile_id]) {
          accumulator[sanction.profile_id] = [];
        }
        accumulator[sanction.profile_id].push(sanction);
        return accumulator;
      },
      {},
    );
    const appealsMap = (appealsData ?? []).reduce<Record<string, GovernanceSanctionAppealRow[]>>(
      (accumulator, appeal) => {
        if (!accumulator[appeal.profile_id]) {
          accumulator[appeal.profile_id] = [];
        }
        accumulator[appeal.profile_id].push(appeal);
        return accumulator;
      },
      {},
    );

    setUsers(nextUsers);
    setLinkedAccounts((linkedAccountsData ?? []) as LinkedAccountLink[]);
    setRolePermissions(groupedRolePermissions);
    setProfessions(professionsData ?? []);
    setUserProfessions(groupedProfessions);
    setVerificationCasesByProfile(verificationCaseMap);
    setSanctionsByProfile(sanctionsMap);
    setAppealsByProfile(appealsMap);
    setEmergencyAccessRequests((emergencyAccessData ?? []) as EmergencyAccessRequestRow[]);
    setEmergencyAccessSummary(((emergencyAccessSummaryData ?? [])[0] ?? null) as EmergencyAccessEventSummaryRow | null);
    setEmergencyAccessOpsSummary(((emergencyAccessOpsSummaryData ?? [])[0] ?? null) as EmergencyAccessOpsSummaryRow | null);
    const nextPolicy = ((emergencyAccessOpsPolicyData ?? [])[0] ?? null) as EmergencyAccessOpsPolicyRow | null;
    setEmergencyAccessOpsPolicy((current) => {
      if (!nextPolicy && !current) return current;
      if (
        current &&
        nextPolicy &&
        current.policy_key === nextPolicy.policy_key &&
        current.pending_max_age_hours === nextPolicy.pending_max_age_hours &&
        current.approved_max_age_minutes === nextPolicy.approved_max_age_minutes &&
        current.near_expiry_window_minutes === nextPolicy.near_expiry_window_minutes &&
        current.escalation_enabled === nextPolicy.escalation_enabled &&
        current.oncall_channel === nextPolicy.oncall_channel &&
        current.updated_at === nextPolicy.updated_at
      ) {
        return current;
      }
      return nextPolicy;
    });
    if (nextPolicy) {
      setEmergencyAccessOpsPolicyDraft({
        pendingMaxAgeHours: String(nextPolicy.pending_max_age_hours),
        approvedMaxAgeMinutes: String(nextPolicy.approved_max_age_minutes),
        nearExpiryWindowMinutes: String(nextPolicy.near_expiry_window_minutes),
        escalationEnabled: Boolean(nextPolicy.escalation_enabled),
        oncallChannel: nextPolicy.oncall_channel || 'public_audit_ops',
      });
    }
    setEmergencyAccessOpsPolicyEvents((emergencyAccessOpsPolicyEventsData ?? []) as EmergencyAccessOpsPolicyEventRow[]);
    setEmergencyEscalationPages(
      readGovernancePublicAuditExternalExecutionPageBoardRows(executionPageBoardResponse.data)
        .filter((page) => page.pageKey.includes('governance_emergency_access_ops_escalation')),
    );
    setEmergencyEscalationHistory((emergencyEscalationHistoryResponse.data ?? []) as EmergencyAccessEscalationHistoryRow[]);
    setSelectedUserId((current) => {
      if (!current) return null;
      return nextUsers.some((user) => user.id === current) ? current : null;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return users;

    const matchesSearch = (user: ProfileRow) =>
      [
        user.full_name,
        user.username,
        user.country,
        user.role,
        user.citizenship_status,
        verificationCasesByProfile[user.id]?.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
      || linkedAccounts.some(
        (link) =>
          link.relationship_type === 'business'
          && (link.linked_profile_id === user.id || link.owner_profile_id === user.id)
          && Boolean(link.business_name_normalized?.toLowerCase().includes(normalized)),
      );

    const matchedIds = new Set(users.filter(matchesSearch).map((user) => user.id));

    // Keep owner↔org pairs together when either side matches search.
    for (const link of linkedAccounts) {
      if (link.relationship_type !== 'business') continue;
      if (matchedIds.has(link.owner_profile_id)) matchedIds.add(link.linked_profile_id);
      if (matchedIds.has(link.linked_profile_id)) matchedIds.add(link.owner_profile_id);
    }

    return users.filter((user) => matchedIds.has(user.id));
  }, [linkedAccounts, search, users, verificationCasesByProfile]);

  const visibleGroups = useMemo(
    () => groupUsersWithOrganizations(visibleUsers, linkedAccounts),
    [linkedAccounts, visibleUsers],
  );

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [selectedUserId, users],
  );

  const selectedUserProfessions = useMemo(
    () => (selectedUser ? userProfessions[selectedUser.id] || [] : []),
    [selectedUser, userProfessions],
  );
  const selectedUserCitizenshipStatus = useMemo(
    () => (selectedUser ? getEffectiveCitizenshipStatus(selectedUser) : null),
    [selectedUser],
  );
  const selectedUserVerificationCase = useMemo(
    () => (selectedUser ? verificationCasesByProfile[selectedUser.id] || null : null),
    [selectedUser, verificationCasesByProfile],
  );
  const selectedUserSanctions = useMemo(
    () => (selectedUser ? sanctionsByProfile[selectedUser.id] || [] : []),
    [sanctionsByProfile, selectedUser],
  );
  const selectedUserAppeals = useMemo(
    () => (selectedUser ? appealsByProfile[selectedUser.id] || [] : []),
    [appealsByProfile, selectedUser],
  );

  useEffect(() => {
    if (!selectedUser) {
      setOverrideModes(null);
      setOverrideSaveError(null);
      latestOverrideSignatureRef.current = null;
      return;
    }

    const nextModes = toOverrideMap(selectedUser);
    setOverrideModes(nextModes);
    setOverrideSaveError(null);
    latestOverrideSignatureRef.current = serializeOverrideModes(nextModes);
  }, [selectedUser]);

  const stats = useMemo(() => {
    const staffCount = users.filter((user) => ['moderator', 'market_manager', 'founder', 'admin', 'system'].includes(user.role)).length;
    return {
      total: users.length,
      admins: users.filter((user) => ['admin', 'system'].includes(user.role)).length,
      staff: staffCount,
    };
  }, [users]);

  const groupedMetadata = useMemo(
    () =>
      [...permissionMetadata].sort(
        (a, b) =>
          sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section) ||
          pageOrder.indexOf(a.page) - pageOrder.indexOf(b.page) ||
          a.permission.localeCompare(b.permission),
      ),
    [],
  );

  const groupedPermissions = useMemo(() => {
    return sectionOrder
      .map((sectionId) => {
        const pages = pageOrder
          .map((pageId) => {
            const items = groupedMetadata.filter(
              (entry) => entry.section === sectionId && entry.page === pageId,
            );

            if (!items.length) return null;

            return {
              pageId,
              items,
            };
          })
          .filter(Boolean) as Array<{
          pageId: PageId;
          items: typeof permissionMetadata;
        }>;

        if (!pages.length) return null;

        return {
          sectionId,
          pages,
        };
      })
      .filter(Boolean) as Array<{
      sectionId: SectionId;
      pages: Array<{
        pageId: PageId;
        items: typeof permissionMetadata;
      }>;
    }>;
  }, [groupedMetadata]);

  const selectedUserEffectivePermissions = useMemo(() => {
    if (!selectedUser || !overrideModes) return [];

    const granted = APP_PERMISSIONS.filter((permission) => overrideModes[permission] === 'grant');
    const denied = APP_PERMISSIONS.filter((permission) => overrideModes[permission] === 'deny');

    return resolveEffectivePermissions(
      selectedUser.role,
      rolePermissions[selectedUser.role] || [],
      granted,
      denied,
      [],
    );
  }, [overrideModes, rolePermissions, selectedUser]);

  const formatDate = (value: string) => {
    try {
      return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return t('admin.users.noActivity');

    try {
      const timestamp = new Date(value).getTime();
      const diffMs = timestamp - Date.now();
      const minute = 60 * 1000;
      const hour = 60 * minute;
      const day = 24 * hour;
      const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

      if (Math.abs(diffMs) < hour) {
        return rtf.format(Math.round(diffMs / minute), 'minute');
      }

      if (Math.abs(diffMs) < day) {
        return rtf.format(Math.round(diffMs / hour), 'hour');
      }

      return rtf.format(Math.round(diffMs / day), 'day');
    } catch {
      return value;
    }
  };

  const getActivityTimestamp = (user: ProfileRow) => user.last_active_at || user.updated_at || user.created_at;

  const isUserOnline = (user: ProfileRow) => {
    const timestamp = getActivityTimestamp(user);
    if (!timestamp) return false;
    return Date.now() - new Date(timestamp).getTime() <= 5 * 60 * 1000;
  };

  const getPageLabel = (pageId: PageId) => {
    if (pageId === 'editProfile') return t('settings.editProfile');
    if (pageId === 'adminUsers') return t('common.users');
    if (pageId === 'adminPermissions') return t('common.permissions');
    return t(pageRegistry[pageId].labelKey);
  };

  const canLoginAsFromAdmin = Boolean(profile?.effective_permissions?.includes('settings.manage'));
  const canReviewEmergencyAccess = Boolean(profile?.effective_permissions?.includes('settings.manage'));

  const filteredEmergencyRequests = useMemo(() => {
    const statusFiltered = emergencyStatusFilter === 'all'
      ? emergencyAccessRequests
      : emergencyAccessRequests.filter((request) => request.request_status === emergencyStatusFilter);
    const normalizedSearch = emergencySearch.trim().toLowerCase();
    if (!normalizedSearch) return statusFiltered;
    return statusFiltered.filter((request) =>
      [
        request.target_display_name,
        request.target_username,
        request.requested_by_name,
        request.request_reason,
        request.review_notes,
        request.request_id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [emergencyAccessRequests, emergencySearch, emergencyStatusFilter]);

  const handleLoginAsUser = async (targetUser: ProfileRow) => {
    if (!canLoginAsFromAdmin) {
      toast.error(t('admin.users.loginAsUserUnavailable'));
      return;
    }

    const defaultReason = `Emergency support request for ${targetUser.full_name || targetUser.username || 'user'} (${targetUser.id}).`;
    const reason = window.prompt(
      'Enter emergency access reason (required, recorded for governance audit).',
      defaultReason,
    );

    if (!reason || !reason.trim()) {
      toast.error('Emergency access request cancelled: reason is required.');
      return;
    }

    setSwitchingUserId(targetUser.id);

    const { data, error } = await supabase.rpc('request_governance_emergency_access', {
      target_profile_id: targetUser.id,
      request_reason: reason.trim(),
    });

    if (error || typeof data !== 'string' || !data.trim()) {
      toast.error('Could not submit emergency access request.');
      setSwitchingUserId(null);
      return;
    }

    toast.success(
      `Emergency access request submitted for ${targetUser.full_name || targetUser.username || 'user'}. Request ID: ${data}.`,
    );
    setSwitchingUserId(null);
    await loadData();
  };

  const handleReviewEmergencyAccessRequest = async (
    request: EmergencyAccessRequestRow,
    nextStatus: 'approved' | 'rejected' | 'expired',
  ) => {
    if (!canReviewEmergencyAccess) return;
    setReviewingEmergencyRequestId(request.request_id);

    const defaultNotes = nextStatus === 'approved'
      ? `Approved by governance staff for emergency support case on ${new Date().toISOString()}.`
      : '';
    const notesInput = window.prompt(
      nextStatus === 'approved'
        ? 'Optional approval notes (leave blank to continue).'
        : 'Review notes are required when rejecting or expiring a request.',
      defaultNotes,
    );
    const reviewNotes = notesInput?.trim() || '';

    if ((nextStatus === 'rejected' || nextStatus === 'expired') && !reviewNotes) {
      toast.error('Review notes are required for rejected or expired emergency access requests.');
      setReviewingEmergencyRequestId(null);
      return;
    }

    let approvedTtlMinutes = 30;
    if (nextStatus === 'approved') {
      const ttlInput = window.prompt('Approved access TTL in minutes (required, min 1).', '30');
      const parsedTtl = Number.parseInt(ttlInput || '', 10);
      if (!Number.isFinite(parsedTtl) || parsedTtl < 1) {
        toast.error('A valid approval TTL is required.');
        setReviewingEmergencyRequestId(null);
        return;
      }
      approvedTtlMinutes = parsedTtl;
    }

    const { error } = await supabase.rpc('review_governance_emergency_access_request', {
      target_request_id: request.request_id,
      next_status: nextStatus,
      review_notes: reviewNotes || null,
      approved_ttl_minutes: approvedTtlMinutes,
    });

    if (error) {
      console.error('Error reviewing emergency access request:', error);
      toast.error('Could not update emergency access request.');
      setReviewingEmergencyRequestId(null);
      return;
    }

    toast.success(`Emergency access request marked ${nextStatus}.`);
    setReviewingEmergencyRequestId(null);
    await loadData();
  };

  const handleToggleEmergencyRequestTimeline = async (requestId: string) => {
    if (expandedEmergencyRequestId === requestId) {
      setExpandedEmergencyRequestId(null);
      return;
    }

    setExpandedEmergencyRequestId(requestId);
    if (emergencyEventsByRequest[requestId]) return;

    setLoadingEmergencyEventsRequestId(requestId);
    const { data, error } = await supabase.rpc('governance_emergency_access_request_event_board', {
      target_request_id: requestId,
      max_events: 40,
    });

    if (error) {
      console.error('Error loading emergency access request events:', error);
      toast.error('Could not load emergency access timeline.');
      setLoadingEmergencyEventsRequestId(null);
      return;
    }

    setEmergencyEventsByRequest((current) => ({
      ...current,
      [requestId]: (data ?? []) as EmergencyAccessRequestEventRow[],
    }));
    setLoadingEmergencyEventsRequestId(null);
  };

  const handleAcknowledgeEmergencyEscalationPage = async (pageId: string) => {
    setAcknowledgingEmergencyEscalationPageId(pageId);
    const notes = window.prompt('Optional acknowledgement notes for this emergency-access escalation page:', '');

    const { error } = await supabase.rpc('acknowledge_governance_public_audit_external_execution_page', {
      target_page_id: pageId,
      acknowledgement_notes: notes?.trim() || null,
    });

    if (error) {
      console.error('Error acknowledging emergency access escalation page:', error);
      toast.error('Could not acknowledge emergency access escalation page.');
      setAcknowledgingEmergencyEscalationPageId(null);
      return;
    }

    toast.success('Emergency access escalation page acknowledged.');
    setAcknowledgingEmergencyEscalationPageId(null);
    await loadData();
  };

  const handleResolveEmergencyEscalationPage = async (pageId: string) => {
    setResolvingEmergencyEscalationPageId(pageId);
    const notes = window.prompt('Optional resolution notes for this emergency-access escalation page:', '');

    const { error } = await supabase.rpc('resolve_governance_public_audit_external_execution_page', {
      target_page_id: pageId,
      resolution_notes: notes?.trim() || null,
    });

    if (error) {
      console.error('Error resolving emergency access escalation page:', error);
      toast.error('Could not resolve emergency access escalation page.');
      setResolvingEmergencyEscalationPageId(null);
      return;
    }

    toast.success('Emergency access escalation page resolved.');
    setResolvingEmergencyEscalationPageId(null);
    await loadData();
  };

  const handleSaveEmergencyAccessOpsPolicy = async () => {
    setSavingEmergencyAccessOpsPolicy(true);
    const pendingMaxAgeHours = Number.parseInt(emergencyAccessOpsPolicyDraft.pendingMaxAgeHours, 10);
    const approvedMaxAgeMinutes = Number.parseInt(emergencyAccessOpsPolicyDraft.approvedMaxAgeMinutes, 10);
    const nearExpiryWindowMinutes = Number.parseInt(emergencyAccessOpsPolicyDraft.nearExpiryWindowMinutes, 10);
    if (!Number.isFinite(pendingMaxAgeHours) || pendingMaxAgeHours < 1
      || !Number.isFinite(approvedMaxAgeMinutes) || approvedMaxAgeMinutes < 1
      || !Number.isFinite(nearExpiryWindowMinutes) || nearExpiryWindowMinutes < 1
    ) {
      toast.error('All emergency operations policy thresholds must be positive numbers.');
      setSavingEmergencyAccessOpsPolicy(false);
      return;
    }

    const { error } = await supabase.rpc('set_governance_emergency_access_ops_policy', {
      requested_policy_key: 'default',
      requested_policy_name: 'Default emergency access operations policy',
      requested_pending_max_age_hours: pendingMaxAgeHours,
      requested_approved_max_age_minutes: approvedMaxAgeMinutes,
      requested_near_expiry_window_minutes: nearExpiryWindowMinutes,
      requested_escalation_enabled: emergencyAccessOpsPolicyDraft.escalationEnabled,
      requested_oncall_channel: emergencyAccessOpsPolicyDraft.oncallChannel.trim() || 'public_audit_ops',
      metadata: { source: 'users_admin_emergency_access_ops_policy' },
    });

    if (error) {
      console.error('Error saving emergency access operations policy:', error);
      toast.error('Could not save emergency access operations policy.');
      setSavingEmergencyAccessOpsPolicy(false);
      return;
    }

    toast.success('Emergency access operations policy saved.');
    setSavingEmergencyAccessOpsPolicy(false);
    await loadData();
  };

  const handleRollbackEmergencyAccessOpsPolicyToEvent = async (eventId: string) => {
    setRollingBackEmergencyAccessOpsPolicyEventId(eventId);
    const confirmed = window.confirm(
      'Rollback emergency access operations policy to this historical event snapshot?',
    );
    if (!confirmed) {
      setRollingBackEmergencyAccessOpsPolicyEventId(null);
      return;
    }

    const { error } = await supabase.rpc('rollback_governance_emergency_access_ops_policy_to_event', {
      target_event_id: eventId,
      max_rollback_age_hours: EMERGENCY_OPS_POLICY_MAX_ROLLBACK_AGE_HOURS,
      required_policy_schema_version: EMERGENCY_OPS_POLICY_SCHEMA_VERSION,
    });

    if (error) {
      console.error('Error rolling back emergency access operations policy:', error);
      toast.error('Could not rollback emergency access operations policy.');
      setRollingBackEmergencyAccessOpsPolicyEventId(null);
      return;
    }

    toast.success('Emergency access operations policy rolled back.');
    setRollingBackEmergencyAccessOpsPolicyEventId(null);
    await loadData();
  };

  const emergencyEscalationTrend = useMemo(() => {
    const summary = {
      opened: 0,
      acknowledged: 0,
      resolved: 0,
      critical: 0,
      warning: 0,
    };
    for (const row of emergencyEscalationHistory) {
      summary.opened += 1;
      if (row.page_status === 'acknowledged') summary.acknowledged += 1;
      if (row.page_status === 'resolved') summary.resolved += 1;
      if (row.severity === 'critical') summary.critical += 1;
      if (row.severity === 'warning') summary.warning += 1;
    }
    return summary;
  }, [emergencyEscalationHistory]);

  const handleRoleChange = async (target: ProfileRow, nextRole: AppRole) => {
    if (!profile) return;
    if (target.user_id === profile.user_id) {
      toast.error(t('admin.users.cannotEditSelf'));
      return;
    }

    const now = new Date().toISOString();
    const previousRole = target.role;
    const previousCitizenshipStatus = target.citizenship_status;
    const previousAcceptedAt = target.citizenship_accepted_at;
    const previousAcceptanceMode = target.citizenship_acceptance_mode;
    const previousIsActiveCitizen = target.is_active_citizen;
    const previousActiveCitizenSince = target.active_citizen_since;
    const nextProjectedCitizenshipStatus = deriveProjectedCitizenshipStatus(nextRole, Boolean(target.is_verified));
    const nextCitizenshipStatus = coerceCitizenshipStatus(target.citizenship_status, nextProjectedCitizenshipStatus);
    const nextIsActiveCitizen = target.is_active_citizen || nextRole === 'founder';
    const rolePatch: Database['public']['Tables']['profiles']['Update'] = {
      role: nextRole,
      citizenship_status: nextCitizenshipStatus,
      citizenship_accepted_at:
        nextCitizenshipStatus === 'citizen' ? target.citizenship_accepted_at ?? now : target.citizenship_accepted_at,
      citizenship_acceptance_mode:
        nextCitizenshipStatus === 'citizen'
          ? target.citizenship_acceptance_mode ?? (nextRole === 'founder' ? 'bootstrap' : 'system_projection')
          : target.citizenship_acceptance_mode,
      is_active_citizen: nextIsActiveCitizen,
      active_citizen_since: nextIsActiveCitizen ? target.active_citizen_since ?? now : target.active_citizen_since,
    };

    setRoleSavingUserId(target.id);
    setUsers((current) =>
      current.map((user) =>
        user.id === target.id
          ? {
              ...user,
              role: nextRole,
              is_admin: nextRole === 'admin' || nextRole === 'system',
              citizenship_status: nextCitizenshipStatus,
              citizenship_accepted_at:
                nextCitizenshipStatus === 'citizen'
                  ? user.citizenship_accepted_at ?? now
                  : user.citizenship_accepted_at,
              citizenship_acceptance_mode:
                nextCitizenshipStatus === 'citizen'
                  ? user.citizenship_acceptance_mode ?? (nextRole === 'founder' ? 'bootstrap' : 'system_projection')
                  : user.citizenship_acceptance_mode,
              is_active_citizen: nextIsActiveCitizen,
              active_citizen_since: nextIsActiveCitizen ? user.active_citizen_since ?? now : user.active_citizen_since,
            }
          : user,
      ),
    );

    const { error } = await supabase.from('profiles').update(rolePatch).eq('id', target.id);

    if (error) {
      console.error('Error updating role:', error);
      setUsers((current) =>
        current.map((user) =>
          user.id === target.id
            ? {
                ...user,
                role: previousRole,
                is_admin: previousRole === 'admin' || previousRole === 'system',
                citizenship_status: previousCitizenshipStatus,
                citizenship_accepted_at: previousAcceptedAt,
                citizenship_acceptance_mode: previousAcceptanceMode,
                is_active_citizen: previousIsActiveCitizen,
                active_citizen_since: previousActiveCitizenSince,
              }
            : user,
        ),
      );
      toast.error(t('admin.users.roleUpdateFailed'));
      setRoleSavingUserId(null);
      return;
    }

    if (target.user_id === profile.user_id) {
      await refreshProfile();
    }

    toast.success(
      t('admin.users.roleUpdated', {
        user: target.full_name || target.username || t('common.anonymousUser'),
        role: t(`admin.roles.${nextRole}`),
      }),
    );
    setRoleSavingUserId(null);
  };

  const handleVerificationToggle = async (target: ProfileRow) => {
    const nextVerified = !target.is_verified;
    const now = new Date().toISOString();
    setRoleSavingUserId(target.id);

    const existingCase = verificationCasesByProfile[target.id] || null;
    const caseUpsert: Database['public']['Tables']['identity_verification_cases']['Insert'] = {
      profile_id: target.id,
      status: nextVerified ? 'in_review' : 'revoked',
      verification_method: existingCase?.verification_method || 'admin_review',
      personal_info_completed:
        existingCase?.personal_info_completed
        ?? Boolean(target.full_name && target.country && target.official_id),
      contact_info_completed:
        existingCase?.contact_info_completed
        ?? Boolean(target.username || target.language_code),
      live_verification_completed: nextVerified ? true : existingCase?.live_verification_completed ?? false,
      submitted_at: existingCase?.submitted_at ?? now,
      notes: nextVerified
        ? t('admin.users.verificationApprovedNote')
        : t('admin.users.verificationRevokedNote'),
    };

    const caseResponse = await supabase
      .from('identity_verification_cases')
      .upsert(caseUpsert, { onConflict: 'profile_id' })
      .select('*')
      .single();

    if (caseResponse.error || !caseResponse.data) {
      console.error('Error upserting verification case:', caseResponse.error);
      toast.error(t('admin.users.verificationCaseUpdateFailed'));
      setRoleSavingUserId(null);
      return;
    }

    const reviewResponse = await supabase
      .from('identity_verification_reviews')
      .insert({
        case_id: caseResponse.data.id,
        reviewer_id: profile?.id ?? null,
        decision: getAdminVerificationDecision(nextVerified),
        notes: nextVerified
          ? t('admin.users.verificationApprovedNote')
          : t('admin.users.verificationRevokedNote'),
      });

    if (reviewResponse.error) {
      console.error('Error recording verification review:', reviewResponse.error);
      toast.error(t('admin.users.verificationReviewFailed'));
      setRoleSavingUserId(null);
      return;
    }

    await loadData();
    if (target.user_id === profile?.user_id) {
      await refreshProfile();
    }

    toast.success(
      t(nextVerified ? 'admin.users.userVerified' : 'admin.users.userUnverified', {
        user: target.full_name || target.username || t('common.anonymousUser'),
      }),
    );
    setRoleSavingUserId(null);
  };

  const handleExperienceLevelChange = async (target: ProfileRow, nextLevel: UserExperienceLevel) => {
    if (target.experience_level === nextLevel) return;
    const previousLevel = target.experience_level;

    setLevelSavingUserId(target.id);
    setUsers((current) => current.map((user) => (user.id === target.id ? { ...user, experience_level: nextLevel } : user)));

    const { error } = await supabase
      .from('profiles')
      .update({ experience_level: nextLevel })
      .eq('id', target.id);

    if (error) {
      console.error('Error updating experience level:', error);
      setUsers((current) => current.map((user) => (user.id === target.id ? { ...user, experience_level: previousLevel } : user)));
      toast.error(t('admin.users.levelUpdateFailed'));
      setLevelSavingUserId(null);
      return;
    }

    toast.success(
      t('admin.users.levelUpdated', {
        user: target.full_name || target.username || t('common.anonymousUser'),
        level: userExperienceLevelLabelMap[nextLevel],
      }),
    );
    setLevelSavingUserId(null);
  };

  const handleOverrideChange = (permission: AppPermission, mode: OverrideMode) => {
    setOverrideSaveError(null);
    setOverrideModes((current) => (current ? { ...current, [permission]: mode } : current));
  };

  const persistOverrideModes = useCallback(async (
    targetUser: ProfileRow,
    nextOverrideModes: Record<AppPermission, OverrideMode>,
    options?: { showSuccessToast?: boolean },
  ) => {
    const { showSuccessToast = false } = options || {};

    if (targetUser.user_id === profile?.user_id) {
      toast.error(t('admin.users.cannotEditOwnPermissions'));
      return false;
    }

    const { granted_permissions, denied_permissions } = getOverridePermissionSets(nextOverrideModes);
    setOverrideSavingUserId(targetUser.id);

    const { error } = await supabase
      .from('profiles')
      .update({
        granted_permissions,
        denied_permissions,
        custom_permissions: granted_permissions,
      })
      .eq('id', targetUser.id);

    if (error) {
      console.error('Error updating user permission overrides:', error);
      setOverrideSaveError(t('admin.users.autoSaveFailed'));
      toast.error(t('admin.users.overrideSaveFailed'));
      setOverrideSavingUserId(null);
      return false;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === targetUser.id
          ? { ...user, granted_permissions, denied_permissions, custom_permissions: granted_permissions }
          : user,
      ),
    );

    latestOverrideSignatureRef.current = JSON.stringify({ granted_permissions, denied_permissions });
    setOverrideSaveError(null);
    setOverrideSavingUserId(null);

    if (showSuccessToast) {
      toast.success(t('admin.users.overrideSaved'));
    }

    return true;
  }, [profile?.user_id, t]);

  useEffect(() => {
    if (!selectedUser || !overrideModes) return;
    if (selectedUser.user_id === profile?.user_id) return;

    const nextSignature = serializeOverrideModes(overrideModes);
    if (nextSignature === latestOverrideSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      void persistOverrideModes(selectedUser, overrideModes);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [overrideModes, persistOverrideModes, profile?.user_id, selectedUser]);

  const handleRetrySaveOverrides = async () => {
    if (!selectedUser || !overrideModes) return;
    await persistOverrideModes(selectedUser, overrideModes, { showSuccessToast: true });
  };

  const getProfessionAssignment = (targetUserId: string, professionId: string) =>
    (userProfessions[targetUserId] || []).find((assignment) => assignment.profession_id === professionId) || null;

  const handleProfessionStatusChange = async (
    targetUser: ProfileRow,
    professionId: string,
    nextStatus: ProfessionStatusMode,
  ) => {
    if (!profile) return;

    const saveKey = `${targetUser.id}:${professionId}`;
    const previousAssignments = userProfessions[targetUser.id] || [];
    const previousAssignment = previousAssignments.find((assignment) => assignment.profession_id === professionId) || null;
    setProfessionSavingKey(saveKey);

    if (nextStatus === 'unassigned') {
      const { error } = await supabase
        .from('profile_professions')
        .delete()
        .eq('profile_id', targetUser.id)
        .eq('profession_id', professionId);

      if (error) {
        console.error('Error removing profession assignment:', error);
        toast.error(t('admin.users.professionSaveFailed'));
        setProfessionSavingKey(null);
        return;
      }

      setUserProfessions((current) => ({
        ...current,
        [targetUser.id]: (current[targetUser.id] || []).filter((assignment) => assignment.profession_id !== professionId),
      }));

      toast.success(
        t('admin.users.professionRemoved', {
          user: targetUser.full_name || targetUser.username || t('common.anonymousUser'),
        }),
      );
      setProfessionSavingKey(null);
      await loadData();
      return;
    }

    const verifiedAt = nextStatus === 'pending' ? null : new Date().toISOString();
    const verifiedBy = nextStatus === 'pending' ? null : profile.id;

    const payload: Database['public']['Tables']['profile_professions']['Insert'] = {
      profile_id: targetUser.id,
      profession_id: professionId,
      status: nextStatus,
      evidence_url: previousAssignment?.evidence_url || null,
      notes: previousAssignment?.notes || null,
      verified_at: verifiedAt,
      verified_by: verifiedBy,
    };

    const { data, error } = await supabase
      .from('profile_professions')
      .upsert(payload, { onConflict: 'profile_id,profession_id' })
      .select()
      .single();

    if (error || !data) {
      console.error('Error saving profession assignment:', error);
      toast.error(t('admin.users.professionSaveFailed'));
      setProfessionSavingKey(null);
      return;
    }

    setUserProfessions((current) => {
      const remaining = (current[targetUser.id] || []).filter((assignment) => assignment.profession_id !== professionId);
      return {
        ...current,
        [targetUser.id]: [...remaining, data as ProfileProfessionRow].sort((a, b) => a.profession_id.localeCompare(b.profession_id)),
      };
    });

    toast.success(
      t('admin.users.professionSaved', {
        user: targetUser.full_name || targetUser.username || t('common.anonymousUser'),
      }),
    );
    setProfessionSavingKey(null);
    await loadData();
  };

  const handleIssueSanction = async (args: {
    targetUser: ProfileRow;
    scope: GovernanceSanctionScopeOption;
    reason: string;
    notes: string;
    durationDays: number | null;
  }) => {
    if (!profile?.id) return false;

    const reason = args.reason.trim();
    if (!reason) return false;

    setSanctionSavingUserId(args.targetUser.id);

    const endsAt = args.durationDays && args.durationDays > 0
      ? new Date(Date.now() + args.durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from('governance_sanctions')
      .insert({
        profile_id: args.targetUser.id,
        issued_by: profile.id,
        reason,
        notes: args.notes.trim() || null,
        ends_at: endsAt,
        ...buildGovernanceSanctionScopeFlags(args.scope),
      });

    if (error) {
      console.error('Error issuing governance sanction:', error);
      toast.error(t('admin.users.sanctionIssueFailed'));
      setSanctionSavingUserId(null);
      return false;
    }

    toast.success(t('admin.users.sanctionIssued'));
    setSanctionSavingUserId(null);
    await loadData();
    return true;
  };

  const handleLiftSanction = async (sanction: GovernanceSanctionRow) => {
    if (!profile?.id) return false;

    setSanctionSavingUserId(sanction.profile_id);

    const { error } = await supabase
      .from('governance_sanctions')
      .update({
        is_active: false,
        lifted_by: profile.id,
        lifted_at: new Date().toISOString(),
      })
      .eq('id', sanction.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error lifting governance sanction:', error);
      toast.error(t('admin.users.sanctionLiftFailed'));
      setSanctionSavingUserId(null);
      return false;
    }

    toast.success(t('admin.users.sanctionLifted'));
    setSanctionSavingUserId(null);
    await loadData();
    return true;
  };

  const handleSaveAppeal = async (args: {
    appeal: GovernanceSanctionAppealRow;
    status: GovernanceSanctionAppealStatus;
    resolutionNotes: string;
  }) => {
    if (!profile?.id) return false;

    setAppealSavingId(args.appeal.id);

    const now = new Date().toISOString();
    const shouldSetReviewTimestamp = args.status === 'under_review'
      || args.status === 'accepted'
      || args.status === 'rejected';

    const { error } = await supabase
      .from('governance_sanction_appeals')
      .update({
        status: args.status,
        reviewed_by: shouldSetReviewTimestamp ? profile.id : null,
        reviewed_at: shouldSetReviewTimestamp ? now : null,
        resolution_notes: args.resolutionNotes.trim() || null,
      })
      .eq('id', args.appeal.id);

    if (error) {
      console.error('Error saving governance sanction appeal:', error);
      toast.error(t('admin.users.appealSaveFailed'));
      setAppealSavingId(null);
      return false;
    }

    toast.success(t('admin.users.appealSaved'));
    setAppealSavingId(null);
    await loadData();
    return true;
  };

  const handleCreateUser = async () => {
    setCreatingUser(true);

    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: createUserForm.email.trim(),
        password: createUserForm.password,
        full_name: createUserForm.fullName.trim() || null,
        username: createUserForm.username.trim() || null,
        role: createUserForm.role,
      },
    });

    if (error) {
      console.error('Error creating user:', error);
      toast.error(t('admin.users.createUserFailed'));
      setCreatingUser(false);
      return;
    }

    if (data?.error) {
      toast.error(String(data.error));
      setCreatingUser(false);
      return;
    }

    toast.success(t('admin.users.userCreated'));
    setCreateUserForm(emptyCreateUserForm);
    setCreateUserOpen(false);
    setCreatingUser(false);
    await loadData();
  };

  return (
    <AppLayout
      topChromeBeforeSearch={(
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full border border-border/60 bg-card/60"
          onClick={() => setCreateUserOpen(true)}
          aria-label={t('admin.users.createUser')}
          title={t('admin.users.createUser')}
          data-testid="users-admin-add-user"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    >
      <div className="space-y-6 px-4 py-6">
        <UsersAdminOverview
          search={search}
          stats={stats}
          t={t}
          onSearchChange={setSearch}
        />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-20 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </div>
            ) : visibleGroups.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-semibold text-foreground">{t('admin.users.noResultsTitle')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('admin.users.noResultsDescription')}</p>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center gap-2 px-6 py-20 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </div>
                }
              >
                {isMobile ? (
                  <UsersAdminMobileList
                    canLoginAsFromAdmin={canLoginAsFromAdmin}
                    levelSavingUserId={levelSavingUserId}
                    overrideSavingUserId={overrideSavingUserId}
                    profileUserId={profile?.user_id}
                    roleSavingUserId={roleSavingUserId}
                    selectedUserId={selectedUserId}
                    switchingUserId={switchingUserId}
                    t={t}
                    verificationCasesByProfile={verificationCasesByProfile}
                    visibleGroups={visibleGroups}
                    formatDate={formatDate}
                    formatRelativeTime={formatRelativeTime}
                    getActivityTimestamp={getActivityTimestamp}
                    isUserOnline={isUserOnline}
                    onExperienceLevelChange={(user, nextLevel) => void handleExperienceLevelChange(user, nextLevel)}
                    onLoginAsUser={(user) => void handleLoginAsUser(user)}
                    onRoleChange={(user, nextRole) => void handleRoleChange(user, nextRole)}
                    onSelectUser={setSelectedUserId}
                    onToggleSelectedUser={(userId) => setSelectedUserId((current) => (current === userId ? null : userId))}
                    onVerificationToggle={(user) => void handleVerificationToggle(user)}
                  />
                ) : (
                  <UsersAdminDesktopTable
                    canLoginAsFromAdmin={canLoginAsFromAdmin}
                    levelSavingUserId={levelSavingUserId}
                    overrideSavingUserId={overrideSavingUserId}
                    profileUserId={profile?.user_id}
                    roleSavingUserId={roleSavingUserId}
                    selectedUserId={selectedUserId}
                    switchingUserId={switchingUserId}
                    t={t}
                    verificationCasesByProfile={verificationCasesByProfile}
                    visibleGroups={visibleGroups}
                    formatDate={formatDate}
                    formatRelativeTime={formatRelativeTime}
                    getActivityTimestamp={getActivityTimestamp}
                    isUserOnline={isUserOnline}
                    onExperienceLevelChange={(user, nextLevel) => void handleExperienceLevelChange(user, nextLevel)}
                    onLoginAsUser={(user) => void handleLoginAsUser(user)}
                    onRoleChange={(user, nextRole) => void handleRoleChange(user, nextRole)}
                    onSelectUser={setSelectedUserId}
                    onVerificationToggle={(user) => void handleVerificationToggle(user)}
                  />
                )}
              </Suspense>
            )}
          </Card>
        </motion.div>

        {selectedUser && overrideModes && (
          <Suspense fallback={<Card className="rounded-3xl border-border/60 p-5 shadow-sm" />}>
            <UsersAdminSelectedPanel
              groupedPermissions={groupedPermissions}
              overrideModes={overrideModes}
              overrideSaveError={overrideSaveError}
              overrideSavingUserId={overrideSavingUserId}
              professionSavingKey={professionSavingKey}
              professions={professions}
              profileUserId={profile?.user_id}
              rolePermissions={rolePermissions}
              selectedUser={selectedUser}
              selectedUserCitizenshipStatus={selectedUserCitizenshipStatus}
              selectedUserSanctions={selectedUserSanctions}
              selectedUserAppeals={selectedUserAppeals}
              selectedUserEffectivePermissions={selectedUserEffectivePermissions}
              selectedUserVerificationCase={selectedUserVerificationCase}
              sanctionSavingUserId={sanctionSavingUserId}
              appealSavingId={appealSavingId}
              t={t}
              formatDate={formatDate}
              getPageLabel={getPageLabel}
              getProfessionAssignment={getProfessionAssignment}
              handleOverrideChange={handleOverrideChange}
              handleProfessionStatusChange={handleProfessionStatusChange}
              handleIssueSanction={handleIssueSanction}
              handleLiftSanction={handleLiftSanction}
              handleSaveAppeal={handleSaveAppeal}
              handleRetrySaveOverrides={handleRetrySaveOverrides}
            />
          </Suspense>
        )}

        <Card className="rounded-3xl border-border/60 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">Emergency Access Requests</h3>
            <span className="text-xs text-muted-foreground">
              {emergencyAccessRequests.filter((request) => request.request_status === 'pending').length} pending
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            All emergency access requests are governance-audited. Approve or reject pending requests explicitly.
          </p>
          {emergencyAccessSummary && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">7d activity</p>
                <p className="mt-1">Requested: {emergencyAccessSummary.request_count}</p>
                <p>Consumed: {emergencyAccessSummary.consumed_count}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Reviews</p>
                <p className="mt-1">Approved: {emergencyAccessSummary.approved_count}</p>
                <p>Rejected: {emergencyAccessSummary.rejected_count}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Expiry / pending</p>
                <p className="mt-1">Expired: {emergencyAccessSummary.expired_count}</p>
                <p>Pending now: {emergencyAccessSummary.pending_count}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Latest event</p>
                <p className="mt-1">{emergencyAccessSummary.latest_event_at ? formatDate(emergencyAccessSummary.latest_event_at) : 'n/a'}</p>
              </div>
            </div>
          )}
          {emergencyAccessOpsSummary && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Ops watch</p>
                <p className="mt-1">Pending: {emergencyAccessOpsSummary.pending_count}</p>
                <p>Stale pending: {emergencyAccessOpsSummary.stale_pending_count}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Approved (unconsumed)</p>
                <p className="mt-1">Open approvals: {emergencyAccessOpsSummary.approved_unconsumed_count}</p>
                <p>Near expiry (15m): {emergencyAccessOpsSummary.near_expiry_approved_count}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Closed states</p>
                <p className="mt-1">Consumed: {emergencyAccessOpsSummary.consumed_count}</p>
                <p>Expired: {emergencyAccessOpsSummary.expired_count}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Latest ops signal</p>
                <p className="mt-1">Latest request: {emergencyAccessOpsSummary.latest_request_at ? formatDate(emergencyAccessOpsSummary.latest_request_at) : 'n/a'}</p>
                <p>Latest event: {emergencyAccessOpsSummary.latest_event_at ? formatDate(emergencyAccessOpsSummary.latest_event_at) : 'n/a'}</p>
              </div>
            </div>
          )}
          {emergencyAccessOpsPolicy && (
            <div className="mt-2 rounded-lg border border-border/60 bg-background/70 p-2.5 text-xs text-muted-foreground">
              <p className="font-semibold uppercase tracking-[0.12em] text-foreground">Emergency ops policy</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Input
                  value={emergencyAccessOpsPolicyDraft.pendingMaxAgeHours}
                  onChange={(event) => setEmergencyAccessOpsPolicyDraft((current) => ({ ...current, pendingMaxAgeHours: event.target.value }))}
                  placeholder="Pending max age (h)"
                />
                <Input
                  value={emergencyAccessOpsPolicyDraft.approvedMaxAgeMinutes}
                  onChange={(event) => setEmergencyAccessOpsPolicyDraft((current) => ({ ...current, approvedMaxAgeMinutes: event.target.value }))}
                  placeholder="Approved max age (m)"
                />
                <Input
                  value={emergencyAccessOpsPolicyDraft.nearExpiryWindowMinutes}
                  onChange={(event) => setEmergencyAccessOpsPolicyDraft((current) => ({ ...current, nearExpiryWindowMinutes: event.target.value }))}
                  placeholder="Near-expiry window (m)"
                />
                <Input
                  value={emergencyAccessOpsPolicyDraft.oncallChannel}
                  onChange={(event) => setEmergencyAccessOpsPolicyDraft((current) => ({ ...current, oncallChannel: event.target.value }))}
                  placeholder="On-call channel"
                />
                <button
                  type="button"
                  className="rounded-md border border-border/70 bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent/60"
                  onClick={() => setEmergencyAccessOpsPolicyDraft((current) => ({ ...current, escalationEnabled: !current.escalationEnabled }))}
                >
                  Escalation {emergencyAccessOpsPolicyDraft.escalationEnabled ? 'enabled' : 'disabled'}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Updated: {emergencyAccessOpsPolicy.updated_at ? formatDate(emergencyAccessOpsPolicy.updated_at) : 'n/a'}
                </p>
                <button
                  type="button"
                  className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary disabled:opacity-60"
                  disabled={savingEmergencyAccessOpsPolicy}
                  onClick={() => void handleSaveEmergencyAccessOpsPolicy()}
                >
                  {savingEmergencyAccessOpsPolicy ? 'Saving...' : 'Save policy'}
                </button>
              </div>
            </div>
          )}
          {emergencyAccessOpsPolicyEvents.length > 0 && (
            <details className="mt-2 rounded-lg border border-border/60 bg-background/70 p-2.5">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Emergency ops policy change timeline (14 days)
              </summary>
              <div className="mt-2 space-y-2">
                {emergencyAccessOpsPolicyEvents.slice(0, 30).map((event) => (
                  <div key={event.event_id} className="rounded-md border border-border/60 bg-background p-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{event.event_type.toUpperCase()}</p>
                      <p className="text-muted-foreground">{formatDate(event.created_at)}</p>
                    </div>
                    <p className="mt-1 text-muted-foreground">{event.event_message}</p>
                    {event.actor_name && <p className="mt-1 text-muted-foreground">Actor: {event.actor_name}</p>}
                    <p className="mt-1 text-muted-foreground">
                      Rollback eligibility: {event.rollback_eligibility_reason ?? 'Unknown'}
                    </p>
                    <div className="mt-2">
                      <button
                        type="button"
                        className="rounded-md border border-border/70 bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent/60 disabled:opacity-60"
                        disabled={
                          rollingBackEmergencyAccessOpsPolicyEventId === event.event_id
                          || !event.rollback_eligible
                        }
                        onClick={() => void handleRollbackEmergencyAccessOpsPolicyToEvent(event.event_id)}
                      >
                        {rollingBackEmergencyAccessOpsPolicyEventId === event.event_id ? 'Rolling back...' : 'Rollback to this snapshot'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
          {emergencyEscalationPages.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Emergency access escalation pages
              </p>
              {emergencyEscalationPages.map((page) => (
                <div key={page.pageId} className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{page.pageStatus.toUpperCase()} · {page.severity.toUpperCase()}</p>
                    <p>{formatDate(page.openedAt)}</p>
                  </div>
                  <p className="mt-1">{page.pageMessage}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(page.pageStatus === 'open') && (
                      <button
                        type="button"
                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 disabled:opacity-60 dark:text-amber-300"
                        disabled={acknowledgingEmergencyEscalationPageId === page.pageId}
                        onClick={() => void handleAcknowledgeEmergencyEscalationPage(page.pageId)}
                      >
                        Acknowledge
                      </button>
                    )}
                    {(page.pageStatus === 'open' || page.pageStatus === 'acknowledged') && (
                      <button
                        type="button"
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 disabled:opacity-60 dark:text-emerald-300"
                        disabled={resolvingEmergencyEscalationPageId === page.pageId}
                        onClick={() => void handleResolveEmergencyEscalationPage(page.pageId)}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">7d escalation history</p>
              <p className="mt-1">Opened: {emergencyEscalationTrend.opened}</p>
              <p>Resolved: {emergencyEscalationTrend.resolved}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">In-flight pages</p>
              <p className="mt-1">Open board pages: {emergencyEscalationPages.filter((page) => page.pageStatus === 'open').length}</p>
              <p>Acknowledged board pages: {emergencyEscalationPages.filter((page) => page.pageStatus === 'acknowledged').length}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Severity mix</p>
              <p className="mt-1">Critical: {emergencyEscalationTrend.critical}</p>
              <p>Warning: {emergencyEscalationTrend.warning}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Latest incident</p>
              <p className="mt-1">
                {emergencyEscalationHistory[0]?.opened_at ? formatDate(emergencyEscalationHistory[0].opened_at) : 'n/a'}
              </p>
              <p>
                {emergencyEscalationHistory[0]?.page_status
                  ? emergencyEscalationHistory[0].page_status.toUpperCase()
                  : 'NO DATA'}
              </p>
            </div>
          </div>
          {emergencyEscalationHistory.length > 0 && (
            <details className="mt-2 rounded-lg border border-border/60 bg-background/70 p-2.5">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Emergency escalation timeline (7 days)
              </summary>
              <div className="mt-2 space-y-2">
                {emergencyEscalationHistory.slice(0, 30).map((row) => (
                  <div key={row.page_id} className="rounded-md border border-border/60 bg-background p-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{row.page_status.toUpperCase()} · {row.severity.toUpperCase()}</p>
                      <p className="text-muted-foreground">{formatDate(row.opened_at)}</p>
                    </div>
                    <p className="mt-1 text-muted-foreground">{row.page_message}</p>
                    <p className="mt-1 text-muted-foreground">
                      Batch: {row.batch_id || 'n/a'} · Ack: {row.acknowledged_at ? formatDate(row.acknowledged_at) : 'n/a'} · Resolved: {row.resolved_at ? formatDate(row.resolved_at) : 'n/a'}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select
              value={emergencyStatusFilter}
              onValueChange={(value) => setEmergencyStatusFilter(value as typeof emergencyStatusFilter)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="search"
              value={emergencySearch}
              onChange={(event) => setEmergencySearch(event.target.value)}
              placeholder="Search target, requester, reason, or request id"
              className="h-9 min-w-[260px] rounded-md border border-border/70 bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="mt-3 space-y-2">
            {filteredEmergencyRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emergency access requests recorded yet.</p>
            ) : (
              filteredEmergencyRequests.slice(0, 20).map((request) => (
                <div key={request.request_id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {request.target_display_name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {request.request_status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested by {request.requested_by_name} on {formatDate(request.created_at)}
                  </p>
                  {request.approved_expires_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Approved until: {formatDate(request.approved_expires_at)}
                    </p>
                  )}
                  {request.consumed_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Consumed: {formatDate(request.consumed_at)}{request.consumed_by_name ? ` by ${request.consumed_by_name}` : ''}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-foreground">{request.request_reason}</p>
                  {request.review_notes && (
                    <p className="mt-1 text-xs text-muted-foreground">Review notes: {request.review_notes}</p>
                  )}
                  {canReviewEmergencyAccess && request.request_status === 'pending' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 disabled:opacity-60 dark:text-emerald-300"
                        onClick={() => void handleReviewEmergencyAccessRequest(request, 'approved')}
                        disabled={reviewingEmergencyRequestId === request.request_id}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-700 disabled:opacity-60 dark:text-rose-300"
                        onClick={() => void handleReviewEmergencyAccessRequest(request, 'rejected')}
                        disabled={reviewingEmergencyRequestId === request.request_id}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  <div className="mt-2">
                    <button
                      type="button"
                      className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent/60"
                      onClick={() => void handleToggleEmergencyRequestTimeline(request.request_id)}
                    >
                      {expandedEmergencyRequestId === request.request_id ? 'Hide timeline' : 'View timeline'}
                    </button>
                  </div>
                  {expandedEmergencyRequestId === request.request_id && (
                    <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                      {loadingEmergencyEventsRequestId === request.request_id ? (
                        <p className="text-xs text-muted-foreground">Loading timeline...</p>
                      ) : (
                        <div className="space-y-2">
                          {(emergencyEventsByRequest[request.request_id] ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No timeline events recorded.</p>
                          ) : (
                            (emergencyEventsByRequest[request.request_id] ?? []).map((event) => (
                              <div key={event.event_id} className="rounded-md border border-border/60 bg-background/70 p-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">{event.event_type.toUpperCase()}</span>
                                  <span className="text-muted-foreground">{formatDate(event.created_at)}</span>
                                </div>
                                <p className="mt-1 text-foreground">{event.event_message}</p>
                                {event.actor_name && <p className="mt-1 text-muted-foreground">Actor: {event.actor_name}</p>}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        <Suspense fallback={null}>
          <UsersAdminCreateUserDialog
            creatingUser={creatingUser}
            form={createUserForm}
            manageableRoles={manageableRoles}
            open={createUserOpen}
            t={t}
            onCreate={handleCreateUser}
            onOpenChange={setCreateUserOpen}
            onUpdateForm={(updater) => setCreateUserForm((current) => updater(current))}
          />
        </Suspense>
      </div>
    </AppLayout>
  );
}

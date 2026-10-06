import { Award, BadgeCheck, BadgeX, Loader2, LogIn, Settings2 } from 'lucide-react';
import type { AppRole } from '@/lib/access-control';
import { getCitizenStatusLabelKey } from '@/lib/civic-status';
import { getVerificationCaseBadgeClassName, getVerificationCaseStatusLabelKey } from '@/lib/verification-workflow';
import {
  citizenshipBadgeClassName,
  getAdminCardTitle,
  getDisplayNameParts,
  getEffectiveCitizenshipStatus,
  getEffectiveVerificationStatus,
  getInitials,
  type OrganizationMembership,
  type ProfileRow,
  type UserAdminGroup,
  type UserExperienceLevel,
  type VerificationCaseRow,
} from '@/lib/users-admin';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UsersAdminExperienceLevelPill } from '@/components/admin/UsersAdminExperienceLevelPill';
import { UsersAdminRolePill } from '@/components/admin/UsersAdminRolePill';

type UsersAdminMobileListProps = {
  canLoginAsFromAdmin: boolean;
  levelSavingUserId: string | null;
  overrideSavingUserId: string | null;
  profileUserId?: string | null;
  roleSavingUserId: string | null;
  selectedUserId: string | null;
  switchingUserId: string | null;
  t: (key: string) => string;
  verificationCasesByProfile: Record<string, VerificationCaseRow>;
  visibleGroups: UserAdminGroup[];
  formatDate: (value: string) => string;
  formatRelativeTime: (value?: string | null) => string;
  getActivityTimestamp: (user: ProfileRow) => string;
  isUserOnline: (user: ProfileRow) => boolean;
  onExperienceLevelChange: (user: ProfileRow, nextLevel: UserExperienceLevel) => void;
  onLoginAsUser: (user: ProfileRow) => void;
  onRoleChange: (user: ProfileRow, nextRole: AppRole) => void;
  onSelectUser: (userId: string) => void;
  onToggleSelectedUser: (userId: string) => void;
  onVerificationToggle: (user: ProfileRow) => void;
};

type CardRenderOptions = {
  nestLevel?: number;
  isOrganization?: boolean;
  organizationName?: string;
};

export function UsersAdminMobileList({
  canLoginAsFromAdmin,
  formatDate,
  formatRelativeTime,
  getActivityTimestamp,
  isUserOnline,
  levelSavingUserId,
  onExperienceLevelChange,
  onLoginAsUser,
  onRoleChange,
  onSelectUser,
  onToggleSelectedUser,
  onVerificationToggle,
  overrideSavingUserId,
  profileUserId,
  roleSavingUserId,
  selectedUserId,
  switchingUserId,
  t,
  verificationCasesByProfile,
  visibleGroups,
}: UsersAdminMobileListProps) {
  const renderCard = (user: ProfileRow, options: CardRenderOptions = {}) => {
    const { nestLevel = 0, isOrganization = false, organizationName } = options;
    const isCurrentUser = user.user_id === profileUserId;
    const isLevelSaving = levelSavingUserId === user.id;
    const isSaving = roleSavingUserId === user.id || overrideSavingUserId === user.id || isLevelSaving;
    const isSelected = selectedUserId === user.id;
    const isOnline = isUserOnline(user);
    const loginBusy = switchingUserId === user.id;
    const displayName = getDisplayNameParts(user);
    const cardTitle =
      getAdminCardTitle(user, { isOrganization, organizationName }) || t('common.anonymousUser');
    const usernameLabel = user.username ? `@${user.username}` : t('admin.users.noUsername');
    const userLevel: UserExperienceLevel =
      user.experience_level === 'junior'
      || user.experience_level === 'mid'
      || user.experience_level === 'senior'
      || user.experience_level === 'professional'
        ? user.experience_level
        : 'entry';
    const shouldShowProBadge = displayName.hasProfessionalSuffix || userLevel === 'professional';
    const effectiveCitizenshipStatus = getEffectiveCitizenshipStatus(user);
    const verificationCase = verificationCasesByProfile[user.id] || null;
    const verificationStatus = getEffectiveVerificationStatus(user, verificationCase);
    const isVerified = Boolean(user.is_verified);

    return (
      <div
        key={user.id}
        className={cn(
          'space-y-2.5 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md',
          isSelected && 'border-primary/40 bg-primary/5 shadow-md',
          nestLevel > 0 && 'ml-4 border-l-2 border-l-primary/30',
        )}
        role="button"
        tabIndex={0}
        onClick={() => onToggleSelectedUser(user.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleSelectedUser(user.id);
          }
        }}
      >
        <div className="flex w-full items-start gap-2.5 text-left">
          {/* Avatar column: photo + experience level under it (same left edge) */}
          <div className="flex shrink-0 flex-col items-start gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Avatar
                    className="h-10 w-10 rounded-2xl border border-border/60"
                    aria-label={usernameLabel}
                  >
                    <AvatarImage src={user.avatar_url || undefined} alt={usernameLabel} className="rounded-2xl object-cover" />
                    <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                      {getInitials(cardTitle, user.username)}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" onClick={(event) => event.stopPropagation()}>
                {usernameLabel}
              </TooltipContent>
            </Tooltip>
            <UsersAdminExperienceLevelPill
              level={userLevel}
              saving={isLevelSaving}
              t={t}
              onLevelChange={(nextLevel) => onExperienceLevelChange(user, nextLevel)}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Line 1: name + actions */}
            <div className="flex w-full items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-medium text-foreground">{cardTitle}</p>
              {shouldShowProBadge && userLevel !== 'professional' && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-700 dark:text-teal-300">
                  <Award className="h-3 w-3" />
                  Pro
                </span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border/70 bg-background/60 hover:border-border hover:bg-accent/70"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectUser(user.id);
                  }}
                  aria-label={t('admin.users.manageAccess')}
                  title={t('admin.users.manageAccess')}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onVerificationToggle(user);
                  }}
                  disabled={isSaving}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                    isVerified
                      ? 'border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300'
                      : 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
                    isSaving && 'opacity-70',
                  )}
                  aria-label={isVerified ? t('admin.users.userIsVerified') : t('admin.users.userIsUnverified')}
                  title={isVerified ? t('admin.users.userIsVerified') : t('admin.users.userIsUnverified')}
                >
                  {isVerified ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeX className="h-3.5 w-3.5" />}
                </button>
                {canLoginAsFromAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 border border-border/70 bg-background/60 hover:border-border hover:bg-accent/70"
                    onClick={(event) => {
                      event.stopPropagation();
                      onLoginAsUser(user);
                    }}
                    disabled={isCurrentUser || loginBusy}
                    aria-label="Request emergency access"
                    title={isCurrentUser ? t('admin.users.cannotEditSelf') : 'Request emergency access'}
                  >
                    {loginBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Line 2: status pills + activity — role pill is the role dropdown */}
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
                <Badge
                  className={cn('shrink-0 rounded-full border', citizenshipBadgeClassName[effectiveCitizenshipStatus])}
                  variant="outline"
                >
                  {t(getCitizenStatusLabelKey(effectiveCitizenshipStatus))}
                </Badge>
                <Badge
                  className={cn('shrink-0 rounded-full border', getVerificationCaseBadgeClassName(verificationStatus))}
                  variant="outline"
                >
                  {t(getVerificationCaseStatusLabelKey(verificationStatus))}
                </Badge>
                <UsersAdminRolePill
                  role={user.role}
                  disabled={isCurrentUser || isSaving}
                  t={t}
                  onRoleChange={(nextRole) => onRoleChange(user, nextRole)}
                />
                {user.is_active_citizen && (
                  <Badge
                    variant="outline"
                    className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    {t('admin.users.activeCitizenBadge')}
                  </Badge>
                )}
                {user.is_governance_eligible && (
                  <Badge
                    variant="outline"
                    className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  >
                    {t('admin.users.governanceEligibleBadge')}
                  </Badge>
                )}
              </div>
              <span
                className={cn(
                  'shrink-0 text-xs',
                  isOnline && 'font-medium text-emerald-600 dark:text-emerald-300',
                )}
              >
                {isOnline ? t('admin.users.onlineNow') : formatRelativeTime(getActivityTimestamp(user))}
              </span>
            </div>
          </div>
        </div>

        {isSelected && (
          <>
            <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-xs">
              <div className="space-y-1">
                <p className="uppercase tracking-[0.12em] text-muted-foreground">{t('admin.users.officialIdLabel')}</p>
                <p className="break-all font-mono text-muted-foreground">{user.official_id || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="uppercase tracking-[0.12em] text-muted-foreground">{t('admin.users.ssnLabel')}</p>
                <p className="break-all font-mono text-muted-foreground">{user.social_security_number || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="uppercase tracking-[0.12em] text-muted-foreground">{t('common.country')}</p>
                <p className="text-muted-foreground">{user.country || user.country_code || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="uppercase tracking-[0.12em] text-muted-foreground">{t('admin.users.joinedColumn')}</p>
                <p className="text-muted-foreground">{formatDate(user.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="uppercase tracking-[0.12em] text-muted-foreground">{t('admin.users.citizenshipColumn')}</p>
                <p className="text-muted-foreground">{t(getCitizenStatusLabelKey(effectiveCitizenshipStatus))}</p>
              </div>
              <div className="space-y-1">
                <p className="uppercase tracking-[0.12em] text-muted-foreground">{t('admin.users.governanceStatusColumn')}</p>
                <p className="text-muted-foreground">
                  {user.is_governance_eligible
                    ? t('admin.users.governanceEligibleBadge')
                    : user.is_active_citizen
                      ? t('admin.users.activeCitizenBadge')
                      : t('admin.users.governancePendingBadge')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="uppercase tracking-[0.12em] text-muted-foreground">{t('admin.users.verificationWorkflowColumn')}</p>
                <p className="text-muted-foreground">{t(getVerificationCaseStatusLabelKey(verificationStatus))}</p>
              </div>
            </div>
            {isCurrentUser && <p className="text-xs text-muted-foreground">{t('admin.users.selfRoleHint')}</p>}
            <div className="grid gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectUser(user.id);
                }}
              >
                <Settings2 className="h-4 w-4" />
                {t('admin.users.manageAccess')}
              </Button>
              {canLoginAsFromAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    onLoginAsUser(user);
                  }}
                  disabled={isCurrentUser || loginBusy}
                >
                  {loginBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Request emergency access
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderOrganization = (membership: OrganizationMembership, nestLevel: number) =>
    renderCard(membership.profile, {
      nestLevel,
      isOrganization: true,
      organizationName: membership.organizationName,
    });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3 p-3 md:hidden">
        {visibleGroups.map((group) => {
          const groupKey = group.owner?.id ?? group.organizations.map((item) => item.profile.id).join('-');
          return (
            <div key={groupKey} className="space-y-2">
              {group.owner && renderCard(group.owner)}
              {group.organizations.map((membership) =>
                renderOrganization(membership, group.owner ? 1 : 0),
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

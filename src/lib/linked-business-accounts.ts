/** Normalize a business display name for uniqueness comparisons. */
export function normalizeBusinessName(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function slugifyUsername(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return (normalized || 'business').slice(0, 24);
}

/**
 * Prefer a `biz_` prefix when it fits the 24-character username limit.
 * Longer organization names use the name slug so the handle is not truncated
 * to an unreadable `biz_…` prefix.
 */
export function toBusinessUsernameCandidate(input: string) {
  const slug = slugifyUsername(input);
  const withPrefix = `biz_${slug}`;
  return withPrefix.length <= 24 ? withPrefix : slug;
}

export function isOwnerSingleBusinessConstraintError(
  error: { message?: string | null } | null | undefined,
) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('idx_linked_accounts_owner_business_unique');
}

export function compressBusinessKey(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function emailDomainBase(email: string) {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  return (domain.split('.')[0] || '').replace(/[^a-z0-9]/g, '');
}

export function emailLooksLikeBusinessName(email: string, businessName: string) {
  const nameKey = compressBusinessKey(businessName);
  const domainKey = emailDomainBase(email);
  if (nameKey.length < 8 || domainKey.length < 8) return false;
  return nameKey.includes(domainKey) || domainKey.includes(nameKey);
}

export type LinkedAccountSwitchRow = {
  owner_profile_id: string;
  linked_profile_id: string;
  relationship_type: string;
  owner: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    deleted_at?: string | null;
  } | null;
  linked: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    deleted_at?: string | null;
  } | null;
};

export type AccountSwitcherOption = {
  profileId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  accountType: 'personal' | 'business' | 'linked';
};

export function buildAccountSwitcherOptions(params: {
  currentProfile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  linkedAccounts: readonly LinkedAccountSwitchRow[];
}): AccountSwitcherOption[] {
  const options: AccountSwitcherOption[] = [];
  const addOption = (option: AccountSwitcherOption) => {
    if (!options.find((item) => item.profileId === option.profileId)) {
      options.push(option);
    }
  };

  const liveRows = params.linkedAccounts.filter(
    (row) => row.owner && row.linked && !row.owner.deleted_at && !row.linked.deleted_at,
  );

  const currentBusinessLink = liveRows.find(
    (row) => row.relationship_type === 'business' && row.linked_profile_id === params.currentProfile.id,
  );

  addOption({
    profileId: params.currentProfile.id,
    username: params.currentProfile.username,
    fullName: params.currentProfile.full_name,
    avatarUrl: params.currentProfile.avatar_url,
    accountType: currentBusinessLink ? 'business' : 'personal',
  });

  liveRows.forEach((row) => {
    if (!row.owner || !row.linked) return;

    if (params.currentProfile.id === row.owner_profile_id) {
      addOption({
        profileId: row.linked.id,
        username: row.linked.username,
        fullName: row.linked.full_name,
        avatarUrl: row.linked.avatar_url,
        accountType: 'business',
      });
      return;
    }

    if (params.currentProfile.id === row.linked_profile_id) {
      addOption({
        profileId: row.owner.id,
        username: row.owner.username,
        fullName: row.owner.full_name,
        avatarUrl: row.owner.avatar_url,
        accountType: 'personal',
      });
      return;
    }

    if (row.relationship_type === 'business') {
      addOption({
        profileId: row.linked.id,
        username: row.linked.username,
        fullName: row.linked.full_name,
        avatarUrl: row.linked.avatar_url,
        accountType: 'business',
      });
    }
  });

  return options;
}

/** Place the current account in the middle so neighbors peek from both sides. */
export function orderAccountsAroundCurrent<T extends { profileId: string }>(
  accounts: readonly T[],
  currentProfileId: string | null | undefined,
): T[] {
  if (!currentProfileId || accounts.length <= 1) return [...accounts];
  const current = accounts.find((item) => item.profileId === currentProfileId);
  if (!current) return [...accounts];
  const others = accounts.filter((item) => item.profileId !== currentProfileId);
  const leftCount = Math.ceil(others.length / 2);
  return [...others.slice(0, leftCount), current, ...others.slice(leftCount)];
}

export function collectSwitchableProfileIds(
  currentProfileId: string,
  linkedAccounts: readonly LinkedAccountSwitchRow[],
): Set<string> {
  const ids = new Set<string>([currentProfileId]);
  linkedAccounts.forEach((row) => {
    const owner = row.owner;
    const linked = row.linked;
    if (!owner || !linked || owner.deleted_at || linked.deleted_at) return;
    ids.add(row.owner_profile_id);
    ids.add(row.linked_profile_id);
  });
  return ids;
}

export function canSwitchBetweenLinkedAccounts(
  rows: readonly { owner_profile_id: string; linked_profile_id: string }[],
  currentProfileId: string,
  targetProfileId: string,
): boolean {
  if (!currentProfileId || !targetProfileId || currentProfileId === targetProfileId) return false;

  const direct = rows.some(
    (row) =>
      (row.owner_profile_id === currentProfileId && row.linked_profile_id === targetProfileId)
      || (row.linked_profile_id === currentProfileId && row.owner_profile_id === targetProfileId),
  );
  if (direct) return true;

  const currentOwners = rows
    .filter((row) => row.linked_profile_id === currentProfileId)
    .map((row) => row.owner_profile_id);
  const targetOwners = rows
    .filter((row) => row.linked_profile_id === targetProfileId)
    .map((row) => row.owner_profile_id);

  return currentOwners.some((ownerId) => targetOwners.includes(ownerId));
}

export type BusinessConnectMatchReason = 'name' | 'username' | 'email' | 'email_domain';

export type BusinessConnectMatch = {
  profileId: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  businessNameNormalized: string | null;
  ownerProfileId: string | null;
  ownerFullName: string | null;
  matchReason: BusinessConnectMatchReason;
  alreadyLinkedToRequester: boolean;
};

export function parseBusinessConnectMatches(payload: unknown): BusinessConnectMatch[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { matches?: unknown }).matches)
      ? (payload as { matches: unknown[] }).matches
      : [];

  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const record = row as Record<string, unknown>;
      const profileId = typeof record.profile_id === 'string' ? record.profile_id : null;
      if (!profileId) return null;
      const reason = record.match_reason;
      const matchReason: BusinessConnectMatchReason =
        reason === 'username' || reason === 'email' || reason === 'email_domain' || reason === 'name'
          ? reason
          : 'name';
      return {
        profileId,
        fullName: typeof record.full_name === 'string' ? record.full_name : null,
        username: typeof record.username === 'string' ? record.username : null,
        avatarUrl: typeof record.avatar_url === 'string' ? record.avatar_url : null,
        businessNameNormalized:
          typeof record.business_name_normalized === 'string' ? record.business_name_normalized : null,
        ownerProfileId: typeof record.owner_profile_id === 'string' ? record.owner_profile_id : null,
        ownerFullName: typeof record.owner_full_name === 'string' ? record.owner_full_name : null,
        matchReason,
        alreadyLinkedToRequester: record.already_linked_to_requester === true,
      } satisfies BusinessConnectMatch;
    })
    .filter((row): row is BusinessConnectMatch => row !== null);
}

export function businessConnectDisplayName(match: BusinessConnectMatch, typedName: string) {
  const typed = typedName.trim();
  if (match.matchReason === 'email' || match.matchReason === 'email_domain') {
    return typed || match.fullName || match.username || 'Business account';
  }
  if (match.fullName?.trim()) return match.fullName.trim();
  if (match.businessNameNormalized?.trim()) {
    return match.businessNameNormalized
      .trim()
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return match.username || typed || 'Business account';
}

export function shouldUseConnectAction(match: BusinessConnectMatch | null | undefined) {
  return Boolean(match?.profileId);
}

export type PendingBusinessAccessRequest = {
  id: string;
  targetProfileId: string;
  requesterProfileId: string;
  createdAt: string;
  requesterName: string | null;
  requesterUsername: string | null;
  requesterAvatarUrl: string | null;
  businessName: string | null;
};

type ProfileSummary = { id?: string | null; full_name?: string | null; username?: string | null; avatar_url?: string | null } | null | undefined;

type AccessRequestRow = {
  id: string;
  target_profile_id: string;
  requester_profile_id: string;
  created_at: string;
  requester?: ProfileSummary | ProfileSummary[];
  target?: ProfileSummary | ProfileSummary[];
};

function firstProfile(value: ProfileSummary | ProfileSummary[]): ProfileSummary {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Pending requests that the signed-in profile may review: those aimed at businesses it owns. */
export function selectOwnedPendingAccessRequests(
  rows: readonly AccessRequestRow[],
  ownedBusinessProfileIds: readonly string[],
): PendingBusinessAccessRequest[] {
  const owned = new Set(ownedBusinessProfileIds);
  return rows
    .filter((row) => owned.has(row.target_profile_id))
    .map((row) => {
      const requester = firstProfile(row.requester);
      const target = firstProfile(row.target);
      return {
        id: row.id,
        targetProfileId: row.target_profile_id,
        requesterProfileId: row.requester_profile_id,
        createdAt: row.created_at,
        requesterName: requester?.full_name ?? null,
        requesterUsername: requester?.username ?? null,
        requesterAvatarUrl: requester?.avatar_url ?? null,
        businessName: target?.full_name ?? target?.username ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

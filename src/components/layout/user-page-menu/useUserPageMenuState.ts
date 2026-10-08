import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { permissionListHasAny } from '@/lib/access-control';
import { getProfileMenuPageLinks } from '@/lib/app-pages';
import { buildAccountSwitcherOptions, collectSwitchableProfileIds, orderAccountsAroundCurrent, parseBusinessConnectMatches, type BusinessConnectMatch } from '@/lib/linked-business-accounts';
import { isMissingLinkedAccountsTableError } from '@/lib/linked-accounts-errors';
import { supabase } from '@/integrations/supabase/client';
import { type AccountOption, type LinkedAccountRow, type UserPageMenuProps } from '@/components/layout/user-page-menu/user-page-menu-shared';

export function useUserPageMenuState({ size }: UserPageMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile,
    knownAccountSessions,
    switchToKnownAccount,
    pruneKnownAccountSessions,
    signIn,
    signInWithOtp,
  } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountRow[]>([]);
  const [linkedAccountsFeatureAvailable, setLinkedAccountsFeatureAvailable] = useState(true);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [linkedAccountsLoadedOnce, setLinkedAccountsLoadedOnce] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPassword, setBusinessPassword] = useState('');
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessMatches, setBusinessMatches] = useState<BusinessConnectMatch[]>([]);
  const [selectedBusinessMatch, setSelectedBusinessMatch] = useState<BusinessConnectMatch | null>(null);
  const [lookingUpBusiness, setLookingUpBusiness] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
  const currentAccountCardRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);

  const triggerSizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const avatarSizeClass = size === 'sm' ? 'h-8 w-8 border' : 'h-10 w-10 border-2';

  const pageLinks = useMemo(
    () =>
      [...getProfileMenuPageLinks(profile?.effective_permissions || [])].sort((a, b) =>
        t(a.labelKey).localeCompare(t(b.labelKey), undefined, { sensitivity: 'base' }),
      ),
    [profile?.effective_permissions, t],
  );

  const canEditProfile = permissionListHasAny(profile?.effective_permissions || [], ['profile.update_self']);

  const accountSessionByProfileId = useMemo(() => {
    const map = new Map<string, typeof knownAccountSessions[number]>();
    knownAccountSessions.forEach((account) => {
      if (account.profileId) {
        map.set(account.profileId, account);
      }
    });
    return map;
  }, [knownAccountSessions]);

  const directlyLinkedProfileIds = useMemo(() => {
    if (!profile?.id) return new Set<string>();
    return collectSwitchableProfileIds(profile.id, linkedAccounts);
  }, [linkedAccounts, profile?.id]);

  const accountOptions = useMemo<AccountOption[]>(() => {
    if (!profile?.id) return [];

    const options: AccountOption[] = [];
    const addOption = (option: AccountOption) => {
      if (!options.find((item) => item.profileId === option.profileId)) {
        options.push(option);
      }
    };

    buildAccountSwitcherOptions({
      currentProfile: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
      linkedAccounts,
    }).forEach((item) => {
      addOption({
        profileId: item.profileId,
        label:
          item.accountType === 'business'
            ? t('home.accountSwitchBusiness')
            : item.accountType === 'personal'
              ? t('home.accountSwitchPersonal')
              : t('home.accountSwitchLinked'),
        username: item.username,
        fullName: item.fullName,
        avatarUrl: item.avatarUrl,
        accountType: item.accountType,
      });
    });

    knownAccountSessions.forEach((session) => {
      if (!session.profileId || session.profileId === profile.id) return;
      addOption({
        profileId: session.profileId,
        label: session.accountType === 'business' ? t('home.accountSwitchBusiness') : t('home.accountSwitchLinked'),
        username: session.username,
        fullName: session.fullName,
        avatarUrl: session.avatarUrl,
        accountType: session.accountType === 'business' ? 'business' : 'linked',
      });
    });

    return options;
  }, [
    knownAccountSessions,
    linkedAccounts,
    profile?.avatar_url,
    profile?.full_name,
    profile?.id,
    profile?.username,
    t,
  ]);

  const orderedAccountOptions = useMemo(
    () => orderAccountsAroundCurrent(accountOptions, profile?.id),
    [accountOptions, profile?.id],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Keep page scroll locked while the profile menu is open so mobile swipes
  // scroll the menu list instead of the underlying page (scroll chaining).
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }

    const preventBackgroundTouchMove = (event: TouchEvent) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      event.preventDefault();
    };

    document.addEventListener('touchmove', preventBackgroundTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundTouchMove);
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!profile?.id || !open || !linkedAccountsFeatureAvailable) return;

    let active = true;
    let settled = false;
    setLinkedLoading(true);
    setLinkedAccountsLoadedOnce(false);
    setLinkedError(null);

    const timeoutId = window.setTimeout(() => {
      if (!active || settled) return;
      setLinkedLoading(false);
      setLinkedError(t('home.accountSwitchLoadFailed'));
    }, 6000);

    Promise.resolve(
      supabase
      .from('linked_accounts')
      .select(
        `
          id,
          owner_profile_id,
          linked_profile_id,
          relationship_type,
          owner:profiles!linked_accounts_owner_profile_id_fkey(id, full_name, username, avatar_url, deleted_at),
          linked:profiles!linked_accounts_linked_profile_id_fkey(id, full_name, username, avatar_url, deleted_at)
        `,
      )
      .then(({ data, error }) => {
        if (!active) return;
        settled = true;
        if (error) {
          if (isMissingLinkedAccountsTableError(error)) {
            setLinkedAccountsFeatureAvailable(false);
            setLinkedAccounts([]);
            setLinkedError(null);
            return;
          }
          console.error('Error loading linked accounts:', error);
          setLinkedError(t('home.accountSwitchLoadFailed'));
          setLinkedAccounts([]);
        } else {
          setLinkedAccounts(data ?? []);
        }
      }))
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (active) {
          setLinkedLoading(false);
          setLinkedAccountsLoadedOnce(true);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [linkedAccountsFeatureAvailable, open, profile?.id, t]);

  useEffect(() => {
    if (!profile?.id) return;
    if (!open) return;
    if (!linkedAccountsLoadedOnce) return;

    const validProfileIds = new Set<string>([profile.id]);
    linkedAccounts.forEach((row) => {
      if (row.owner?.id && !row.owner?.deleted_at) {
        validProfileIds.add(row.owner.id);
      }
      if (row.linked?.id && !row.linked?.deleted_at) {
        validProfileIds.add(row.linked.id);
      }
    });

    pruneKnownAccountSessions(Array.from(validProfileIds));
  }, [linkedAccounts, linkedAccountsLoadedOnce, open, profile?.id, pruneKnownAccountSessions]);

  useEffect(() => {
    if (!open || orderedAccountOptions.length < 2) return;
    currentAccountCardRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
  }, [linkedLoading, open, orderedAccountOptions]);

  useEffect(() => {
    if (!createBusinessOpen) {
      setBusinessMatches([]);
      setSelectedBusinessMatch(null);
      setLookingUpBusiness(false);
      return;
    }

    const name = businessName.trim();
    const email = businessEmail.trim().toLowerCase();
    if (name.length < 2 && !email.includes('@')) {
      setBusinessMatches([]);
      setSelectedBusinessMatch(null);
      setLookingUpBusiness(false);
      return;
    }

    let active = true;
    setLookingUpBusiness(true);
    const timeoutId = window.setTimeout(() => {
      void Promise.resolve(supabase
        .rpc('lookup_business_accounts_for_connect', {
          p_name: name || null,
          p_email: email || null,
          p_limit: 5,
        })
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setBusinessMatches([]);
            setSelectedBusinessMatch(null);
            return;
          }
          const matches = parseBusinessConnectMatches(data);
          setBusinessMatches(matches);
          setSelectedBusinessMatch((current) => {
            if (current && matches.some((item) => item.profileId === current.profileId)) {
              return matches.find((item) => item.profileId === current.profileId) ?? current;
            }
            return matches.length === 1 ? matches[0] : null;
          });
        }))
        .finally(() => {
          if (active) setLookingUpBusiness(false);
        });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [businessEmail, businessName, createBusinessOpen]);

  return {
    open, setOpen, linkedLoading, linkedError, createBusinessOpen, setCreateBusinessOpen,
    businessName, setBusinessName, businessEmail, setBusinessEmail, businessPassword,
    setBusinessPassword, creatingBusiness, setCreatingBusiness, businessError, setBusinessError,
    businessMatches, setBusinessMatches, selectedBusinessMatch, setSelectedBusinessMatch,
    lookingUpBusiness, switchingAccountId, setSwitchingAccountId, profile, switchToKnownAccount,
    signIn, signInWithOtp, t, navigate, location, panelRef, currentAccountCardRef, triggerSizeClass,
    avatarSizeClass, pageLinks, canEditProfile, accountSessionByProfileId, directlyLinkedProfileIds,
    accountOptions, orderedAccountOptions, linkedAccounts,
  };
}

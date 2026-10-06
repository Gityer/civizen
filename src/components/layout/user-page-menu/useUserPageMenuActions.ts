import { isOwnerSingleBusinessConstraintError, normalizeBusinessName, shouldUseConnectAction, toBusinessUsernameCandidate } from '@/lib/linked-business-accounts';
import { isDuplicateLinkError, isMissingBusinessAccessRequestsTableError } from '@/lib/linked-accounts-errors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type AccountOption, type UserPageMenuProps, createEphemeralSupabaseClient, isNetworkFetchError, raceTimeout } from '@/components/layout/user-page-menu/user-page-menu-shared';
import type { useUserPageMenuState } from '@/components/layout/user-page-menu/useUserPageMenuState';

export function useUserPageMenuActions({ setOpen, setCreateBusinessOpen, businessName, setBusinessName, businessEmail, setBusinessEmail, businessPassword, setBusinessPassword, setCreatingBusiness, setBusinessError, setBusinessMatches, selectedBusinessMatch, setSelectedBusinessMatch, switchingAccountId, setSwitchingAccountId, profile, switchToKnownAccount, signIn, signInWithOtp, t, accountSessionByProfileId, directlyLinkedProfileIds }: ReturnType<typeof useUserPageMenuState>) {
  const switchToLinkedProfile = async (targetProfileId: string) => {
    const invoke = supabase.functions.invoke('linked-account-switch', {
      body: { targetProfileId },
    });
    const { data, error } = await raceTimeout(invoke, 12000, 'linked-account-switch-timeout');

    if (error || !data?.email || !data?.token) {
      return { error: new Error(t('home.accountSwitchFailed')) };
    }

    const result = await raceTimeout(
      signInWithOtp(
        {
          email: data.email,
          token: data.token,
          type: 'magiclink',
        },
        { preserveCurrentSession: true },
      ),
      8000,
      'linked-account-otp-timeout',
    );

    return result;
  };

  const handleSwitchAccount = async (account: AccountOption) => {
    if (account.profileId === profile?.id || switchingAccountId) return;

    const session = accountSessionByProfileId.get(account.profileId);
    const linkedTarget = directlyLinkedProfileIds.has(account.profileId);
    const switchTargetKey = session?.userId || account.profileId;
    setSwitchingAccountId(switchTargetKey);

    let error: Error | null = null;
    if (session?.userId) {
      try {
        const stored = await raceTimeout(
          switchToKnownAccount(session.userId),
          2500,
          'stored-session-timeout',
        );
        error = stored.error;
      } catch {
        error = new Error(t('home.accountSwitchFailed'));
      }
    }

    if ((!session?.userId || error) && linkedTarget) {
      try {
        const linked = await switchToLinkedProfile(account.profileId);
        error = linked.error;
      } catch {
        error = new Error(t('home.accountSwitchFailed'));
      }
    } else if (!session?.userId && !linkedTarget) {
      error = new Error(t('home.accountSwitchFailed'));
    }

    if (error) {
      toast.error(t('home.accountSwitchFailed'));
    } else {
      toast.success(t('home.accountSwitchSuccess'));
      setOpen(false);
    }
    setSwitchingAccountId(null);
  };

  const resolveProfileIdForUser = async (options: {
    userId: string;
    email: string;
    password: string;
  }) => {
    const ephemeralClient = createEphemeralSupabaseClient();
    if (!ephemeralClient) return null;

    // Try to authenticate in the isolated client to avoid clobbering the current session.
    await ephemeralClient.auth.signInWithPassword({
      email: options.email,
      password: options.password,
    });

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data: ownProfile } = await ephemeralClient
        .from('profiles')
        .select('id')
        .eq('user_id', options.userId)
        .maybeSingle();

      if (ownProfile?.id) {
        await ephemeralClient.auth.signOut();
        return ownProfile.id;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    await ephemeralClient.auth.signOut();
    return null;
  };

  const createBusinessAccountClientSide = async () => {
    const submitBusinessAccessRequest = async (targetProfileId: string) => {
      const { error: requestError } = await supabase.from('business_account_access_requests').insert({
        target_profile_id: targetProfileId,
        requester_profile_id: profile?.id,
      });

      if (!requestError) {
        return t('home.accountSwitchAccessRequestSubmitted');
      }

      if (requestError.code === '23505') {
        return t('home.accountSwitchAccessRequestPending');
      }

      if (isMissingBusinessAccessRequestsTableError(requestError)) {
        return t('home.accountSwitchBusinessExists');
      }

      console.error('Could not create business access request:', requestError);
      return t('home.accountSwitchAccessRequestFailed');
    };

    try {
      if (!profile?.id) {
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      const normalizedEmail = businessEmail.trim().toLowerCase();
      const normalizedBusinessName = normalizeBusinessName(businessName);
      const ephemeralClient = createEphemeralSupabaseClient();
      if (!ephemeralClient) {
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      const usernameCandidate = toBusinessUsernameCandidate(businessName);
      const existingProfileId = selectedBusinessMatch?.profileId ?? null;

      const { data: existingBusinessProfile } = existingProfileId
        ? { data: { id: existingProfileId } }
        : await supabase
            .from('profiles')
            .select('id')
            .eq('username', usernameCandidate)
            .maybeSingle();

      if (existingBusinessProfile?.id) {
        const { data: existingOwnerLink } = await supabase
          .from('linked_accounts')
          .select('id, owner_profile_id')
          .eq('linked_profile_id', existingBusinessProfile.id)
          .eq('relationship_type', 'business')
          .maybeSingle();

        if (existingOwnerLink?.id) {
          if (existingOwnerLink.owner_profile_id === profile.id) {
            return { error: t('home.accountSwitchAlreadyLinked') } as const;
          }

          const requestMessage = await submitBusinessAccessRequest(existingBusinessProfile.id);
          return {
            error: null,
            accessRequested: true,
            message: requestMessage,
          } as const;
        }
      }

      const { data: signUpData, error: signUpError } = await ephemeralClient.auth.signUp({
        email: normalizedEmail,
        password: businessPassword,
        options: {
          data: {
            full_name: businessName.trim(),
            username: usernameCandidate,
          },
        },
      });

      if (signUpError && !signUpError.message.toLowerCase().includes('already')) {
        const failureMessage = isNetworkFetchError(signUpError)
          ? t('home.accountSwitchCreateFailed')
          : (signUpError.message || t('home.accountSwitchCreateFailed'));
        return { error: failureMessage } as const;
      }

      let businessUserId = signUpData.user?.id ?? null;
      if (!businessUserId) {
        const { data: fallbackSignIn, error: fallbackSignInError } = await ephemeralClient.auth.signInWithPassword({
          email: normalizedEmail,
          password: businessPassword,
        });

        if (fallbackSignInError || !fallbackSignIn.user?.id) {
          const failureMessage = isNetworkFetchError(fallbackSignInError)
            ? t('home.accountSwitchCreateFailed')
            : (fallbackSignInError?.message || t('home.accountSwitchCreateFailed'));
          return { error: failureMessage } as const;
        }

        businessUserId = fallbackSignIn.user.id;
      }

      const linkedProfileId = await resolveProfileIdForUser({
        userId: businessUserId,
        email: normalizedEmail,
        password: businessPassword,
      });

      if (!linkedProfileId) {
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      const { error: linkError } = await supabase.from('linked_accounts').insert({
        owner_profile_id: profile.id,
        linked_profile_id: linkedProfileId,
        relationship_type: 'business',
        business_name_normalized: normalizedBusinessName,
      });

      if (linkError) {
        if (isDuplicateLinkError(linkError)) {
          if (isOwnerSingleBusinessConstraintError(linkError)) {
            return { error: t('home.accountSwitchCreateFailed') } as const;
          }
          const message = String(linkError.message || '').toLowerCase();
          if (message.includes('business_name')) {
            return { error: t('home.accountSwitchBusinessExists') } as const;
          }
          return { error: t('home.accountSwitchAlreadyLinked') } as const;
        }
        console.warn('Could not create linked_accounts row:', linkError);
        return { error: t('home.accountSwitchCreateFailed') } as const;
      }

      return { error: null, linkedProfileId } as const;
    } catch (error) {
      return {
        error: isNetworkFetchError(error as { message?: string; details?: string })
          ? t('home.accountSwitchCreateFailed')
          : t('home.accountSwitchCreateFailed'),
      } as const;
    }
  };

  const connectingExisting = shouldUseConnectAction(selectedBusinessMatch);
  const connectNeedsPassword = Boolean(
    selectedBusinessMatch
    && !selectedBusinessMatch.alreadyLinkedToRequester
    && (!selectedBusinessMatch.ownerProfileId || selectedBusinessMatch.ownerProfileId === profile?.id),
  );
  const connectNeedsAccessRequest = Boolean(
    selectedBusinessMatch
    && selectedBusinessMatch.ownerProfileId
    && selectedBusinessMatch.ownerProfileId !== profile?.id
    && !selectedBusinessMatch.alreadyLinkedToRequester,
  );

  const handleCreateBusinessAccount = async () => {
    if (selectedBusinessMatch?.alreadyLinkedToRequester) {
      setBusinessError(t('home.accountSwitchAlreadyLinked'));
      toast.error(t('home.accountSwitchAlreadyLinked'));
      return;
    }

    if (connectNeedsAccessRequest) {
      // Selected company is enough to request access.
    } else if (connectingExisting && connectNeedsPassword) {
      if (!businessEmail.trim() || !businessPassword.trim()) {
        setBusinessError(t('home.accountSwitchConnectMissing'));
        toast.error(t('home.accountSwitchConnectMissing'));
        return;
      }
    } else if (!connectingExisting) {
      if (!businessName.trim() || !businessEmail.trim() || !businessPassword.trim()) {
        setBusinessError(t('home.accountSwitchCreateMissing'));
        toast.error(t('home.accountSwitchCreateMissing'));
        return;
      }
    }

    setCreatingBusiness(true);
    setBusinessError(null);

    const createResult = await createBusinessAccountClientSide();
    if (createResult.accessRequested) {
      const infoMessage = createResult.message || t('home.accountSwitchAccessRequestSubmitted');
      setBusinessError(null);
      toast.success(infoMessage);
      setCreatingBusiness(false);
      setBusinessName('');
      setBusinessEmail('');
      setBusinessPassword('');
      setCreateBusinessOpen(false);
      return;
    }

    const createError = createResult.error;
    if (createError) {
      setBusinessError(createError);
      toast.error(createError);
      setCreatingBusiness(false);
      return;
    }

    const { error: signInError } = await signIn(businessEmail.trim(), businessPassword, {
      preserveCurrentSession: true,
    });

    if (signInError) {
      const errorMessage = String(signInError.message || t('home.accountSwitchSignInFailed'));
      setBusinessError(errorMessage);
      toast.error(errorMessage);
      setCreatingBusiness(false);
      return;
    }

    if (createResult.linkedProfileId) {
      await supabase
        .from('profiles')
        .update({ full_name: businessName.trim() })
        .eq('id', createResult.linkedProfileId);
    }

    toast.success(t(connectingExisting ? 'home.accountSwitchConnectSuccess' : 'home.accountSwitchCreateSuccess'));
    setBusinessName('');
    setBusinessEmail('');
    setBusinessPassword('');
    setBusinessError(null);
    setBusinessMatches([]);
    setSelectedBusinessMatch(null);
    setCreateBusinessOpen(false);
    setCreatingBusiness(false);
    setOpen(false);
  };

  return {
    handleSwitchAccount, connectingExisting, connectNeedsPassword, connectNeedsAccessRequest,
    handleCreateBusinessAccount,
  };
}

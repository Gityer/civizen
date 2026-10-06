import { motion } from 'framer-motion';
import { cloneElement, isValidElement, Suspense, useState, useEffect, useRef, useMemo, type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Globe, Loader2, MapPin, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryName, getCountryOptions } from '@/lib/countries';
import { detectDeviceLocation, LocationPermissionError } from '@/lib/device-location';
import { uploadProfileAvatar } from '@/lib/profile-avatar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { type CardCategory, getDefaultCardCategoryCode, getStoredCardCategories, getStoredProfileCardCategory, saveProfileCardCategory } from '@/lib/taxonomy';
import { buildCivizenDid, buildCivizenLsiQrValue, buildWorldCitizenMrz, getWorldCitizenIdParts, getWorldCitizenStatusPrefix, normalizeCivizenSocialId } from '@/lib/world-citizen-id';
import { BUILD_STORAGE_EVENT, EDIT_PROFILE_LAYOUT_SCHEMA_KEY_PREFIX, EDIT_PROFILE_LAYOUT_SCHEMA_VERSION, LAYOUT_REGION_LABELS, LEGACY_LAYOUT_STORAGE_PREFIX, areDraftsEqual, getFullNameChangeState, getUsernameChangeState, normalizeProfileDraft, resetEditProfileBuildStorage, type ProfileDraft } from '@/lib/edit-profile-helpers';
import { WorldCitizenshipStatusNotice } from '@/components/institutional/WorldCitizenshipStatusNotice';
import { IdentityVerificationSettingsSection } from '@/components/profile/IdentityVerificationSettingsSection';
import { EditProfileSocialCard, EditProfileWorldCitizenCard } from '@/components/profile/edit-profile-lazy-cards';



function isBuildModeActive() {
  return typeof document !== 'undefined' && document.body.dataset.buildModeActive === 'true';
}

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
  const [placeOfBirth, setPlaceOfBirth] = useState(profile?.place_of_birth || profile?.country || '');
  const [sex, setSex] = useState(profile?.sex || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [countryCode, setCountryCode] = useState(profile?.country_code || '');
  const [city, setCity] = useState(profile?.city || '');
  const [regionCode, setRegionCode] = useState(profile?.region_code || '');
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [placeOfBirthPickerOpen, setPlaceOfBirthPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [showOfficialId, setShowOfficialId] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDateOfBirth, setEditingDateOfBirth] = useState(false);
  const [editingSex, setEditingSex] = useState(false);
  const [cardCategories, setCardCategories] = useState<CardCategory[]>(() => getStoredCardCategories());
  const [cardCategoryCode, setCardCategoryCode] = useState(getDefaultCardCategoryCode());
  const [worldCitizenCardSide, setWorldCitizenCardSide] = useState<'front' | 'back'>('front');
  const [socialCardSide, setSocialCardSide] = useState<'front' | 'back'>('front');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const worldCitizenFrontCardRef = useRef<HTMLDivElement>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);
  const initializedProfileIdRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const placeOfBirthHoverCloseRef = useRef<number | null>(null);
  const categoryHoverCloseRef = useRef<number | null>(null);
  const [categoryPopoverMetrics, setCategoryPopoverMetrics] = useState({ width: 0, alignOffset: 0 });
  const lastSavedDraftRef = useRef<ProfileDraft | null>(null);
  const lastSaveVersionRef = useRef(0);
  const latestAttemptVersionRef = useRef(0);
  const countryOptions = getCountryOptions(language);
  const usernameChangeState = useMemo(() => getUsernameChangeState(profile), [profile]);
  const fullNameChangeState = useMemo(
    () =>
      getFullNameChangeState({
        created_at: profile?.created_at || new Date().toISOString(),
      full_name_change_count: profile?.full_name_change_count,
    }),
    [profile?.created_at, profile?.full_name_change_count],
  );
  const formattedOfficialId = useMemo(() => profile?.official_id?.toUpperCase().replace(/[^A-Z0-9]/g, '') || null, [profile?.official_id]);
  const officialIdDisplay = useMemo(
    () => (formattedOfficialId ? getWorldCitizenIdParts(formattedOfficialId, showOfficialId) : null),
    [formattedOfficialId, showOfficialId],
  );
  const formattedLsi = useMemo(() => normalizeCivizenSocialId(profile?.social_security_number), [profile?.social_security_number]);
  const citizenStatusPrefix = useMemo(
    () => getWorldCitizenStatusPrefix(profile?.role, profile?.is_verified),
    [profile?.is_verified, profile?.role],
  );
  const mrzLines = useMemo(
    () => (formattedOfficialId ? buildWorldCitizenMrz({ officialId: formattedOfficialId, fullName: profile?.full_name, createdAt: profile?.created_at }) : []),
    [formattedOfficialId, profile?.created_at, profile?.full_name],
  );
  const didUri = useMemo(() => (formattedOfficialId ? buildCivizenDid(formattedOfficialId) : null), [formattedOfficialId]);
  const didDisplay = useMemo(() => (didUri ? didUri.replace(/^did:/, '') : null), [didUri]);
  const identityName = fullName || profile?.full_name || t('home.worldCitizen');
  const { givenName, surname } = useMemo(() => {
    const parts = identityName.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { givenName: identityName.trim() || '—', surname: '—' };
    }
    return {
      givenName: parts.slice(0, -1).join(' '),
      surname: parts[parts.length - 1],
    };
  }, [identityName]);
  const lsiQrValue = useMemo(
    () => (formattedOfficialId && formattedLsi ? buildCivizenLsiQrValue(formattedOfficialId, formattedLsi) : null),
    [formattedLsi, formattedOfficialId],
  );
  const memberSinceLabel = useMemo(() => {
    if (!profile?.created_at) return null;
    const createdAt = new Date(profile.created_at);
    if (Number.isNaN(createdAt.getTime())) return null;
    return createdAt.toLocaleDateString(language, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }, [language, profile?.created_at]);
  const dateOfBirthLabel = useMemo(() => {
    if (!dateOfBirth) return null;
    const parsed = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(language, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }, [dateOfBirth, language]);
  const displayedPlaceOfBirth = placeOfBirth || country || '';
  const expiryLabel = useMemo(() => {
    if (!profile?.created_at) return null;
    const createdAt = new Date(profile.created_at);
    if (Number.isNaN(createdAt.getTime())) return null;
    const expiryDate = new Date(createdAt);
    expiryDate.setUTCFullYear(expiryDate.getUTCFullYear() + 10);
    return expiryDate.toLocaleDateString(language, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }, [language, profile?.created_at]);
  const sexLabel = useMemo(() => {
    if (sex === 'M') return t('editProfile.sexMale');
    if (sex === 'F') return t('editProfile.sexFemale');
    if (sex === 'X') return t('editProfile.sexOther');
    return '—';
  }, [sex, t]);
  const selectedCardCategory = useMemo(
    () => cardCategories.find((category) => category.code === cardCategoryCode) || cardCategories[0] || { code: getDefaultCardCategoryCode(), label: t('editProfile.categoryNative') },
    [cardCategories, cardCategoryCode, t],
  );
  const draft = useMemo(
    () =>
      normalizeProfileDraft({
        fullName,
        username,
        bio,
        dateOfBirth,
        placeOfBirth,
        sex,
        country,
        countryCode,
        city,
        regionCode,
      }),
    [bio, city, country, countryCode, dateOfBirth, fullName, placeOfBirth, regionCode, sex, username],
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const measureCategoryPopover = () => {
      const cardElement = worldCitizenFrontCardRef.current;
      const triggerElement = categoryTriggerRef.current;
      if (!cardElement || !triggerElement) return;

      const cardRect = cardElement.getBoundingClientRect();
      const triggerRect = triggerElement.getBoundingClientRect();

      setCategoryPopoverMetrics({
        width: cardRect.width,
        alignOffset: cardRect.left - triggerRect.left,
      });
    };

    measureCategoryPopover();

    const cardElement = worldCitizenFrontCardRef.current;
    const triggerElement = categoryTriggerRef.current;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measureCategoryPopover();
          })
        : null;

    if (cardElement) resizeObserver?.observe(cardElement);
    if (triggerElement) resizeObserver?.observe(triggerElement);
    window.addEventListener('resize', measureCategoryPopover);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureCategoryPopover);
    };
  }, []);
  useEffect(() => {
    if (!profile?.id) return;

    const profileDraft: ProfileDraft = {
      full_name: profile.full_name || null,
      username: profile.username || null,
      bio: profile.bio || null,
      date_of_birth: profile.date_of_birth || null,
      place_of_birth: profile.place_of_birth || null,
      sex: profile.sex || null,
      country: profile.country || null,
      country_code: profile.country_code || null,
      city: profile.city || null,
      region_code: profile.region_code || null,
    };

    const currentProfileId = initializedProfileIdRef.current;
    const isNewProfile = currentProfileId !== profile.id;

    if (isNewProfile || !lastSavedDraftRef.current) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setDateOfBirth(profile.date_of_birth || '');
      setPlaceOfBirth(profile.place_of_birth || profile.country || '');
      setSex(profile.sex || '');
      setCountry(profile.country || '');
      setCountryCode(profile.country_code || '');
      setCity(profile.city || '');
      setRegionCode(profile.region_code || '');
      initializedProfileIdRef.current = profile.id;
      lastSavedDraftRef.current = profileDraft;
      setAutosaveError(null);
      return;
    }

    if (areDraftsEqual(lastSavedDraftRef.current, draft)) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setDateOfBirth(profile.date_of_birth || '');
      setPlaceOfBirth(profile.place_of_birth || profile.country || '');
      setSex(profile.sex || '');
      setCountry(profile.country || '');
      setCountryCode(profile.country_code || '');
      setCity(profile.city || '');
      setRegionCode(profile.region_code || '');
    }

    lastSavedDraftRef.current = profileDraft;
  }, [profile]);

  useEffect(() => {
    setCardCategories(getStoredCardCategories());
  }, []);

  useEffect(() => {
    if (!profile?.id) {
      setCardCategoryCode(getDefaultCardCategoryCode());
      return;
    }

    setCardCategoryCode(getStoredProfileCardCategory(profile.id));
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const pathname = window.location.pathname;
    const legacyKey = `${LEGACY_LAYOUT_STORAGE_PREFIX}:${profile.id}`;
    const schemaKey = `${EDIT_PROFILE_LAYOUT_SCHEMA_KEY_PREFIX}:${pathname}`;
    const hasLegacyOffsets = Boolean(window.localStorage.getItem(legacyKey));
    const storedSchemaVersion = Number.parseInt(window.localStorage.getItem(schemaKey) || '', 10);
    const needsSchemaReset = storedSchemaVersion !== EDIT_PROFILE_LAYOUT_SCHEMA_VERSION;

    if (!hasLegacyOffsets && !needsSchemaReset) return;

    let didChange = resetEditProfileBuildStorage(pathname);

    if (hasLegacyOffsets) {
      window.localStorage.removeItem(legacyKey);
      didChange = true;
    }

    if (needsSchemaReset) {
      window.localStorage.setItem(schemaKey, String(EDIT_PROFILE_LAYOUT_SCHEMA_VERSION));
      didChange = true;
    }

    if (didChange) {
      window.dispatchEvent(new CustomEvent(BUILD_STORAGE_EVENT));
    }
  }, [profile?.id]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      if (placeOfBirthHoverCloseRef.current !== null) {
        window.clearTimeout(placeOfBirthHoverCloseRef.current);
      }
    };
  }, []);

  const persistDraft = async (nextDraft: ProfileDraft, manualRetry = false) => {
    if (!profile?.id) return;

    const version = latestAttemptVersionRef.current + 1;
    latestAttemptVersionRef.current = version;
    setSaving(true);
    setAutosaveError(null);

    const { error } = await supabase
      .from('profiles')
      .update(nextDraft)
      .eq('id', profile.id);

    if (error) {
      const nextError =
        error.code === '23505' ? t('editProfile.usernameTaken') : t('editProfile.autoSaveFailed');

      if (version === latestAttemptVersionRef.current) {
        setAutosaveError(nextError);
      }

      if (error.code === '23505') {
        toast.error(t('editProfile.usernameTaken'));
      } else {
        toast.error(t('editProfile.autoSaveFailed'));
      }

      if (version === latestAttemptVersionRef.current) {
        setSaving(false);
      }
      return;
    }

    if (version >= lastSaveVersionRef.current) {
      lastSaveVersionRef.current = version;
      lastSavedDraftRef.current = nextDraft;
    }

    if (version === latestAttemptVersionRef.current) {
      setSaving(false);
      setAutosaveError(null);
    }

    await refreshProfile();

    if (manualRetry) {
      toast.success(t('editProfile.profileUpdated'));
    }
  };

  const handleAvatarUploadClick = () => {
    avatarInputRef.current?.click();
  };

  useEffect(() => {
    if (!profile?.id || !lastSavedDraftRef.current) return;
    if (areDraftsEqual(draft, lastSavedDraftRef.current)) return;

    setAutosaveError(null);

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void persistDraft(draft);
    }, 700);
  }, [draft, profile?.id]);

  const handleCountrySelect = (nextCountry: string, nextCountryCode: string) => {
    const previousCountry = country;
    setCountry(nextCountry);
    setCountryCode(nextCountryCode);
    if (!placeOfBirth || placeOfBirth === previousCountry) {
      setPlaceOfBirth(nextCountry);
    }
    setCountryPickerOpen(false);
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const detected = await detectDeviceLocation();
      if (detected.city) setCity(detected.city);
      if (detected.regionCode) setRegionCode(detected.regionCode);
      if (detected.countryCode) {
        setCountryCode(detected.countryCode);
        setCountry(detected.countryName || getCountryName(detected.countryCode, language));
      }
      toast.success(t('editProfile.locationDetected'));
    } catch (error) {
      const message =
        error instanceof LocationPermissionError
          ? error.message
          : t('editProfile.locationDetectFailed');
      toast.error(message);
    } finally {
      setDetectingLocation(false);
    }
  };

  const openPlaceOfBirthPicker = () => {
    if (!fullNameChangeState.canEdit) return;
    if (placeOfBirthHoverCloseRef.current !== null) {
      window.clearTimeout(placeOfBirthHoverCloseRef.current);
      placeOfBirthHoverCloseRef.current = null;
    }
    setPlaceOfBirthPickerOpen(true);
  };

  const schedulePlaceOfBirthPickerClose = () => {
    if (placeOfBirthHoverCloseRef.current !== null) {
      window.clearTimeout(placeOfBirthHoverCloseRef.current);
    }
    placeOfBirthHoverCloseRef.current = window.setTimeout(() => {
      setPlaceOfBirthPickerOpen(false);
    }, 140);
  };

  const openCategoryPicker = () => {
    if (isBuildModeActive()) return;
    if (!fullNameChangeState.canEdit) return;
    if (categoryHoverCloseRef.current !== null) {
      window.clearTimeout(categoryHoverCloseRef.current);
      categoryHoverCloseRef.current = null;
    }
    setCategoryPickerOpen(true);
  };

  const scheduleCategoryPickerClose = () => {
    if (isBuildModeActive()) return;
    if (categoryHoverCloseRef.current !== null) {
      window.clearTimeout(categoryHoverCloseRef.current);
    }
    categoryHoverCloseRef.current = window.setTimeout(() => {
      setCategoryPickerOpen(false);
    }, 140);
  };

  const handleCategorySelect = (nextCode: string) => {
    if (isBuildModeActive()) return;
    const normalized = nextCode.trim().toUpperCase() || getDefaultCardCategoryCode();
    setCardCategoryCode(normalized);
    if (profile?.id) {
      saveProfileCardCategory(profile.id, normalized);
    }
    setCategoryPickerOpen(false);
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !profile?.id || !profile.user_id) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('common.photoUploadInvalidType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('common.photoUploadTooLarge'));
      return;
    }

    setUploadingAvatar(true);

    try {
      const { publicUrl } = await uploadProfileAvatar(file, profile.user_id);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      toast.success(t('common.photoUpdated'));
    } catch (error) {
      console.error('Error uploading profile avatar:', error);
      toast.error(t('common.photoUploadFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderLayoutRegion = (
    key: keyof typeof LAYOUT_REGION_LABELS,
    children: ReactNode,
    options?: {
      className?: string;
      roundedClassName?: string;
    },
  ) => {
    if (isValidElement(children) && typeof children.type === 'string') {
      const childProps = children.props as { className?: string };
      return cloneElement(children as ReactElement<Record<string, unknown>>, {
        'data-build-key': key,
        'data-build-label': LAYOUT_REGION_LABELS[key],
        className: cn('relative', options?.className, childProps.className),
      });
    }

    return (
      <div
        className={cn('relative', options?.className)}
        data-build-key={key}
        data-build-label={LAYOUT_REGION_LABELS[key]}
      >
        {children}
      </div>
    );
  };

  const toggleWorldCitizenCardSide = () => {
    if (document.body.dataset.buildModeActive === 'true') return;
    if (editingName || editingDateOfBirth || editingSex) {
      setEditingName(false);
      setEditingDateOfBirth(false);
      setEditingSex(false);
      return;
    }
    setWorldCitizenCardSide((current) => (current === 'front' ? 'back' : 'front'));
  };

  const toggleSocialCardSide = () => {
    if (document.body.dataset.buildModeActive === 'true') return;
    setSocialCardSide((current) => (current === 'front' ? 'back' : 'front'));
  };

  return (
    <AppLayout>
      <div
        className="px-4 py-6 space-y-6"
        data-build-key="editProfilePage"
        data-build-label={LAYOUT_REGION_LABELS.editProfilePage}
        data-build-root="true"
      >
        <div
          data-build-key="editProfileBackGroup"
          data-build-label={LAYOUT_REGION_LABELS.editProfileBackGroup}
        >
          <span
            className="sr-only"
            data-build-key="editProfileBackIcon"
            data-build-label={LAYOUT_REGION_LABELS.editProfileBackIcon}
          />
          <span
            className="sr-only"
            data-build-key="editProfileBackText"
            data-build-label={LAYOUT_REGION_LABELS.editProfileBackText}
          >
            {t('common.back')}
          </span>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            data-build-key="editProfileTitleGroup"
            data-build-label={LAYOUT_REGION_LABELS.editProfileTitleGroup}
          >
            <AppPageHeader
              title={
                <span
                  data-build-key="editProfileTitle"
                  data-build-label={LAYOUT_REGION_LABELS.editProfileTitle}
                >
                  {t('editProfile.title')}
                </span>
              }
              fallbackPath="/settings"
            />
          </motion.div>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm"
            data-build-key="editProfileCardsGroup"
            data-build-label={LAYOUT_REGION_LABELS.editProfileCardsGroup}
          >
            <TooltipProvider>
              <div className="mx-auto w-full max-w-[26rem]">
                <Carousel opts={{ align: 'start' }} className="w-full">
                  <CarouselContent className="-ml-0">
                    <Suspense fallback={<CarouselItem className="pl-0" />}>
                      <EditProfileWorldCitizenCard
                        avatarAlt={fullName || profile?.full_name || t('home.worldCitizen')}
                        avatarInitials={getInitials(fullName || profile?.full_name)}
                        cardCategories={cardCategories}
                        cardCategoryCode={cardCategoryCode}
                        categoryPickerOpen={categoryPickerOpen}
                        categoryPopoverMetrics={categoryPopoverMetrics}
                        categoryTriggerRef={categoryTriggerRef}
                        citizenStatusPrefix={citizenStatusPrefix}
                        countryOptions={countryOptions}
                        dateOfBirth={dateOfBirth}
                        dateOfBirthLabel={dateOfBirthLabel}
                        didDisplay={didDisplay}
                        displayedPlaceOfBirth={displayedPlaceOfBirth}
                        editingDateOfBirth={editingDateOfBirth}
                        editingName={editingName}
                        editingSex={editingSex}
                        expiryLabel={expiryLabel}
                        fullName={fullName}
                        fullNameChangeState={fullNameChangeState}
                        givenName={givenName}
                        handleAvatarUploadClick={handleAvatarUploadClick}
                        handleCategorySelect={handleCategorySelect}
                        isBuildModeActive={isBuildModeActive}
                        memberSinceLabel={memberSinceLabel}
                        mrzLines={mrzLines}
                        officialIdDisplay={officialIdDisplay}
                        openCategoryPicker={openCategoryPicker}
                        openPlaceOfBirthPicker={openPlaceOfBirthPicker}
                        placeOfBirthPickerOpen={placeOfBirthPickerOpen}
                        profile={profile}
                        renderLayoutRegion={renderLayoutRegion}
                        scheduleCategoryPickerClose={scheduleCategoryPickerClose}
                        schedulePlaceOfBirthPickerClose={schedulePlaceOfBirthPickerClose}
                        selectedCardCategory={selectedCardCategory}
                        setCategoryPickerOpen={setCategoryPickerOpen}
                        setDateOfBirth={setDateOfBirth}
                        setEditingDateOfBirth={setEditingDateOfBirth}
                        setEditingName={setEditingName}
                        setEditingSex={setEditingSex}
                        setFullName={setFullName}
                        setPlaceOfBirth={setPlaceOfBirth}
                        setPlaceOfBirthPickerOpen={setPlaceOfBirthPickerOpen}
                        setSex={setSex}
                        setShowOfficialId={setShowOfficialId}
                        sex={sex}
                        sexLabel={sexLabel}
                        showOfficialId={showOfficialId}
                        surname={surname}
                        t={t}
                        toggleWorldCitizenCardSide={toggleWorldCitizenCardSide}
                        uploadingAvatar={uploadingAvatar}
                        worldCitizenCardSide={worldCitizenCardSide}
                        worldCitizenFrontCardRef={worldCitizenFrontCardRef}
                      />
                    </Suspense>

                    <Suspense fallback={<CarouselItem className="pl-4" />}>
                      <EditProfileSocialCard
                        didDisplay={didDisplay}
                        formattedLsi={formattedLsi}
                        fullName={fullName}
                        lsiQrValue={lsiQrValue}
                        profile={profile}
                        renderLayoutRegion={renderLayoutRegion}
                        socialCardSide={socialCardSide}
                        t={t}
                        toggleSocialCardSide={toggleSocialCardSide}
                      />
                    </Suspense>
                  </CarouselContent>
                </Carousel>

                <div
                  className="mt-3 flex justify-center gap-2"
                  data-build-key="editProfileCarouselDots"
                  data-build-label={LAYOUT_REGION_LABELS.editProfileCarouselDots}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border/80" />
                </div>
              </div>
            </TooltipProvider>
            <WorldCitizenshipStatusNotice variant="credential" className="mt-3" />
            <div className="mt-4">
              <IdentityVerificationSettingsSection />
            </div>
          </div>

          <div
            className="space-y-2"
            data-build-key="editProfileUsernameGroup"
            data-build-label={LAYOUT_REGION_LABELS.editProfileUsernameGroup}
          >
            <Label htmlFor="username">{t('editProfile.username')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                placeholder={t('editProfile.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="pl-8"
                disabled={!usernameChangeState.canEdit}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t(usernameChangeState.key, usernameChangeState.vars)}</p>
          </div>

          <div
            className="space-y-2"
            data-build-key="editProfileCountryGroup"
            data-build-label={LAYOUT_REGION_LABELS.editProfileCountryGroup}
          >
            <Label htmlFor="country">{t('editProfile.country')}</Label>
            <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 z-10 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <PopoverTrigger asChild>
                  <Button
                    id="country"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryPickerOpen}
                    className={cn(
                      'w-full justify-between pl-10 pr-3 font-normal',
                      !country && 'text-muted-foreground'
                    )}
                  >
                    <span className="truncate">{country || t('editProfile.countryPlaceholder')}</span>
                    {saving ? (
                      <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-70" />
                    ) : (
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
              </div>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('editProfile.searchCountryPlaceholder')} />
                  <CommandList>
                    <CommandEmpty>{t('editProfile.countryNotFound')}</CommandEmpty>
                    <CommandGroup>
                      {countryOptions.map((option) => (
                        <CommandItem
                          key={option.code}
                          value={option.label}
                            onSelect={() => void handleCountrySelect(option.label, option.code)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              country === option.label ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div
            className="space-y-3"
            data-build-key="editProfileLocationGroup"
            data-build-label={LAYOUT_REGION_LABELS.editProfileLocationGroup}
          >
            <div className="flex items-center justify-between gap-2">
              <Label>{t('editProfile.currentLocation')}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={detectingLocation || saving}
                onClick={() => void handleDetectLocation()}
              >
                {detectingLocation ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                {t('editProfile.detectLocation')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('editProfile.detectLocationHint')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">{t('editProfile.city')}</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('editProfile.cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regionCode">{t('editProfile.regionCode')}</Label>
                <Input
                  id="regionCode"
                  value={regionCode}
                  onChange={(e) => setRegionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8))}
                  placeholder={t('editProfile.regionCodePlaceholder')}
                  maxLength={8}
                />
              </div>
            </div>
          </div>

          <div
            className="space-y-2"
            data-build-key="editProfileBioGroup"
            data-build-label={LAYOUT_REGION_LABELS.editProfileBioGroup}
          >
            <Label htmlFor="bio">{t('editProfile.bio')}</Label>
            <Textarea
              id="bio"
              placeholder={t('editProfile.bioPlaceholder')}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[100px]"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/300
            </p>
          </div>

          <div
            className="flex min-h-11 items-center justify-end"
            data-build-key="editProfileAutosaveGroup"
            data-build-label={LAYOUT_REGION_LABELS.editProfileAutosaveGroup}
          >
            {autosaveError ? (
              <Button
                onClick={() => void persistDraft(draft, true)}
                disabled={saving}
                className="w-full gap-2"
              >
                {saving ? t('editProfile.saving') : t('editProfile.saveChanges')}
                <Save className="w-4 h-4" />
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {saving ? t('editProfile.autoSaving') : t('editProfile.autoSaveActive')}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}

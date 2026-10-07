import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useLatestRef } from '@/hooks/useLatestRef';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';

import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryOptions } from '@/lib/countries';
import { uploadEducationCertificate } from '@/lib/education-certificate';
import { countryShowsEducationRegion } from '@/lib/education-geo';
import {
  DEFAULT_EDUCATION_LEVEL,
  EDUCATION_LEVELS,
  filterEducationDepartments,
  filterEducationInstitutions,
  filterEducationSpecializations,
} from '@/lib/education-institutions';
import {
  listGeoCities,
  listGeoCitiesOfCountry,
  listGeoRegions,
  resolveCountryCapitalLocation,
  type GeoRegionOption,
} from '@/lib/geo-locations';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AUTOSAVE_MS, canHoverOpen, selectedOptionClass, type AutosaveStatus } from '@/components/profile/details-dialog-helpers';

export type EducationEntryDefaults = {
  countryCode?: string | null;
  regionCode?: string | null;
  city?: string | null;
};

type EducationDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  defaults: EducationEntryDefaults;
  /** Called after a successful persist so score surfaces can refresh. */
  onSaved?: () => void;
};

type EducationFormState = {
  educationLevel: string;
  department: string;
  major: string;
  institutionName: string;
  yearCompleted: string;
  countryCode: string;
  regionCode: string;
  city: string;
};

type VerificationStatus = 'unverified' | 'certificate_provided' | 'verified';

const YEAR_OPTIONS = Array.from({ length: 80 }, (_, index) => String(new Date().getFullYear() - index));

function serializeForm(form: EducationFormState): string {
  return JSON.stringify(form);
}

function educationLooksFilled(form: EducationFormState): boolean {
  return Boolean(
    form.department.trim() ||
      form.major.trim() ||
      form.institutionName.trim() ||
      form.yearCompleted ||
      form.city.trim() ||
      (form.educationLevel && form.educationLevel !== DEFAULT_EDUCATION_LEVEL),
  );
}

const emptyForm = (defaults: EducationEntryDefaults = {}): EducationFormState => ({
  educationLevel: DEFAULT_EDUCATION_LEVEL,
  department: '',
  major: '',
  institutionName: '',
  yearCompleted: '',
  countryCode: defaults.countryCode || '',
  regionCode: defaults.regionCode || '',
  city: defaults.city || '',
});

type SentenceTokenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  empty: boolean;
  children: ReactNode;
  panel: ReactNode;
  className?: string;
};

function SentenceToken({
  open,
  onOpenChange,
  ariaLabel,
  empty,
  children,
  panel,
  className,
}: SentenceTokenProps) {
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    onOpenChange(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => onOpenChange(false), 160);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        onOpenChange(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            'ml-0.5 mr-0.5 inline-flex max-w-[16rem] items-center rounded-sm border-b border-dashed border-primary/55 px-0.5 text-left font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            empty && 'text-muted-foreground',
            className,
          )}
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
        >
          <span className="truncate">{children}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(18rem,calc(100vw-2rem))] p-0"
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

export function EducationDetailsDialog({
  open,
  onOpenChange,
  profileId,
  defaults,
  onSaved,
}: EducationDetailsDialogProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');
  const entryIdRef = useRef<string | null>(null);
  const verificationStatusRef = useRef<VerificationStatus>('unverified');
  const formRef = useRef<EducationFormState>(emptyForm(defaults));
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const [form, setForm] = useState<EducationFormState>(() => emptyForm(defaults));
  const [entryId, setEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [customLevels, setCustomLevels] = useState<string[]>([]);
  const [regions, setRegions] = useState<GeoRegionOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [levelOpen, setLevelOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [majorOpen, setMajorOpen] = useState(false);
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [levelQuery, setLevelQuery] = useState('');
  const [departmentQuery, setDepartmentQuery] = useState('');
  const [majorQuery, setMajorQuery] = useState('');
  const [institutionQuery, setInstitutionQuery] = useState('');

  entryIdRef.current = entryId;
  verificationStatusRef.current = verificationStatus;
  formRef.current = form;

  const countryOptions = useMemo(() => getCountryOptions(language), [language]);
  const showRegion = countryShowsEducationRegion(form.countryCode) && regions.length > 0;
  const formKey = serializeForm(form);
  const showProofIcon = educationLooksFilled(form) || verificationStatus !== 'unverified';

  const knownLevelKeys = useMemo(() => new Set<string>(EDUCATION_LEVELS), []);

  const levelLabel = useCallback(
    (level: string) => {
      if (knownLevelKeys.has(level)) {
        const key = `profile.educationDetails.levels.${level}`;
        const translated = t(key);
        return translated === key ? level : translated;
      }
      return level;
    },
    [knownLevelKeys, t],
  );

  const levelOptions = useMemo(() => {
    const builtIn = EDUCATION_LEVELS.map((level) => ({
      value: level,
      label: levelLabel(level),
    }));
    const custom = customLevels
      .filter((level) => !knownLevelKeys.has(level))
      .map((level) => ({ value: level, label: level }));
    return [...builtIn, ...custom];
  }, [customLevels, knownLevelKeys, levelLabel]);

  const filteredLevelOptions = useMemo(() => {
    const q = levelQuery.trim().toLowerCase();
    if (!q) return levelOptions;
    return levelOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q),
    );
  }, [levelOptions, levelQuery]);

  const levelQueryTrimmed = levelQuery.trim();
  const showAddLevel =
    levelQueryTrimmed.length > 0 &&
    !levelOptions.some(
      (option) =>
        option.label.toLowerCase() === levelQueryTrimmed.toLowerCase() ||
        option.value.toLowerCase() === levelQueryTrimmed.toLowerCase(),
    );

  const institutionSuggestions = useMemo(
    () =>
      filterEducationInstitutions(institutionQuery, {
        countryCode: form.countryCode,
        regionCode: form.regionCode,
        city: form.city,
        extraNames: form.institutionName ? [form.institutionName] : [],
      }),
    [institutionQuery, form.countryCode, form.regionCode, form.city, form.institutionName],
  );

  const departmentSuggestions = useMemo(
    () => filterEducationDepartments(departmentQuery, form.department ? [form.department] : []),
    [departmentQuery, form.department],
  );

  const majorSuggestions = useMemo(
    () => filterEducationSpecializations(majorQuery, form.major ? [form.major] : []),
    [majorQuery, form.major],
  );

  const institutionQueryTrimmed = institutionQuery.trim();
  const showAddInstitution =
    institutionQueryTrimmed.length > 0 &&
    !institutionSuggestions.some((name) => name.toLowerCase() === institutionQueryTrimmed.toLowerCase());

  const departmentQueryTrimmed = departmentQuery.trim();
  const showAddDepartment =
    departmentQueryTrimmed.length > 0 &&
    !departmentSuggestions.some((name) => name.toLowerCase() === departmentQueryTrimmed.toLowerCase());

  const majorQueryTrimmed = majorQuery.trim();
  const showAddMajor =
    majorQueryTrimmed.length > 0 &&
    !majorSuggestions.some((name) => name.toLowerCase() === majorQueryTrimmed.toLowerCase());

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open]);

  // Primitives, so the load effect does not re-run when the parent passes a new `defaults` object.
  const { countryCode: defCountry, regionCode: defRegion, city: defCity } = defaults;

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      setAutosaveStatus('idle');
      return;
    }
    if (!profileId) return;

    let cancelled = false;
    const load = async () => {
      hydratedRef.current = false;
      setLoading(true);
      const { data, error } = await supabase
        .from('profile_education_entries')
        .select(
          'id, education_level, institution_name, country_code, region_code, city, department, major, year_start, year_end, verification_status, certificate_path',
        )
        .eq('profile_id', profileId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error(t('profile.educationDetails.loadFailed'));
        setLoading(false);
        return;
      }

      let nextForm = emptyForm({ countryCode: defCountry, regionCode: defRegion, city: defCity });
      if (data) {
        setEntryId(typeof data.id === 'string' ? data.id : null);
        const level =
          typeof data.education_level === 'string' && data.education_level
            ? data.education_level
            : DEFAULT_EDUCATION_LEVEL;
        const storedDepartment = typeof data.department === 'string' ? data.department.trim() : '';
        const storedMajor = typeof data.major === 'string' ? data.major.trim() : '';
        // Soft-migrate pre-department rows: old major becomes broad field.
        const department = storedDepartment || storedMajor;
        const major = storedDepartment ? storedMajor : '';

        nextForm = {
          educationLevel: level === 'other' ? DEFAULT_EDUCATION_LEVEL : level,
          department,
          major,
          institutionName: typeof data.institution_name === 'string' ? data.institution_name : '',
          yearCompleted:
            data.year_end != null
              ? String(data.year_end)
              : data.year_start != null
                ? String(data.year_start)
                : '',
          countryCode:
            (typeof data.country_code === 'string' && data.country_code) ||
            defCountry ||
            '',
          regionCode:
            (typeof data.region_code === 'string' && data.region_code) ||
            defRegion ||
            '',
          city: (typeof data.city === 'string' && data.city) || defCity || '',
        };

        if (
          level !== 'other' &&
          !knownLevelKeys.has(level) &&
          level !== DEFAULT_EDUCATION_LEVEL
        ) {
          setCustomLevels((current) =>
            current.some((item) => item.toLowerCase() === level.toLowerCase())
              ? current
              : [...current, level],
          );
        }
      } else {
        setEntryId(null);
      }

      const statusRaw =
        typeof data?.verification_status === 'string' ? data.verification_status : 'unverified';
      const nextStatus: VerificationStatus =
        statusRaw === 'verified' || statusRaw === 'certificate_provided' ? statusRaw : 'unverified';
      setVerificationStatus(nextStatus);

      setForm(nextForm);
      lastSavedRef.current = serializeForm(nextForm);
      setLoading(false);
      hydratedRef.current = true;
      setAutosaveStatus('saved');
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, profileId, defCountry, defRegion, defCity, t, knownLevelKeys]);

  useEffect(() => {
    if (!form.countryCode) {
      setRegions([]);
      return;
    }
    let cancelled = false;
    void listGeoRegions(form.countryCode).then((next) => {
      if (!cancelled) setRegions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [form.countryCode]);

  useEffect(() => {
    if (!form.countryCode) {
      setCities([]);
      return;
    }
    let cancelled = false;
    const loadCities = async () => {
      if (countryShowsEducationRegion(form.countryCode) && form.regionCode) {
        return listGeoCities(form.countryCode, form.regionCode);
      }
      return listGeoCitiesOfCountry(form.countryCode);
    };
    void loadCities().then((next) => {
      if (!cancelled) setCities(next);
    });
    return () => {
      cancelled = true;
    };
  }, [form.countryCode, form.regionCode]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!educationLooksFilled(form)) return;
    if (verificationStatus === 'verified' || verificationStatus === 'certificate_provided') return;
    setVerificationStatus('unverified');
  }, [form, verificationStatus]);

  const buildPayload = (nextVerification: VerificationStatus, nextForm: EducationFormState = formRef.current) => ({
    profile_id: profileId,
    education_level: nextForm.educationLevel || DEFAULT_EDUCATION_LEVEL,
    institution_name: nextForm.institutionName.trim() || null,
    country_code: nextForm.countryCode || null,
    region_code: nextForm.regionCode || null,
    city: nextForm.city.trim() || null,
    department: nextForm.department.trim() || null,
    major: nextForm.major.trim() || null,
    year_start: null,
    year_end: nextForm.yearCompleted ? Number(nextForm.yearCompleted) : null,
    verification_status: nextVerification,
    updated_at: new Date().toISOString(),
  });

  const persistEducation = async (options?: { force?: boolean }): Promise<boolean> => {
    const nextForm = formRef.current;
    const serialized = serializeForm(nextForm);
    if (!options?.force && serialized === lastSavedRef.current) return true;
    if (!educationLooksFilled(nextForm) && !options?.force) return true;

    setAutosaveStatus('saving');
    const payload = buildPayload(verificationStatusRef.current, nextForm);
    const currentId = entryIdRef.current;
    const { data, error } = currentId
      ? await supabase
          .from('profile_education_entries')
          .update(payload)
          .eq('id', currentId)
          .select('id')
          .maybeSingle()
      : await supabase
          .from('profile_education_entries')
          .upsert(payload, { onConflict: 'profile_id' })
          .select('id')
          .maybeSingle();

    if (error) {
      setAutosaveStatus('error');
      toast.error(t('profile.educationDetails.saveFailed'));
      return false;
    }

    if (data?.id && typeof data.id === 'string') {
      setEntryId(data.id);
      entryIdRef.current = data.id;
    }
    lastSavedRef.current = serialized;
    setAutosaveStatus('saved');
    onSavedRef.current?.();
    return true;
  };

  const persistEducationRef = useLatestRef(persistEducation);

  useEffect(() => {
    if (!open || loading || !hydratedRef.current) return;
    if (formKey === lastSavedRef.current) return;

    const timer = window.setTimeout(() => {
      void persistEducationRef.current();
    }, AUTOSAVE_MS);

    return () => window.clearTimeout(timer);
  }, [form, formKey, loading, open, persistEducationRef, profileId, t]);

  // Flush pending education when the panel closes (X, parent, or dial), so score refreshes.
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      void persistEducationRef.current({ force: educationLooksFilled(formRef.current) });
    }
    wasOpenRef.current = open;
  }, [open, persistEducationRef]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const setField = <K extends keyof EducationFormState>(key: K, value: EducationFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addCustomLevel = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    setCustomLevels((current) =>
      current.some((item) => item.toLowerCase() === name.toLowerCase()) ? current : [...current, name],
    );
    setField('educationLevel', name);
    setLevelQuery('');
    setLevelOpen(false);
  };

  const handleCountrySelect = async (countryCode: string) => {
    setCountryOpen(false);
    const normalized = countryCode.trim().toUpperCase();
    if (!normalized) return;

    const profileCountry = (defaults.countryCode || '').trim().toUpperCase();
    if (
      normalized === profileCountry &&
      ((defaults.city && defaults.city.trim()) || (defaults.regionCode && defaults.regionCode.trim()))
    ) {
      setForm((current) => ({
        ...current,
        countryCode: normalized,
        regionCode: defaults.regionCode || '',
        city: defaults.city || '',
      }));
      return;
    }

    const capital = await resolveCountryCapitalLocation(normalized);
    setForm((current) => ({
      ...current,
      countryCode: normalized,
      regionCode: capital?.regionCode || '',
      city: capital?.city || '',
    }));
  };

  const handleCertificateUploadClick = () => {
    if (verificationStatus === 'verified') return;
    certificateInputRef.current?.click();
  };

  const handleCertificateSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user?.id) return;

    setUploadingCertificate(true);
    try {
      const { filePath } = await uploadEducationCertificate(file, user.id);
      const nextStatus: VerificationStatus = 'certificate_provided';
      setVerificationStatus(nextStatus);
      verificationStatusRef.current = nextStatus;

      const payload = {
        ...buildPayload(nextStatus),
        certificate_path: filePath,
        certificate_uploaded_at: new Date().toISOString(),
      };

      const currentId = entryIdRef.current;
      const { data, error } = currentId
        ? await supabase
            .from('profile_education_entries')
            .update(payload)
            .eq('id', currentId)
            .select('id')
            .maybeSingle()
        : await supabase
            .from('profile_education_entries')
            .upsert(payload, { onConflict: 'profile_id' })
            .select('id')
            .maybeSingle();

      if (error) throw error;
      if (data?.id && typeof data.id === 'string') {
        setEntryId(data.id);
        entryIdRef.current = data.id;
      }
      lastSavedRef.current = serializeForm(formRef.current);
      toast.success(t('profile.educationDetails.certificateUploaded'));
      onSavedRef.current?.();
    } catch (error) {
      console.error(error);
      toast.error(t('profile.educationDetails.certificateUploadFailed'));
    } finally {
      setUploadingCertificate(false);
    }
  };

  if (!open) return null;

  const cityChoices = cities.length > 0 ? cities : form.city ? [form.city] : [];

  const autosaveIcon =
    autosaveStatus === 'saving' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
    ) : autosaveStatus === 'error' ? (
      <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />
    ) : (
      <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
    );

  const autosaveLabel =
    autosaveStatus === 'saving'
      ? t('profile.educationDetails.autoSaving')
      : autosaveStatus === 'error'
        ? t('profile.educationDetails.saveFailed')
        : t('profile.educationDetails.autoSaved');

  const proofLabel =
    verificationStatus === 'verified'
      ? t('profile.educationDetails.verified')
      : verificationStatus === 'certificate_provided'
        ? t('profile.educationDetails.certificateProvided')
        : t('profile.educationDetails.unverified');

  const proofIcon =
    verificationStatus === 'verified' ? (
      <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
    ) : verificationStatus === 'certificate_provided' ? (
      <FileCheck2 className="h-3.5 w-3.5 text-primary" aria-hidden />
    ) : uploadingCertificate ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" aria-hidden />
    ) : (
      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" aria-hidden />
    );

  return (
    <Card
      ref={cardRef}
      id="learning-education-panel"
      className="relative mt-3 w-full max-w-md overflow-visible border-border/80 shadow-soft"
    >
      <div className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2">
        <span className="bg-card px-1.5 font-display text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('profile.educationDetails.title')}
        </span>
      </div>
      <div className="absolute right-3 top-0 z-10 flex -translate-y-1/2 items-center gap-1.5">
        {showProofIcon ? (
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            title={proofLabel}
            aria-label={proofLabel}
            disabled={verificationStatus === 'verified' || uploadingCertificate}
            onClick={handleCertificateUploadClick}
          >
            {proofIcon}
          </button>
        ) : null}
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft"
          title={autosaveLabel}
          aria-label={autosaveLabel}
          role="status"
        >
          {autosaveIcon}
        </span>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('common.close')}
          onClick={() => handleOpenChange(false)}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
        <input
          ref={certificateInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleCertificateSelected(event)}
        />
      </div>

      <CardContent className="px-4 pb-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground">
            {t('profile.educationDetails.sentenceLead')}{' '}
            <SentenceToken
              open={levelOpen}
              onOpenChange={setLevelOpen}
              ariaLabel={t('profile.educationDetails.level')}
              empty={!form.educationLevel}
              panel={
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('profile.educationDetails.levelSearch')}
                    value={levelQuery}
                    onValueChange={setLevelQuery}
                  />
                  <CommandList>
                    <CommandEmpty>{t('profile.educationDetails.levelEmpty')}</CommandEmpty>
                    <CommandGroup>
                      {showAddLevel ? (
                        <CommandItem
                          value={`add-${levelQueryTrimmed}`}
                          onSelect={() => addCustomLevel(levelQueryTrimmed)}
                        >
                          <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                          {t('profile.educationDetails.addLevel', { name: levelQueryTrimmed })}
                        </CommandItem>
                      ) : null}
                      {filteredLevelOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          className={selectedOptionClass(form.educationLevel === option.value)}
                          onSelect={() => {
                            setField('educationLevel', option.value);
                            setLevelQuery('');
                            setLevelOpen(false);
                          }}
                        >
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              }
            >
              {levelLabel(form.educationLevel || DEFAULT_EDUCATION_LEVEL)}
            </SentenceToken>{' '}
            {t('profile.educationDetails.sentenceIn')}{' '}
            <SentenceToken
              open={departmentOpen}
              onOpenChange={setDepartmentOpen}
              ariaLabel={t('profile.educationDetails.department')}
              empty={!form.department}
              panel={
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('profile.educationDetails.departmentSearch')}
                    value={departmentQuery}
                    onValueChange={setDepartmentQuery}
                  />
                  <CommandList>
                    <CommandEmpty>{t('profile.educationDetails.departmentEmpty')}</CommandEmpty>
                    <CommandGroup>
                      {showAddDepartment ? (
                        <CommandItem
                          value={`add-${departmentQueryTrimmed}`}
                          onSelect={() => {
                            setField('department', departmentQueryTrimmed);
                            setDepartmentQuery('');
                            setDepartmentOpen(false);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                          {t('profile.educationDetails.addDepartment', {
                            name: departmentQueryTrimmed,
                          })}
                        </CommandItem>
                      ) : null}
                      {departmentSuggestions.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          className={selectedOptionClass(form.department === name)}
                          onSelect={() => {
                            setField('department', name);
                            setDepartmentQuery('');
                            setDepartmentOpen(false);
                          }}
                        >
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              }
            >
              {form.department || t('profile.educationDetails.departmentPlaceholder')}
            </SentenceToken>{' '}
            {t('profile.educationDetails.sentenceFocusing')}{' '}
            <SentenceToken
              open={majorOpen}
              onOpenChange={setMajorOpen}
              ariaLabel={t('profile.educationDetails.major')}
              empty={!form.major}
              panel={
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('profile.educationDetails.majorSearch')}
                    value={majorQuery}
                    onValueChange={setMajorQuery}
                  />
                  <CommandList>
                    <CommandEmpty>{t('profile.educationDetails.majorEmpty')}</CommandEmpty>
                    <CommandGroup>
                      {showAddMajor ? (
                        <CommandItem
                          value={`add-${majorQueryTrimmed}`}
                          onSelect={() => {
                            setField('major', majorQueryTrimmed);
                            setMajorQuery('');
                            setMajorOpen(false);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                          {t('profile.educationDetails.addMajor', { name: majorQueryTrimmed })}
                        </CommandItem>
                      ) : null}
                      {majorSuggestions.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          className={selectedOptionClass(form.major === name)}
                          onSelect={() => {
                            setField('major', name);
                            setMajorQuery('');
                            setMajorOpen(false);
                          }}
                        >
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              }
            >
              {form.major || t('profile.educationDetails.majorPlaceholder')}
            </SentenceToken>{' '}
            {t('profile.educationDetails.sentenceFrom')}{' '}
            <SentenceToken
              open={institutionOpen}
              onOpenChange={setInstitutionOpen}
              ariaLabel={t('profile.educationDetails.institution')}
              empty={!form.institutionName}
              className="mr-0!"
              panel={
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('profile.educationDetails.institutionSearch')}
                    value={institutionQuery}
                    onValueChange={setInstitutionQuery}
                  />
                  <CommandList>
                    <CommandEmpty>{t('profile.educationDetails.institutionEmpty')}</CommandEmpty>
                    <CommandGroup>
                      {showAddInstitution ? (
                        <CommandItem
                          value={`add-${institutionQueryTrimmed}`}
                          onSelect={() => {
                            setField('institutionName', institutionQueryTrimmed);
                            setInstitutionQuery('');
                            setInstitutionOpen(false);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                          {t('profile.educationDetails.addInstitution', {
                            name: institutionQueryTrimmed,
                          })}
                        </CommandItem>
                      ) : null}
                      {institutionSuggestions.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          className={selectedOptionClass(form.institutionName === name)}
                          onSelect={() => {
                            setField('institutionName', name);
                            setInstitutionQuery('');
                            setInstitutionOpen(false);
                          }}
                        >
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              }
            >
              {form.institutionName || t('profile.educationDetails.institutionPlaceholder')}
            </SentenceToken>
            {', '}
            {t('profile.educationDetails.sentenceCompleted')}{' '}
            <SentenceToken
              open={yearOpen}
              onOpenChange={setYearOpen}
              ariaLabel={t('profile.educationDetails.yearCompleted')}
              empty={!form.yearCompleted}
              panel={
                <Command>
                  <CommandInput placeholder={t('profile.educationDetails.yearSearch')} />
                  <CommandList>
                    <CommandEmpty>{t('profile.educationDetails.yearEmpty')}</CommandEmpty>
                    <CommandGroup>
                      {YEAR_OPTIONS.map((year) => (
                        <CommandItem
                          key={year}
                          value={year}
                          className={selectedOptionClass(form.yearCompleted === year)}
                          onSelect={() => {
                            setField('yearCompleted', year);
                            setYearOpen(false);
                          }}
                        >
                          {year}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              }
            >
              {form.yearCompleted || t('profile.educationDetails.yearPlaceholder')}
            </SentenceToken>{' '}
            {t('profile.educationDetails.sentenceLocated')}{' '}
            <SentenceToken
              open={cityOpen}
              onOpenChange={setCityOpen}
              ariaLabel={t('profile.educationDetails.city')}
              empty={!form.city}
              className="mr-0!"
              panel={
                <Command>
                  <CommandInput placeholder={t('profile.educationDetails.citySearch')} />
                  <CommandList>
                    <CommandEmpty>{t('profile.educationDetails.cityEmpty')}</CommandEmpty>
                    <CommandGroup>
                      {cityChoices.map((cityName) => (
                        <CommandItem
                          key={cityName}
                          value={cityName}
                          className={selectedOptionClass(form.city === cityName)}
                          onSelect={() => {
                            setField('city', cityName);
                            setCityOpen(false);
                          }}
                        >
                          {cityName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              }
            >
              {form.city || t('profile.educationDetails.cityPlaceholder')}
            </SentenceToken>
            {','}
            {showRegion ? (
              <>
                {' '}
                <SentenceToken
                  open={regionOpen}
                  onOpenChange={setRegionOpen}
                  ariaLabel={t('profile.educationDetails.region')}
                  empty={!form.regionCode}
                  className="mr-0!"
                  panel={
                    <Command>
                      <CommandInput placeholder={t('profile.educationDetails.regionSearch')} />
                      <CommandList>
                        <CommandEmpty>{t('profile.educationDetails.regionEmpty')}</CommandEmpty>
                        <CommandGroup>
                          {regions.map((region) => (
                            <CommandItem
                              key={region.code}
                              value={`${region.code} ${region.name}`}
                              className={selectedOptionClass(form.regionCode === region.code)}
                              onSelect={() => {
                                setForm((current) => ({
                                  ...current,
                                  regionCode: region.code,
                                  city: '',
                                }));
                                setRegionOpen(false);
                              }}
                            >
                              <span className="font-medium">{region.code}</span>
                              <span className="ml-2 text-muted-foreground">{region.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  }
                >
                  {form.regionCode || t('profile.educationDetails.regionPlaceholder')}
                </SentenceToken>
                {','}
              </>
            ) : null}{' '}
            <span className="inline-flex items-center">
              <SentenceToken
                open={countryOpen}
                onOpenChange={setCountryOpen}
                ariaLabel={t('profile.educationDetails.country')}
                empty={!form.countryCode}
                className="mx-0 max-w-none border-b-0 px-0 hover:bg-transparent"
                panel={
                  <Command>
                    <CommandInput placeholder={t('editProfile.searchCountryPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('editProfile.countryNotFound')}</CommandEmpty>
                      <CommandGroup>
                        {countryOptions.map((option) => (
                          <CommandItem
                            key={option.code}
                            value={option.label}
                            className={selectedOptionClass(form.countryCode === option.code)}
                            onSelect={() => {
                              void handleCountrySelect(option.code);
                            }}
                          >
                            <RoundCountryFlag
                              countryCode={option.code}
                              locale={language}
                              size="sm"
                              className="mr-2"
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                }
              >
                {form.countryCode ? (
                  <RoundCountryFlag countryCode={form.countryCode} locale={language} size="sm" />
                ) : (
                  t('profile.educationDetails.countryPlaceholder')
                )}
              </SentenceToken>
            </span>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

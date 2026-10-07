import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLatestRef } from '@/hooks/useLatestRef';
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatEnglishList } from '@/lib/profile-skills';
import {
  DURATION_PRESENT,
  emptyExperienceDraft,
  experienceDurationComplete,
  experienceEntryComplete,
  experienceYearOptions,
  filterExperienceOptions,
  formatDurationRange,
  formatExperienceLine,
  isDurationPresent,
  monthYearKey,
  newExperienceDraftId,
  normalizeDurationEnd,
  normalizeDurationStart,
  normalizeNameList,
  parseExperienceEntries,
  parseMonthYearKey,
  PROFILE_EXPERIENCE_AREA_SEEDS,
  PROFILE_EXPERIENCE_COMPANY_SEEDS,
  PROFILE_EXPERIENCE_MONTH_LABELS,
  PROFILE_EXPERIENCE_POSITION_SEEDS,
  serializeExperienceEntries,
  type ExperienceEntry,
} from '@/lib/profile-experience';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DemonstratedExperienceEvidence } from '@/components/profile/DemonstratedExperienceEvidence';
import { AUTOSAVE_MS, canHoverOpen, selectedOptionClass, type AutosaveStatus } from '@/components/profile/details-dialog-helpers';
import { CyclingOptionsLabel } from '@/components/profile/CyclingOptionsLabel';

type ExperienceDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onSaved?: () => void;
};

type DraftState = {
  areas: string[];
  positions: string[];
  companies: string[];
  durationStart: string;
  durationEnd: string;
};

const COMMIT_MS = 400;
const YEAR_OPTIONS = experienceYearOptions(60);

function emptyDraft(): DraftState {
  return emptyExperienceDraft() as DraftState;
}

type SentenceTokenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  empty: boolean;
  children: ReactNode;
  panel: ReactNode;
  contentClassName?: string;
  onHoverChange?: (hovered: boolean) => void;
};

function SentenceToken({
  open,
  onOpenChange,
  ariaLabel,
  empty,
  children,
  panel,
  contentClassName,
  onHoverChange,
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

  const setHovered = (hovered: boolean) => {
    onHoverChange?.(hovered);
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
            'ml-0.5 mr-0.5 inline-flex max-w-[min(22rem,calc(100vw-6rem))] items-center rounded-sm border-b border-dashed border-primary/55 px-0.5 text-left font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            empty && 'text-muted-foreground',
          )}
          onMouseEnter={() => {
            setHovered(true);
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            setHovered(false);
            if (canHoverOpen()) scheduleClose();
          }}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          <span className="whitespace-normal">{children}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn('w-[min(18rem,calc(100vw-2rem))] p-0', contentClassName)}
        onMouseEnter={() => {
          setHovered(true);
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          setHovered(false);
          if (canHoverOpen()) scheduleClose();
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

type DurationPickerProps = {
  durationStart: string;
  durationEnd: string;
  onChangeStart: (year: number, month: number) => void;
  onChangeEnd: (year: number, month: number) => void;
  onSelectPresent: () => void;
};

function MonthYearColumns({
  year,
  month,
  onYearChange,
  onMonthChange,
  monthLabel,
  yearLabel,
}: {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  monthLabel: string;
  yearLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-1">
      <ScrollArea className="h-40">
        <div className="flex flex-col gap-0.5 p-1" role="listbox" aria-label={monthLabel}>
          {PROFILE_EXPERIENCE_MONTH_LABELS.map((label, index) => {
            const value = index + 1;
            const active = month === value;
            return (
              <button
                key={label}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  'rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  active
                    ? 'bg-background font-semibold text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                )}
                onClick={() => onMonthChange(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <ScrollArea className="h-40">
        <div className="flex flex-col gap-0.5 p-1" role="listbox" aria-label={yearLabel}>
          {YEAR_OPTIONS.map((option) => {
            const active = year === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  'rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  active
                    ? 'bg-background font-semibold text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                )}
                onClick={() => onYearChange(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function DurationPicker({
  durationStart,
  durationEnd,
  onChangeStart,
  onChangeEnd,
  onSelectPresent,
}: DurationPickerProps) {
  const { t } = useLanguage();
  const presentLabel = t('profile.experienceDetails.durationPresent');
  const startPoint = parseMonthYearKey(durationStart);
  const endPoint = isDurationPresent(durationEnd) ? null : parseMonthYearKey(durationEnd);
  const startPointRef = useLatestRef(startPoint);
  const endPointRef = useLatestRef(endPoint);
  const endIsPresent = isDurationPresent(durationEnd);

  const [fromYear, setFromYear] = useState(
    () => startPoint?.year ?? YEAR_OPTIONS[0] ?? new Date().getFullYear(),
  );
  const [fromMonth, setFromMonth] = useState(
    () => startPoint?.month ?? new Date().getMonth() + 1,
  );
  const [toYear, setToYear] = useState(
    () => endPoint?.year ?? YEAR_OPTIONS[0] ?? new Date().getFullYear(),
  );
  const [toMonth, setToMonth] = useState(
    () => endPoint?.month ?? new Date().getMonth() + 1,
  );

  useEffect(() => {
    const point = startPointRef.current;
    if (point) {
      setFromYear(point.year);
      setFromMonth(point.month);
    }
  }, [durationStart, startPointRef]);

  useEffect(() => {
    const point = endPointRef.current;
    if (point) {
      setToYear(point.year);
      setToMonth(point.month);
    }
  }, [durationEnd, endPointRef]);

  const applyFrom = (year: number, month: number) => {
    setFromYear(year);
    setFromMonth(month);
    onChangeStart(year, month);
  };

  const applyTo = (year: number, month: number) => {
    setToYear(year);
    setToMonth(month);
    onChangeEnd(year, month);
  };

  return (
    <div className="space-y-3 p-2">
      <p className="px-1 text-xs text-muted-foreground">
        {t('profile.experienceDetails.durationHint')}
      </p>

      <div className="space-y-1.5">
        <p className="px-1 text-xs font-medium text-foreground">
          {t('profile.experienceDetails.durationFrom')}
        </p>
        <MonthYearColumns
          year={fromYear}
          month={fromMonth}
          onYearChange={(year) => applyFrom(year, fromMonth)}
          onMonthChange={(month) => applyFrom(fromYear, month)}
          monthLabel={t('profile.experienceDetails.month')}
          yearLabel={t('profile.experienceDetails.year')}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-medium text-foreground">
            {t('profile.experienceDetails.durationTo')}
          </p>
          <button
            type="button"
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              endIsPresent
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-foreground hover:bg-muted/80',
            )}
            onClick={onSelectPresent}
          >
            {presentLabel}
          </button>
        </div>
        <MonthYearColumns
          year={toYear}
          month={toMonth}
          onYearChange={(year) => applyTo(year, toMonth)}
          onMonthChange={(month) => applyTo(toYear, month)}
          monthLabel={t('profile.experienceDetails.month')}
          yearLabel={t('profile.experienceDetails.year')}
        />
      </div>

      {durationStart ? (
        <p className="px-1 text-xs text-muted-foreground">
          {t('profile.experienceDetails.durationSelected', {
            value: formatDurationRange(durationStart, durationEnd || DURATION_PRESENT, presentLabel),
          })}
        </p>
      ) : null}
    </div>
  );
}

export function ExperienceDetailsDialog({
  open,
  onOpenChange,
  profileId,
  onSaved,
}: ExperienceDetailsDialogProps) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');
  const entryIdRef = useRef<string | null>(null);
  const entriesRef = useRef<ExperienceEntry[]>([]);
  const draftRef = useRef<DraftState>(emptyDraft());
  const editingIdRef = useRef<string | null>(null);
  const editingIndexRef = useRef<number | null>(null);
  const editBaselineRef = useRef<string>('');
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const [entries, setEntries] = useState<ExperienceEntry[]>([]);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [areasOpen, setAreasOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [companiesOpen, setCompaniesOpen] = useState(false);
  const [areasHovered, setAreasHovered] = useState(false);
  const [positionsHovered, setPositionsHovered] = useState(false);
  const [durationHovered, setDurationHovered] = useState(false);
  const [companiesHovered, setCompaniesHovered] = useState(false);
  const [areasQuery, setAreasQuery] = useState('');
  const [positionsQuery, setPositionsQuery] = useState('');
  const [companiesQuery, setCompaniesQuery] = useState('');

  entryIdRef.current = entryId;
  entriesRef.current = entries;
  draftRef.current = draft;
  editingIdRef.current = editingId;

  const draftSerializedKey = useMemo(
    () =>
      JSON.stringify({
        areas: normalizeNameList(draft.areas),
        positions: normalizeNameList(draft.positions),
        companies: normalizeNameList(draft.companies),
        durationStart: normalizeDurationStart(draft.durationStart),
        durationEnd: normalizeDurationEnd(draft.durationEnd || DURATION_PRESENT),
      }),
    [draft],
  );

  const formKey = serializeExperienceEntries(entries);
  const areaSuggestions = useMemo(
    () => filterExperienceOptions(areasQuery, PROFILE_EXPERIENCE_AREA_SEEDS, draft.areas),
    [areasQuery, draft.areas],
  );
  const positionSuggestions = useMemo(
    () =>
      filterExperienceOptions(positionsQuery, PROFILE_EXPERIENCE_POSITION_SEEDS, draft.positions),
    [positionsQuery, draft.positions],
  );
  const companySuggestions = useMemo(
    () =>
      filterExperienceOptions(companiesQuery, PROFILE_EXPERIENCE_COMPANY_SEEDS, draft.companies),
    [companiesQuery, draft.companies],
  );

  const areasQueryTrimmed = areasQuery.trim();
  const positionsQueryTrimmed = positionsQuery.trim();
  const companiesQueryTrimmed = companiesQuery.trim();
  const showAddArea =
    areasQueryTrimmed.length > 0 &&
    !areaSuggestions.some((name) => name.toLowerCase() === areasQueryTrimmed.toLowerCase()) &&
    !draft.areas.some((name) => name.toLowerCase() === areasQueryTrimmed.toLowerCase());
  const showAddPosition =
    positionsQueryTrimmed.length > 0 &&
    !positionSuggestions.some(
      (name) => name.toLowerCase() === positionsQueryTrimmed.toLowerCase(),
    ) &&
    !draft.positions.some((name) => name.toLowerCase() === positionsQueryTrimmed.toLowerCase());
  const showAddCompany =
    companiesQueryTrimmed.length > 0 &&
    !companySuggestions.some(
      (name) => name.toLowerCase() === companiesQueryTrimmed.toLowerCase(),
    ) &&
    !draft.companies.some((name) => name.toLowerCase() === companiesQueryTrimmed.toLowerCase());

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      setAutosaveStatus('idle');
      setAreasOpen(false);
      setPositionsOpen(false);
      setPositionsHovered(false);
      setAreasHovered(false);
      setDurationHovered(false);
      setCompaniesHovered(false);
      setDurationOpen(false);
      setCompaniesOpen(false);
      setAreasQuery('');
      setPositionsQuery('');
      setCompaniesQuery('');
      setEditingId(null);
      editingIdRef.current = null;
      editingIndexRef.current = null;
      editBaselineRef.current = '';
      return;
    }
    if (!profileId) return;

    let cancelled = false;
    const load = async () => {
      hydratedRef.current = false;
      setLoading(true);
      const { data, error } = await supabase
        .from('profile_experience_entries')
        .select('id, experiences')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error(t('profile.experienceDetails.loadFailed'));
        setLoading(false);
        return;
      }

      const nextEntries = parseExperienceEntries(data?.experiences);
      setEntryId(typeof data?.id === 'string' ? data.id : null);
      setEntries(nextEntries);
      setDraft(emptyDraft());
      setEditingId(null);
      editingIdRef.current = null;
      editingIndexRef.current = null;
      editBaselineRef.current = '';
      lastSavedRef.current = serializeExperienceEntries(nextEntries);
      setLoading(false);
      hydratedRef.current = true;
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, profileId, t]);

  const persistEntries = async (
    nextEntries: ExperienceEntry[],
    options?: { force?: boolean },
  ): Promise<boolean> => {
    const serialized = serializeExperienceEntries(nextEntries);
    if (!options?.force && serialized === lastSavedRef.current) return true;

    setAutosaveStatus('saving');
    const payload = {
      profile_id: profileId,
      experiences: nextEntries.map((entry) => ({
        id: entry.id,
        areas: normalizeNameList(entry.areas),
        positions: normalizeNameList(entry.positions),
        companies: normalizeNameList(entry.companies),
        durationStart: normalizeDurationStart(entry.durationStart),
        durationEnd: normalizeDurationEnd(entry.durationEnd),
      })),
      updated_at: new Date().toISOString(),
    };
    const currentId = entryIdRef.current;
    const { data, error } = currentId
      ? await supabase
          .from('profile_experience_entries')
          .update(payload)
          .eq('id', currentId)
          .select('id')
          .maybeSingle()
      : await supabase
          .from('profile_experience_entries')
          .upsert(payload, { onConflict: 'profile_id' })
          .select('id')
          .maybeSingle();

    if (error) {
      console.error(error);
      setAutosaveStatus('error');
      toast.error(t('profile.experienceDetails.saveFailed'));
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

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!open) return;
    const timer = window.setTimeout(() => {
      void persistEntries(entriesRef.current);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist on formKey only
  }, [formKey, open]);

  const buildEntryFromDraft = (id: string): ExperienceEntry => ({
    id,
    areas: normalizeNameList(draftRef.current.areas),
    positions: normalizeNameList(draftRef.current.positions),
    companies: normalizeNameList(draftRef.current.companies),
    durationStart: normalizeDurationStart(draftRef.current.durationStart),
    durationEnd: normalizeDurationEnd(draftRef.current.durationEnd || DURATION_PRESENT),
  });

  const insertEntryAt = (
    list: ExperienceEntry[],
    entry: ExperienceEntry,
    index: number | null,
  ): ExperienceEntry[] => {
    const next = [...list];
    const at = index == null ? next.length : Math.min(Math.max(index, 0), next.length);
    next.splice(at, 0, entry);
    return next;
  };

  const clearDraftEditor = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    editingIdRef.current = null;
    editingIndexRef.current = null;
    editBaselineRef.current = '';
    setAreasOpen(false);
    setPositionsOpen(false);
    setDurationOpen(false);
    setCompaniesOpen(false);
    setAreasQuery('');
    setPositionsQuery('');
    setCompaniesQuery('');
  };

  const beginEditEntry = (entry: ExperienceEntry) => {
    // Preserve an in-progress edit if the draft is still complete.
    if (editingIdRef.current) {
      const previous = buildEntryFromDraft(editingIdRef.current);
      if (experienceEntryComplete(previous)) {
        setEntries((current) =>
          insertEntryAt(current, previous, editingIndexRef.current),
        );
      }
    }

    const index = entriesRef.current.findIndex((item) => item.id === entry.id);
    const nextDraft: DraftState = {
      areas: [...entry.areas],
      positions: [...entry.positions],
      companies: [...entry.companies],
      durationStart: entry.durationStart,
      durationEnd: entry.durationEnd,
    };
    setEditingId(entry.id);
    editingIdRef.current = entry.id;
    editingIndexRef.current = index >= 0 ? index : entriesRef.current.length;
    editBaselineRef.current = JSON.stringify({
      areas: normalizeNameList(nextDraft.areas),
      positions: normalizeNameList(nextDraft.positions),
      companies: normalizeNameList(nextDraft.companies),
      durationStart: normalizeDurationStart(nextDraft.durationStart),
      durationEnd: normalizeDurationEnd(nextDraft.durationEnd || DURATION_PRESENT),
    });
    setDraft(nextDraft);
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setAreasOpen(false);
    setPositionsOpen(false);
    setDurationOpen(false);
    setCompaniesOpen(false);
  };

  // Commit a complete draft into the experience list, then reset the sentence builder.
  useEffect(() => {
    if (!hydratedRef.current || !open) return;
    if (!experienceEntryComplete(draft)) return;
    // Editing loads a complete draft; wait until the user changes something.
    if (editingId && draftSerializedKey === editBaselineRef.current) return;

    const timer = window.setTimeout(() => {
      const id = editingIdRef.current ?? newExperienceDraftId();
      const committed = buildEntryFromDraft(id);
      if (!experienceEntryComplete(committed)) return;
      const insertAt = editingIdRef.current ? editingIndexRef.current : null;
      setEntries((current) => insertEntryAt(current, committed, insertAt));
      clearDraftEditor();
    }, COMMIT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commit on draft fields / edit baseline
  }, [
    open,
    draft.areas,
    draft.positions,
    draft.companies,
    draft.durationStart,
    draft.durationEnd,
    draftSerializedKey,
    editingId,
  ]);

  const flushAndClose = async () => {
    let next = entriesRef.current;
    const currentDraftKey = JSON.stringify({
      areas: normalizeNameList(draftRef.current.areas),
      positions: normalizeNameList(draftRef.current.positions),
      companies: normalizeNameList(draftRef.current.companies),
      durationStart: normalizeDurationStart(draftRef.current.durationStart),
      durationEnd: normalizeDurationEnd(
        draftRef.current.durationEnd || DURATION_PRESENT,
      ),
    });

    if (experienceEntryComplete(draftRef.current)) {
      const unchangedEdit =
        Boolean(editingIdRef.current) && currentDraftKey === editBaselineRef.current;
      if (!unchangedEdit) {
        const committed = buildEntryFromDraft(
          editingIdRef.current ?? newExperienceDraftId(),
        );
        next = insertEntryAt(
          next,
          committed,
          editingIdRef.current ? editingIndexRef.current : null,
        );
      } else if (editingIdRef.current) {
        const restored = buildEntryFromDraft(editingIdRef.current);
        next = insertEntryAt(next, restored, editingIndexRef.current);
      }
      setEntries(next);
      clearDraftEditor();
    } else if (editingIdRef.current) {
      try {
        const baseline = JSON.parse(editBaselineRef.current) as DraftState;
        const restored: ExperienceEntry = {
          id: editingIdRef.current,
          areas: normalizeNameList(baseline.areas ?? []),
          positions: normalizeNameList(baseline.positions ?? []),
          companies: normalizeNameList(baseline.companies ?? []),
          durationStart: normalizeDurationStart(baseline.durationStart ?? ''),
          durationEnd: normalizeDurationEnd(baseline.durationEnd || DURATION_PRESENT),
        };
        if (experienceEntryComplete(restored)) {
          next = insertEntryAt(next, restored, editingIndexRef.current);
          setEntries(next);
        }
      } catch {
        /* ignore corrupt baseline */
      }
      clearDraftEditor();
    }
    await persistEntries(next, { force: true });
    onOpenChange(false);
  };

  const toggleName = (
    field: 'areas' | 'positions' | 'companies',
    name: string,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDraft((current) => {
      const list = current[field];
      const exists = list.some((item) => item.toLowerCase() === trimmed.toLowerCase());
      const nextList = exists
        ? list.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())
        : normalizeNameList([...list, trimmed]);
      return { ...current, [field]: nextList };
    });
  };

  const addCustomName = (
    field: 'areas' | 'positions' | 'companies',
    name: string,
    clearQuery: () => void,
  ) => {
    toggleName(field, name);
    clearQuery();
  };

  const setDurationStart = (year: number, month: number) => {
    const key = monthYearKey(year, month);
    setDraft((current) => {
      // Selecting From defaults To to Present when To is empty or still Present.
      const nextEnd =
        !current.durationEnd || isDurationPresent(current.durationEnd)
          ? DURATION_PRESENT
          : normalizeDurationEnd(current.durationEnd);
      return {
        ...current,
        durationStart: key,
        durationEnd: nextEnd,
      };
    });
  };

  const setDurationEndMonthYear = (year: number, month: number) => {
    const key = monthYearKey(year, month);
    setDraft((current) => ({
      ...current,
      durationEnd: key,
      // If To is chosen before From, seed From to the same month so the range is valid.
      durationStart: current.durationStart || key,
    }));
  };

  const setDurationEndPresent = () => {
    setDraft((current) => ({
      ...current,
      durationEnd: DURATION_PRESENT,
    }));
  };

  const removeEntry = (id: string) => {
    if (editingIdRef.current === id) {
      clearDraftEditor();
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  const renderEntryActions = (entry: ExperienceEntry) => (
    <div
      className={cn(
        'absolute right-0 top-0 flex items-center gap-0.5',
        'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
        '[@media(hover:none)]:opacity-100',
      )}
    >
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary"
        aria-label={t('profile.experienceDetails.editExperience')}
        onClick={() => beginEditEntry(entry)}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
        aria-label={t('profile.experienceDetails.removeExperience')}
        onClick={() => removeEntry(entry.id)}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );

  if (!open) return null;

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
      ? t('profile.experienceDetails.autoSaving')
      : autosaveStatus === 'error'
        ? t('profile.experienceDetails.saveFailed')
        : t('profile.experienceDetails.autoSaved');

  const presentLabel = t('profile.experienceDetails.durationPresent');
  const areasEmpty = draft.areas.length === 0;
  const positionsEmpty = draft.positions.length === 0;
  const durationStartMissing = !normalizeDurationStart(draft.durationStart);
  const durationEmpty = !experienceDurationComplete(draft);
  const companiesEmpty = draft.companies.length === 0;
  const useBullets = entries.length > 1;
  const pausePositionsCycle =
    areasOpen ||
    positionsOpen ||
    durationOpen ||
    companiesOpen ||
    areasHovered ||
    positionsHovered ||
    durationHovered ||
    companiesHovered;

  const durationTokenLabel = durationStartMissing ? (
    <>
      <span className="text-muted-foreground">
        {t('profile.experienceDetails.durationFromPlaceholder')}
      </span>
      {' – '}
      <span className="text-primary">{presentLabel}</span>
    </>
  ) : (
    formatDurationRange(
      draft.durationStart,
      draft.durationEnd || DURATION_PRESENT,
      presentLabel,
    )
  );

  return (
    <Card
      ref={cardRef}
      className="relative mt-3 w-full max-w-md overflow-visible border-border/80 shadow-soft"
    >
      <div className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2">
        <span className="bg-card px-1.5 font-display text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('profile.experienceDetails.title')}
        </span>
      </div>
      <div className="absolute right-3 top-0 z-10 flex -translate-y-1/2 items-center gap-1.5">
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
          onClick={() => void flushAndClose()}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <CardContent className="px-4 pb-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {entries.length > 0 ? (
              <>
                <p className="text-sm leading-relaxed text-foreground">
                  {t('profile.experienceDetails.sentenceLead')}:
                </p>
                {useBullets ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                    {entries.map((entry) => (
                      <li key={entry.id} className="group relative pr-14">
                        <span>{formatExperienceLine(entry, presentLabel)}</span>
                        {renderEntryActions(entry)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="group relative pr-14 text-sm leading-relaxed text-foreground">
                    <span>{formatExperienceLine(entries[0], presentLabel)}.</span>
                    {renderEntryActions(entries[0])}
                  </div>
                )}
              </>
            ) : editingId ? (
              <p className="text-sm leading-relaxed text-foreground">
                {t('profile.experienceDetails.sentenceLead')}:
              </p>
            ) : null}

            {editingId || entries.length > 0 ? (
              <p className="text-xs font-medium text-muted-foreground">
                {editingId
                  ? t('profile.experienceDetails.editingExperience')
                  : t('profile.experienceDetails.addAnother')}
              </p>
            ) : null}

            <p className="text-sm leading-relaxed text-foreground">
              {entries.length === 0 && !editingId ? (
                <>{t('profile.experienceDetails.sentenceLead')}{' '}</>
              ) : null}
              <SentenceToken
                open={areasOpen}
                onOpenChange={setAreasOpen}
                onHoverChange={setAreasHovered}
                ariaLabel={t('profile.experienceDetails.areas')}
                empty={areasEmpty}
                panel={
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('profile.experienceDetails.areasSearch')}
                      value={areasQuery}
                      onValueChange={setAreasQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{t('profile.experienceDetails.areasEmpty')}</CommandEmpty>
                      <CommandGroup>
                        {showAddArea ? (
                          <CommandItem
                            value={`add-area-${areasQueryTrimmed}`}
                            onSelect={() =>
                              addCustomName('areas', areasQueryTrimmed, () => setAreasQuery(''))
                            }
                          >
                            <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                            {t('profile.experienceDetails.addArea', { name: areasQueryTrimmed })}
                          </CommandItem>
                        ) : null}
                        {areaSuggestions.map((name) => {
                          const selected = draft.areas.some(
                            (item) => item.toLowerCase() === name.toLowerCase(),
                          );
                          return (
                            <CommandItem
                              key={name}
                              value={name}
                              className={selectedOptionClass(selected)}
                              onSelect={() => {
                                toggleName('areas', name);
                                requestAnimationFrame(() => setAreasOpen(true));
                              }}
                            >
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                }
              >
                {areasEmpty
                  ? t('profile.experienceDetails.areasPlaceholder')
                  : formatEnglishList(draft.areas)}
              </SentenceToken>{' '}
              {t('profile.experienceDetails.sentenceAtPosition')}{' '}
              <SentenceToken
                open={positionsOpen}
                onOpenChange={setPositionsOpen}
                onHoverChange={setPositionsHovered}
                ariaLabel={t('profile.experienceDetails.positions')}
                empty={positionsEmpty}
                panel={
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('profile.experienceDetails.positionsSearch')}
                      value={positionsQuery}
                      onValueChange={setPositionsQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{t('profile.experienceDetails.positionsEmpty')}</CommandEmpty>
                      <CommandGroup>
                        {showAddPosition ? (
                          <CommandItem
                            value={`add-position-${positionsQueryTrimmed}`}
                            onSelect={() =>
                              addCustomName('positions', positionsQueryTrimmed, () =>
                                setPositionsQuery(''),
                              )
                            }
                          >
                            <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                            {t('profile.experienceDetails.addPosition', {
                              name: positionsQueryTrimmed,
                            })}
                          </CommandItem>
                        ) : null}
                        {positionSuggestions.map((name) => {
                          const selected = draft.positions.some(
                            (item) => item.toLowerCase() === name.toLowerCase(),
                          );
                          return (
                            <CommandItem
                              key={name}
                              value={name}
                              className={selectedOptionClass(selected)}
                              onSelect={() => {
                                toggleName('positions', name);
                                requestAnimationFrame(() => setPositionsOpen(true));
                              }}
                            >
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                }
              >
                {positionsEmpty ? (
                  <CyclingOptionsLabel
                    options={PROFILE_EXPERIENCE_POSITION_SEEDS}
                    active
                    paused={pausePositionsCycle}
                    fallback={t('profile.experienceDetails.positionsPlaceholder')}
                  />
                ) : (
                  formatEnglishList(draft.positions)
                )}
              </SentenceToken>{' '}
              {t('profile.experienceDetails.sentenceDuration')}{' '}
              <SentenceToken
                open={durationOpen}
                onOpenChange={setDurationOpen}
                onHoverChange={setDurationHovered}
                ariaLabel={t('profile.experienceDetails.duration')}
                empty={durationEmpty}
                contentClassName="w-[min(22rem,calc(100vw-2rem))]"
                panel={
                  <DurationPicker
                    durationStart={draft.durationStart}
                    durationEnd={draft.durationEnd || DURATION_PRESENT}
                    onChangeStart={setDurationStart}
                    onChangeEnd={setDurationEndMonthYear}
                    onSelectPresent={setDurationEndPresent}
                  />
                }
              >
                {durationTokenLabel}
              </SentenceToken>{' '}
              {t('profile.experienceDetails.sentenceWith')}{' '}
              <SentenceToken
                open={companiesOpen}
                onOpenChange={setCompaniesOpen}
                onHoverChange={setCompaniesHovered}
                ariaLabel={t('profile.experienceDetails.companies')}
                empty={companiesEmpty}
                panel={
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('profile.experienceDetails.companiesSearch')}
                      value={companiesQuery}
                      onValueChange={setCompaniesQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{t('profile.experienceDetails.companiesEmpty')}</CommandEmpty>
                      <CommandGroup>
                        {showAddCompany ? (
                          <CommandItem
                            value={`add-company-${companiesQueryTrimmed}`}
                            onSelect={() =>
                              addCustomName('companies', companiesQueryTrimmed, () =>
                                setCompaniesQuery(''),
                              )
                            }
                          >
                            <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                            {t('profile.experienceDetails.addCompany', {
                              name: companiesQueryTrimmed,
                            })}
                          </CommandItem>
                        ) : null}
                        {companySuggestions.map((name) => {
                          const selected = draft.companies.some(
                            (item) => item.toLowerCase() === name.toLowerCase(),
                          );
                          return (
                            <CommandItem
                              key={name}
                              value={name}
                              className={selectedOptionClass(selected)}
                              onSelect={() => {
                                toggleName('companies', name);
                                requestAnimationFrame(() => setCompaniesOpen(true));
                              }}
                            >
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                }
              >
                {companiesEmpty
                  ? t('profile.experienceDetails.companiesPlaceholder')
                  : formatEnglishList(draft.companies)}
              </SentenceToken>
              .
            </p>
            <DemonstratedExperienceEvidence profileId={profileId} active={open && !loading} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

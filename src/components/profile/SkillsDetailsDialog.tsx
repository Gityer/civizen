import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from 'lucide-react';

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
import { useLanguage } from '@/contexts/LanguageContext';
import {
  filterProfileSkills,
  formatEnglishList,
  isKnownHardSkill,
  isKnownSoftSkill,
  normalizeSkillNames,
  partitionLegacySkillNames,
  resolveSkillKind,
  type SkillKind,
} from '@/lib/profile-skills';
import { getSkillDescription } from '@/lib/profile-skill-descriptions';
import { cn } from '@/lib/utils';
import { supabaseUntyped } from '@/integrations/supabase/untyped';
import { toast } from 'sonner';
import { DemonstratedSkillEvidence } from '@/components/profile/DemonstratedSkillEvidence';
import { AUTOSAVE_MS, canHoverOpen, selectedOptionClass, type AutosaveStatus } from '@/components/profile/details-dialog-helpers';

type SkillsDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onSaved?: () => void;
};

type SkillsFormState = {
  hard: string[];
  soft: string[];
};

function serializeSkills(form: SkillsFormState): string {
  return JSON.stringify({
    hard: normalizeSkillNames(form.hard),
    soft: normalizeSkillNames(form.soft),
  });
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return normalizeSkillNames(value.filter((item): item is string => typeof item === 'string'));
}

function SkillCommandItem({
  name,
  selected,
  onToggle,
}: {
  name: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const description = getSkillDescription(name);
  return (
    <CommandItem
      value={name}
      className={cn(
        'group flex flex-col items-start gap-0.5 py-2',
        selectedOptionClass(selected),
      )}
      onSelect={onToggle}
    >
      <span className="font-medium leading-tight">{name}</span>
      {description ? (
        <span
          className={cn(
            'max-h-0 overflow-hidden text-xs leading-snug text-muted-foreground opacity-0 transition-[max-height,opacity] duration-150',
            'group-data-[selected=true]:max-h-24 group-data-[selected=true]:opacity-100',
          )}
        >
          {description}
        </span>
      ) : null}
    </CommandItem>
  );
}

type SentenceTokenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  empty: boolean;
  children: ReactNode;
  panel: ReactNode;
};

function SentenceToken({
  open,
  onOpenChange,
  ariaLabel,
  empty,
  children,
  panel,
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
            'ml-0.5 mr-0.5 inline-flex max-w-full items-center rounded-sm border-b border-dashed border-primary/55 px-0.5 text-left font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            empty && 'text-muted-foreground',
          )}
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
        >
          <span className="whitespace-normal">{children}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(40rem,calc(100vw-1.5rem))] p-0"
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

export function SkillsDetailsDialog({
  open,
  onOpenChange,
  profileId,
  onSaved,
}: SkillsDetailsDialogProps) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');
  const entryIdRef = useRef<string | null>(null);
  const formRef = useRef<SkillsFormState>({ hard: [], soft: [] });
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const [form, setForm] = useState<SkillsFormState>({ hard: [], soft: [] });
  const [entryId, setEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [skillsQuery, setSkillsQuery] = useState('');

  entryIdRef.current = entryId;
  formRef.current = form;

  const formKey = serializeSkills(form);
  const hardSuggestions = useMemo(
    () => filterProfileSkills(skillsQuery, 'hard', form.hard, form.soft),
    [skillsQuery, form.hard, form.soft],
  );
  const softSuggestions = useMemo(
    () => filterProfileSkills(skillsQuery, 'soft', form.soft, form.hard),
    [skillsQuery, form.soft, form.hard],
  );

  const skillsQueryTrimmed = skillsQuery.trim();
  const queryMatchesKnown =
    isKnownHardSkill(skillsQueryTrimmed) || isKnownSoftSkill(skillsQueryTrimmed);
  const queryAlreadySelected =
    form.hard.some((name) => name.toLowerCase() === skillsQueryTrimmed.toLowerCase()) ||
    form.soft.some((name) => name.toLowerCase() === skillsQueryTrimmed.toLowerCase());
  const showAddCustom =
    skillsQueryTrimmed.length > 0 && !queryMatchesKnown && !queryAlreadySelected;

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      setAutosaveStatus('idle');
      setSkillsOpen(false);
      setSkillsQuery('');
      return;
    }
    if (!profileId) return;

    let cancelled = false;
    const load = async () => {
      hydratedRef.current = false;
      setLoading(true);
      const { data, error } = await supabaseUntyped
        .from('profile_skills_entries')
        .select('id, hard_skill_names, soft_skill_names, skill_names')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error(t('profile.skillsDetails.loadFailed'));
        setLoading(false);
        return;
      }

      let hard = readStringArray(data?.hard_skill_names);
      let soft = readStringArray(data?.soft_skill_names);
      if (hard.length === 0 && soft.length === 0) {
        const legacy = partitionLegacySkillNames(readStringArray(data?.skill_names));
        hard = legacy.hard;
        soft = legacy.soft;
      }

      const nextForm = { hard, soft };
      setEntryId(typeof data?.id === 'string' ? data.id : null);
      setForm(nextForm);
      lastSavedRef.current = serializeSkills(nextForm);
      setLoading(false);
      hydratedRef.current = true;
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, profileId, t]);

  const persistSkills = async (options?: { force?: boolean }): Promise<boolean> => {
    const nextForm = {
      hard: normalizeSkillNames(formRef.current.hard),
      soft: normalizeSkillNames(formRef.current.soft),
    };
    const serialized = serializeSkills(nextForm);
    if (!options?.force && serialized === lastSavedRef.current) return true;

    setAutosaveStatus('saving');
    const payload = {
      profile_id: profileId,
      hard_skill_names: nextForm.hard,
      soft_skill_names: nextForm.soft,
      skill_names: [...nextForm.hard, ...nextForm.soft],
      updated_at: new Date().toISOString(),
    };
    const currentId = entryIdRef.current;
    const { data, error } = currentId
      ? await supabaseUntyped
          .from('profile_skills_entries')
          .update(payload)
          .eq('id', currentId)
          .select('id')
          .maybeSingle()
      : await supabaseUntyped
          .from('profile_skills_entries')
          .upsert(payload, { onConflict: 'profile_id' })
          .select('id')
          .maybeSingle();

    if (error) {
      console.error(error);
      setAutosaveStatus('error');
      toast.error(t('profile.skillsDetails.saveFailed'));
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
      void persistSkills();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist on formKey only
  }, [formKey, open]);

  const flushAndClose = async () => {
    await persistSkills({ force: true });
    onOpenChange(false);
  };

  const toggleSkill = (name: string, kindOverride?: SkillKind) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const kind = kindOverride ?? resolveSkillKind(trimmed);
    setForm((current) => {
      const inHard = current.hard.some((item) => item.toLowerCase() === trimmed.toLowerCase());
      const inSoft = current.soft.some((item) => item.toLowerCase() === trimmed.toLowerCase());
      if (inHard || inSoft) {
        return {
          hard: current.hard.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
          soft: current.soft.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
        };
      }
      if (kind === 'soft') {
        return {
          hard: current.hard.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
          soft: normalizeSkillNames([...current.soft, trimmed]),
        };
      }
      return {
        hard: normalizeSkillNames([...current.hard, trimmed]),
        soft: current.soft.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      };
    });
  };

  const addCustomSkill = (name: string, kind: SkillKind) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    toggleSkill(trimmed, kind);
    setSkillsQuery('');
  };

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
      ? t('profile.skillsDetails.autoSaving')
      : autosaveStatus === 'error'
        ? t('profile.skillsDetails.saveFailed')
        : t('profile.skillsDetails.autoSaved');

  const hardEmpty = form.hard.length === 0;
  const softEmpty = form.soft.length === 0;
  const bothEmpty = hardEmpty && softEmpty;

  const keepOpen = () => {
    requestAnimationFrame(() => setSkillsOpen(true));
  };

  return (
    <Card
      ref={cardRef}
      className="relative mt-3 w-full max-w-md overflow-visible border-border/80 shadow-soft"
    >
      <div className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2">
        <span className="bg-card px-1.5 font-display text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('profile.skillsDetails.title')}
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
          <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            {t('profile.skillsDetails.sentenceLead')}{' '}
            <SentenceToken
              open={skillsOpen}
              onOpenChange={setSkillsOpen}
              ariaLabel={t('profile.skillsDetails.skills')}
              empty={bothEmpty}
              panel={
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('profile.skillsDetails.skillsSearch')}
                    value={skillsQuery}
                    onValueChange={setSkillsQuery}
                  />
                  {showAddCustom ? (
                    <div className="flex flex-wrap gap-1 border-b border-border/60 px-2 py-2">
                      <CommandItem
                        value={`add-hard-${skillsQueryTrimmed}`}
                        className="rounded-md border border-border/70 px-2 py-1.5"
                        onSelect={() => addCustomSkill(skillsQueryTrimmed, 'hard')}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {t('profile.skillsDetails.addAsHard', { name: skillsQueryTrimmed })}
                      </CommandItem>
                      <CommandItem
                        value={`add-soft-${skillsQueryTrimmed}`}
                        className="rounded-md border border-border/70 px-2 py-1.5"
                        onSelect={() => addCustomSkill(skillsQueryTrimmed, 'soft')}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {t('profile.skillsDetails.addAsSoft', { name: skillsQueryTrimmed })}
                      </CommandItem>
                    </div>
                  ) : null}
                  <CommandList className="max-h-[min(22rem,55vh)]">
                    {hardSuggestions.length === 0 && softSuggestions.length === 0 ? (
                      <CommandEmpty>{t('profile.skillsDetails.skillsEmpty')}</CommandEmpty>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-border/70">
                        <CommandGroup
                          heading={t('profile.skillsDetails.hardSkills')}
                          className="min-w-0"
                        >
                          {hardSuggestions.map((name) => {
                            const selected = form.hard.some(
                              (item) => item.toLowerCase() === name.toLowerCase(),
                            );
                            return (
                              <SkillCommandItem
                                key={`hard-${name}`}
                                name={name}
                                selected={selected}
                                onToggle={() => {
                                  toggleSkill(name, 'hard');
                                  keepOpen();
                                }}
                              />
                            );
                          })}
                        </CommandGroup>
                        <CommandGroup
                          heading={t('profile.skillsDetails.softSkills')}
                          className="min-w-0"
                        >
                          {softSuggestions.map((name) => {
                            const selected = form.soft.some(
                              (item) => item.toLowerCase() === name.toLowerCase(),
                            );
                            return (
                              <SkillCommandItem
                                key={`soft-${name}`}
                                name={name}
                                selected={selected}
                                onToggle={() => {
                                  toggleSkill(name, 'soft');
                                  keepOpen();
                                }}
                              />
                            );
                          })}
                        </CommandGroup>
                      </div>
                    )}
                  </CommandList>
                </Command>
              }
            >
              <span>
                {t('profile.skillsDetails.hardLabel')}{' '}
                <span className={cn(!hardEmpty && 'text-primary')}>
                  {hardEmpty
                    ? t('profile.skillsDetails.hardPlaceholder')
                    : formatEnglishList(form.hard)}
                </span>
                {' '}
                {t('profile.skillsDetails.andSoftLabel')}{' '}
                <span className={cn(!softEmpty && 'text-primary')}>
                  {softEmpty
                    ? t('profile.skillsDetails.softPlaceholder')
                    : formatEnglishList(form.soft)}
                </span>
              </span>
            </SentenceToken>
            .
          </p>
          <DemonstratedSkillEvidence profileId={profileId} active={open && !loading} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

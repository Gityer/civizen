import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLatestRef } from '@/hooks/useLatestRef';
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
  filterTrainingOptions,
  formatTrainingList,
  isKnownTraining,
  normalizeTrainingNames,
  PROFILE_TRAINING_SEEDS,
} from '@/lib/profile-trainings';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AUTOSAVE_MS, canHoverOpen, selectedOptionClass, type AutosaveStatus } from '@/components/profile/details-dialog-helpers';
import { CyclingOptionsLabel } from '@/components/profile/CyclingOptionsLabel';

type TrainingDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onSaved?: () => void;
};

function serializeTrainings(names: string[]): string {
  return JSON.stringify(normalizeTrainingNames(names));
}

type SentenceTokenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  empty: boolean;
  children: ReactNode;
  panel: ReactNode;
  onHoverChange?: (hovered: boolean) => void;
};

function SentenceToken({
  open,
  onOpenChange,
  ariaLabel,
  empty,
  children,
  panel,
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
            onHoverChange?.(true);
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            onHoverChange?.(false);
            if (canHoverOpen()) scheduleClose();
          }}
        >
          <span className="whitespace-normal">{children}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(28rem,calc(100vw-1.5rem))] p-0"
        onMouseEnter={() => {
          onHoverChange?.(true);
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          onHoverChange?.(false);
          if (canHoverOpen()) scheduleClose();
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

export function TrainingDetailsDialog({
  open,
  onOpenChange,
  profileId,
  onSaved,
}: TrainingDetailsDialogProps) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');
  const entryIdRef = useRef<string | null>(null);
  const namesRef = useRef<string[]>([]);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const [names, setNames] = useState<string[]>([]);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [trainingsOpen, setTrainingsOpen] = useState(false);
  const [trainingsHovered, setTrainingsHovered] = useState(false);
  const [trainingsQuery, setTrainingsQuery] = useState('');

  entryIdRef.current = entryId;
  namesRef.current = names;

  const formKey = serializeTrainings(names);
  const suggestions = useMemo(
    () => filterTrainingOptions(trainingsQuery, names),
    [trainingsQuery, names],
  );

  const trainingsQueryTrimmed = trainingsQuery.trim();
  const showAddCustom =
    trainingsQueryTrimmed.length > 0 &&
    !isKnownTraining(trainingsQueryTrimmed) &&
    !names.some((name) => name.toLowerCase() === trainingsQueryTrimmed.toLowerCase());

  const pauseCycle = trainingsOpen || trainingsHovered;

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      setAutosaveStatus('idle');
      setTrainingsOpen(false);
      setTrainingsQuery('');
      setTrainingsHovered(false);
      return;
    }
    if (!profileId) return;

    let cancelled = false;
    const load = async () => {
      hydratedRef.current = false;
      setLoading(true);
      const { data, error } = await supabase
        .from('profile_training_entries')
        .select('id, training_names')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error(t('profile.trainingDetails.loadFailed'));
        setLoading(false);
        return;
      }

      const nextNames = normalizeTrainingNames(data?.training_names);
      setEntryId(typeof data?.id === 'string' ? data.id : null);
      setNames(nextNames);
      lastSavedRef.current = serializeTrainings(nextNames);
      setLoading(false);
      hydratedRef.current = true;
      setAutosaveStatus('saved');
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, profileId, t]);

  const persistTrainings = async (options?: { force?: boolean }) => {
    if (!profileId || !hydratedRef.current) return false;
    const nextNames = normalizeTrainingNames(namesRef.current);
    const serialized = serializeTrainings(nextNames);
    if (!options?.force && serialized === lastSavedRef.current) return true;

    setAutosaveStatus('saving');
    const payload = {
      profile_id: profileId,
      training_names: nextNames,
      updated_at: new Date().toISOString(),
    };

    const existingId = entryIdRef.current;
    const { data, error } = existingId
      ? await supabase
          .from('profile_training_entries')
          .update(payload)
          .eq('id', existingId)
          .select('id')
          .maybeSingle()
      : await supabase
          .from('profile_training_entries')
          .upsert(payload, { onConflict: 'profile_id' })
          .select('id')
          .maybeSingle();

    if (error) {
      setAutosaveStatus('error');
      toast.error(t('profile.trainingDetails.saveFailed'));
      return false;
    }

    if (typeof data?.id === 'string') {
      setEntryId(data.id);
      entryIdRef.current = data.id;
    }
    lastSavedRef.current = serialized;
    setAutosaveStatus('saved');
    onSavedRef.current?.();
    return true;
  };

  const persistTrainingsRef = useLatestRef(persistTrainings);

  useEffect(() => {
    if (!open || loading || !hydratedRef.current) return;
    if (formKey === lastSavedRef.current) return;

    const timer = window.setTimeout(() => {
      void persistTrainingsRef.current();
    }, AUTOSAVE_MS);

    return () => window.clearTimeout(timer);
  }, [formKey, loading, open, persistTrainingsRef, profileId]);

  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      void persistTrainingsRef.current({ force: namesRef.current.length > 0 });
    }
    wasOpenRef.current = open;
  }, [open, persistTrainingsRef]);

  const flushAndClose = async () => {
    await persistTrainings({ force: namesRef.current.length > 0 });
    onOpenChange(false);
  };

  const toggleTraining = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setNames((current) => {
      const exists = current.some((item) => item.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      }
      return normalizeTrainingNames([...current, trimmed]);
    });
  };

  const addCustomTraining = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    toggleTraining(name);
    setTrainingsQuery('');
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
      ? t('profile.trainingDetails.autoSaving')
      : autosaveStatus === 'error'
        ? t('profile.trainingDetails.saveFailed')
        : t('profile.trainingDetails.autoSaved');

  const empty = names.length === 0;

  return (
    <Card
      ref={cardRef}
      id="learning-trainings-panel"
      className="relative mt-3 w-full max-w-md overflow-visible border-border/80 shadow-soft"
    >
      <div className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2">
        <span className="bg-card px-1.5 font-display text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('profile.trainingDetails.title')}
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
          <p className="text-sm leading-relaxed text-foreground">
            {t('profile.trainingDetails.sentenceLead')}{' '}
            <SentenceToken
              open={trainingsOpen}
              onOpenChange={setTrainingsOpen}
              onHoverChange={setTrainingsHovered}
              ariaLabel={t('profile.trainingDetails.trainings')}
              empty={empty}
              panel={
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('profile.trainingDetails.trainingsSearch')}
                    value={trainingsQuery}
                    onValueChange={setTrainingsQuery}
                  />
                  <CommandList className="max-h-[min(22rem,55vh)]">
                    <CommandEmpty>{t('profile.trainingDetails.trainingsEmpty')}</CommandEmpty>
                    <CommandGroup>
                      {showAddCustom ? (
                        <CommandItem
                          value={`add-training-${trainingsQueryTrimmed}`}
                          onSelect={() => addCustomTraining(trainingsQueryTrimmed)}
                        >
                          <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                          {t('profile.trainingDetails.addTraining', {
                            name: trainingsQueryTrimmed,
                          })}
                        </CommandItem>
                      ) : null}
                      {suggestions.map((name) => {
                        const selected = names.some(
                          (item) => item.toLowerCase() === name.toLowerCase(),
                        );
                        return (
                          <CommandItem
                            key={name}
                            value={name}
                            className={selectedOptionClass(selected)}
                            onSelect={() => {
                              toggleTraining(name);
                              requestAnimationFrame(() => setTrainingsOpen(true));
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
              {empty ? (
                <CyclingOptionsLabel
                  options={PROFILE_TRAINING_SEEDS}
                  active
                  paused={pauseCycle}
                  fallback={t('profile.trainingDetails.trainingsPlaceholder')}
                />
              ) : (
                formatTrainingList(names)
              )}
            </SentenceToken>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

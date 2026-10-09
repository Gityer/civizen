import { useEffect, useMemo, useRef, useState } from 'react';

import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import { isReviewedLanguage } from '@/lib/i18n/curated';
import {
  getLanguageFlagCountryCode,
  loadLanguageOptions,
  type LanguageCode,
  type LanguageOption,
} from '@/lib/i18n.runtime';
import { cn } from '@/lib/utils';

function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function PublicLanguageSelect() {
  const { language, setLanguage, t } = useLanguage();
  const [languageOptions, setLanguageOptions] = useState<readonly LanguageOption[]>([]);
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      const options = await loadLanguageOptions();
      if (active) setLanguageOptions(options);
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const selectedOption = useMemo(
    () => languageOptions.find((option) => option.code === language),
    [language, languageOptions],
  );
  const selectedFlagCountry = getLanguageFlagCountryCode(language);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  };

  if (languageOptions.length === 0) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t('auth.language')}: ${selectedOption?.label ?? language}`}
          aria-expanded={open}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-card/80 outline-none ring-offset-background transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
        >
          <RoundCountryFlag countryCode={selectedFlagCountry} locale={language} size="sm" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[min(18rem,calc(100vw-2rem))] p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
      >
        <p className="px-2.5 pt-1.5 text-[11px] leading-snug text-muted-foreground">{t('auth.languageAutomaticNote')}</p>
        <div className="max-h-72 overflow-y-auto overscroll-contain py-0.5" role="listbox" aria-label={t('auth.language')}>
          {languageOptions.map((option) => {
            const selected = option.code === language;
            return (
              <button
                key={option.code}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                )}
                onClick={() => {
                  void setLanguage(option.code as LanguageCode);
                  setOpen(false);
                }}
              >
                <RoundCountryFlag
                  countryCode={getLanguageFlagCountryCode(option.code)}
                  locale={language}
                  size="xs"
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {!isReviewedLanguage(option.code) ? <span className="shrink-0 text-[10px] opacity-70">{t('auth.languageAutomaticTag')}</span> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

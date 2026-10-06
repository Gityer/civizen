import { useMemo, useState } from 'react';
import { Globe2, Check } from 'lucide-react';
import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCountryName } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { GLOBAL_COUNTRY_FILTER, LOCATION_MENU_LIMIT } from '@/pages/governance/civic-voting-hub-shared';

export function ScopeTextMenu({
  label,
  emptyLabel,
  allLabel,
  searchPlaceholder,
  emptySearchLabel,
  value,
  options,
  loading = false,
  onChange,
  formatOption,
  formatMenuOption,
}: {
  label: string;
  emptyLabel: string;
  allLabel: string;
  searchPlaceholder: string;
  emptySearchLabel: string;
  value: string | null;
  options: string[];
  loading?: boolean;
  onChange: (value: string | null) => void;
  formatOption: (value: string) => string;
  formatMenuOption?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const display = value
    ? formatOption(value)
    : loading
      ? label
      : options.length === 0
        ? emptyLabel
        : label;
  const menuLabel = formatMenuOption ?? formatOption;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    const matched = normalizedQuery
      ? options.filter((option) => {
          const short = formatOption(option).toLowerCase();
          const full = menuLabel(option).toLowerCase();
          return (
            option.toLowerCase().includes(normalizedQuery) ||
            short.includes(normalizedQuery) ||
            full.includes(normalizedQuery)
          );
        })
      : options;
    return matched.slice(0, LOCATION_MENU_LIMIT);
  }, [options, normalizedQuery, formatOption, menuLabel]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'max-w-30 truncate border-0 bg-transparent p-0 text-left text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline',
            value && 'text-foreground',
          )}
          aria-label={label}
          disabled={!loading && options.length === 0 && !value}
          onMouseEnter={() => {
            if (options.length > 0 || loading) setOpen(true);
          }}
        >
          {display}
        </button>
      </PopoverTrigger>
      {options.length > 0 || loading ? (
        <PopoverContent
          align="end"
          className="w-64 p-0"
          onMouseLeave={() => setOpen(false)}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>{loading ? '…' : emptySearchLabel}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  {allLabel}
                </CommandItem>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        value === option ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {menuLabel(option)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

export function CountryFilterMenu({
  label,
  globalLabel,
  searchPlaceholder,
  emptySearchLabel,
  value,
  options,
  language,
  onChange,
}: {
  label: string;
  globalLabel: string;
  searchPlaceholder: string;
  emptySearchLabel: string;
  value: string | null;
  options: string[];
  language: string;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const isGlobal = value === GLOBAL_COUNTRY_FILTER;
  const countryName = isGlobal
    ? globalLabel
    : value
      ? getCountryName(value, language)
      : label;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    const matched = normalizedQuery
      ? options.filter((code) => {
          const name = getCountryName(code, language).toLowerCase();
          return code.toLowerCase().includes(normalizedQuery) || name.includes(normalizedQuery);
        })
      : options;
    return matched.slice(0, LOCATION_MENU_LIMIT);
  }, [options, normalizedQuery, language]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          aria-label={countryName || label}
          title={countryName || label}
          onMouseEnter={() => setOpen(true)}
        >
          {isGlobal ? (
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
              <Globe2 className="h-2.5 w-2.5" aria-hidden />
            </span>
          ) : value ? (
            <RoundCountryFlag countryCode={value} locale={language} size="xs" />
          ) : (
            <Globe2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" onMouseLeave={() => setOpen(false)}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptySearchLabel}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__global__"
                onSelect={() => {
                  onChange(GLOBAL_COUNTRY_FILTER);
                  setOpen(false);
                  setQuery('');
                }}
                className="gap-2"
              >
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Globe2 className="h-2.5 w-2.5" aria-hidden />
                </span>
                <span className="flex-1">{globalLabel}</span>
                <Check
                  className={cn('h-3.5 w-3.5', isGlobal ? 'opacity-100' : 'opacity-0')}
                />
              </CommandItem>
              {filteredOptions.map((code) => (
                <CommandItem
                  key={code}
                  value={code}
                  onSelect={() => {
                    onChange(code);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="gap-2"
                >
                  <RoundCountryFlag countryCode={code} locale={language} size="xs" />
                  <span className="flex-1">{getCountryName(code, language)}</span>
                  <Check
                    className={cn(
                      'h-3.5 w-3.5',
                      value === code ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

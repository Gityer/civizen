import { Link } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { formatEnglishOrList, MARKET_JOB_DAYS } from '@/lib/market-job-types';
import { marketJobLanguageFlagCountry, marketJobLanguageLabel } from '@/lib/market-job-languages';
import { agreementsCreatePath } from '@/lib/agreements-model';
import { cn } from '@/lib/utils';
import type { useMarketJobsInterestForm } from '@/components/market/useMarketJobsInterestForm';

type MarketJobsInterestFormModel = ReturnType<typeof useMarketJobsInterestForm>;

export function MarketJobsContact({ model }: { model: MarketJobsInterestFormModel }) {
  const {
    mode, jobTypes, countryCode, payAmount, payPeriod, engagement, fullName, setFullName,
    companyName, setCompanyName, phoneCountryCode, setPhoneCountryCode, phoneNumber, setPhoneNumber,
    age, setAge, detailsOpen, setDetailsOpen, days, hoursFrom, setHoursFrom, hoursTo, setHoursTo,
    languages, languageOpen, setLanguageOpen, languageQuery, setLanguageQuery, notes, setNotes,
    submitting, t, language, profile, showContact, showMoreDetails, languageOptionsForJobs,
    showNameField, showCompanyField, showPhoneField, showAgeField, showIdentityFields, locationText,
    toggleDay, toggleLanguage, onSubmit,
  } = model;
  return (
    <>
    {showContact ? (
      <div className="space-y-3" data-testid="market-jobs-contact">
        {showIdentityFields ? (
          <div className="flex flex-wrap items-start gap-x-3 gap-y-3 text-sm" data-testid="market-jobs-identity-fields">
            {showNameField ? (
              <OutlinedField
                className="min-w-40 flex-1"
                label={t('market.jobsForm.fullNameLabel')}
                htmlFor="market-jobs-full-name"
                endAdornment={
                  countryCode ? (
                    <RoundCountryFlag countryCode={countryCode} locale={language} size="sm" />
                  ) : null
                }
              >
                <Input
                  id="market-jobs-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                />
              </OutlinedField>
            ) : null}
            {showCompanyField ? (
              <OutlinedField
                className="min-w-40 flex-1"
                label={t('market.jobsForm.companyLabel')}
                htmlFor="market-jobs-company"
              >
                <Input
                  id="market-jobs-company"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  autoComplete="organization"
                />
              </OutlinedField>
            ) : null}
            {showPhoneField ? (
              <OutlinedField
                className="min-w-44 flex-1"
                label={t('market.jobsForm.phoneLabel')}
                htmlFor="market-jobs-phone"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={phoneCountryCode}
                    onChange={(event) => setPhoneCountryCode(event.target.value.toUpperCase())}
                    className="w-14"
                    aria-label={t('market.jobsForm.phoneCountryLabel')}
                    autoComplete="tel-country-code"
                  />
                  <Input
                    id="market-jobs-phone"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    autoComplete="tel-national"
                  />
                </div>
              </OutlinedField>
            ) : null}
            {showAgeField ? (
              <OutlinedField
                className="w-24"
                label={t('market.jobsForm.ageLabel')}
                htmlFor="market-jobs-age"
              >
                <Input
                  id="market-jobs-age"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  inputMode="numeric"
                />
              </OutlinedField>
            ) : null}
          </div>
        ) : null}

        {showMoreDetails ? (
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => setDetailsOpen((current) => !current)}
            data-testid="market-jobs-more-toggle"
          >
            {detailsOpen ? t('common.less') : t('common.more')}
          </button>
        ) : null}

        {showMoreDetails && detailsOpen ? (
          <div className="space-y-4" data-testid="market-jobs-details">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('market.jobsForm.daysHeading')}
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('market.jobsForm.daysHeading')}>
                {MARKET_JOB_DAYS.map((day) => {
                  const selected = days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-label={day}
                      aria-pressed={selected}
                      className={cn(
                        'h-8 w-8 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                          : 'border border-border text-muted-foreground hover:bg-muted/60',
                      )}
                      onClick={() => toggleDay(day)}
                    >
                      {day.slice(0, 1)}
                    </button>
                  );
                })}
              </div>
            </div>
            <OutlinedField label={t('market.jobsForm.hoursLabel')} htmlFor="market-jobs-hours-from">
              <div className="flex items-center gap-2">
                <Input
                  id="market-jobs-hours-from"
                  type="time"
                  value={hoursFrom}
                  onChange={(event) => setHoursFrom(event.target.value)}
                  aria-label={t('market.jobsForm.hoursFromLabel')}
                />
                <span className="text-muted-foreground" aria-hidden>
                  –
                </span>
                <Input
                  id="market-jobs-hours-to"
                  type="time"
                  value={hoursTo}
                  onChange={(event) => setHoursTo(event.target.value)}
                  aria-label={t('market.jobsForm.hoursToLabel')}
                />
              </div>
            </OutlinedField>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('market.jobsForm.languagesHeading')}
              </p>
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label={t('market.jobsForm.languagesHeading')}
              >
                {languages.map((code) => {
                  const flagCountry = marketJobLanguageFlagCountry(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-label={marketJobLanguageLabel(code, language)}
                      aria-pressed
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => toggleLanguage(code)}
                    >
                      {flagCountry ? (
                        <RoundCountryFlag
                          countryCode={flagCountry}
                          locale={language}
                          size="md"
                          className="h-8 w-8"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold uppercase">{code.slice(0, 2)}</span>
                      )}
                    </button>
                  );
                })}
                <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('market.jobsForm.addLanguage')}
                      data-testid="market-jobs-add-language"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-0">
                    <Command>
                      <CommandInput
                        value={languageQuery}
                        onValueChange={setLanguageQuery}
                        placeholder={t('market.jobsForm.languageSearch')}
                      />
                      <CommandList>
                        <CommandEmpty>{t('market.jobsForm.languageEmpty')}</CommandEmpty>
                        <CommandGroup>
                          {languageOptionsForJobs.map((option) => {
                            const selected = languages.includes(option.code);
                            return (
                              <CommandItem
                                key={option.code}
                                value={`${option.label} ${option.code}`}
                                onSelect={() => {
                                  toggleLanguage(option.code);
                                  setLanguageQuery('');
                                }}
                              >
                                <Check
                                  className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')}
                                  aria-hidden
                                />
                                <span className="inline-flex items-center gap-2">
                                  {marketJobLanguageFlagCountry(option.code) ? (
                                    <RoundCountryFlag
                                      countryCode={marketJobLanguageFlagCountry(option.code)}
                                      locale={language}
                                      size="xs"
                                    />
                                  ) : null}
                                  {option.label}
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <OutlinedField label={t('market.jobsForm.notesLabel')} htmlFor="market-jobs-notes">
              <Textarea
                id="market-jobs-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="resize-y"
              />
            </OutlinedField>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            type="button"
            className="min-w-48 rounded-full"
            onClick={() => void onSubmit()}
            disabled={submitting}
            data-testid="market-jobs-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('market.jobsForm.submitting')}
              </>
            ) : (
              t('market.jobsForm.submit')
            )}
          </Button>
          {profile?.id ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link
                data-testid="market-jobs-employment-agreement"
                to={agreementsCreatePath({
                  source: 'job',
                  agreementType: 'employment',
                  relatedTitle: formatEnglishOrList(jobTypes),
                  position: formatEnglishOrList(jobTypes),
                  workLocation: locationText || undefined,
                  compensation: payAmount.trim() || undefined,
                  payFrequency: payAmount.trim() ? payPeriod : undefined,
                  employmentStatus: engagement,
                  employmentSelfRole: mode === 'employer' ? 'employer' : 'employee',
                })}
              >
                {t('agreements.types.employment')}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    ) : null}

    </>
  );
}

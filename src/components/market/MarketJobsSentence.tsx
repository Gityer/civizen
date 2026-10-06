import { Check } from 'lucide-react';
import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { formatEnglishOrList, MARKET_JOB_ARRANGEMENTS, MARKET_JOB_LEVELS, MARKET_JOB_PAY_PERIODS, MARKET_JOB_STARTS, MARKET_JOB_TERMS, MARKET_JOB_TYPE_SEEDS } from '@/lib/market-job-types';
import { cn } from '@/lib/utils';
import { ChoicePanel, CyclingOptionsLabel, SentenceToken } from '@/components/market/market-jobs-form-shared-parts';
import type { useMarketJobsInterestForm } from '@/components/market/useMarketJobsInterestForm';

type MarketJobsInterestFormModel = ReturnType<typeof useMarketJobsInterestForm>;

export function MarketJobsSentence({ model }: { model: MarketJobsInterestFormModel }) {
  const {
    mode, jobTypes, jobQuery, setJobQuery, jobOpen, setJobOpen, setJobHovered, setCity, regionCode,
    setRegionCode, countryCode, setCountryCode, locationOpen, setLocationOpen, locationQuery,
    setLocationQuery, payAmount, setPayAmount, payPeriod, setPayPeriod, payOpen, setPayOpen,
    payPeriodOpen, setPayPeriodOpen, setPayTouched, engagement, setEngagement, engagementOpen,
    setEngagementOpen, level, setLevel, levelOpen, setLevelOpen, arrangement, setArrangement,
    arrangementOpen, setArrangementOpen, startWhen, setStartWhen, startOpen, setStartOpen, t,
    language, jobOptions, selectedJobSet, jobCycleIndex, locationText, locationEmpty, payDisplay,
    toggleJobType, markLocationTouched, filteredCountries, filteredRegions, filteredCities,
  } = model;
  return (
    <>
    <p className="text-base leading-relaxed text-foreground sm:text-lg" data-testid="market-jobs-sentence">
      {mode === 'seeker' ? t('market.jobsForm.seekerLead') : t('market.jobsForm.employerLead')}{' '}
      <SentenceToken
        open={engagementOpen}
        onOpenChange={setEngagementOpen}
        ariaLabel={t('market.jobsForm.engagementLabel')}
        empty={false}
        emphasis="secondary"
        panel={<ChoicePanel options={MARKET_JOB_TERMS} value={engagement} onChange={(next) => { setEngagement(next); setEngagementOpen(false); }} />}
      >
        {engagement}
      </SentenceToken>{' '}
      <SentenceToken
        open={levelOpen}
        onOpenChange={setLevelOpen}
        ariaLabel={t('market.jobsForm.levelLabel')}
        empty={false}
        emphasis="secondary"
        panel={<ChoicePanel options={MARKET_JOB_LEVELS} value={level} onChange={(next) => { setLevel(next); setLevelOpen(false); }} />}
      >
        {level}
      </SentenceToken>{' '}
      <SentenceToken
        open={jobOpen}
        onOpenChange={setJobOpen}
        onHoverChange={setJobHovered}
        ariaLabel={t('market.jobsForm.jobTypeLabel')}
        empty={jobTypes.length === 0}
        dimWhenEmpty={false}
        triggerClassName="border-primary/70 font-semibold text-primary hover:bg-primary/15"
        panel={
          <Command>
            <CommandInput
              value={jobQuery}
              onValueChange={setJobQuery}
              placeholder={t('market.jobsForm.jobTypeSearch')}
            />
            <CommandList>
              <CommandEmpty>{t('market.jobsForm.jobTypeEmpty')}</CommandEmpty>
              <CommandGroup>
                {jobOptions.map((job) => {
                  const selected = selectedJobSet.has(job.toLowerCase());
                  return (
                    <CommandItem
                      key={job}
                      value={job}
                      onSelect={() => {
                        toggleJobType(job);
                        requestAnimationFrame(() => setJobOpen(true));
                      }}
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')}
                        aria-hidden
                      />
                      {job}
                    </CommandItem>
                  );
                })}
                {jobQuery.trim() &&
                !jobTypes.some((item) => item.toLowerCase() === jobQuery.trim().toLowerCase()) &&
                !MARKET_JOB_TYPE_SEEDS.some(
                  (seed) => seed.toLowerCase() === jobQuery.trim().toLowerCase(),
                ) ? (
                  <CommandItem
                    value={`add-${jobQuery.trim()}`}
                    onSelect={() => {
                      toggleJobType(jobQuery.trim());
                      requestAnimationFrame(() => setJobOpen(true));
                    }}
                  >
                    {t('market.jobsForm.addCustom', { label: jobQuery.trim() })}
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        }
      >
        {jobTypes.length > 0 ? (
          <span className="font-semibold text-primary">{formatEnglishOrList(jobTypes)}</span>
        ) : (
          <CyclingOptionsLabel
            options={MARKET_JOB_TYPE_SEEDS}
            index={jobCycleIndex}
            active
            fallback={t('market.jobsForm.jobTypePlaceholder')}
          />
        )}
      </SentenceToken>
      {mode === 'seeker' ? (
        <>
          {' '}
          <SentenceToken
            open={arrangementOpen}
            onOpenChange={setArrangementOpen}
            ariaLabel={t('market.jobsForm.arrangementLabel')}
            empty={false}
            emphasis="secondary"
            panel={<ChoicePanel options={MARKET_JOB_ARRANGEMENTS} value={arrangement} onChange={(next) => { setArrangement(next); setArrangementOpen(false); }} />}
          >
            {arrangement}
          </SentenceToken>{' '}
          {t('market.jobsForm.seekerMid')}{' '}
        </>
      ) : (
        <>
          {' '}
          {t('market.jobsForm.employerMid')}{' '}
        </>
      )}
      <SentenceToken
        open={locationOpen}
        onOpenChange={setLocationOpen}
        ariaLabel={t('market.jobsForm.locationLabel')}
        empty={locationEmpty}
        contentClassName="w-[min(22rem,calc(100vw-2rem))]"
        panel={
          <Command>
            <CommandInput
              value={locationQuery}
              onValueChange={setLocationQuery}
              placeholder={t('market.jobsForm.locationSearch')}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>{t('market.jobsForm.locationEmpty')}</CommandEmpty>
              <CommandGroup heading={t('market.jobsForm.countryHeading')}>
                {filteredCountries.slice(0, 40).map((option) => (
                  <CommandItem
                    key={option.code}
                    value={`${option.label} ${option.code}`}
                    onSelect={() => {
                      markLocationTouched();
                      setCountryCode(option.code);
                      setRegionCode('');
                      setCity('');
                      setLocationQuery('');
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <RoundCountryFlag countryCode={option.code} locale={language} size="xs" />
                      {option.label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {countryCode ? (
                <CommandGroup heading={t('market.jobsForm.regionHeading')}>
                  {filteredRegions.slice(0, 40).map((region) => (
                    <CommandItem
                      key={region.code}
                      value={`${region.name} ${region.code}`}
                      onSelect={() => {
                        markLocationTouched();
                        setRegionCode(region.code);
                        setCity('');
                        setLocationQuery('');
                      }}
                    >
                      {region.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {countryCode && regionCode ? (
                <CommandGroup heading={t('market.jobsForm.cityHeading')}>
                  {filteredCities.slice(0, 60).map((name) => (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => {
                        markLocationTouched();
                        setCity(name);
                        setLocationQuery('');
                        setLocationOpen(false);
                      }}
                    >
                      {name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        }
      >
        {locationEmpty ? (
          t('market.jobsForm.locationPlaceholder')
        ) : (
          <>
            {locationText || t('market.jobsForm.locationPlaceholder')}
            {countryCode ? (
              <RoundCountryFlag
                countryCode={countryCode}
                locale={language}
                size="xs"
                className="block"
              />
            ) : null}
          </>
        )}
      </SentenceToken>
      {', '}
      {t('market.jobsForm.startingLead')}{' '}
      <SentenceToken
        open={startOpen}
        onOpenChange={setStartOpen}
        ariaLabel={t('market.jobsForm.startLabel')}
        empty={false}
        emphasis="secondary"
        panel={<ChoicePanel options={MARKET_JOB_STARTS} value={startWhen} onChange={(next) => { setStartWhen(next); setStartOpen(false); }} />}
      >
        {startWhen === 'Immediately' ? t('market.jobsForm.startImmediately') : startWhen}
      </SentenceToken>
      {', '}
      {t('market.jobsForm.employerPayLead')}{' '}
      <SentenceToken
        open={payOpen}
        onOpenChange={setPayOpen}
        ariaLabel={t('market.jobsForm.payLabel')}
        empty={!payAmount}
        panel={
          <div className="space-y-2 p-3">
            <Input
              value={payAmount}
              onChange={(event) => {
                setPayTouched(true);
                setPayAmount(event.target.value);
              }}
              placeholder={t('market.jobsForm.payAmountPlaceholder')}
              inputMode="decimal"
            />
          </div>
        }
      >
        {payDisplay}
      </SentenceToken>{' '}
      <SentenceToken
        open={payPeriodOpen}
        onOpenChange={setPayPeriodOpen}
        ariaLabel={t('market.jobsForm.payPeriodLabel')}
        empty={false}
        emphasis="secondary"
        panel={<ChoicePanel options={MARKET_JOB_PAY_PERIODS} value={payPeriod} onChange={(next) => { setPayTouched(true); setPayPeriod(next); setPayPeriodOpen(false); }} />}
      >
        {payPeriod}
      </SentenceToken>
      .
    </p>

    </>
  );
}

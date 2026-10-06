import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryOptions } from '@/lib/countries';
import { detectVisitorLocation } from '@/lib/device-location';
import { listGeoCities, listGeoRegions, type GeoRegionOption } from '@/lib/geo-locations';
import { formatMarketJobPayAmount, guideMonthlyPayUsd, localizeGuideMonthlyPay } from '@/lib/market-job-guide-pay';
import { ageFromDateOfBirth, filterMarketJobTypeOptions, MARKET_JOB_TYPE_SEEDS, type MarketJobMode } from '@/lib/market-job-types';
import { defaultMarketJobLanguages, filterMarketJobLanguageOptions } from '@/lib/market-job-languages';
import { parseWorkFitJobsQuery } from '@/lib/market-jobs-work-fit-prefill';
import { submitMarketJobInterest } from '@/lib/submit-market-job-interest';
import { isBusinessUsername } from '@/lib/users-admin';
import { trimOrEmpty, useCyclingIndex } from '@/components/market/market-jobs-form-shared';

export function useMarketJobsInterestForm() {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const workFitPrefill = parseWorkFitJobsQuery(searchParams.toString());
  const isBusiness = isBusinessUsername(profile?.username);
  const isLoggedIn = Boolean(user?.id);
  const showModeTabs = !authLoading && !isLoggedIn;

  const [mode, setMode] = useState<MarketJobMode>(() => (isBusiness ? 'employer' : 'seeker'));
  const [jobTypes, setJobTypes] = useState<string[]>(() => workFitPrefill.jobTypes);
  const [jobQuery, setJobQuery] = useState('');
  const [jobOpen, setJobOpen] = useState(false);
  const [jobHovered, setJobHovered] = useState(false);

  const [city, setCity] = useState(() => trimOrEmpty(profile?.city));
  const [regionCode, setRegionCode] = useState(() => trimOrEmpty(profile?.region_code));
  const [countryCode, setCountryCode] = useState(() => trimOrEmpty(profile?.country_code));
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [regions, setRegions] = useState<GeoRegionOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [payAmount, setPayAmount] = useState('');
  const [payPeriod, setPayPeriod] = useState('Monthly pay');
  const [payOpen, setPayOpen] = useState(false);
  const [payPeriodOpen, setPayPeriodOpen] = useState(false);
  const [payTouched, setPayTouched] = useState(false);
  const locationTouchedRef = useRef(false);

  const [engagement, setEngagement] = useState<string>('Full-time');
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [level, setLevel] = useState<string>('Mid-level');
  const [levelOpen, setLevelOpen] = useState(false);
  const [arrangement, setArrangement] = useState<string>('job');
  const [arrangementOpen, setArrangementOpen] = useState(false);
  const [startWhen, setStartWhen] = useState<string>('Immediately');
  const [startOpen, setStartOpen] = useState(false);

  const [fullName, setFullName] = useState(() => trimOrEmpty(profile?.full_name));
  const [companyName, setCompanyName] = useState(() =>
    isBusiness ? trimOrEmpty(profile?.full_name) : '',
  );
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    () => trimOrEmpty(profile?.phone_country_code) || trimOrEmpty(profile?.country_code) || 'US',
  );
  const [phoneNumber, setPhoneNumber] = useState(() => trimOrEmpty(profile?.phone_number));
  const [age, setAge] = useState(() => ageFromDateOfBirth(profile?.date_of_birth));

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [days, setDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [hoursFrom, setHoursFrom] = useState('09:00');
  const [hoursTo, setHoursTo] = useState('18:00');
  const [languages, setLanguages] = useState<string[]>(() =>
    defaultMarketJobLanguages(language, trimOrEmpty(profile?.country_code)),
  );
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState('');
  const languagesTouchedRef = useRef(false);
  const [notes, setNotes] = useState(() => workFitPrefill.notes);
  const [submitting, setSubmitting] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);

  const showContact = jobTypes.length > 0;
  const showMoreDetails = isLoggedIn && showContact;
  const languageOptionsForJobs = useMemo(
    () => filterMarketJobLanguageOptions(languageQuery, languages, language),
    [language, languageQuery, languages],
  );
  const showNameField = !trimOrEmpty(fullName);
  const showCompanyField = mode === 'employer' && !trimOrEmpty(companyName);
  const showPhoneField = !trimOrEmpty(phoneNumber);
  const showAgeField = !trimOrEmpty(age);
  const showIdentityFields = showNameField || showCompanyField || showPhoneField || showAgeField;
  const countryOptions = useMemo(() => getCountryOptions(language), [language]);
  const jobOptions = useMemo(() => filterMarketJobTypeOptions(jobQuery, jobTypes), [jobQuery, jobTypes]);
  const selectedJobSet = useMemo(
    () => new Set(jobTypes.map((item) => item.toLowerCase())),
    [jobTypes],
  );
  const pauseJobCycle = jobOpen || jobHovered;
  const jobCycleIndex = useCyclingIndex(
    MARKET_JOB_TYPE_SEEDS.length,
    jobTypes.length === 0,
    pauseJobCycle,
  );
  const displayedJobType =
    jobTypes[jobTypes.length - 1] ??
    MARKET_JOB_TYPE_SEEDS[((jobCycleIndex % MARKET_JOB_TYPE_SEEDS.length) + MARKET_JOB_TYPE_SEEDS.length) % MARKET_JOB_TYPE_SEEDS.length];

  useEffect(() => {
    setMode(isBusiness ? 'employer' : 'seeker');
  }, [isBusiness]);

  useEffect(() => {
    const nextName = trimOrEmpty(profile?.full_name);
    const nextPhone = trimOrEmpty(profile?.phone_number);
    const nextPhoneCountry =
      trimOrEmpty(profile?.phone_country_code) || trimOrEmpty(profile?.country_code);
    const nextAge = ageFromDateOfBirth(profile?.date_of_birth);
    const nextCity = trimOrEmpty(profile?.city);
    const nextRegion = trimOrEmpty(profile?.region_code);
    const nextCountry = trimOrEmpty(profile?.country_code);

    if (nextName) setFullName((current) => trimOrEmpty(current) || nextName);
    if (nextPhone) setPhoneNumber((current) => trimOrEmpty(current) || nextPhone);
    if (nextPhoneCountry) {
      setPhoneCountryCode((current) => trimOrEmpty(current) || nextPhoneCountry);
    }
    if (nextAge) setAge((current) => trimOrEmpty(current) || nextAge);
    if (nextCity) setCity((current) => trimOrEmpty(current) || nextCity);
    if (nextRegion) setRegionCode((current) => trimOrEmpty(current) || nextRegion);
    if (nextCountry) setCountryCode((current) => trimOrEmpty(current) || nextCountry);
    if (nextCity || nextRegion || nextCountry) {
      locationTouchedRef.current = true;
    }
    if (isBusinessUsername(profile?.username) && nextName) {
      setCompanyName((current) => trimOrEmpty(current) || nextName);
    }
  }, [
    profile?.full_name,
    profile?.phone_number,
    profile?.phone_country_code,
    profile?.date_of_birth,
    profile?.city,
    profile?.region_code,
    profile?.country_code,
    profile?.username,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!countryCode) {
      setRegions([]);
      setCities([]);
      return;
    }
    void listGeoRegions(countryCode).then((next) => {
      if (!cancelled) setRegions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  useEffect(() => {
    let cancelled = false;
    if (!countryCode || !regionCode) {
      setCities([]);
      return;
    }
    void listGeoCities(countryCode, regionCode).then((next) => {
      if (!cancelled) setCities(next);
    });
    return () => {
      cancelled = true;
    };
  }, [countryCode, regionCode]);

  useEffect(() => {
    const hasProfilePlace = Boolean(
      trimOrEmpty(profile?.city) || trimOrEmpty(profile?.region_code) || trimOrEmpty(profile?.country_code),
    );
    if (hasProfilePlace || locationTouchedRef.current) return;
    if (trimOrEmpty(city) || trimOrEmpty(countryCode)) return;

    let cancelled = false;
    void detectVisitorLocation()
      .then((detected) => {
        if (cancelled || locationTouchedRef.current) return;
        if (detected.city) setCity(detected.city);
        if (detected.regionCode) setRegionCode(detected.regionCode);
        if (detected.countryCode) {
          setCountryCode(detected.countryCode);
          setPhoneCountryCode((current) => trimOrEmpty(current) || detected.countryCode || 'US');
        }
      })
      .catch(() => {
        /* Keep the placeholder if IP lookup is unavailable. */
      });
    return () => {
      cancelled = true;
    };
  }, [city, countryCode, profile?.city, profile?.country_code, profile?.region_code]);

  useEffect(() => {
    if (payTouched || !displayedJobType) return;
    const localized = localizeGuideMonthlyPay(guideMonthlyPayUsd(displayedJobType), countryCode || 'US');
    setPayAmount(String(localized.value));
    setPayPeriod('Monthly pay');
  }, [countryCode, displayedJobType, payTouched]);

  useEffect(() => {
    if (languagesTouchedRef.current) return;
    setLanguages(defaultMarketJobLanguages(language, countryCode));
  }, [countryCode, language]);

  const locationText = [city, regionCode].filter(Boolean).join(', ');
  const locationEmpty = !city && !regionCode && !countryCode;
  const payNumber = Number(String(payAmount).replace(/[^\d.]/g, ''));
  const payDisplay =
    Number.isFinite(payNumber) && payNumber > 0
      ? formatMarketJobPayAmount(payNumber, countryCode)
      : t('market.jobsForm.payPlaceholder');

  const toggleJobType = (job: string) => {
    setJobTypes((current) => {
      const needle = job.toLowerCase();
      if (current.some((item) => item.toLowerCase() === needle)) {
        return current.filter((item) => item.toLowerCase() !== needle);
      }
      return [...current, job];
    });
    setJobQuery('');
  };

  const toggleDay = (day: string) => {
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const toggleLanguage = (code: string) => {
    languagesTouchedRef.current = true;
    setLanguages((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  const markLocationTouched = () => {
    locationTouchedRef.current = true;
  };

  const onSubmit = async () => {
    setSubmitting(true);
    const result = await submitMarketJobInterest({
      mode,
      jobTypes,
      city,
      regionCode,
      countryCode,
      payAmount,
      payPeriod,
      fullName,
      companyName,
      phoneCountryCode,
      phoneNumber,
      age,
      days,
      hoursFrom,
      hoursTo,
      languages: isLoggedIn ? languages : [],
      terms: [engagement, level, arrangement, startWhen],
      notes,
      userId: user?.id ?? null,
      profileId: profile?.id ?? null,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(t('market.jobsForm.submitSuccess'));
    setJobTypes([]);
    setNotes('');
    setDetailsOpen(false);
    setBoardRefreshKey((current) => current + 1);
  };

  const filteredCountries = countryOptions.filter((option) => {
    const needle = locationQuery.trim().toLowerCase();
    if (!needle) return true;
    return option.label.toLowerCase().includes(needle) || option.code.toLowerCase().includes(needle);
  });

  const filteredRegions = regions.filter((region) => {
    const needle = locationQuery.trim().toLowerCase();
    if (!needle) return true;
    return region.name.toLowerCase().includes(needle) || region.code.toLowerCase().includes(needle);
  });

  const filteredCities = cities.filter((name) => {
    const needle = locationQuery.trim().toLowerCase();
    if (!needle) return true;
    return name.toLowerCase().includes(needle);
  });

  return {
    mode, setMode, jobTypes, city, countryCode, boardRefreshKey, t, showModeTabs, jobQuery,
    setJobQuery, jobOpen, setJobOpen, setJobHovered, setCity, regionCode, setRegionCode,
    setCountryCode, locationOpen, setLocationOpen, locationQuery, setLocationQuery, payAmount,
    setPayAmount, payPeriod, setPayPeriod, payOpen, setPayOpen, payPeriodOpen, setPayPeriodOpen,
    setPayTouched, engagement, setEngagement, engagementOpen, setEngagementOpen, level, setLevel,
    levelOpen, setLevelOpen, arrangement, setArrangement, arrangementOpen, setArrangementOpen,
    startWhen, setStartWhen, startOpen, setStartOpen, language, jobOptions, selectedJobSet,
    jobCycleIndex, locationText, locationEmpty, payDisplay, toggleJobType, markLocationTouched,
    filteredCountries, filteredRegions, filteredCities, fullName, setFullName, companyName,
    setCompanyName, phoneCountryCode, setPhoneCountryCode, phoneNumber, setPhoneNumber, age, setAge,
    detailsOpen, setDetailsOpen, days, hoursFrom, setHoursFrom, hoursTo, setHoursTo, languages,
    languageOpen, setLanguageOpen, languageQuery, setLanguageQuery, notes, setNotes, submitting,
    profile, showContact, showMoreDetails, languageOptionsForJobs, showNameField, showCompanyField,
    showPhoneField, showAgeField, showIdentityFields, toggleDay, toggleLanguage, onSubmit,
  };
}

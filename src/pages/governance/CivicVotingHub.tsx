import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Vote,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Bell,
  MapPin,
  Eye,
  Loader2,
  BadgeCheck,
  CalendarClock,
  CircleDot,
  Lock,
  FilePenLine,
  Ban,
  ChevronRight,
  Globe2,
  Check,
  History,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { CivicVotingPageHeading, CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SlowRunningText } from '@/components/ui/slow-running-text';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryCodeFromName, getCountryName } from '@/lib/countries';
import { detectDeviceLocation } from '@/lib/device-location';
import {
  listGeoCities,
  listGeoCountryCodes,
  listGeoRegions,
  type GeoRegionOption,
} from '@/lib/geo-locations';
import { detectCountryCode } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import {
  CIVIC_ELECTION_TIER_LABELS,
  CIVIC_SECURITY_CLASS_LABELS,
  electionTitleWithoutCountryLabel,
  isCivicElectionActiveCatalog,
  isCivicElectionHistoryCatalog,
  isCivicElectionSample,
  isOrdinaryConsultationElection,
  listCivicElections,
  listVotingProposals,
  type CivicElection,
  type CivicElectionSecurityClass,
  type CivicElectionStatus,
  type CivicElectionTier,
  type VotingProposal,
} from '@/lib/civic-voting';
import { cn } from '@/lib/utils';

/** Sentinel for Civizen-wide / planetary contests in the country filter. */
const GLOBAL_COUNTRY_FILTER = 'GLOBAL';

function isGlobalScopeCountry(code: string | null | undefined): boolean {
  if (!code) return true;
  const normalized = code.trim().toUpperCase();
  return (
    normalized === GLOBAL_COUNTRY_FILTER ||
    normalized === 'WW' ||
    normalized === 'XZ' ||
    normalized === 'UN'
  );
}

const TIER_ORDER: CivicElectionTier[] = [
  'neighborhood',
  'local',
  'district',
  'regional',
  'national',
  'supranational',
];

/** Compact labels for the mobile tab strip */
const TIER_TAB_LABELS: Record<CivicElectionTier, string> = {
  neighborhood: 'Neighborhood',
  local: 'Local',
  district: 'District',
  regional: 'Regional',
  national: 'National',
  supranational: 'Supranational',
};

/** Soft per-tier chips — muted idle fill; clearer selected ring/fill */
const TIER_TAB_TONES: Record<CivicElectionTier, string> = {
  neighborhood:
    'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200/90 data-[state=active]:border-emerald-500/55 data-[state=active]:bg-emerald-500/28 data-[state=active]:text-emerald-950 dark:data-[state=active]:text-emerald-50 data-[state=active]:ring-emerald-500/40',
  local:
    'border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200/90 data-[state=active]:border-sky-500/55 data-[state=active]:bg-sky-500/28 data-[state=active]:text-sky-950 dark:data-[state=active]:text-sky-50 data-[state=active]:ring-sky-500/40',
  district:
    'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100/90 data-[state=active]:border-amber-500/55 data-[state=active]:bg-amber-500/28 data-[state=active]:text-amber-950 dark:data-[state=active]:text-amber-50 data-[state=active]:ring-amber-500/40',
  regional:
    'border-orange-500/25 bg-orange-500/10 text-orange-900 dark:text-orange-100/90 data-[state=active]:border-orange-500/55 data-[state=active]:bg-orange-500/28 data-[state=active]:text-orange-950 dark:data-[state=active]:text-orange-50 data-[state=active]:ring-orange-500/40',
  national:
    'border-blue-500/25 bg-blue-500/10 text-blue-800 dark:text-blue-200/90 data-[state=active]:border-blue-500/55 data-[state=active]:bg-blue-500/28 data-[state=active]:text-blue-950 dark:data-[state=active]:text-blue-50 data-[state=active]:ring-blue-500/40',
  supranational:
    'border-teal-500/25 bg-teal-500/10 text-teal-800 dark:text-teal-200/90 data-[state=active]:border-teal-500/55 data-[state=active]:bg-teal-500/28 data-[state=active]:text-teal-950 dark:data-[state=active]:text-teal-50 data-[state=active]:ring-teal-500/40',
};

const STATUS_ICON: Record<
  CivicElectionStatus,
  { icon: typeof BadgeCheck; className: string }
> = {
  certified: { icon: BadgeCheck, className: 'text-primary' },
  open: { icon: CircleDot, className: 'text-emerald-400' },
  scheduled: { icon: CalendarClock, className: 'text-sky-400' },
  closed: { icon: Lock, className: 'text-muted-foreground' },
  draft: { icon: FilePenLine, className: 'text-muted-foreground' },
  cancelled: { icon: Ban, className: 'text-destructive' },
};

const SECURITY_ICON: Record<
  CivicElectionSecurityClass,
  { icon: typeof Shield; className: string }
> = {
  ordinary: { icon: Shield, className: 'text-muted-foreground' },
  elevated: { icon: ShieldAlert, className: 'text-amber-400' },
  constitutional: { icon: Scale, className: 'text-sky-400' },
};

/** Prefer soonest upcoming close; otherwise most recently closed. */
function pickNearestDeadlineElection(
  elections: CivicElection[],
  nowMs = Date.now(),
): CivicElection | null {
  if (elections.length === 0) return null;

  const scored = elections.map((election) => ({
    election,
    closeMs: new Date(election.votingClosesAt).getTime(),
  }));

  const upcoming = scored
    .filter((row) => Number.isFinite(row.closeMs) && row.closeMs >= nowMs)
    .sort((a, b) => a.closeMs - b.closeMs);
  if (upcoming.length > 0) return upcoming[0].election;

  const past = scored
    .filter((row) => Number.isFinite(row.closeMs))
    .sort((a, b) => b.closeMs - a.closeMs);
  return past[0]?.election ?? elections[0];
}

function sortByNearestDeadline(elections: CivicElection[], nowMs = Date.now()): CivicElection[] {
  return [...elections].sort((a, b) => {
    const aClose = new Date(a.votingClosesAt).getTime();
    const bClose = new Date(b.votingClosesAt).getTime();
    const aUpcoming = aClose >= nowMs;
    const bUpcoming = bClose >= nowMs;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    if (aUpcoming && bUpcoming) return aClose - bClose;
    return bClose - aClose;
  });
}

function centerTabInStrip(strip: HTMLElement, tab: HTMLElement, behavior: ScrollBehavior = 'smooth') {
  const stripRect = strip.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  const delta =
    tabRect.left + tabRect.width / 2 - (stripRect.left + stripRect.width / 2);
  strip.scrollBy({ left: delta, behavior });
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function formatScopeLabel(value: string): string {
  return value.replace(/[-_]+/g, ' ').trim();
}

/** Prefer compact 2-letter region codes when already short. */
function formatStateLabel(value: string, regionName?: string | null): string {
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  if (/^[A-Z]{2,3}$/.test(trimmed)) return trimmed;
  if (regionName) return regionName;
  return formatScopeLabel(value);
}

function formatStateMenuLabel(code: string, regionName?: string | null): string {
  const short = formatStateLabel(code);
  if (regionName && regionName.toUpperCase() !== short) {
    return `${regionName} (${short})`;
  }
  return short;
}

function localityMatchesFilter(electionLocality: string, filterLocality: string): boolean {
  const city = filterLocality.trim().toLowerCase();
  const raw = electionLocality.trim().toLowerCase();
  const labeled = formatScopeLabel(electionLocality).toLowerCase();
  return raw === city || labeled === city || labeled.includes(city) || city.includes(labeled);
}

function resolvePreferredCountryCode(input: {
  profileCountryCode?: string | null;
  profileCountryName?: string | null;
  available: string[];
}): string | null {
  const fromProfileCode = input.profileCountryCode?.trim().toUpperCase() || null;
  const fromProfileName = input.profileCountryName
    ? getCountryCodeFromName(input.profileCountryName)
    : null;
  const detected = detectCountryCode().toUpperCase();
  const candidates = [fromProfileCode, fromProfileName, detected].filter(
    (value): value is string => Boolean(value),
  );

  for (const candidate of candidates) {
    if (input.available.includes(candidate)) return candidate;
  }

  return input.available[0] ?? null;
}

const LOCATION_MENU_LIMIT = 180;

export default function CivicVotingHub() {
  const { t, language } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [elections, setElections] = useState<CivicElection[]>([]);
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [proposalHistoryOpen, setProposalHistoryOpen] = useState(false);
  const [activeTier, setActiveTier] = useState<CivicElectionTier>(TIER_ORDER[0]);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [filterLocality, setFilterLocality] = useState<string | null>(null);
  const [geoRegions, setGeoRegions] = useState<GeoRegionOption[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [localityOptions, setLocalityOptions] = useState<string[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const tabStripRef = useRef<HTMLDivElement>(null);
  const tabTriggerRefs = useRef<Partial<Record<CivicElectionTier, HTMLButtonElement | null>>>({});
  const didApplyDefaultTier = useRef(false);
  const didApplyLocationDefaults = useRef(false);
  const didRequestDeviceLocation = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [electionResult, proposalRows] = await Promise.all([
        listCivicElections(),
        listVotingProposals().catch(() => [] as VotingProposal[]),
      ]);
      if (cancelled) return;
      setElections(electionResult.elections);
      setError(electionResult.error);
      setProposals(proposalRows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeElections = useMemo(
    () => elections.filter(isCivicElectionActiveCatalog),
    [elections],
  );
  const historyElections = useMemo(
    () =>
      elections
        .filter(isCivicElectionHistoryCatalog)
        .sort((a, b) => Date.parse(b.votingClosesAt) - Date.parse(a.votingClosesAt)),
    [elections],
  );
  const activeProposals = useMemo(
    () => proposals.filter((item) => item.status === 'draft'),
    [proposals],
  );
  const historyProposals = useMemo(
    () =>
      proposals
        .filter((item) => item.status !== 'draft')
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [proposals],
  );

  const countryOptions = useMemo(() => listGeoCountryCodes(language), [language]);

  const regionNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const region of geoRegions) {
      map.set(region.code.toUpperCase(), region.name);
    }
    return map;
  }, [geoRegions]);

  useEffect(() => {
    if (!filterCountry || filterCountry === GLOBAL_COUNTRY_FILTER) {
      setGeoRegions([]);
      setRegionOptions([]);
      setLoadingRegions(false);
      return;
    }

    let cancelled = false;
    setLoadingRegions(true);
    (async () => {
      try {
        const regions = await listGeoRegions(filterCountry);
        if (cancelled) return;
        const electionRegions = elections
          .filter((election) => election.scopeCountryCode === filterCountry)
          .map((election) => election.scopeRegionCode);
        setGeoRegions(regions);
        setRegionOptions(uniqueSorted([...regions.map((region) => region.code), ...electionRegions]));
      } catch {
        if (cancelled) return;
        const electionRegions = elections
          .filter((election) => election.scopeCountryCode === filterCountry)
          .map((election) => election.scopeRegionCode);
        setGeoRegions([]);
        setRegionOptions(uniqueSorted(electionRegions));
      } finally {
        if (!cancelled) setLoadingRegions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filterCountry, elections]);

  useEffect(() => {
    if (!filterCountry || filterCountry === GLOBAL_COUNTRY_FILTER || !filterRegion) {
      setLocalityOptions([]);
      setLoadingCities(false);
      return;
    }

    let cancelled = false;
    setLoadingCities(true);
    (async () => {
      try {
        const cities = await listGeoCities(filterCountry, filterRegion);
        if (cancelled) return;
        const electionLocalities = elections
          .filter(
            (election) =>
              election.scopeCountryCode === filterCountry &&
              election.scopeRegionCode === filterRegion,
          )
          .map((election) => election.scopeLocalityCode);
        setLocalityOptions(uniqueSorted([...cities, ...electionLocalities]));
      } catch {
        if (cancelled) return;
        const electionLocalities = elections
          .filter(
            (election) =>
              election.scopeCountryCode === filterCountry &&
              election.scopeRegionCode === filterRegion,
          )
          .map((election) => election.scopeLocalityCode);
        setLocalityOptions(uniqueSorted(electionLocalities));
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filterCountry, filterRegion, elections]);

  const filteredElections = useMemo(() => {
    return activeElections.filter((election) => {
      if (filterCountry === GLOBAL_COUNTRY_FILTER) {
        if (!isGlobalScopeCountry(election.scopeCountryCode)) return false;
      } else if (
        filterCountry &&
        !isGlobalScopeCountry(election.scopeCountryCode) &&
        election.scopeCountryCode !== filterCountry
      ) {
        return false;
      }
      // Global contests stay visible under local country / region / city filters.
      if (isGlobalScopeCountry(election.scopeCountryCode)) return true;
      if (filterRegion && election.scopeRegionCode !== filterRegion) return false;
      if (filterLocality) {
        if (!election.scopeLocalityCode) {
          // Keep statewide / region-wide contests for the selected city.
          if (filterRegion && election.scopeRegionCode !== filterRegion) return false;
        } else if (!localityMatchesFilter(election.scopeLocalityCode, filterLocality)) {
          return false;
        }
      }
      return true;
    });
  }, [activeElections, filterCountry, filterRegion, filterLocality]);

  const byTier = useMemo(() => {
    const map = new Map<CivicElectionTier, CivicElection[]>();
    for (const tier of TIER_ORDER) map.set(tier, []);
    for (const election of filteredElections) {
      const list = map.get(election.tier) ?? [];
      list.push(election);
      map.set(election.tier, list);
    }
    for (const tier of TIER_ORDER) {
      map.set(tier, sortByNearestDeadline(map.get(tier) ?? []));
    }
    return map;
  }, [filteredElections]);

  const tiersWithElections = useMemo(
    () => TIER_ORDER.filter((tier) => (byTier.get(tier)?.length ?? 0) > 0),
    [byTier],
  );

  useEffect(() => {
    if (activeElections.length === 0 || didApplyDefaultTier.current) return;
    const nearest = pickNearestDeadlineElection(activeElections);
    if (nearest) {
      setActiveTier(nearest.tier);
      didApplyDefaultTier.current = true;
    }
  }, [activeElections]);

  useEffect(() => {
    if (didApplyLocationDefaults.current || activeElections.length === 0 || countryOptions.length === 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      const preferredCountry = resolvePreferredCountryCode({
        profileCountryCode: profile?.country_code,
        profileCountryName: profile?.country,
        available: countryOptions,
      });
      if (!preferredCountry || cancelled) return;

      const inCountry = activeElections.filter(
        (election) => election.scopeCountryCode === preferredCountry,
      );
      if (inCountry.length === 0) {
        const globalOnes = activeElections.filter((election) =>
          isGlobalScopeCountry(election.scopeCountryCode),
        );
        if (globalOnes.length > 0) {
          setFilterCountry(GLOBAL_COUNTRY_FILTER);
          setFilterRegion(null);
          setFilterLocality(null);
          didApplyLocationDefaults.current = true;
          return;
        }
      }

      const profileRegion = profile?.region_code?.trim().toUpperCase() || null;
      const profileCity = profile?.city?.trim() || null;

      let geoRegionCodes: string[] = [];
      try {
        geoRegionCodes = (await listGeoRegions(preferredCountry)).map((region) => region.code);
      } catch {
        geoRegionCodes = [];
      }
      if (cancelled) return;

      const electionRegions = uniqueSorted(inCountry.map((election) => election.scopeRegionCode));
      const regionMatch =
        profileRegion &&
        (geoRegionCodes.includes(profileRegion) || electionRegions.includes(profileRegion))
          ? profileRegion
          : null;

      const nearestInCountry = pickNearestDeadlineElection(inCountry) ?? inCountry[0] ?? null;
      const preferredRegion = regionMatch ?? nearestInCountry?.scopeRegionCode ?? null;

      let localityMatch: string | null = null;
      if (profileCity && preferredRegion) {
        let geoCities: string[] = [];
        try {
          geoCities = await listGeoCities(preferredCountry, preferredRegion);
        } catch {
          geoCities = [];
        }
        if (cancelled) return;
        const electionLocalities = uniqueSorted(
          inCountry
            .filter((election) => election.scopeRegionCode === preferredRegion)
            .map((election) => election.scopeLocalityCode),
        );
        const pool = uniqueSorted([...geoCities, ...electionLocalities]);
        const exact = pool.find((option) => option.toLowerCase() === profileCity.toLowerCase());
        const fuzzy = pool.find((option) =>
          formatScopeLabel(option).toLowerCase().includes(profileCity.toLowerCase()),
        );
        localityMatch = exact ?? fuzzy ?? profileCity;
      } else if (profileCity) {
        localityMatch = profileCity;
      }

      const inRegionWithCity = preferredRegion
        ? inCountry.filter(
            (election) =>
              election.scopeRegionCode === preferredRegion && Boolean(election.scopeLocalityCode),
          )
        : [];
      const citySource = pickNearestDeadlineElection(inRegionWithCity);

      setFilterCountry(preferredCountry);
      setFilterRegion(preferredRegion);
      setFilterLocality(
        localityMatch ??
          (preferredRegion && citySource?.scopeRegionCode === preferredRegion
            ? citySource.scopeLocalityCode
            : null),
      );
      didApplyLocationDefaults.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeElections,
    countryOptions,
    profile?.country_code,
    profile?.country,
    profile?.region_code,
    profile?.city,
  ]);

  // When profile lacks city/region, ask for device location once and persist.
  useEffect(() => {
    if (!profile?.id || elections.length === 0) return;
    if (profile.city && profile.region_code && profile.country_code) return;
    if (didRequestDeviceLocation.current) return;
    didRequestDeviceLocation.current = true;

    let cancelled = false;
    (async () => {
      try {
        const detected = await detectDeviceLocation();
        if (cancelled) return;

        const nextCountry = detected.countryCode;
        const nextRegion = detected.regionCode;
        const nextCity = detected.city;
        if (!nextCountry && !nextRegion && !nextCity) return;

        if (nextCountry && countryOptions.includes(nextCountry)) {
          setFilterCountry(nextCountry);
        }
        if (nextRegion) setFilterRegion(nextRegion);
        if (nextCity) setFilterLocality(nextCity);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            city: nextCity,
            region_code: nextRegion,
            country_code: nextCountry,
            country: detected.countryName || (nextCountry ? getCountryName(nextCountry, language) : null),
          })
          .eq('id', profile.id);
        if (!updateError) {
          await refreshProfile();
        }
      } catch {
        // Permission denied or unavailable — keep election/profile fallbacks.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    profile?.id,
    profile?.city,
    profile?.region_code,
    profile?.country_code,
    elections.length,
    countryOptions,
    language,
    refreshProfile,
  ]);

  useEffect(() => {
    if (tiersWithElections.length === 0) return;
    if (!tiersWithElections.includes(activeTier)) {
      const nearest = pickNearestDeadlineElection(filteredElections);
      setActiveTier(nearest?.tier ?? tiersWithElections[0]);
    }
  }, [tiersWithElections, activeTier, filteredElections]);

  useEffect(() => {
    const strip = tabStripRef.current;
    const tab = tabTriggerRefs.current[activeTier];
    if (!strip || !tab || loading) return;

    const frame = window.requestAnimationFrame(() => {
      centerTabInStrip(strip, tab, 'smooth');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTier, tiersWithElections, loading]);

  const selectCountry = (value: string | null) => {
    setFilterCountry(value);
    setFilterRegion(null);
    setFilterLocality(null);
  };

  const selectRegion = (value: string | null) => {
    setFilterRegion(value);
    setFilterLocality(null);
  };

  return (
    <CivicVotingPageShell
      sectionTrail={[{ label: t('civicVoting.openElections') }]}
    >
      <div className="mx-auto max-w-3xl space-y-4 px-1 py-2 pb-8">
        <div className="space-y-1">
          <CivicVotingPageHeading
            icon={
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Vote className="h-5 w-5" />
              </div>
            }
            title={t('civicVoting.title')}
          />
          <SlowRunningText
            text={t('civicVoting.subtitle')}
            className="w-full text-sm text-muted-foreground"
          />
        </div>

        <section className="space-y-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">
                {t('civicVoting.proposals.title')}
              </h2>
              <Badge variant="outline" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                {activeProposals.length}
              </Badge>
              {historyProposals.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground"
                      aria-label={t('civicVoting.history.proposalsTitle')}
                      onClick={() => setProposalHistoryOpen(true)}
                    >
                      <History className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {t('civicVoting.history.proposalsTitle')}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>

          {!loading && activeProposals.length === 0 ? (
            <Card className="rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">
              {t('civicVoting.proposals.empty')}
            </Card>
          ) : null}

          {activeProposals.map((proposal) => (
            <Link
              key={proposal.id}
              to={`/governance/voting/proposals/${proposal.id}`}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-3 text-sm transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{t('civicVoting.proposals.status.draft')}</Badge>
                  <Badge variant="secondary">{t('civicVoting.proposals.nonbinding')}</Badge>
                </div>
                <p className="truncate font-medium text-foreground">{proposal.title}</p>
                {proposal.summary ? (
                  <p className="truncate text-xs text-muted-foreground">{proposal.summary}</p>
                ) : null}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">
                {t('civicVoting.openElections')}
              </h2>
              <Badge variant="outline" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                {filteredElections.length}
              </Badge>
              {historyElections.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground"
                      aria-label={t('civicVoting.history.title')}
                      onClick={() => setHistoryOpen(true)}
                    >
                      <History className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('civicVoting.history.title')}</TooltipContent>
                </Tooltip>
              ) : null}
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-1.5">
              <div className="flex min-w-0 items-center text-xs text-muted-foreground">
                <ScopeTextMenu
                  label={t('civicVoting.filters.city')}
                  emptyLabel={t('civicVoting.filters.noCity')}
                  allLabel={t('civicVoting.filters.allCities')}
                  searchPlaceholder={t('civicVoting.filters.searchCity')}
                  emptySearchLabel={t('civicVoting.filters.noLocationMatches')}
                  value={filterLocality}
                  options={localityOptions}
                  loading={loadingCities}
                  onChange={setFilterLocality}
                  formatOption={formatScopeLabel}
                />
                <span className="px-0.5" aria-hidden>
                  ,
                </span>
                <ScopeTextMenu
                  label={t('civicVoting.filters.state')}
                  emptyLabel={t('civicVoting.filters.noState')}
                  allLabel={t('civicVoting.filters.allStates')}
                  searchPlaceholder={t('civicVoting.filters.searchState')}
                  emptySearchLabel={t('civicVoting.filters.noLocationMatches')}
                  value={filterRegion}
                  options={regionOptions}
                  loading={loadingRegions}
                  onChange={selectRegion}
                  formatOption={(code) =>
                    formatStateLabel(code, regionNameByCode.get(code.toUpperCase()) ?? null)
                  }
                  formatMenuOption={(code) =>
                    formatStateMenuLabel(code, regionNameByCode.get(code.toUpperCase()) ?? null)
                  }
                />
              </div>
              <CountryFilterMenu
                label={t('civicVoting.filters.country')}
                globalLabel={t('civicVoting.filters.global')}
                searchPlaceholder={t('civicVoting.filters.searchCountry')}
                emptySearchLabel={t('civicVoting.filters.noLocationMatches')}
                value={filterCountry}
                options={countryOptions}
                language={language}
                onChange={selectCountry}
              />
            </div>
          </div>

          {loading ? (
            <Card className="flex items-center gap-2 rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading')}
            </Card>
          ) : null}

          {error ? (
            <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
              {t('civicVoting.loadFailed')}
            </Card>
          ) : null}

          {!loading && !error && activeElections.length === 0 ? (
            <Card className="rounded-2xl border-border/60 p-4 text-sm text-muted-foreground space-y-2">
              <p>{t('civicVoting.emptyElections')}</p>
              {historyElections.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-3.5 w-3.5" aria-hidden />
                  {t('civicVoting.history.open')}
                </Button>
              ) : null}
            </Card>
          ) : null}

          {!loading && !error && activeElections.length > 0 && filteredElections.length === 0 ? (
            <Card className="rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">
              {t('civicVoting.filters.empty')}
            </Card>
          ) : null}

          {!loading && !error && tiersWithElections.length > 0 ? (
            <Tabs
              value={activeTier}
              onValueChange={(value) => setActiveTier(value as CivicElectionTier)}
              className="space-y-3"
            >
              <div
                ref={tabStripRef}
                className="-mx-1 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <TabsList className="inline-flex h-auto w-max justify-start gap-2 rounded-none bg-transparent p-0 text-foreground shadow-none pl-[max(0.5rem,calc(50%-4.75rem))] pr-[max(0.5rem,calc(50%-4.75rem))]">
                  {tiersWithElections.map((tier) => {
                    const count = byTier.get(tier)?.length ?? 0;
                    const selected = activeTier === tier;
                    return (
                      <TabsTrigger
                        key={tier}
                        value={tier}
                        ref={(node) => {
                          tabTriggerRefs.current[tier] = node;
                        }}
                        className={cn(
                          'shrink-0 snap-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-none transition-colors sm:text-sm',
                          'opacity-70 scale-[0.96] data-[state=active]:opacity-100 data-[state=active]:scale-100 data-[state=active]:shadow-sm',
                          'data-[state=active]:ring-2 data-[state=active]:ring-offset-1 data-[state=active]:ring-offset-background',
                          TIER_TAB_TONES[tier],
                        )}
                        title={CIVIC_ELECTION_TIER_LABELS[tier]}
                        aria-current={selected ? 'page' : undefined}
                      >
                        <span>{TIER_TAB_LABELS[tier]}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-5 min-w-5 justify-center border-foreground/15 bg-background/40 px-1 text-[10px] font-normal',
                            selected && 'bg-background/70 font-semibold',
                          )}
                        >
                          {count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {tiersWithElections.map((tier) => {
                const tierElections = byTier.get(tier) ?? [];
                return (
                  <TabsContent key={tier} value={tier} className="mt-0 space-y-2 focus-visible:ring-0">
                    {tierElections.map((election) => (
                      <ElectionCard key={election.id} election={election} />
                    ))}
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : null}
        </section>

        <Accordion type="multiple" className="rounded-2xl border border-border/60 bg-card/40 px-4">
          <AccordionItem value="about" className="border-border/40">
            <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
              {t('civicVoting.folds.aboutVoting')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t('civicVoting.institutionalNotice')}</p>
              <p className="text-xs">{t('civicVoting.history.catalogHint')}</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="how" className="border-border/40">
            <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
              {t('civicVoting.folds.howItWorks')}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <FeatureChip
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title={t('civicVoting.features.identityTitle')}
                  body={t('civicVoting.features.identityBody')}
                />
                <FeatureChip
                  icon={<Bell className="h-4 w-4" />}
                  title={t('civicVoting.features.pushTitle')}
                  body={t('civicVoting.features.pushBody')}
                />
                <FeatureChip
                  icon={<MapPin className="h-4 w-4" />}
                  title={t('civicVoting.features.homeTitle')}
                  body={t('civicVoting.features.homeBody')}
                />
                <FeatureChip
                  icon={<Eye className="h-4 w-4" />}
                  title={t('civicVoting.features.transparencyTitle')}
                  body={t('civicVoting.features.transparencyBody')}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl px-3 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>{t('civicVoting.history.title')}</SheetTitle>
            <SheetDescription>{t('civicVoting.history.description')}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
            {historyElections.map((election) => (
              <Link
                key={election.id}
                to={`/governance/voting/${election.id}`}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                onClick={() => setHistoryOpen(false)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{election.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isCivicElectionSample(election)
                      ? t('civicVoting.history.sampleBadge')
                      : t(`civicVoting.status.${election.status}`)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={proposalHistoryOpen} onOpenChange={setProposalHistoryOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl px-3 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>{t('civicVoting.history.proposalsTitle')}</SheetTitle>
            <SheetDescription>{t('civicVoting.history.proposalsDescription')}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
            {historyProposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('civicVoting.history.proposalsEmpty')}</p>
            ) : (
              historyProposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  to={
                    proposal.electionId
                      ? `/governance/voting/${proposal.electionId}`
                      : `/governance/voting/proposals/${proposal.id}`
                  }
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  onClick={() => setProposalHistoryOpen(false)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{proposal.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`civicVoting.proposals.status.${proposal.status}`)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </CivicVotingPageShell>
  );
}

function FeatureChip({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function ScopeTextMenu({
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
            'max-w-[7.5rem] truncate border-0 bg-transparent p-0 text-left text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline',
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

function CountryFilterMenu({
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

function ElectionCard({ election }: { election: CivicElection }) {
  const { t, language } = useLanguage();
  const securityLabel = CIVIC_SECURITY_CLASS_LABELS[election.securityClass];
  const securityHint = t(`civicVoting.securityHint.${election.securityClass}`);
  const securityMeta = SECURITY_ICON[election.securityClass];
  const SecurityIcon = securityMeta.icon;
  const statusMeta = STATUS_ICON[election.status];
  const StatusIcon = statusMeta.icon;
  const statusLabel = t(`civicVoting.status.${election.status}`);
  const statusHint = t(`civicVoting.statusHint.${election.status}`);
  const openLabel = t('civicVoting.openElection');
  const displayTitle = electionTitleWithoutCountryLabel(
    election.title,
    election.scopeCountryCode,
    language,
  );

  return (
    <Card className="rounded-xl border-border/60 px-2.5 py-1.5 shadow-none transition-colors hover:bg-muted/20">
      <Link
        to={`/governance/voting/${election.id}`}
        className="block space-y-0.5"
        aria-label={`${election.title}. ${securityLabel}. ${statusLabel}. ${openLabel}`}
      >
        <div className="flex min-w-0 items-center gap-1">
          {isGlobalScopeCountry(election.scopeCountryCode) ? (
            <span
              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30"
              title={t('civicVoting.filters.global')}
              aria-label={t('civicVoting.filters.global')}
            >
              <Globe2 className="h-2.5 w-2.5" aria-hidden />
            </span>
          ) : election.scopeCountryCode ? (
            <RoundCountryFlag
              countryCode={election.scopeCountryCode}
              locale={language}
              size="xs"
            />
          ) : null}
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground">
            {displayTitle}
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  securityMeta.className,
                )}
                aria-label={securityLabel}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <SecurityIcon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[16rem]">
              <p className="font-medium">{securityLabel}</p>
              <p className="text-xs text-muted-foreground">{securityHint}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  statusMeta.className,
                )}
                aria-label={statusLabel}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <StatusIcon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[16rem]">
              <p className="font-medium">{statusLabel}</p>
              <p className="text-xs text-muted-foreground">{statusHint}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {isOrdinaryConsultationElection(election) ? (
          <p className="text-[11px] font-medium leading-tight text-muted-foreground">
            {t('civicVoting.proposals.nonbinding')}
          </p>
        ) : null}
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 flex-1 line-clamp-1 text-xs leading-tight text-muted-foreground">
            {election.summary}
          </p>
          <span aria-hidden className="inline-flex h-5 w-5 shrink-0" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary">
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">{openLabel}</TooltipContent>
          </Tooltip>
        </div>
      </Link>
    </Card>
  );
}

import { Shield, ShieldAlert, Scale, BadgeCheck, CalendarClock, CircleDot, Lock, FilePenLine, Ban } from 'lucide-react';
import { type CivicElectionSecurityClass, type CivicElectionStatus, type CivicElectionTier } from '@/lib/civic-voting';

/** Sentinel for Civizen-wide / planetary contests in the country filter. */
export const GLOBAL_COUNTRY_FILTER = 'GLOBAL';

export function isGlobalScopeCountry(code: string | null | undefined): boolean {
  if (!code) return true;
  const normalized = code.trim().toUpperCase();
  return (
    normalized === GLOBAL_COUNTRY_FILTER ||
    normalized === 'WW' ||
    normalized === 'XZ' ||
    normalized === 'UN'
  );
}

export const TIER_ORDER: CivicElectionTier[] = [
  'neighborhood',
  'local',
  'district',
  'regional',
  'national',
  'supranational',
];

/** Compact labels for the mobile tab strip */
export const TIER_TAB_LABELS: Record<CivicElectionTier, string> = {
  neighborhood: 'Neighborhood',
  local: 'Local',
  district: 'District',
  regional: 'Regional',
  national: 'National',
  supranational: 'Supranational',
};

/** Soft per-tier chips — muted idle fill; clearer selected ring/fill */
export const TIER_TAB_TONES: Record<CivicElectionTier, string> = {
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

export const STATUS_ICON: Record<
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

export const SECURITY_ICON: Record<
  CivicElectionSecurityClass,
  { icon: typeof Shield; className: string }
> = {
  ordinary: { icon: Shield, className: 'text-muted-foreground' },
  elevated: { icon: ShieldAlert, className: 'text-amber-400' },
  constitutional: { icon: Scale, className: 'text-sky-400' },
};

export const LOCATION_MENU_LIMIT = 180;

import { getCountryDialCode } from '@/lib/countries';
import { formatEnglishOrList, type MarketJobMode } from '@/lib/market-job-types';
import { supabase } from '@/integrations/supabase/client';

export type PublicMarketJobListing = {
  id: string;
  created_at: string;
  mode: MarketJobMode;
  job_types: string[];
  city: string | null;
  region_code: string | null;
  country_code: string | null;
  age: string | null;
  pay_amount: string | null;
  pay_period: string | null;
  display_name: string;
  phone_country_code: string | null;
  has_phone: boolean;
  is_own: boolean;
};

export type UnlockedMarketJobContact = {
  id: string;
  full_name: string;
  company_name: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
};

const PAY_PERIOD_SHORT: Record<string, string> = {
  'Hourly pay': '/H',
  'Daily pay': '/D',
  'Weekly pay': '/W',
  'Monthly pay': '/M',
  'Yearly pay': '/Y',
};

export function listingModeForViewer(viewerMode: MarketJobMode): MarketJobMode {
  return viewerMode === 'seeker' ? 'employer' : 'seeker';
}

export function formatMaskedPhone(phoneCountryCode: string | null | undefined, hasPhone: boolean): string {
  if (!hasPhone) return '—';
  const dial = phoneCountryCode ? getCountryDialCode(phoneCountryCode) : '';
  return dial ? `${dial} ·· ······` : '·· ······';
}

export function formatPayDisplay(amount: string | null | undefined, period: string | null | undefined): string {
  const value = amount?.trim();
  if (!value) return '—';
  const short = period ? PAY_PERIOD_SHORT[period] : undefined;
  return short ? `${value} ${short}` : value;
}

export function formatJobTypesDisplay(jobTypes: string[] | null | undefined): string {
  return formatEnglishOrList(jobTypes ?? []) || '—';
}

export function formatPostedOn(iso: string, locale = 'en-GB'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(date);
}

export function formatListingLocation(listing: Pick<PublicMarketJobListing, 'city' | 'region_code'>): string {
  return [listing.city, listing.region_code].map((part) => part?.trim()).filter(Boolean).join(', ') || '—';
}

export function listingMatchesFilters(
  listing: PublicMarketJobListing,
  filters: { jobTypes?: string[]; countryCode?: string; city?: string },
): boolean {
  if (filters.jobTypes && filters.jobTypes.length > 0) {
    const selected = new Set(filters.jobTypes.map((item) => item.toLowerCase()));
    const overlap = listing.job_types.some((item) => selected.has(item.toLowerCase()));
    if (!overlap) return false;
  }
  if (filters.countryCode?.trim()) {
    if ((listing.country_code || '').toUpperCase() !== filters.countryCode.trim().toUpperCase()) {
      return false;
    }
  }
  if (filters.city?.trim()) {
    if ((listing.city || '').toLowerCase() !== filters.city.trim().toLowerCase()) {
      return false;
    }
  }
  return true;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeListing(row: Record<string, unknown>): PublicMarketJobListing | null {
  const id = asString(row.id);
  const createdAt = asString(row.created_at);
  const mode = row.mode === 'employer' ? 'employer' : row.mode === 'seeker' ? 'seeker' : null;
  if (!id || !createdAt || !mode) return null;
  const jobTypes = Array.isArray(row.job_types)
    ? row.job_types.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
  return {
    id,
    created_at: createdAt,
    mode,
    job_types: jobTypes,
    city: asString(row.city),
    region_code: asString(row.region_code),
    country_code: asString(row.country_code),
    age: asString(row.age),
    pay_amount: asString(row.pay_amount),
    pay_period: asString(row.pay_period),
    display_name: asString(row.display_name) || '—',
    phone_country_code: asString(row.phone_country_code),
    has_phone: asBoolean(row.has_phone),
    is_own: asBoolean(row.is_own),
  };
}

export async function listPublicMarketJobListings(mode: MarketJobMode): Promise<PublicMarketJobListing[]> {
  const { data, error } = await supabase.rpc('list_public_market_job_listings', {
    p_mode: mode,
    p_limit: 40,
  });
  if (error) {
    throw new Error(error.message || 'Could not load listings.');
  }
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => normalizeListing((row ?? {}) as Record<string, unknown>))
    .filter((row): row is PublicMarketJobListing => Boolean(row));
}

export async function unlockMarketJobContact(id: string): Promise<UnlockedMarketJobContact> {
  const { data, error } = await supabase.rpc('unlock_market_job_contact', {
    p_id: id,
  });
  if (error) {
    throw new Error(error.message || 'Could not unlock contact details.');
  }
  const row = Array.isArray(data) ? data[0] : data;
  const record = (row ?? {}) as Record<string, unknown>;
  const unlockedId = asString(record.id);
  if (!unlockedId) {
    throw new Error('This listing is no longer available.');
  }
  return {
    id: unlockedId,
    full_name: asString(record.full_name) || '',
    company_name: asString(record.company_name),
    phone_country_code: asString(record.phone_country_code),
    phone_number: asString(record.phone_number),
  };
}

export function formatUnlockedPhone(contact: UnlockedMarketJobContact): string {
  const number = contact.phone_number?.trim();
  if (!number) return '—';
  const dial = contact.phone_country_code ? getCountryDialCode(contact.phone_country_code) : '';
  if (dial && !number.startsWith('+')) {
    return `${dial} ${number}`;
  }
  return number;
}

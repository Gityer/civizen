import { supabase } from '@/integrations/supabase/client';
import type { MarketJobMode } from '@/lib/market-job-types';

export type MarketJobInterestPayload = {
  mode: MarketJobMode;
  jobTypes: string[];
  city: string;
  regionCode: string;
  countryCode: string;
  payAmount: string;
  payPeriod: string;
  fullName: string;
  companyName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  age: string;
  days: string[];
  hoursFrom: string;
  hoursTo: string;
  languages: string[];
  terms: string[];
  notes: string;
  userId?: string | null;
  profileId?: string | null;
};

type InsertResult = { ok: true; message?: undefined } | { ok: false; message: string };

export async function submitMarketJobInterest(payload: MarketJobInterestPayload): Promise<InsertResult> {
  const jobTypes = payload.jobTypes.map((item) => item.trim()).filter(Boolean);
  const fullName = payload.fullName.trim();
  const phoneNumber = payload.phoneNumber.trim();
  const companyName = payload.companyName.trim();

  if (jobTypes.length === 0) {
    return { ok: false, message: 'Choose at least one job type.' };
  }
  if (!fullName) {
    return { ok: false, message: 'Full name is required.' };
  }
  if (!phoneNumber) {
    return { ok: false, message: 'Phone number is required.' };
  }
  if (payload.mode === 'employer' && !companyName) {
    return { ok: false, message: 'Company name is required.' };
  }

  const userId = payload.userId?.trim() || null;
  const profileId = payload.profileId?.trim() || null;

  const { error } = await supabase.from('market_job_interests' as never).insert({
    mode: payload.mode,
    job_types: jobTypes,
    city: payload.city.trim() || null,
    region_code: payload.regionCode.trim() || null,
    country_code: payload.countryCode.trim() || null,
    pay_amount: payload.payAmount.trim() || null,
    pay_period: payload.payAmount.trim() ? payload.payPeriod.trim() || null : null,
    full_name: fullName,
    company_name: payload.mode === 'employer' ? companyName || null : null,
    phone_country_code: payload.phoneCountryCode.trim() || null,
    phone_number: phoneNumber,
    age: payload.age.trim() || null,
    days: payload.days,
    hours_from: payload.hoursFrom.trim() || null,
    hours_to: payload.hoursTo.trim() || null,
    languages: payload.languages.map((item) => item.trim()).filter(Boolean),
    terms: payload.terms,
    notes: payload.notes.trim() || null,
    user_id: userId,
    profile_id: profileId,
  } as never);

  if (error) {
    return { ok: false, message: error.message || 'Could not submit your interest.' };
  }

  return { ok: true };
}

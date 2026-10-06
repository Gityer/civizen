import { supabase } from '@/integrations/supabase/client';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type DistributionPeriod = {
  id: string;
  label: string;
  period_start: string;
  period_end: string;
  civizen_shared_proceeds_usd: number;
  investor_share: number;
  contributor_share: number;
  project_servicing_share: number;
  founder_share: number;
  investor_pool_usd: number;
  contributor_pool_usd: number;
  project_servicing_pool_usd: number;
  founder_reserve_usd: number;
  mission_reserve_usd: number;
  status: string;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
};

export type FundingPayout = {
  id: string;
  distribution_period_id: string;
  recipient_type: string;
  recipient_id: string | null;
  funder_id: string | null;
  contributor_id: string | null;
  amount_usd: number;
  status: string;
  notes: string | null;
  created_at: string;
};

export type ContributorProfile = {
  id: string;
  display_name: string;
  contributor_type: string;
  tax_status: string;
  payout_status: string;
  created_at: string;
};

export type ContributionRecord = {
  id: string;
  contributor_id: string;
  work_type: string;
  verified_points: number;
  status: string;
  notes: string | null;
  created_at: string;
};

export async function listDistributionPeriods(limit = 100): Promise<Result<DistributionPeriod[]>> {
  const { data, error } = await supabase
    .from('distribution_periods' as never)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as DistributionPeriod[] | null) ?? [] };
}

/** Retired: percentage-based distribution creation is superseded and must not be called. */
export async function createDistributionPeriod(_input: {
  label: string;
  periodStart: string;
  periodEnd: string;
  civizenSharedProceedsUsd: number;
  contributorShare?: number;
  projectServicingShare?: number;
  notes?: string;
}): Promise<Result<DistributionPeriod>> {
  return {
    ok: false,
    message: 'Superseded model: percentage-based distribution periods are retired and cannot be created.',
  };
}

/** Retired: percentage-based distribution approval is superseded and must not be called. */
export async function approveDistributionPeriod(
  _periodId: string,
): Promise<Result<{ period_id: string; status: string; payout_count: number }>> {
  return {
    ok: false,
    message: 'Superseded model: percentage-based distribution approvals are retired.',
  };
}

export async function listFundingPayouts(
  periodId?: string,
  limit = 300,
): Promise<Result<FundingPayout[]>> {
  let query = supabase
    .from('funding_payouts' as never)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (periodId) query = query.eq('distribution_period_id', periodId);
  const { data, error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FundingPayout[] | null) ?? [] };
}

export async function listContributorProfiles(limit = 200): Promise<Result<ContributorProfile[]>> {
  const { data, error } = await supabase
    .from('contributor_profiles' as never)
    .select('id, display_name, contributor_type, tax_status, payout_status, created_at')
    .order('display_name', { ascending: true })
    .limit(limit);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as ContributorProfile[] | null) ?? [] };
}

export async function createContributorProfile(input: {
  displayName: string;
  contributorType?: string;
}): Promise<Result<ContributorProfile>> {
  const { data, error } = await supabase
    .from('contributor_profiles' as never)
    .insert({
      display_name: input.displayName.trim(),
      contributor_type: input.contributorType ?? 'individual',
      payout_status: 'eligible',
    } as never)
    .select('id, display_name, contributor_type, tax_status, payout_status, created_at')
    .single();
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as ContributorProfile };
}

export async function createContributionRecord(input: {
  contributorId: string;
  workType: string;
  verifiedPoints: number;
  status?: string;
  notes?: string;
}): Promise<Result<ContributionRecord>> {
  const { data, error } = await supabase
    .from('contribution_records' as never)
    .insert({
      contributor_id: input.contributorId,
      work_type: input.workType.trim(),
      verified_points: input.verifiedPoints,
      status: input.status ?? 'verified',
      notes: input.notes ?? null,
    } as never)
    .select('id, contributor_id, work_type, verified_points, status, notes, created_at')
    .single();
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as ContributionRecord };
}

export async function listContributionRecords(limit = 200): Promise<Result<ContributionRecord[]>> {
  const { data, error } = await supabase
    .from('contribution_records' as never)
    .select('id, contributor_id, work_type, verified_points, status, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as ContributionRecord[] | null) ?? [] };
}

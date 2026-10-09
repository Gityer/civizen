import { supabase } from '@/integrations/supabase/client';

export type AreaActivityProgram = { id: string; title: string; summary: string | null; status: string };
export type AreaActivityChallenge = { id: string; title: string; problemStatement: string | null; status: string };
export type AreaActivityMatter = { id: string; title: string; matterType: string; lifecycleStatus: string; updatedAt: string | null };

export type AreaActivity = {
  programs: AreaActivityProgram[];
  challenges: AreaActivityChallenge[];
  matters: AreaActivityMatter[];
};

export const EMPTY_AREA_ACTIVITY: AreaActivity = { programs: [], challenges: [], matters: [] };

const str = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value));
const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const rows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object') : [];

export function mapAreaActivity(data: unknown): AreaActivity {
  if (!data || typeof data !== 'object') return EMPTY_AREA_ACTIVITY;
  const row = data as Record<string, unknown>;
  return {
    programs: rows(row.programs).map((p) => ({ id: str(p.id), title: str(p.title), summary: strOrNull(p.summary), status: str(p.status) })),
    challenges: rows(row.challenges).map((c) => ({
      id: str(c.id), title: str(c.title), problemStatement: strOrNull(c.problem_statement), status: str(c.status),
    })),
    matters: rows(row.matters).map((m) => ({
      id: str(m.id), title: str(m.title), matterType: str(m.matter_type), lifecycleStatus: str(m.lifecycle_status), updatedAt: strOrNull(m.updated_at),
    })),
  };
}

export function hasAreaActivity(activity: AreaActivity): boolean {
  return activity.programs.length > 0 || activity.challenges.length > 0 || activity.matters.length > 0;
}

/** Public, non-demo programs, challenges and public Matters tagged with the Area (step 4.4); guests included. */
export async function loadAreaActivity(areaCode: string): Promise<AreaActivity> {
  try {
    const { data, error } = await supabase.rpc('area_activity', { p_area_code: areaCode });
    if (error) return EMPTY_AREA_ACTIVITY;
    return mapAreaActivity(data);
  } catch {
    return EMPTY_AREA_ACTIVITY;
  }
}

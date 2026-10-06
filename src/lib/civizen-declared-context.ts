/** Persisted declared Civizen context. Not a score input. */

import { supabase } from '@/integrations/supabase/client';
import type { UntypedSupabaseClient } from '@/integrations/supabase/untyped';
import type { DeclaredContext } from '@/lib/civizen-context-model';

type DbClient = Pick<UntypedSupabaseClient, 'from'>;

export type PersistedDeclaredContext = DeclaredContext & {
  contributionInterests: string[];
};

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

export function emptyDeclaredContext(): PersistedDeclaredContext {
  return { interests: [], goals: [], priorities: [], contributionInterests: [] };
}

export async function loadDeclaredContext(
  profileId: string,
  client: DbClient = supabase,
): Promise<PersistedDeclaredContext> {
  try {
    const { data, error } = await client
      .from('profile_declared_context')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error || !data) return emptyDeclaredContext();
    return {
      interests: asList(data.interests),
      goals: asList(data.goals),
      priorities: asList(data.priorities),
      contributionInterests: asList(data.contribution_interests),
    };
  } catch {
    return emptyDeclaredContext();
  }
}

export async function saveDeclaredContext(
  profileId: string,
  declared: PersistedDeclaredContext,
  client: DbClient = supabase,
): Promise<PersistedDeclaredContext> {
  const row = {
    profile_id: profileId,
    interests: declared.interests,
    goals: declared.goals,
    priorities: declared.priorities,
    contribution_interests: declared.contributionInterests,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from('profile_declared_context')
    .upsert(row, { onConflict: 'profile_id' })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Could not save declared context');
  return {
    interests: asList(data.interests),
    goals: asList(data.goals),
    priorities: asList(data.priorities),
    contributionInterests: asList(data.contribution_interests),
  };
}

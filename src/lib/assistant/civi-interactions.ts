import { supabase } from '@/integrations/supabase/client';
import {
  interactionRowFromRpc,
  type CiviInteractionRow,
} from '@/lib/assistant/interaction-log';

export async function listCiviInteractions(limit = 200): Promise<CiviInteractionRow[]> {
  const { data, error } = await supabase.rpc('list_civi_interactions', {
    p_limit: Math.max(1, Math.min(limit, 200)),
  });
  if (error || !Array.isArray(data)) {
    throw new Error(error?.message || 'Could not load Civi interactions.');
  }
  return data
    .map((row) => interactionRowFromRpc(row as Record<string, unknown>))
    .filter((row): row is CiviInteractionRow => Boolean(row));
}

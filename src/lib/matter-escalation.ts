import { supabase } from '@/integrations/supabase/client';
import type { MatterActionRequirement } from '@/lib/matters';

/** An action the initiator is waiting on that is past its deadline: the Matter may be passed to Civic Operations. */
export function overdueActionForInitiator(
  actions: readonly MatterActionRequirement[],
  viewerProfileId: string,
  managedIds: readonly string[],
  now = Date.now(),
): MatterActionRequirement | null {
  return actions.find((action) =>
    (action.status === 'pending' || action.status === 'overdue')
    && Date.parse(action.dueAt) < now
    && action.assignedActor.profileId !== viewerProfileId
    && !managedIds.includes(action.assignedActor.profileId ?? '')) ?? null;
}

export async function escalateMatterToCivicOperations(matterId: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('escalate_matter_to_civic_operations', { p_matter_id: matterId, p_note: note });
  if (error) throw new Error(error.message || 'request_failed');
}

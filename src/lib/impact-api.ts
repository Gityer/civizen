import { supabase } from '@/integrations/supabase/client';

export type MyKnowledgeResource = {
  id: string;
  spaceId: string;
  title: string;
  status: string;
  /** True when the member proposed it (it was published by a coordinator). */
  proposed: boolean;
};

const str = (value: unknown): string => (value == null ? '' : String(value));

export function mapMyKnowledgeResource(row: Record<string, unknown>, profileId: string): MyKnowledgeResource {
  return {
    id: str(row.id),
    spaceId: str(row.space_id),
    title: str(row.title),
    status: str(row.status) || 'draft',
    proposed: str(row.proposed_by_profile_id) === profileId && str(row.publisher_profile_id) !== profileId,
  };
}

/** Knowledge resources a member published or proposed (Impact page, Phase 4 step 4.2). */
export async function listMyKnowledgeResources(profileId: string): Promise<MyKnowledgeResource[]> {
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('knowledge_resources')
    .select('id, space_id, title, status, publisher_profile_id, proposed_by_profile_id, created_at')
    .or(`publisher_profile_id.eq.${profileId},proposed_by_profile_id.eq.${profileId}`)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) return [];
  return (data ?? []).map((row) => mapMyKnowledgeResource(row as Record<string, unknown>, profileId));
}

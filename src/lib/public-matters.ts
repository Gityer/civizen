import { supabase } from '@/integrations/supabase/client';

/** Guest-safe view of a public Matter (v2 step B3): no actions, parties, tasks or private comments. */
export type PublicMatterCard = {
  id: string;
  title: string;
  description: string;
  matterType: string;
  lifecycleStatus: string;
  areaNodeId: string | null;
  scopeKind: string | null;
  scopeCountryCode: string | null;
  createdAt: string;
  updatedAt: string;
  initiatorName: string | null;
  addresseeName: string | null;
  commentCount: number;
};

export type PublicMatterComment = { id: string; parentId: string | null; body: string; createdAt: string; authorName: string | null };
export type PublicMatter = PublicMatterCard & { comments: PublicMatterComment[] };

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const textOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

export function mapPublicMatterCard(row: Record<string, unknown>): PublicMatterCard {
  return {
    id: text(row.id),
    title: text(row.title),
    description: text(row.description),
    matterType: text(row.matter_type),
    lifecycleStatus: text(row.lifecycle_status),
    areaNodeId: textOrNull(row.area_node_id),
    scopeKind: textOrNull(row.scope_kind),
    scopeCountryCode: textOrNull(row.scope_country_code),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    initiatorName: textOrNull(row.initiator_display_name),
    addresseeName: textOrNull(row.addressee_display_name),
    commentCount: typeof row.comment_count === 'number' ? row.comment_count : Number(row.comment_count ?? 0) || 0,
  };
}

export async function listPublicMatterCards(filters: { search?: string; matterType?: string; offset?: number } = {}): Promise<PublicMatterCard[]> {
  const { data, error } = await supabase.rpc('public_matter_cards', {
    p_search: filters.search?.trim() || undefined,
    p_matter_type: filters.matterType || undefined,
    p_limit: 30,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []).map((row) => mapPublicMatterCard(row as Record<string, unknown>));
}

export async function getPublicMatter(id: string): Promise<PublicMatter | null> {
  const { data, error } = await supabase.rpc('public_matter', { p_id: id });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const comments = Array.isArray(row.comments) ? (row.comments as Record<string, unknown>[]) : [];
  return {
    ...mapPublicMatterCard(row),
    comments: comments.map((c) => ({
      id: text(c.id),
      parentId: textOrNull(c.parent_id),
      body: text(c.body),
      createdAt: text(c.created_at),
      authorName: textOrNull(c.author_display_name),
    })),
  };
}

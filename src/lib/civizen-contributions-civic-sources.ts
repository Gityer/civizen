import type { SupabaseDbClient } from '@/integrations/supabase/client-type';
import { estimateContributionEvent, type ContributionEvent } from '@/lib/civizen-contributions';

type Row = Record<string, unknown>;
const str = (value: unknown): string => (value == null ? '' : String(value));

/** Pure mapping so the ledger stays testable without a database. */
export function civicEventsFromRows(profileId: string, matters: Row[], resources: Row[]): ContributionEvent[] {
  const events: ContributionEvent[] = [];
  for (const row of matters) {
    const description = str(row.description);
    events.push(estimateContributionEvent({
      eventType: 'matter_raised',
      title: str(row.title) || 'Matter',
      summary: description.slice(0, 240) || null,
      textLen: description.length,
      verified: str(row.visibility) === 'public',
      rawMeta: { visibility: str(row.visibility), lifecycle_status: str(row.lifecycle_status) },
      occurredAt: str(row.created_at),
      sourceTable: 'matters',
      sourceId: str(row.id),
      profileId,
    }));
  }
  for (const row of resources) {
    const summary = str(row.summary);
    events.push(estimateContributionEvent({
      eventType: 'knowledge_resource',
      title: str(row.title) || 'Knowledge resource',
      summary: summary.slice(0, 240) || null,
      textLen: summary.length,
      verified: str(row.status) === 'published',
      rawMeta: { status: str(row.status), proposed: str(row.proposed_by_profile_id) === profileId },
      occurredAt: str(row.created_at),
      sourceTable: 'knowledge_resources',
      sourceId: str(row.id),
      profileId,
    }));
  }
  return events;
}

/** Matters a member raised and knowledge they published or proposed (Phase 4 step 4.2: ledger ⇄ Impact). */
export async function collectCivicContributionSources(profileId: string, client: SupabaseDbClient): Promise<ContributionEvent[]> {
  const [mattersRes, resourcesRes] = await Promise.all([
    client
      .from('matters')
      .select('id, title, description, visibility, lifecycle_status, created_at')
      .eq('initiator_profile_id', profileId)
      .limit(200),
    client
      .from('knowledge_resources')
      .select('id, title, summary, status, proposed_by_profile_id, created_at')
      .or(`publisher_profile_id.eq.${profileId},proposed_by_profile_id.eq.${profileId}`)
      .limit(200),
  ]);
  return civicEventsFromRows(
    profileId,
    (mattersRes.error ? [] : mattersRes.data ?? []) as Row[],
    (resourcesRes.error ? [] : resourcesRes.data ?? []) as Row[],
  );
}

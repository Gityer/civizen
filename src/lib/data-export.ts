import { supabaseUntyped } from '@/integrations/supabase/untyped';
import { downloadTextFile } from '@/lib/funding/interest-csv';

export type DataExportResult = { ok: true } | { ok: false; reason: 'rate_limited' | 'failed' };

/** File name for a member's export, e.g. civizen-data-ana-2026-10-06.json. */
export function dataExportFileName(username: string | null | undefined, now = new Date()): string {
  const slug = (username ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const day = now.toISOString().slice(0, 10);
  return `civizen-data-${slug || 'me'}-${day}.json`;
}

/** Asks the server for everything kept about the caller and saves it as a JSON file. */
export async function downloadMyData(username: string | null | undefined): Promise<DataExportResult> {
  const { data, error } = await supabaseUntyped.rpc('export_my_data');
  if (error) {
    return { ok: false, reason: error.code === '54000' ? 'rate_limited' : 'failed' };
  }
  downloadTextFile(dataExportFileName(username), JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
  return { ok: true };
}

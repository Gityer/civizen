import { Capacitor } from '@capacitor/core';

import { supabase } from '@/integrations/supabase/client';

/** Everything the member has put into Civizen, as one JSON document (Phase 3 step 3.5). */
export async function exportMyData(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') throw new Error('export_empty');
  return data as Record<string, unknown>;
}

/** `civizen-export-<username>-<yyyy-mm-dd>.json`, safe for every file system. */
export function exportFileName(username: string | null | undefined, now: Date = new Date()): string {
  const slug = (username ?? 'member').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'member';
  return `civizen-export-${slug}-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Saves the document where the member can keep it: the browser download on the web, and the
 * system share sheet on the native app (an Android WebView ignores `<a download>` blob links).
 */
export async function saveJson(fileName: string, data: unknown): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    downloadJson(fileName, data);
    return;
  }
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const written = await Filesystem.writeFile({
    path: fileName,
    data: JSON.stringify(data, null, 2),
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({ title: fileName, files: [written.uri] });
}

/** Hands the document to the browser as a download. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

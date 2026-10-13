import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';

const SEEN_KEY = 'civizen.pageViews.seen';

function seenThisSession(path: string): boolean {
  try {
    const seen = new Set<string>(JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? '[]'));
    if (seen.has(path)) return true;
    seen.add(path);
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
    return false;
  } catch {
    return false;
  }
}

/**
 * Counts a page view once per page per browser tab (v2 step B5, decision E4). The server keeps only a daily total
 * per page pattern; nothing identifies the visitor. Fire-and-forget: a failure never affects the page.
 */
export function PageViewRecorder() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (seenThisSession(pathname)) return;
    const timer = window.setTimeout(() => {
      void supabase.rpc('record_page_view', { p_path: pathname }).then(() => undefined, () => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}

import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

type ClientErrorRow = {
  kind: string;
  message: string;
  route: string;
  release_id: string;
  app_version: string;
  occurrences: number;
  last_seen: string;
  stack: string | null;
};

const DAYS = 7;

/** Staff view of the errors members' browsers reported (record_client_error), most frequent first. */
export function ClientErrorsCard() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<ClientErrorRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void supabase.rpc('client_error_summary', { p_days: DAYS }).then(({ data, error }) => {
      if (error) setFailed(true);
      else setRows((data ?? []) as ClientErrorRow[]);
    });
  }, []);

  return (
    <Card className="space-y-2 rounded-2xl border-border/60 p-4 text-sm" data-testid="client-errors-card">
      <h2 className="font-semibold text-foreground">{t('clientErrors.title', { days: String(DAYS) })}</h2>
      <p className="text-xs text-muted-foreground">{t('clientErrors.note')}</p>
      {failed ? <p className="text-xs text-destructive">{t('clientErrors.loadFailed')}</p> : null}
      {rows && rows.length === 0 ? <p className="text-xs text-muted-foreground">{t('clientErrors.empty')}</p> : null}
      {(rows ?? []).slice(0, 20).map((row) => (
        <details key={`${row.kind}|${row.message}|${row.route}|${row.release_id}`} className="border-t border-border/40 pt-1.5 text-xs">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-foreground">{row.message}</span>
              <code className="text-muted-foreground">{row.route}</code>
              <span className="text-muted-foreground"> · {row.app_version} · {row.kind}</span>
            </span>
            <span className="shrink-0 text-right tabular-nums text-muted-foreground">
              {t('clientErrors.times', { count: String(row.occurrences) })}
              <br />
              {t('clientErrors.lastSeen', { time: new Date(row.last_seen).toLocaleString(language || undefined) })}
            </span>
          </summary>
          {row.stack ? <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-muted-foreground">{row.stack}</pre> : null}
        </details>
      ))}
    </Card>
  );
}

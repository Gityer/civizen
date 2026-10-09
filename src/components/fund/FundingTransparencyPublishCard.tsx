import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFundingTransparencyPublish, setFundingTransparencyPublished, type FundingTransparencyPublishRow } from '@/lib/funding/transparency';

/** The one switch that publishes /fund/transparency, now beside the Sources ledger it publishes (Phase 6 step 6.4). */
export function FundingTransparencyPublishCard() {
  const { t } = useLanguage();
  const [state, setState] = useState<FundingTransparencyPublishRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    void getFundingTransparencyPublish().then((result) => {
      if (active && result.ok) setState(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = async () => {
    if (!state) return;
    setBusy(true);
    setMessage(null);
    const result = await setFundingTransparencyPublished(!state.is_published);
    setBusy(false);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.message });
      return;
    }
    setState(result.data);
    setMessage({ kind: 'ok', text: result.data.is_published ? t('fund.ledger.publishOnSuccess') : t('fund.ledger.publishOffSuccess') });
  };

  return (
    <Card className="space-y-3 p-4" data-testid="funding-transparency-publish">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{t('fund.ledger.publishTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('fund.ledger.publishDescription')}</p>
          {state?.published_at ? (
            <p className="mt-1 text-xs text-muted-foreground">{t('fund.ledger.lastPublished')}: {new Date(state.published_at).toLocaleString()}</p>
          ) : null}
        </div>
        <Button type="button" variant={state?.is_published ? 'destructive' : 'default'} disabled={busy || !state} onClick={() => void toggle()}>
          {busy ? t('fund.ledger.publishBusy') : state?.is_published ? t('fund.ledger.unpublish') : t('fund.ledger.publish')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t('fund.ledger.publishHint')}</p>
      {message ? <p className={message.kind === 'ok' ? 'text-sm text-primary' : 'text-sm text-destructive'}>{message.text}</p> : null}
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { BellOff, BellRing } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/push-subscriptions';

/** "Notify this device" on the Notifications page: one web push subscription per browser (Phase 7 step 7.2). */
export function PushDeviceToggle({ profileId }: { profileId: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getPushState().then((value) => {
      if (active) setState(value);
    });
    return () => {
      active = false;
    };
  }, []);

  if (state === 'loading' || state === 'unsupported' || state === 'unconfigured') return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const next = state === 'enabled' ? await disablePush() : await enablePush(profileId);
      setState(next);
      if (next === 'enabled') toast.success(t('notificationCenter.pushEnabled'));
      else if (next === 'denied') toast.error(t('notificationCenter.pushDenied'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notificationCenter.pushFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" size="sm" variant={state === 'enabled' ? 'secondary' : 'outline'} disabled={busy || state === 'denied'} onClick={() => void toggle()} data-testid="push-device-toggle">
      {state === 'enabled' ? <BellOff className="mr-2 h-4 w-4" aria-hidden /> : <BellRing className="mr-2 h-4 w-4" aria-hidden />}
      {state === 'enabled' ? t('notificationCenter.pushDisable') : state === 'denied' ? t('notificationCenter.pushBlocked') : t('notificationCenter.pushEnable')}
    </Button>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { permissionListHasAny } from '@/lib/access-control';
import { loadModerationActions, loadModerationQueue, type ModerationAction, type ModerationQueueItem } from '@/lib/moderation';
import { ModerationActionsList } from '@/pages/moderation/ModerationActionsList';
import { ModerationQueueList } from '@/pages/moderation/ModerationQueueList';

type Tab = 'mine' | 'queue' | 'appeals';

/**
 * Moderation (v2 step A6, decision E2). Every member sees what moderation did to their own content and can appeal
 * once; moderators (content.moderate) also work the report queue and decide appeals of other moderators' decisions.
 */
export default function Moderation() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const isModerator = permissionListHasAny(profile?.effective_permissions ?? [], ['content.moderate']);
  const requested = params.get('tab') as Tab | null;
  const tab: Tab = requested === 'queue' || requested === 'appeals' ? (isModerator ? requested : 'mine') : (isModerator && !requested ? 'queue' : 'mine');

  const [mine, setMine] = useState<ModerationAction[]>([]);
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [appeals, setAppeals] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ownRows, queueRows, appealRows] = await Promise.all([
        loadModerationActions('mine'),
        isModerator ? loadModerationQueue() : Promise.resolve([]),
        isModerator ? loadModerationActions('appeals') : Promise.resolve([]),
      ]);
      setMine(ownRows);
      setQueue(queueRows);
      setAppeals(appealRows);
    } catch {
      // lists stay empty; the empty states say so
    } finally {
      setLoading(false);
    }
  }, [isModerator]);

  useEffect(() => {
    if (profile?.id) void load();
  }, [profile?.id, load]);

  return (
    <AppLayout>
      <div className="space-y-4 px-4 py-6">
        <AppPageHeader
          title={t('moderation.title')}
          subtitle={t('moderation.subtitle')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
          }
        />
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
          <TabsList>
            {isModerator ? <TabsTrigger value="queue">{t('moderation.tabs.queue')} {queue.length ? `(${queue.length})` : ''}</TabsTrigger> : null}
            {isModerator ? <TabsTrigger value="appeals">{t('moderation.tabs.appeals')} {appeals.length ? `(${appeals.length})` : ''}</TabsTrigger> : null}
            <TabsTrigger value="mine">{t('moderation.tabs.mine')}</TabsTrigger>
          </TabsList>
          {loading ? <p className="pt-4 text-sm text-muted-foreground">{t('common.loading')}</p> : (
            <>
              {isModerator ? (
                <TabsContent value="queue" className="pt-3">
                  <ModerationQueueList items={queue} onChanged={() => void load()} />
                </TabsContent>
              ) : null}
              {isModerator ? (
                <TabsContent value="appeals" className="pt-3">
                  <ModerationActionsList actions={appeals} mode="appeals" viewerProfileId={profile?.id} onChanged={() => void load()} />
                </TabsContent>
              ) : null}
              <TabsContent value="mine" className="pt-3">
                <ModerationActionsList actions={mine} mode="mine" onChanged={() => void load()} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

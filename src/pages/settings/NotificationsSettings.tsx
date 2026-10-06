import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NotificationPreferencesCard } from '@/components/settings/NotificationPreferencesCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  countUnread,
  fetchUserNotifications,
  markNotificationsRead,
  notificationLink,
  notificationTitle,
  type UserNotification,
} from '@/lib/user-notifications';

export default function NotificationsSettings() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const profileId = profile?.id ?? null;

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const { data, error } = await fetchUserNotifications(supabase, profileId);
    setFailed(Boolean(error));
    if (!error) setItems(data);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (ids?: string[]) => {
    if (!profileId) return false;
    const { error } = await markNotificationsRead(supabase, profileId, ids);
    if (error) {
      toast.error(t('settings.notificationsPage.loadFailed'));
      return false;
    }
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => (
      !item.readAt && (!ids || ids.includes(item.id)) ? { ...item, readAt } : item
    )));
    return true;
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markRead();
    setMarkingAll(false);
  };

  const unread = countUnread(items);
  const formatter = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.notifications')}
          subtitle={unread > 0 ? t('settings.notificationsPage.unreadCount', { count: unread }) : t('settings.notificationsDescription')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-6 w-6" />
            </div>
          }
        />

        {unread > 0 ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={markingAll} onClick={() => void handleMarkAll()}>
              {markingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('settings.notificationsPage.markAllRead')}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : failed ? (
          <Card className="space-y-3 border-border/80 p-4 text-sm">
            <p>{t('settings.notificationsPage.loadFailed')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              {t('settings.notificationsPage.retry')}
            </Button>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-border/80 p-6 text-center text-sm text-muted-foreground">
            {t('settings.notificationsPage.empty')}
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const href = notificationLink(item);
              return (
                <li key={item.id}>
                  <Card className={`space-y-2 border-border/80 p-4 ${item.readAt ? '' : 'border-l-4 border-l-primary'}`}>
                    <div className="space-y-1">
                      <p className={`text-sm ${item.readAt ? 'text-foreground' : 'font-semibold text-foreground'}`}>{notificationTitle(item, t)}</p>
                      {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
                      <p className="text-xs text-muted-foreground">
                        <time dateTime={item.createdAt}>{formatter.format(new Date(item.createdAt))}</time>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {href ? (
                        <Button type="button" size="sm" variant="secondary" asChild>
                          <Link to={href} onClick={() => { if (!item.readAt) void markRead([item.id]); }}>
                            {t('settings.notificationsPage.open')}
                          </Link>
                        </Button>
                      ) : null}
                      {!item.readAt ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void markRead([item.id])}>
                          {t('settings.notificationsPage.markRead')}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <NotificationPreferencesCard />
      </div>
    </AppLayout>
  );
}

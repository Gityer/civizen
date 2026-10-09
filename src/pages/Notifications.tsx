import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationRoute,
  type AppNotification,
} from '@/lib/notifications';
import { describeNotification } from '@/lib/notification-text';
import { cn } from '@/lib/utils';

function formatWhen(value: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language || 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

/** Pure list; the page loads data and wires navigation. Exported for tests. */
export function NotificationList({
  t,
  language,
  rows,
  onOpen,
}: {
  t: (key: string, params?: Record<string, string>) => string;
  language: string;
  rows: AppNotification[];
  onOpen: (row: AppNotification) => void;
}) {
  if (rows.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        {t('notificationCenter.empty')}
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const route = notificationRoute(row);
        const unread = !row.readAt;
        const text = describeNotification(row, t);
        return (
          <li key={row.id}>
            <Card
              role={route ? 'link' : undefined}
              tabIndex={0}
              className={cn(
                'flex items-start gap-3 rounded-2xl border-border/60 p-4',
                route && 'cursor-pointer transition-shadow hover:shadow-elevated',
                unread && 'border-primary/30 bg-primary/5',
              )}
              data-testid={unread ? 'notification-unread' : 'notification-read'}
              onClick={() => onOpen(row)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen(row);
                }
              }}
            >
              <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm text-foreground', unread && 'font-semibold')}>{text.title}</p>
                {text.body ? <p className="mt-0.5 text-sm text-muted-foreground">{text.body}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{formatWhen(row.createdAt, language)}</p>
              </div>
              {route ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export default function Notifications() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listNotifications();
    setRows(result.rows);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (row: AppNotification) => {
    if (!row.readAt) {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, readAt: new Date().toISOString() } : item)));
      void markNotificationRead(row.id).catch(() => undefined);
    }
    const route = notificationRoute(row);
    if (route) navigate(route);
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setRows((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
    } catch {
      toast.error(t('notificationCenter.markAllFailed'));
    }
  };

  const hasUnread = rows.some((row) => !row.readAt);

  return (
    <AppLayout>
      <div className="flex min-h-0 flex-col px-4 pb-28 pt-4">
        <div className="mb-4">
          <AppPageHeader
            title={t('notificationCenter.title')}
            subtitle={t('notificationCenter.subtitle')}
            leading={<Bell className="h-5 w-5 text-primary" aria-hidden />}
            fallbackPath="/"
            actions={
              hasUnread ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void markAll()}>
                  <CheckCheck className="mr-2 h-4 w-4" aria-hidden />
                  {t('notificationCenter.markAllRead')}
                </Button>
              ) : null
            }
          />
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{t('notificationCenter.loadFailed')}</p>
        ) : (
          <NotificationList t={t} language={language} rows={rows} onOpen={(row) => void open(row)} />
        )}
      </div>
    </AppLayout>
  );
}

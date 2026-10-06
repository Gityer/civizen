import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { unreadNotificationCount } from '@/lib/notifications';
import { cn } from '@/lib/utils';

const REFRESH_MS = 60_000;

/** Unread-count bell for the floating app chrome. Polls on mount, every minute, and on focus. */
export function NotificationBell({ profileId }: { profileId: string | undefined }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const active = location.pathname === '/notifications';

  useEffect(() => {
    if (!profileId) {
      setUnread(0);
      return undefined;
    }
    let cancelled = false;
    const refresh = () => {
      void unreadNotificationCount()
        .then((count) => {
          if (!cancelled) setUnread(count);
        })
        .catch(() => undefined);
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [profileId, location.pathname]);

  const label = unread > 0
    ? t('notificationCenter.bellWithCount', { count: String(unread) })
    : t('notificationCenter.bell');

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn(
        'relative h-10 w-10 rounded-full border border-border/60 bg-card/60',
        active && 'border-primary/30 bg-primary/10 text-primary',
      )}
      onClick={() => navigate('/notifications')}
      aria-label={label}
      title={label}
      data-testid="app-top-chrome-notifications"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
          aria-hidden
        >
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Button>
  );
}

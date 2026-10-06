import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { countUnreadNotifications, formatUnreadBadge } from '@/lib/user-notifications';
import { cn } from '@/lib/utils';

const NOTIFICATIONS_PATH = '/settings/notifications';

/**
 * Bell in the top chrome. Counts unread rows of `user_notifications` and refreshes when a new one
 * arrives (realtime, own rows only), when the route changes and when the app regains focus.
 */
export function NotificationsBell({ profileId }: { profileId: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const active = location.pathname === NOTIFICATIONS_PATH;

  const refresh = useCallback(async () => {
    const { count, error } = await countUnreadNotifications(supabase, profileId);
    if (!error) setUnread(count);
  }, [profileId]);

  useEffect(() => {
    void refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    const channel = supabase
      .channel(`user-notifications:${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications', filter: `recipient_profile_id=eq.${profileId}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      window.removeEventListener('focus', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [profileId, refresh]);

  const badge = formatUnreadBadge(unread);
  const label = badge
    ? t('settings.notificationsPage.bellLabelUnread', { count: unread })
    : t('settings.notificationsPage.bellLabel');

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn(
        'relative h-10 w-10 rounded-full border border-border/60 bg-card/60',
        active && 'border-primary/30 bg-primary/10 text-primary',
      )}
      onClick={() => navigate(NOTIFICATIONS_PATH)}
      aria-label={label}
      data-testid="app-top-chrome-notifications"
    >
      <Bell className="h-4 w-4" />
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-destructive-foreground"
        >
          {badge}
        </span>
      ) : null}
    </Button>
  );
}

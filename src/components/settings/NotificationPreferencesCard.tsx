import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/notification-preferences';

/** Which kinds of event notify the member; saved as soon as a switch changes. */
export function NotificationPreferencesCard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const profileId = profile?.id ?? null;
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void loadNotificationPreferences(profileId).then((next) => {
      if (cancelled) return;
      setPreferences(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const update = async (next: NotificationPreferences) => {
    if (!profileId) return;
    const previous = preferences;
    setPreferences(next);
    const { error } = await saveNotificationPreferences(profileId, next);
    if (error) {
      setPreferences(previous);
      toast.error(t('settings.notificationPreferences.saveFailed'));
    }
  };

  return (
    <Card className="space-y-4 border-border/80 p-4" data-testid="notification-preferences-card">
      <p className="text-sm font-semibold text-foreground">{t('settings.notificationPreferences.title')}</p>
      {NOTIFICATION_CATEGORIES.map((category) => (
        <div key={category} className="flex items-start gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor={`notify-${category}`} className="text-sm text-foreground">
              {t(`settings.notificationPreferences.${category}`)}
            </Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(`settings.notificationPreferences.${category}Hint`)}
            </p>
          </div>
          <Switch
            id={`notify-${category}`}
            checked={preferences[category]}
            disabled={!loaded}
            onCheckedChange={(checked) => void update({ ...preferences, [category]: checked })}
          />
        </div>
      ))}
    </Card>
  );
}

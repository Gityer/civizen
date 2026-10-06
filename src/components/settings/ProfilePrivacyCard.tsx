import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DEFAULT_PROFILE_PRIVACY,
  MESSAGE_PERMISSIONS,
  loadProfilePrivacy,
  saveProfilePrivacy,
  type MessagePermission,
  type ProfilePrivacySettings,
} from '@/lib/profile-privacy';

const PERMISSION_LABEL_KEYS: Record<MessagePermission, string> = {
  everyone: 'settings.profilePrivacy.messageEveryone',
  endorsement_ties: 'settings.profilePrivacy.messageTies',
  nobody: 'settings.profilePrivacy.messageNobody',
};

/** Directory listing and who may start a new conversation; saved as soon as it changes. */
export function ProfilePrivacyCard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const profileId = profile?.id ?? null;
  const [settings, setSettings] = useState<ProfilePrivacySettings>(DEFAULT_PROFILE_PRIVACY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void loadProfilePrivacy(profileId).then((next) => {
      if (cancelled) return;
      setSettings(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const update = async (next: ProfilePrivacySettings) => {
    if (!profileId) return;
    const previous = settings;
    setSettings(next);
    const { error } = await saveProfilePrivacy(profileId, next);
    if (error) {
      setSettings(previous);
      toast.error(t('settings.profilePrivacy.saveFailed'));
      return;
    }
    toast.success(t('settings.profilePrivacy.saved'));
  };

  return (
    <Card className="space-y-4 border-border/80 p-4" data-testid="profile-privacy-card">
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1">
          <Label htmlFor="privacy-hide-directory" className="text-sm font-semibold text-foreground">
            {t('settings.profilePrivacy.hideTitle')}
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.profilePrivacy.hideBody')}</p>
        </div>
        <Switch
          id="privacy-hide-directory"
          checked={settings.hideFromDirectory}
          disabled={!loaded}
          onCheckedChange={(checked) => void update({ ...settings, hideFromDirectory: checked })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="privacy-message-permission" className="text-sm font-semibold text-foreground">
          {t('settings.profilePrivacy.messageTitle')}
        </Label>
        <Select
          value={settings.messagePermission}
          disabled={!loaded}
          onValueChange={(value) => void update({ ...settings, messagePermission: value as MessagePermission })}
        >
          <SelectTrigger id="privacy-message-permission"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESSAGE_PERMISSIONS.map((option) => (
              <SelectItem key={option} value={option}>{t(PERMISSION_LABEL_KEYS[option])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('settings.profilePrivacy.messageHint')}</p>
      </div>
    </Card>
  );
}

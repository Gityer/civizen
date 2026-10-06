import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { listBlockedProfiles, unblockProfile, type BlockedProfile } from '@/lib/profile-blocks';

export default function SafetySettings() {
  const { t } = useLanguage();
  const [blocked, setBlocked] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listBlockedProfiles();
    setFailed(Boolean(error));
    setBlocked(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUnblock = async (profileId: string) => {
    setBusyId(profileId);
    const { error } = await unblockProfile(profileId);
    setBusyId(null);
    if (error) {
      toast.error(t('settings.safetyPage.unblockFailed'));
      return;
    }
    setBlocked((current) => current.filter((item) => item.profileId !== profileId));
    toast.success(t('settings.safetyPage.unblocked'));
  };

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.safety')}
          subtitle={t('settings.safetyDescription')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
          }
        />

        <Card className="space-y-3 border-border/80 p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{t('settings.safetyPage.blockedTitle')}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.safetyPage.blockedBody')}</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-4" role="status" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : failed ? (
            <p className="text-sm text-muted-foreground">{t('settings.safetyPage.loadFailed')}</p>
          ) : blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.safetyPage.blockedEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {blocked.map((item) => {
                const name = item.fullName || item.username || t('settings.safetyPage.unknownPerson');
                return (
                  <li key={item.profileId} className="flex items-center gap-3 py-2">
                    <Avatar className="h-9 w-9">
                      {item.avatarUrl ? <AvatarImage src={item.avatarUrl} alt="" /> : null}
                      <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      {item.username ? <p className="truncate text-xs text-muted-foreground">@{item.username}</p> : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.profileId}
                      onClick={() => void handleUnblock(item.profileId)}
                      aria-label={`${t('settings.safetyPage.unblock')}: ${name}`}
                    >
                      {busyId === item.profileId ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.safetyPage.unblock')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-1 border-border/80 p-4">
          <h2 className="text-sm font-semibold text-foreground">{t('settings.safetyPage.reportTitle')}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.safetyPage.reportBody')}</p>
        </Card>

        <Card className="space-y-3 border-border/80 p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{t('settings.safetyPage.messagingTitle')}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.safetyPage.messagingBody')}</p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/settings/messaging-security">{t('settings.safetyPage.openMessaging')}</Link>
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}

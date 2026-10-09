import { useCallback, useEffect, useState } from 'react';
import { Landmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { acceptCivicFramework, loadMyCivicStatus, type CivicStatusLayers as CivicStatus } from '@/lib/civic-status-service';

function formatDate(value: string | null, language: string): string {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(language || 'en', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

/**
 * Civic status layers (Phase 3 step 3.1): registered member → verified member → citizen. A verified
 * member becomes a citizen 30 days after verification, or 14 days after it once they accept the
 * civic framework here. Badges stay separate from roles.
 */
export function CivicStatusCard() {
  const { profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const [status, setStatus] = useState<CivicStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setStatus(await loadMyCivicStatus());
  }, [profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!profile?.id || !status) return null;

  const accept = async () => {
    setBusy(true);
    try {
      await acceptCivicFramework();
      toast.success(t('editProfile.civicStatus.accepted'));
      await load();
      await refreshProfile();
    } catch {
      toast.error(t('editProfile.civicStatus.acceptFailed'));
    } finally {
      setBusy(false);
    }
  };

  const isCitizen = status.citizenshipStatus === 'citizen';
  const body = isCitizen
    ? t('editProfile.civicStatus.citizenBody', { date: formatDate(status.citizenshipAcceptedAt, language) })
    : !status.isVerified
      ? t('editProfile.civicStatus.registeredBody')
      : status.civicFrameworkAcceptedAt
        ? t('editProfile.civicStatus.verifiedAcceptedBody', { date: formatDate(status.citizenshipDueAt, language) })
        : t('editProfile.civicStatus.verifiedBody', { date: formatDate(status.citizenshipDueAt, language) });

  return (
    <Card className="space-y-3 rounded-3xl border-border/60 p-5 shadow-sm" data-testid="civic-status-card">
      <div className="flex flex-wrap items-center gap-2">
        <Landmark className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">{t('editProfile.civicStatus.title')}</h2>
        <Badge variant="outline" className="rounded-full" data-testid="civic-status-badge">
          {t(`editProfile.civicStatus.status.${status.citizenshipStatus}`)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
      {status.isVerified && !isCitizen && !status.civicFrameworkAcceptedAt ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('editProfile.civicStatus.acceptHint')}</p>
          <Button type="button" size="sm" disabled={busy} onClick={() => void accept()} data-testid="accept-civic-framework">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('editProfile.civicStatus.acceptAction')}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

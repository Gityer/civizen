import type { ReactNode } from 'react';
import { Bell, Eye, MapPin, ShieldCheck, Vote } from 'lucide-react';

/** "How civic voting works" fold on the civic voting hub: what applies now vs. what is planned. */
export function CivicVotingHowItWorks({ t }: { t: (key: string) => string }) {
  return (
    <div className="space-y-3">
      <FeatureChip
        icon={<Vote className="h-4 w-4" />}
        title={t('civicVoting.features.ordinaryTitle')}
        body={t('civicVoting.features.ordinaryBody')}
      />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{t('civicVoting.features.plannedTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('civicVoting.features.plannedBody')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FeatureChip
          icon={<ShieldCheck className="h-4 w-4" />}
          title={t('civicVoting.features.identityTitle')}
          body={t('civicVoting.features.identityBody')}
        />
        <FeatureChip
          icon={<Bell className="h-4 w-4" />}
          title={t('civicVoting.features.pushTitle')}
          body={t('civicVoting.features.pushBody')}
        />
        <FeatureChip
          icon={<MapPin className="h-4 w-4" />}
          title={t('civicVoting.features.homeTitle')}
          body={t('civicVoting.features.homeBody')}
        />
        <FeatureChip
          icon={<Eye className="h-4 w-4" />}
          title={t('civicVoting.features.transparencyTitle')}
          body={t('civicVoting.features.transparencyBody')}
        />
      </div>
    </div>
  );
}

function FeatureChip({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

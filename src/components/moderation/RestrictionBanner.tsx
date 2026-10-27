import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadEnforcementActions, strongestRestriction, type EnforcementAction } from '@/lib/member-enforcement';
import { restrictionCache } from '@/components/moderation/restriction-banner-cache';

/**
 * Tells a restricted member, on every page, what a moderation decision stops them from doing and until when, with
 * the way to Moderation where they can read why and appeal (PM decision TD2).
 */
export function RestrictionBanner() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [restriction, setRestriction] = useState<EnforcementAction | null>(null);

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) {
      setRestriction(null);
      return;
    }
    const cached = restrictionCache.get(profileId);
    if (cached) {
      setRestriction(strongestRestriction(cached));
      return;
    }
    let active = true;
    void loadEnforcementActions('mine').then(
      (actions) => {
        restrictionCache.set(profileId, actions);
        if (active) setRestriction(strongestRestriction(actions));
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [profile?.id]);

  if (!restriction?.endsAt) return null;
  const date = new Date(restriction.endsAt).toLocaleString(language || undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div role="status" data-testid="restriction-banner"
      className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-foreground">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <p className="min-w-0">
        {t(`memberEnforcement.banner.${restriction.step}`, { date })}{' '}
        <Link to="/moderation?tab=mine" className="font-medium text-primary underline-offset-2 hover:underline">
          {t('memberEnforcement.banner.open')}
        </Link>
      </p>
    </div>
  );
}

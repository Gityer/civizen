import { EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import { isReasonCode } from '@/lib/moderation';

/** Shown to the author (and moderators) on an item moderation hid; others never receive the item. */
export function ModerationHiddenNotice({ hiddenAt, reason }: { hiddenAt?: string | null; reason?: string | null }) {
  const { t } = useLanguage();
  if (!hiddenAt) return null;
  const reasonLabel = reason && isReasonCode(reason) ? t(`moderation.reasons.${reason}`) : t('moderation.reasons.other');
  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground"
      role="note"
      data-testid="moderation-hidden-notice"
    >
      <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{t('moderation.hiddenBanner', { reason: reasonLabel })}</span>
      <Link to="/moderation" className="font-medium text-primary hover:underline">
        {t('moderation.hiddenBannerLink')}
      </Link>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

/** Marks seeded demonstration programs and their items (decision D5); they are hidden from browse lists. */
export function DemoBadge() {
  const { t } = useLanguage();
  return (
    <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" data-testid="demo-badge">
      {t('contribute.demoBadge')}
    </Badge>
  );
}

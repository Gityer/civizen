import { useSyncExternalStore } from 'react';
import { Type } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getReadingPreferences,
  setReadingPreferences,
  subscribeReadingPreferences,
  type ReadingPreferences,
} from '@/lib/reading-preferences';

const FIELDS = [
  {
    field: 'textSize',
    labelKey: 'settings.readingTextSize',
    options: { default: 'settings.readingTextSizes.default', large: 'settings.readingTextSizes.large', larger: 'settings.readingTextSizes.larger' },
  },
  {
    field: 'contrast',
    labelKey: 'settings.readingContrast',
    options: { standard: 'settings.readingContrasts.standard', high: 'settings.readingContrasts.high' },
  },
  {
    field: 'motion',
    labelKey: 'settings.readingMotion',
    options: { device: 'settings.readingMotions.device', reduce: 'settings.readingMotions.reduce' },
  },
] as const;

/** Settings › Reading: text size, contrast and motion for this device (see `reading-preferences.ts`). */
export function ReadingPreferencesCard() {
  const { t } = useLanguage();
  const prefs = useSyncExternalStore(subscribeReadingPreferences, getReadingPreferences, getReadingPreferences);

  return (
    <Card className="p-4" data-testid="reading-preferences">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Type className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{t('settings.readingTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('settings.readingDescription')}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {FIELDS.map(({ field, labelKey, options }) => (
          <label key={field} className="space-y-1 text-sm text-muted-foreground">
            <span>{t(labelKey)}</span>
            <Select value={prefs[field]} onValueChange={(value) => setReadingPreferences({ [field]: value } as Partial<ReadingPreferences>)}>
              <SelectTrigger aria-label={t(labelKey)} data-testid={`reading-${field}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(options).map(([value, key]) => (
                  <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ))}
      </div>
    </Card>
  );
}

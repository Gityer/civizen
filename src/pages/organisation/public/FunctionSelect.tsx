import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PublicFunction } from '@/lib/public-functions';
import { DIVISION_KEYS, byDivision } from '@/pages/organisation/public/groups';

/** A function picker grouped by division. */
export function FunctionSelect({ functions, value, onChange, label, testId }: {
  functions: readonly PublicFunction[];
  value: string;
  onChange: (functionKey: string) => void;
  label: string;
  testId?: string;
}) {
  const { t } = useLanguage();
  return (
    <Select value={value || 'none'} onValueChange={(next) => onChange(next === 'none' ? '' : next)}>
      <SelectTrigger aria-label={label} data-testid={testId}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{t('organisation.public.finder.chooseFunction')}</SelectItem>
        {byDivision(functions).map((group) => (
          <SelectGroup key={group.code}>
            <SelectLabel>{DIVISION_KEYS[group.code] ? t(DIVISION_KEYS[group.code]) : group.name}</SelectLabel>
            {group.functions.map((fn) => <SelectItem key={fn.functionKey} value={fn.functionKey}>{fn.name}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

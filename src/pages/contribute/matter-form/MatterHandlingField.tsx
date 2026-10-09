import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/contexts/LanguageContext';
import { MATTER_HANDLINGS, type MatterHandling } from '@/pages/contribute/matter-form/matter-handling';

type Props = { value: MatterHandling; onChange: (value: MatterHandling) => void; disabled?: boolean };

/**
 * One way to raise a problem (Phase 4 step 4.1): the Matter is always the entry; this chooses how it is handled.
 * "AI council" also opens a Solutions problem linked to the Matter; "community project" continues to the challenge
 * form prefilled from the Matter.
 */
export function MatterHandlingField({ value, onChange, disabled }: Props) {
  const { t } = useLanguage();
  return (
    <fieldset className="space-y-2" data-testid="matter-handling">
      <legend className="text-sm font-medium text-foreground">{t('contribute.matters.handling.label')}</legend>
      <RadioGroup value={value} onValueChange={(next) => onChange(next as MatterHandling)} disabled={disabled} className="gap-2">
        {MATTER_HANDLINGS.map((handling) => (
          <label key={handling} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3 has-[[data-state=checked]]:border-primary">
            <RadioGroupItem value={handling} id={`matter-handling-${handling}`} className="mt-0.5" />
            <span className="space-y-0.5">
              <Label htmlFor={`matter-handling-${handling}`} className="cursor-pointer text-sm font-medium text-foreground">
                {t(`contribute.matters.handling.${handling}`)}
              </Label>
              <span className="block text-xs text-muted-foreground">{t(`contribute.matters.handling.${handling}Hint`)}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

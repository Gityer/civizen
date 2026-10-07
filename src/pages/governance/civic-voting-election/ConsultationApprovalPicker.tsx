import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Translate = (key: string, params?: Record<string, string>) => string;

/**
 * Approval ballot: the member toggles up to `max` options, then casts them together.
 * The draft starts from the member's current picks so a change is one click away.
 */
export function ConsultationApprovalPicker({
  options, selected, max, disabled, casting, onCast, t,
}: {
  options: Array<{ key: string; label: string }>;
  selected: string[];
  max: number;
  disabled: boolean;
  casting: boolean;
  onCast: (keys: string[]) => void;
  t: Translate;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  useEffect(() => setDraft(selected), [selected]);

  const toggle = (key: string) => {
    setDraft((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= max) return current;
      return [...current, key];
    });
  };
  const unchanged = draft.length === selected.length && draft.every((key) => selected.includes(key));

  return (
    <div className="space-y-2" data-testid="consultation-approval">
      <p className="text-xs text-muted-foreground">{t('civicBallot.approvalHint', { max: String(max) })}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const picked = draft.includes(option.key);
          const full = !picked && draft.length >= max;
          return (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={picked ? 'default' : 'outline'}
              aria-pressed={picked}
              disabled={disabled || casting || full}
              onClick={() => toggle(option.key)}
            >
              {picked ? <Check className="mr-1 h-3.5 w-3.5" aria-hidden /> : null}
              {option.label}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {t('civicBallot.approvalSelected', { count: String(draft.length), max: String(max) })}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={disabled || casting || draft.length === 0 || unchanged}
          onClick={() => onCast(draft)}
          data-testid="consultation-cast-approval"
        >
          {casting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('civicBallot.castBallot')}
        </Button>
      </div>
    </div>
  );
}

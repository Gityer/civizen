import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Translate = (key: string, params?: Record<string, string>) => string;

/**
 * Ranked ballot: the member taps options in order of preference (the first tap is the first
 * choice); tapping a ranked option removes it. Partial rankings are allowed.
 */
export function ConsultationRankedPicker({
  options, selected, disabled, casting, onCast, t,
}: {
  options: Array<{ key: string; label: string }>;
  selected: string[];
  disabled: boolean;
  casting: boolean;
  onCast: (keys: string[]) => void;
  t: Translate;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  useEffect(() => setDraft(selected), [selected]);

  const toggle = (key: string) => {
    setDraft((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };
  const unchanged = draft.length === selected.length && draft.every((key, index) => selected[index] === key);

  return (
    <div className="space-y-2" data-testid="consultation-ranked">
      <p className="text-xs text-muted-foreground">{t('civicBallot.rankedHint')}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const rank = draft.indexOf(option.key);
          return (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={rank >= 0 ? 'default' : 'outline'}
              aria-pressed={rank >= 0}
              disabled={disabled || casting}
              onClick={() => toggle(option.key)}
            >
              {rank >= 0 ? (
                <span className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/30 px-1 text-[10px] font-semibold" aria-label={t('civicBallot.rankedRank', { rank: String(rank + 1) })}>
                  {rank + 1}
                </span>
              ) : null}
              {option.label}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={disabled || casting || draft.length === 0} onClick={() => setDraft([])}>
          {t('civicBallot.clearRanking')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || casting || draft.length === 0 || unchanged}
          onClick={() => onCast(draft)}
          data-testid="consultation-cast-ranked"
        >
          {casting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('civicBallot.castBallot')}
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Circle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  dismissFirstSteps,
  firstSteps,
  isFirstStepsDismissed,
  loadFirstSteps,
  type FirstStepsState,
} from '@/lib/first-steps';

/**
 * Getting started (v2 step B4): the few first steps that make Civizen useful, each one tap away. Hidden once every
 * step is done or when the member closes it.
 */
export function HomeFirstSteps({ profileId }: { profileId?: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<FirstStepsState | null>(null);
  const [dismissed, setDismissed] = useState(isFirstStepsDismissed);

  useEffect(() => {
    if (!profileId || dismissed) return;
    let active = true;
    void loadFirstSteps().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [profileId, dismissed]);

  if (!state || dismissed) return null;
  const steps = firstSteps(state);
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;

  return (
    <Card className="space-y-3 rounded-2xl border-border/60 p-4 shadow-sm" data-testid="home-first-steps">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('firstSteps.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('firstSteps.progress', { done: String(done), total: String(steps.length) })}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={t('firstSteps.dismiss')} title={t('firstSteps.dismiss')}
          onClick={() => {
            dismissFirstSteps();
            setDismissed(true);
          }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.key}>
            <Link to={step.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50" data-testid={`first-step-${step.key}`} data-done={step.done ? 'true' : 'false'}>
              {step.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className={step.done ? 'text-sm text-muted-foreground line-through' : 'text-sm font-medium text-foreground'}>{t(`firstSteps.steps.${step.key}.title`)}</span>
                {!step.done ? <span className="block text-xs text-muted-foreground">{t(`firstSteps.steps.${step.key}.hint`)}</span> : null}
                {step.key === 'vote' && state.voted ? (
                  <span className="block text-xs text-muted-foreground">{t(state.voteCounts ? 'firstSteps.voteCounts' : 'firstSteps.voteAdvisory')}</span>
                ) : null}
              </span>
              {!step.done ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

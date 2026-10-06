import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  buildFirstRunSteps,
  dismissFirstRun,
  isFirstRunComplete,
  isFirstRunDismissed,
  type FirstRunStepId,
} from '@/lib/first-run-checklist';
import { cn } from '@/lib/utils';
import type { useHome } from '@/pages/home/useHome';

type HomeModel = ReturnType<typeof useHome>;

const STEP_LABEL_KEYS: Record<FirstRunStepId, string> = {
  photo: 'home.firstRunPhoto',
  bio: 'home.firstRunBio',
  background: 'home.firstRunBackground',
  post: 'home.firstRunPost',
  endorse: 'home.firstRunEndorse',
};

/** Short checklist on Home for new members; hides itself once done or dismissed. */
export function HomeFirstRunChecklist({ model }: { model: HomeModel }) {
  const { profile, t, navigate, loading, skillCount, experienceCount, postEditorRef } = model;
  const profileId = profile?.id ?? null;
  const [dismissed, setDismissed] = useState(() => (profileId ? isFirstRunDismissed(profileId) : true));
  const [counts, setCounts] = useState<{ posts: number; endorsements: number } | null>(null);

  useEffect(() => {
    if (!profileId || dismissed) return;
    let cancelled = false;
    void Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', profileId),
      supabase.from('endorsements').select('id', { count: 'exact', head: true }).eq('endorser_id', profileId),
    ]).then(([posts, endorsements]) => {
      if (cancelled) return;
      setCounts({ posts: posts.count ?? 0, endorsements: endorsements.count ?? 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [profileId, dismissed]);

  const steps = useMemo(
    () =>
      buildFirstRunSteps({
        avatarUrl: profile?.avatar_url,
        bio: profile?.bio,
        skillCount,
        experienceCount,
        postCount: counts?.posts ?? 0,
        endorsementsGivenCount: counts?.endorsements ?? 0,
      }),
    [profile?.avatar_url, profile?.bio, skillCount, experienceCount, counts],
  );

  if (!profileId || dismissed || loading || !counts || isFirstRunComplete(steps)) return null;

  const openStep = (id: FirstRunStepId) => {
    if (id === 'photo' || id === 'bio') navigate('/settings/profile');
    else if (id === 'background') navigate('/profile');
    else if (id === 'endorse') navigate('/endorse/select');
    else postEditorRef.current?.focus();
  };

  const doneCount = steps.filter((step) => step.done).length;

  return (
    <Card className="border-primary/30 bg-primary/5 p-4 shadow-sm" data-testid="home-first-run">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('home.firstRunTitle')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('home.firstRunProgress', { done: doneCount, total: steps.length })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground"
          aria-label={t('home.firstRunDismiss')}
          title={t('home.firstRunDismiss')}
          onClick={() => {
            dismissFirstRun(profileId);
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-3 space-y-1">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              disabled={step.done}
              onClick={() => openStep(step.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                step.done ? 'text-muted-foreground line-through' : 'text-foreground hover:bg-primary/10',
              )}
            >
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              {t(STEP_LABEL_KEYS[step.id])}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

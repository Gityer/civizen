import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LEARNING_PATH_IDS, getLearningPath, nextLessonId, pathProgress } from '@/lib/study/learning-paths';
import { loadCompletedLessonKeys } from '@/lib/study/learning-progress';

/** The three real learning paths (Phase 5 step 5.1) with each member's progress. */
export default function StudyLearningPaths() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const profileId = profile?.id ?? '';
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    void loadCompletedLessonKeys(profileId).then((keys) => {
      if (active) setCompleted(keys);
    });
    return () => {
      active = false;
    };
  }, [profileId]);

  return (
    <div className="space-y-4" data-testid="study-learning-paths">
      <p className="text-sm text-muted-foreground">{t('studyPaths.intro')}</p>
      <div className="grid gap-3 md:grid-cols-3">
        {LEARNING_PATH_IDS.map((id) => {
          const path = getLearningPath(id, language);
          const progress = pathProgress(id, completed);
          const minutes = path.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
          const cta = progress.done ? 'studyPaths.review' : progress.completed > 0 ? 'studyPaths.continue' : 'studyPaths.start';
          return (
            <Card key={id} className="flex flex-col gap-3 border-border/70 bg-card/95 p-4 shadow-sm" data-testid={`study-path-${id}`}>
              <div className="flex items-start justify-between gap-2">
                <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {progress.done ? <Badge className="rounded-full">{t('studyPaths.completed')}</Badge> : null}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{path.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{path.summary}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('studyPaths.lessonsCount', { count: path.lessons.length, minutes })}</p>
              <div className="space-y-1">
                <Progress value={progress.percent} aria-label={t('studyPaths.progressLabel', { percent: progress.percent })} />
                <p className="text-xs text-muted-foreground">{t('studyPaths.progressText', { completed: progress.completed, total: progress.total })}</p>
              </div>
              <Button asChild size="sm" className="mt-auto">
                <Link to={`/study/paths/${id}/${nextLessonId(id, completed)}`}>{t(cta)}</Link>
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

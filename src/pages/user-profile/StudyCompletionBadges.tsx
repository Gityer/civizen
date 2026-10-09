import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLearningPath, isLearningPathId } from '@/lib/study/learning-paths';
import { loadStudyCompletions, type StudyCompletion } from '@/lib/study/learning-progress';

/** Learning paths a member completed, on the public profile (Phase 5 step 5.2). Renders nothing when there are none. */
export function StudyCompletionBadges({ profileId }: { profileId: string }) {
  const { t, language } = useLanguage();
  const [completions, setCompletions] = useState<StudyCompletion[]>([]);

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    void loadStudyCompletions(profileId).then((rows) => {
      if (active) setCompletions(rows);
    });
    return () => {
      active = false;
    };
  }, [profileId]);

  const items = completions
    .map((completion) => ({ id: completion.key.slice('path:'.length), earnedAt: completion.earnedAt }))
    .filter((item) => isLearningPathId(item.id));
  if (items.length === 0) return null;

  return (
    <section className="space-y-2" data-testid="study-completion-badges">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('studyPaths.profileBadgesTitle')}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link key={item.id} to={`/study/paths/${item.id}`}>
            <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 text-xs">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              {isLearningPathId(item.id) ? getLearningPath(item.id, language).title : item.id}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}

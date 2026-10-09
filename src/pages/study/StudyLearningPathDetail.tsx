import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LEARNING_PATH_SOURCES, getLearningPath, isLearningPathId, lessonKey, pathProgress } from '@/lib/study/learning-paths';
import { loadCompletedLessonKeys, markLessonComplete } from '@/lib/study/learning-progress';
import { cn } from '@/lib/utils';

/** Paragraphs render as text; consecutive "- " lines become one list. */
function LessonBody({ body }: { body: string[] }) {
  const blocks: Array<{ kind: 'p'; text: string } | { kind: 'ul'; items: string[] }> = [];
  for (const paragraph of body) {
    if (paragraph.startsWith('- ')) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === 'ul') last.items.push(paragraph.slice(2));
      else blocks.push({ kind: 'ul', items: [paragraph.slice(2)] });
    } else {
      blocks.push({ kind: 'p', text: paragraph });
    }
  }
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {blocks.map((block, index) =>
        block.kind === 'p' ? (
          <p key={index}>{block.text}</p>
        ) : (
          <ul key={index} className="list-disc space-y-1 pl-5">
            {block.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ),
      )}
    </div>
  );
}

export default function StudyLearningPathDetail() {
  const { pathId, lessonId } = useParams<{ pathId: string; lessonId?: string }>();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

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

  const path = useMemo(() => (isLearningPathId(pathId) ? getLearningPath(pathId, language) : null), [pathId, language]);
  if (!isLearningPathId(pathId) || !path) return <Navigate to="/study/paths" replace />;
  const index = Math.max(0, path.lessons.findIndex((lesson) => lesson.id === lessonId));
  const lesson = path.lessons[index];
  if (!lessonId || lesson.id !== lessonId) return <Navigate to={`/study/paths/${pathId}/${lesson.id}`} replace />;
  const progress = pathProgress(pathId, completed);
  const isDone = completed.has(lessonKey(pathId, lesson.id));
  const next = path.lessons[index + 1] ?? null;
  const previous = path.lessons[index - 1] ?? null;

  const complete = async () => {
    setSaving(true);
    try {
      const result = await markLessonComplete(pathId, lesson.id);
      setCompleted((current) => new Set([...current, lessonKey(pathId, lesson.id)]));
      if (result?.pathCompleted) toast.success(t('studyPaths.pathCompleted'));
      if (next) navigate(`/study/paths/${pathId}/${next.id}`);
    } catch {
      toast.error(t('studyPaths.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="study-learning-path-detail">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/study/paths"><ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />{t('studyPaths.backToPaths')}</Link>
        </Button>
        <p className="text-xs text-muted-foreground">{t('studyPaths.progressText', { completed: progress.completed, total: progress.total })}</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{path.title}</h2>
        <Progress value={progress.percent} className="mt-2" aria-label={t('studyPaths.progressLabel', { percent: progress.percent })} />
      </div>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <nav aria-label={path.title} className="space-y-1">
          {path.lessons.map((item, itemIndex) => {
            const done = completed.has(lessonKey(pathId, item.id));
            return (
              <Link
                key={item.id}
                to={`/study/paths/${pathId}/${item.id}`}
                aria-current={item.id === lesson.id ? 'page' : undefined}
                className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60', item.id === lesson.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground')}
              >
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]', done ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                  {done ? <Check className="h-3 w-3" aria-hidden="true" /> : itemIndex + 1}
                </span>
                <span className="min-w-0 truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
        <Card className="space-y-4 border-border/70 bg-card/95 p-4 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('studyPaths.lessonOf', { n: index + 1, total: path.lessons.length })} · {t('study.estimatedMinutes', { minutes: lesson.minutes })}</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{lesson.title}</h3>
          </div>
          <LessonBody body={lesson.body} />
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {previous ? (
              <Button asChild variant="outline" size="sm"><Link to={`/study/paths/${pathId}/${previous.id}`}><ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />{t('studyPaths.previous')}</Link></Button>
            ) : null}
            {isDone ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Check className="h-4 w-4 text-primary" aria-hidden="true" />{t('studyPaths.completedLesson')}</span>
            ) : (
              <Button type="button" size="sm" disabled={saving || !profileId} onClick={() => void complete()} data-testid="study-lesson-complete">
                {next ? t('studyPaths.markCompleteNext') : t('studyPaths.markComplete')}
              </Button>
            )}
            {isDone && next ? (
              <Button asChild size="sm"><Link to={`/study/paths/${pathId}/${next.id}`}>{t('studyPaths.next')}<ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link></Button>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">{t('studyPaths.sources')}</p>
            <ul className="mt-1 space-y-0.5">
              {LEARNING_PATH_SOURCES[pathId].map((source) => (
                <li key={source.label}>{source.href ? <Link to={source.href} className="underline-offset-2 hover:underline">{source.label}</Link> : source.label}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

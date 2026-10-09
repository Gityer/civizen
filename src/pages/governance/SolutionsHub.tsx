import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lightbulb, Loader2, MessageSquareText, Plus } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { takeWellbeingHandoff } from '@/lib/happiness/insights/handoff';
import { listSolutionAuthorities } from '@/lib/solution-authorities';
import { categorizeSolutionIssue } from '@/lib/solution-categorize';
import {
  createSolutionProblem,
  invokeSolutionsCouncil,
  isMissingSolutionsBackend,
  listSolutionProblems,
  type SolutionProblem,
} from '@/lib/solutions-api';
import type { SolutionIssueMode, SolutionProblemStatus } from '@/lib/solutions-constants';
import { toast } from 'sonner';

import { createMatterRecord, resolveOfficialCivizenMatterActor } from '@/lib/matters-api';
import { linkSolutionProblemToMatter } from '@/lib/matter-links';

function statusBadgeVariant(status: SolutionProblemStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'consensus' || status === 'resolved' || status === 'accepted') return 'default';
  if (status === 'split' || status === 'seeking_professional' || status === 'routed') return 'secondary';
  if (status === 'debating' || status === 'in_progress' || status === 'categorizing') return 'outline';
  if (status === 'closed') return 'destructive';
  return 'outline';
}

export default function SolutionsHub() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState<SolutionProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingBackend, setMissingBackend] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [showAuthorities, setShowAuthorities] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<SolutionIssueMode>('discuss');
  const [submitting, setSubmitting] = useState(false);

  const previewCategory = useMemo(
    () => categorizeSolutionIssue(title, body),
    [title, body],
  );

  usePageMeta({
    title: t('solutions.metaTitle'),
    description: t('solutions.metaDescription'),
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { problems: rows, error } = await listSolutionProblems();
    if (error && isMissingSolutionsBackend(error)) {
      setMissingBackend(true);
      setProblems([]);
    } else if (error) {
      toast.error(t('solutions.loadFailed'));
      setProblems([]);
    } else {
      setMissingBackend(false);
      setProblems(rows);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handoff = takeWellbeingHandoff();
    if (!handoff) return;
    setTitle(handoff.title);
    setBody(`${handoff.problemStatement}\n\n${handoff.evidenceLinks}\n\n${handoff.contextDetail}`);
    setComposerOpen(true);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile?.id) {
      toast.error(t('solutions.signInRequired'));
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (trimmedTitle.length < 3 || trimmedBody.length < 10) {
      toast.error(t('solutions.composerValidation'));
      return;
    }
    setSubmitting(true);
    const { problem, error } = await createSolutionProblem({
      authorId: profile.id,
      title: trimmedTitle,
      body: trimmedBody,
      mode,
    });
    if (error || !problem) {
      toast.error(t('solutions.createFailed'));
      setSubmitting(false);
      return;
    }
    // One way to raise a problem (step 4.1): the problem is also a public Matter addressed to the community.
    try {
      const community = await resolveOfficialCivizenMatterActor();
      if (community) {
        const matterId = await createMatterRecord({
          title: trimmedTitle,
          description: trimmedBody,
          matterType: 'discussion',
          initiatorKind: 'person',
          initiatorProfileId: profile.id,
          addresseeKind: community.kind,
          addresseeProfileId: community.profileId,
          visibility: 'public',
          scopeKind: 'global',
        });
        await linkSolutionProblemToMatter(problem.id, matterId);
      }
    } catch (linkError) {
      console.warn('Solutions problem created without its Matter', linkError);
    }
    setTitle('');
    setBody('');
    setMode('discuss');
    setComposerOpen(false);
    toast.success(
      mode === 'discuss' ? t('solutions.createStartedDiscuss') : t('solutions.createStartedSolve'),
    );
    if (problem.mode === 'discuss') {
      void invokeSolutionsCouncil(problem.id).then(({ error: invokeError }) => {
        if (invokeError) {
          console.warn('[solutions] council invoke failed', invokeError);
        }
      });
    }
    setSubmitting(false);
    navigate(`/governance/solutions/${problem.id}`);
  }

  const authorities = listSolutionAuthorities();

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 px-3 pb-24 pt-2 sm:px-4">
        <AppPageHeader
          title={t('solutions.title')}
          subtitle={t('solutions.subtitle')}
          leading={<Lightbulb className="h-5 w-5 text-primary" />}
          actions={
            <Button
              type="button"
              size="sm"
              onClick={() => setComposerOpen((open) => !open)}
              disabled={missingBackend}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('solutions.postProblem')}
            </Button>
          }
        />

        <p className="text-xs text-muted-foreground">{t('solutions.disclaimer')}</p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowAuthorities((v) => !v)}
          >
            {showAuthorities ? t('solutions.hideAuthorities') : t('solutions.browseAuthorities')}
          </Button>
        </div>

        {showAuthorities ? (
          <Card className="space-y-3 rounded-2xl border-border/60 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">{t('solutions.authoritiesTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('solutions.authoritiesIntro')}</p>
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {authorities.map((authority) => (
                <li key={authority.id} className="rounded-xl border border-border/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{authority.name}</p>
                    <Badge variant="outline">{t(`solutions.tier.${authority.tier}`)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{authority.responsibilities}</p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {composerOpen ? (
          <Card className="space-y-3 rounded-2xl border-border/60 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">{t('solutions.composerTitle')}</h2>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === 'discuss' ? 'default' : 'outline'}
                  onClick={() => setMode('discuss')}
                  disabled={submitting}
                >
                  {t('solutions.mode.discuss')}
                </Button>
                <Button
                  type="button"
                  variant={mode === 'solve' ? 'default' : 'outline'}
                  onClick={() => setMode('solve')}
                  disabled={submitting}
                >
                  {t('solutions.mode.solve')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === 'discuss' ? t('solutions.mode.discussHint') : t('solutions.mode.solveHint')}
              </p>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('solutions.titlePlaceholder')}
                maxLength={200}
                disabled={submitting}
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('solutions.bodyPlaceholder')}
                rows={5}
                maxLength={8000}
                disabled={submitting}
              />
              {(title.trim().length >= 3 || body.trim().length >= 10) && (
                <p className="text-xs text-muted-foreground">
                  {t('solutions.suggestedAuthority')}:{' '}
                  <span className="font-medium text-foreground">{previewCategory.authority.name}</span>
                  {' · '}
                  {Math.round(previewCategory.confidence * 100)}%
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('solutions.submitProblem')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setComposerOpen(false)}
                >
                  {t('solutions.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {missingBackend ? (
          <Card className="rounded-2xl border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            {t('solutions.backendMissing')}
          </Card>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('solutions.loading')}
          </div>
        ) : null}

        {!loading && !missingBackend && problems.length === 0 ? (
          <Card className="rounded-2xl border-border/60 p-6 text-center shadow-sm">
            <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('solutions.empty')}</p>
          </Card>
        ) : null}

        <ul className="space-y-3">
          {problems.map((problem) => (
            <li key={problem.id}>
              <Link to={`/governance/solutions/${problem.id}`} className="block">
                <Card className="rounded-2xl border-border/60 p-4 shadow-sm transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                      {problem.title}
                    </h2>
                    <Badge variant={statusBadgeVariant(problem.status)}>
                      {t(`solutions.status.${problem.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{t(`solutions.mode.${problem.mode}`)}</Badge>
                    {problem.authorityName ? (
                      <Badge variant="secondary">{problem.authorityName}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{problem.body}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {problem.authorName || t('solutions.anonymousCitizen')} ·{' '}
                    {new Date(problem.createdAt).toLocaleString()}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppLayout>
  );
}

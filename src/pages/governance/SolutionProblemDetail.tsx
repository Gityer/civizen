import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ThumbsUp } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  addSolutionComment,
  getSolutionProblem,
  invokeSolutionsCouncil,
  isMissingSolutionsBackend,
  listSolutionComments,
  listSolutionProposals,
  listSolutionRoutingEvents,
  listSolutionTurns,
  subscribeSolutionProblem,
  toggleProposalEndorsement,
  type SolutionComment,
  type SolutionProblem,
  type SolutionProposal,
  type SolutionRoutingEvent,
  type SolutionTurn,
} from '@/lib/solutions-api';
import { getSolutionAuthority } from '@/lib/solution-authorities';
import {
  SOLUTION_AGENT_DISPLAY_NAMES,
  isSolutionAgentSpeaker,
  resolveSolutionAgentAvatarUrl,
  type SolutionProblemStatus,
} from '@/lib/solutions-constants';
import { toast } from 'sonner';
import { HumanOutcomeLinks } from '@/pages/wellbeing/HumanOutcomeLinks';

function statusBadgeVariant(status: SolutionProblemStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'consensus' || status === 'resolved' || status === 'accepted') return 'default';
  if (status === 'split' || status === 'seeking_professional' || status === 'routed') return 'secondary';
  if (status === 'debating' || status === 'in_progress' || status === 'categorizing') return 'outline';
  if (status === 'closed') return 'destructive';
  return 'outline';
}

function speakerLabel(turn: SolutionTurn, t: (key: string) => string): string {
  if (turn.speaker === 'citizen') return t('solutions.citizen');
  if (isSolutionAgentSpeaker(turn.speaker)) return SOLUTION_AGENT_DISPLAY_NAMES[turn.speaker];
  return turn.speaker;
}

export default function SolutionProblemDetail() {
  const { problemId = '' } = useParams();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [problem, setProblem] = useState<SolutionProblem | null>(null);
  const [turns, setTurns] = useState<SolutionTurn[]>([]);
  const [proposals, setProposals] = useState<SolutionProposal[]>([]);
  const [comments, setComments] = useState<SolutionComment[]>([]);
  const [routingEvents, setRoutingEvents] = useState<SolutionRoutingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [missingBackend, setMissingBackend] = useState(false);

  usePageMeta({
    title: problem?.title ? `${problem.title} — ${t('solutions.title')}` : t('solutions.metaTitle'),
    description: t('solutions.metaDescription'),
  });

  const refresh = useCallback(async () => {
    if (!problemId) return;
    const [problemRes, turnsRes, proposalsRes, commentsRes, routingRes] = await Promise.all([
      getSolutionProblem(problemId),
      listSolutionTurns(problemId),
      listSolutionProposals(problemId, profile?.id),
      listSolutionComments(problemId),
      listSolutionRoutingEvents(problemId),
    ]);

    const firstError =
      problemRes.error ||
      turnsRes.error ||
      proposalsRes.error ||
      commentsRes.error ||
      routingRes.error;
    if (firstError && isMissingSolutionsBackend(firstError)) {
      setMissingBackend(true);
      setLoading(false);
      return;
    }

    setMissingBackend(false);
    setProblem(problemRes.problem);
    setTurns(turnsRes.turns);
    setProposals(proposalsRes.proposals);
    setComments(commentsRes.comments);
    setRoutingEvents(routingRes.events);
    setLoading(false);
  }, [problemId, profile?.id]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!problemId) return;
    return subscribeSolutionProblem(problemId, {
      onTurn: () => void refresh(),
      onProblem: () => void refresh(),
      onProposal: () => void refresh(),
      onRouting: () => void refresh(),
    });
  }, [problemId, refresh]);

  async function onComment(event: FormEvent) {
    event.preventDefault();
    if (!profile?.id || !problemId) return;
    const body = commentBody.trim();
    if (!body) return;
    setCommentSubmitting(true);
    const { error } = await addSolutionComment({
      problemId,
      authorId: profile.id,
      body,
    });
    setCommentSubmitting(false);
    if (error) {
      toast.error(t('solutions.commentFailed'));
      return;
    }
    setCommentBody('');
    void refresh();
  }

  async function onEndorse(proposal: SolutionProposal) {
    if (!profile?.id) {
      toast.error(t('solutions.signInRequired'));
      return;
    }
    const { error } = await toggleProposalEndorsement({
      proposalId: proposal.id,
      profileId: profile.id,
      currentlyEndorsed: proposal.endorsedByMe,
    });
    if (error) {
      toast.error(t('solutions.endorseFailed'));
      return;
    }
    void refresh();
  }

  async function onContinueDebate() {
    if (!problemId) return;
    setContinuing(true);
    const { error } = await invokeSolutionsCouncil(problemId, { continue: true });
    setContinuing(false);
    if (error) {
      toast.error(t('solutions.continueFailed'));
      return;
    }
    void refresh();
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 px-3 pb-24 pt-2 sm:px-4">
        <AppPageHeader
          title={problem?.title ?? t('solutions.title')}
          fallbackPath="/governance/solutions"
          actions={
            problem ? (
              <Badge variant={statusBadgeVariant(problem.status)}>
                {t(`solutions.status.${problem.status}`)}
              </Badge>
            ) : undefined
          }
        />

        {problem ? <HumanOutcomeLinks governanceSolutionId={problem.id} /> : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('solutions.loading')}
          </div>
        ) : null}

        {missingBackend ? (
          <Card className="rounded-2xl border-dashed p-4 text-sm text-muted-foreground">
            {t('solutions.backendMissing')}
          </Card>
        ) : null}

        {!loading && !problem && !missingBackend ? (
          <Card className="rounded-2xl p-4 text-sm text-muted-foreground">
            {t('solutions.notFound')}
          </Card>
        ) : null}

        {problem ? (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline">{t(`solutions.mode.${problem.mode}`)}</Badge>
                {problem.authorityName ? (
                  <Badge variant="secondary">{problem.authorityName}</Badge>
                ) : null}
                {problem.matterId ? (
                  <Button type="button" size="sm" variant="link" className="h-auto px-1 py-0 text-xs" asChild>
                    <Link to={`/contribute/matters/${problem.matterId}`}>{t('solutions.openMatter')}</Link>
                  </Button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{problem.body}</p>
              <p className="text-[11px] text-muted-foreground">
                {problem.authorName || t('solutions.anonymousCitizen')} ·{' '}
                {new Date(problem.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{t('solutions.disclaimer')}</p>
            </div>

            <Card className="space-y-2 rounded-2xl border-border/60 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">{t('solutions.routingTitle')}</h2>
              {(() => {
                const authority = getSolutionAuthority(problem.authorityId);
                return (
                  <>
                    <p className="text-sm text-foreground">
                      <span className="text-muted-foreground">{t('solutions.redirectedTo')}: </span>
                      {problem.authorityName || t('solutions.authorityPending')}
                    </p>
                    {authority ? (
                      <p className="text-xs text-muted-foreground">{authority.responsibilities}</p>
                    ) : null}
                    {problem.routingNote ? (
                      <p className="text-xs text-muted-foreground">{problem.routingNote}</p>
                    ) : null}
                  </>
                );
              })()}
              {routingEvents.length > 0 ? (
                <ul className="space-y-1 border-t border-border/40 pt-2">
                  {routingEvents.map((event) => (
                    <li key={event.id} className="text-[11px] text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()} ·{' '}
                      {t(`solutions.status.${event.toStatus}`)}
                      {event.note ? ` — ${event.note}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            {problem.status === 'debating' ? (
              <Card className="flex items-center gap-2 rounded-2xl border-border/60 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                {t('solutions.debatingHint')}
              </Card>
            ) : null}

            {problem.mode === 'discuss' && (problem.status === 'split' || problem.status === 'open') ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={continuing}
                onClick={() => void onContinueDebate()}
              >
                {continuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('solutions.continueDebate')}
              </Button>
            ) : null}

            {problem.mode === 'discuss' || turns.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t('solutions.discussion')}</h2>
              {turns.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('solutions.noTurnsYet')}</p>
              ) : null}
              <ul className="space-y-3">
                {turns.map((turn) => {
                  const avatar = resolveSolutionAgentAvatarUrl(turn.speaker);
                  const action = turn.stance.action;
                  return (
                    <li key={turn.id}>
                      <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {avatar ? <AvatarImage src={avatar} alt="" /> : null}
                            <AvatarFallback>
                              {speakerLabel(turn, t).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {speakerLabel(turn, t)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {t('solutions.round', { round: String(turn.round) })}
                              {action ? ` · ${t(`solutions.action.${action}`)}` : ''}
                            </p>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">{turn.content}</p>
                        {turn.stance.proposal_summary ? (
                          <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {t('solutions.proposalSummary')}:{' '}
                            </span>
                            {turn.stance.proposal_summary}
                          </p>
                        ) : null}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
            ) : null}

            {proposals.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">{t('solutions.solutionsHeading')}</h2>
                <ul className="space-y-3">
                  {proposals.map((proposal) => (
                    <li key={proposal.id}>
                      <Card className="space-y-2 rounded-2xl border-border/60 p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{proposal.title}</h3>
                          <Badge variant="outline">{t(`solutions.source.${proposal.source}`)}</Badge>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">{proposal.body}</p>
                        {proposal.supportingSpeakers.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            {t('solutions.supportedBy')}:{' '}
                            {proposal.supportingSpeakers
                              .map((s) => SOLUTION_AGENT_DISPLAY_NAMES[s])
                              .join(', ')}
                          </p>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant={proposal.endorsedByMe ? 'default' : 'outline'}
                          onClick={() => void onEndorse(proposal)}
                        >
                          <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                          {t('solutions.endorse')} ({proposal.endorsementCount})
                        </Button>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t('solutions.citizenComments')}</h2>
              <ul className="space-y-2">
                {comments.map((comment) => (
                  <li key={comment.id}>
                    <Card className="rounded-xl border-border/50 p-3">
                      <p className="text-xs font-medium text-foreground">
                        {comment.authorName || t('solutions.anonymousCitizen')}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                        {comment.body}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
              <form className="space-y-2" onSubmit={onComment}>
                <Textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder={t('solutions.commentPlaceholder')}
                  rows={3}
                  maxLength={4000}
                  disabled={commentSubmitting}
                />
                <Button type="submit" size="sm" disabled={commentSubmitting || !commentBody.trim()}>
                  {commentSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('solutions.postComment')}
                </Button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

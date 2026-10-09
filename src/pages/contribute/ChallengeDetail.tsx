import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { DemoBadge } from '@/components/contribute/DemoBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  canCompleteChallenge,
  canSelectProposal,
  canSubmitProposal,
  publicChallengeStage,
  type ChallengeProposal,
  type CommunityChallenge,
  type ContributionProgram,
  type ImplementationProject,
  type ProposalPayload,
  type SolutionRecord,
} from '@/lib/challenges';
import {
  completeCommunityChallenge,
  createImplementationOpportunity,
  getCommunityChallenge,
  getContributionProgram,
  getImplementationProjectForChallenge,
  getMyChallengeProposal,
  getSolutionRecordForChallenge,
  linkImplementationOpportunity,
  listChallengeProposalIdentities,
  listChallengeProposals,
  listProjectOpportunities,
  listUnlinkedCoordinatorOpportunities,
  recordChallengeOutcome,
  selectChallengeProposal,
  setCommunityChallengeStatus,
  submitChallengeProposal,
  type ChallengeProposalIdentity,
} from '@/lib/challenges-api';
import { listCurrentAreas } from '@/lib/classification';
import type { KnowledgeSpace } from '@/lib/knowledge';
import { listManagedKnowledgeSpaces, publishSolutionRecordAsResource } from '@/lib/knowledge-api';
import { HumanOutcomeLinks } from '@/pages/wellbeing/HumanOutcomeLinks';
import { profileCanManagePublisher } from '@/lib/opportunities';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';
import { RelatedAgreementsCard } from '@/components/agreements/RelatedAgreementsCard';
type ProjectOpportunity = { id: string; title: string; status: string; summary: string };
const emptyProposal: ProposalPayload = {
  title: '',
  rationale: '',
  expectedResult: '',
  implementationApproach: '',
  resourcesNeeded: '',
  risks: '',
  supportingEvidence: '',
};
export default function ChallengeDetail() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';

  const [challenge, setChallenge] = useState<CommunityChallenge | null>(null);
  const [program, setProgram] = useState<ContributionProgram | null>(null);
  const [proposals, setProposals] = useState<ChallengeProposal[]>([]);
  const [mine, setMine] = useState<ChallengeProposal | null>(null);
  const [project, setProject] = useState<ImplementationProject | null>(null);
  const [solution, setSolution] = useState<SolutionRecord | null>(null);
  const [opportunities, setOpportunities] = useState<ProjectOpportunity[]>([]);
  const [linkable, setLinkable] = useState<ProjectOpportunity[]>([]);
  const [identities, setIdentities] = useState<ChallengeProposalIdentity[]>([]);
  const [ownedLinkedIds, setOwnedLinkedIds] = useState<string[]>([]);
  const [proposalForm, setProposalForm] = useState(emptyProposal);
  const [showProposalDetails, setShowProposalDetails] = useState(false);
  const [showChallengeDetails, setShowChallengeDetails] = useState(false);
  const [oppTitle, setOppTitle] = useState('');
  const [oppSummary, setOppSummary] = useState('');
  const [oppEffort, setOppEffort] = useState('');
  const [linkId, setLinkId] = useState('');
  const [outcomeSummary, setOutcomeSummary] = useState('');
  const [outcomeEvidence, setOutcomeEvidence] = useState('');
  const [criteriaResult, setCriteriaResult] = useState('');
  const [lessons, setLessons] = useState('');
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
  const [shareSpaceId, setShareSpaceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const failToast = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'request_failed';
    const key = `contribute.challenges.errors.${message}`;
    const translated = tRef.current(key);
    toast.error(translated === key ? tRef.current('contribute.challenges.actionFailed') : translated);
  };

  const load = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      setOwnedLinkedIds(linked);
      const row = await getCommunityChallenge(challengeId);
      setChallenge(row);
      if (!row) return;
      const manages = profileCanManagePublisher({
        currentProfileId: profileId,
        publisherProfileId: row.publisherProfileId,
        ownedLinkedProfileIds: linked,
      });
      const [programRow, proposalRows, mineRow, projectRow, solutionRow] = await Promise.all([
        getContributionProgram(row.programId),
        listChallengeProposals(challengeId),
        profileId ? getMyChallengeProposal(challengeId, profileId) : Promise.resolve(null),
        getImplementationProjectForChallenge(challengeId),
        getSolutionRecordForChallenge(challengeId),
      ]);
      setProgram(programRow);
      setProposals(proposalRows);
      setMine(mineRow);
      setProject(projectRow);
      setSolution(solutionRow);
      setOutcomeSummary(row.outcomeSummary ?? '');
      setOutcomeEvidence(row.outcomeEvidence ?? '');
      setCriteriaResult(row.successCriteriaResult ?? '');
      setLessons(row.lessonsLearned ?? '');
      if (projectRow) {
        setOpportunities(await listProjectOpportunities(projectRow.id));
      } else {
        setOpportunities([]);
      }
      if (manages) {
        const [ids, unlinked] = await Promise.all([
          listChallengeProposalIdentities(challengeId),
          listUnlinkedCoordinatorOpportunities([row.publisherProfileId, ...linked]),
        ]);
        setIdentities(ids);
        setLinkable(unlinked);
        setKnowledgeSpaces(await listManagedKnowledgeSpaces([row.publisherProfileId, ...linked]));
      } else {
        setIdentities([]);
        setLinkable([]);
        setKnowledgeSpaces([]);
      }
    } catch {
      toast.error(tRef.current('contribute.challenges.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [challengeId, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const manages = profileCanManagePublisher({
    currentProfileId: profileId,
    publisherProfileId: challenge?.publisherProfileId ?? '',
    ownedLinkedProfileIds: ownedLinkedIds,
  });
  const areaName = useMemo(() => {
    if (!challenge?.areaNodeId) return null;
    return listCurrentAreas().find((node) => node.id === challenge.areaNodeId)?.displayName ?? null;
  }, [challenge?.areaNodeId]);

  const selected = proposals.find((row) => row.id === challenge?.selectedProposalId) ?? null;
  const canPropose = challenge
    ? canSubmitProposal({
        challenge,
        currentProfileId: profileId,
        ownedLinkedProfileIds: ownedLinkedIds,
        existingProposal: mine,
      }).ok
    : false;
  const completeCheck = challenge
    ? canCompleteChallenge({ challenge: { ...challenge, outcomeSummary }, project })
    : { ok: false as const, reason: 'challenge_not_in_implementation' };

  const run = async (action: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(t(successKey));
      await load();
    } catch (error) {
      failToast(error);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 py-6">
          <AppPageHeader title={t('contribute.challenges.missingTitle')} fallbackPath="/contribute/challenges" />
          <p className="text-sm text-muted-foreground">{t('contribute.challenges.missingBody')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={challenge.title}
          titleAccessory={challenge.isDemo ? <DemoBadge /> : undefined}
          subtitle={challenge.problemStatement}
          fallbackPath="/contribute/challenges"
          actions={
            manages && challenge.status !== 'completed' ? (
              <Button size="sm" variant="outline" onClick={() => navigate(`/contribute/challenges/${challenge.id}/edit`)}>
                {t('common.edit')}
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.challenges.stage.${publicChallengeStage(challenge.status)}`)}
          </Badge>
          {program ? (
            <span className="text-xs text-muted-foreground">
              {t('contribute.challenges.programName')}: {program.title}
            </span>
          ) : null}
        </div>

        <RelatedAgreementsCard
          entityType="challenge"
          entityId={challenge.id}
          entityTitle={challenge.title}
          launch={{
            source: 'pilot',
            agreementType: 'pilot',
            relatedTitle: program ? `${challenge.title} · ${program.title}` : challenge.title,
          }}
        />
        {project ? (
          <RelatedAgreementsCard
            entityType="project"
            entityId={project.id}
            entityTitle={project.title}
            launch={{ source: 'project', agreementType: 'general' }}
          />
        ) : null}

        <Card className="space-y-3 border-border/70 bg-card/95 p-4">
          <p className="text-sm text-foreground">{challenge.whyItMatters}</p>
          {challenge.affected ? (
            <p className="text-sm text-muted-foreground">{challenge.affected}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {[areaName, challenge.scope].filter(Boolean).join(' · ')}
          </p>
          <div>
            <h2 className="text-sm font-medium">{t('contribute.challenges.criteriaLabel')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{challenge.successCriteria}</p>
          </div>
        </Card>

        <Collapsible open={showChallengeDetails} onOpenChange={setShowChallengeDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.challenges.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 text-sm text-muted-foreground">
            {challenge.evidenceLinks ? <p>{challenge.evidenceLinks}</p> : null}
            {challenge.constraints ? <p>{challenge.constraints}</p> : null}
            {challenge.resources ? <p>{challenge.resources}</p> : null}
            {challenge.contextDetail ? <p>{challenge.contextDetail}</p> : null}
          </CollapsibleContent>
        </Collapsible>

        {selected ? (
          <Card className="space-y-2 border-border/70 bg-card/95 p-4">
            <h2 className="text-sm font-medium">{t('contribute.challenges.selectedSolution')}</h2>
            <p className="font-medium">{selected.title}</p>
            <p className="text-sm text-muted-foreground">{selected.expectedResult}</p>
          </Card>
        ) : null}

        {mine && !manages ? (
          <Card className="space-y-2 border-border/70 bg-card/95 p-4">
            <h2 className="text-sm font-medium">{t('contribute.challenges.yourProposal')}</h2>
            <p className="font-medium">{mine.title}</p>
            <Badge variant="outline" className="rounded-full">
              {t(`contribute.challenges.proposalStatus.${mine.status}`)}
            </Badge>
            <p className="text-sm text-muted-foreground">{mine.rationale}</p>
          </Card>
        ) : null}

        {canPropose ? (
          <Card className="space-y-3 border-border/70 bg-card/95 p-4">
            <h2 className="text-sm font-medium">{t('contribute.challenges.propose')}</h2>
            <div className="space-y-2">
              <Label htmlFor="pr-title">{t('contribute.challenges.proposeTitle')}</Label>
              <Input
                id="pr-title"
                value={proposalForm.title}
                onChange={(event) => setProposalForm((current) => ({ ...current, title: event.target.value }))}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-why">{t('contribute.challenges.rationaleLabel')}</Label>
              <Textarea
                id="pr-why"
                value={proposalForm.rationale}
                onChange={(event) => setProposalForm((current) => ({ ...current, rationale: event.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-result">{t('contribute.challenges.resultLabel')}</Label>
              <Textarea
                id="pr-result"
                value={proposalForm.expectedResult}
                onChange={(event) => setProposalForm((current) => ({ ...current, expectedResult: event.target.value }))}
                rows={3}
              />
            </div>
            <Collapsible open={showProposalDetails} onOpenChange={setShowProposalDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {t('contribute.challenges.moreDetails')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <Textarea
                  value={proposalForm.implementationApproach ?? ''}
                  onChange={(event) =>
                    setProposalForm((current) => ({ ...current, implementationApproach: event.target.value }))
                  }
                  placeholder={t('contribute.challenges.approachLabel')}
                  rows={2}
                />
                <Input
                  value={proposalForm.resourcesNeeded ?? ''}
                  onChange={(event) =>
                    setProposalForm((current) => ({ ...current, resourcesNeeded: event.target.value }))
                  }
                  placeholder={t('contribute.challenges.neededLabel')}
                />
                <Input
                  value={proposalForm.risks ?? ''}
                  onChange={(event) => setProposalForm((current) => ({ ...current, risks: event.target.value }))}
                  placeholder={t('contribute.challenges.risksLabel')}
                />
                <Textarea
                  value={proposalForm.supportingEvidence ?? ''}
                  onChange={(event) =>
                    setProposalForm((current) => ({ ...current, supportingEvidence: event.target.value }))
                  }
                  placeholder={t('contribute.challenges.supportLabel')}
                  rows={2}
                />
              </CollapsibleContent>
            </Collapsible>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await submitChallengeProposal(challenge.id, proposalForm);
                }, 'contribute.challenges.proposalSubmitted')
              }
            >
              {t('contribute.challenges.submitProposal')}
            </Button>
          </Card>
        ) : null}

        {project ? (
          <Card className="space-y-3 border-border/70 bg-card/95 p-4">
            <h2 className="text-sm font-medium">{t('contribute.challenges.implementationTitle')}</h2>
            <p className="font-medium">{project.title}</p>
            <p className="text-sm text-muted-foreground">{project.summary}</p>
            {project.keySteps ? <p className="text-sm text-muted-foreground">{project.keySteps}</p> : null}
            <h3 className="pt-1 text-sm font-medium">{t('contribute.challenges.opportunitiesTitle')}</h3>
            {opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('contribute.challenges.noOpportunities')}</p>
            ) : (
              <div className="grid gap-2">
                {opportunities.map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    to={`/contribute/professional/${opportunity.id}`}
                    className="rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <p className="font-medium">{opportunity.title}</p>
                    <p className="text-muted-foreground">{opportunity.summary}</p>
                    <p className="mt-1 text-xs font-medium text-primary">
                      {t('contribute.challenges.joinWork')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {challenge.status === 'completed' && (challenge.outcomeSummary || solution) ? (
          <Card className="space-y-3 border-border/70 bg-card/95 p-4">
            <h2 className="text-sm font-medium">{t('contribute.challenges.solutionTitle')}</h2>
            <p className="text-sm">{solution?.implementedSolution || selected?.title}</p>
            <p className="text-sm text-muted-foreground">{solution?.outcome || challenge.outcomeSummary}</p>
            {solution?.contributors ? (
              <p className="text-sm text-muted-foreground">
                {t('contribute.challenges.contributors')}: {solution.contributors}
              </p>
            ) : null}
            {solution?.lessonsLearned || challenge.lessonsLearned ? (
              <p className="text-sm text-muted-foreground">
                {solution?.lessonsLearned || challenge.lessonsLearned}
              </p>
            ) : null}
            {solution?.reuseNotes ? (
              <p className="text-sm text-muted-foreground">{solution.reuseNotes}</p>
            ) : null}
            <HumanOutcomeLinks challengeId={challenge.id} projectId={project?.id} />
            {solution?.knowledgeResourceId && solution.knowledgeSpaceId ? (
              <Link
                to={`/contribute/knowledge/${solution.knowledgeSpaceId}/resources/${solution.knowledgeResourceId}`}
                className="text-sm font-medium text-primary"
              >
                {t('contribute.challenges.openKnowledgeResource')}
              </Link>
            ) : manages && knowledgeSpaces.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('contribute.challenges.knowledgeLater')}</p>
                <Select value={shareSpaceId || undefined} onValueChange={setShareSpaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('contribute.challenges.chooseSpace')} />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeSpaces.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={busy || !shareSpaceId || !solution}
                  onClick={() =>
                    void run(async () => {
                      if (!solution) return;
                      await publishSolutionRecordAsResource(solution.id, shareSpaceId);
                    }, 'contribute.challenges.solutionShared')
                  }
                >
                  {t('contribute.challenges.shareAsKnowledge')}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('contribute.challenges.knowledgeLater')}</p>
            )}
          </Card>
        ) : null}

        {manages ? (
          <Card className="space-y-4 border-border/70 bg-card/95 p-4">
            <h2 className="text-sm font-medium">{t('contribute.challenges.coordinate')}</h2>
            {challenge.status === 'draft' ? (
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await setCommunityChallengeStatus(challenge.id, 'active');
                  }, 'contribute.challenges.published')
                }
              >
                {t('contribute.challenges.publish')}
              </Button>
            ) : null}
            {challenge.status === 'active' ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await setCommunityChallengeStatus(challenge.id, 'proposal_review');
                  }, 'contribute.challenges.reviewStarted')
                }
              >
                {t('contribute.challenges.startReview')}
              </Button>
            ) : null}

            {(challenge.status === 'active' || challenge.status === 'proposal_review') && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium">{t('contribute.challenges.proposalsTitle')}</h2>
                {proposals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('contribute.challenges.noProposals')}</p>
                ) : (
                  proposals.map((proposal) => {
                    const identity = identities.find((row) => row.proposalId === proposal.id);
                    const selectable = canSelectProposal({
                      challenge,
                      proposal,
                      challengeId: challenge.id,
                    }).ok;
                    return (
                      <div key={proposal.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{proposal.title}</p>
                          <Badge variant="outline" className="rounded-full">
                            {t(`contribute.challenges.proposalStatus.${proposal.status}`)}
                          </Badge>
                        </div>
                        {identity ? (
                          <Link to={`/user/${identity.profileId}`} className="text-xs text-muted-foreground underline">
                            {identity.displayName}
                          </Link>
                        ) : null}
                        <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
                        <p className="text-sm text-muted-foreground">{proposal.expectedResult}</p>
                        {selectable ? (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await selectChallengeProposal(proposal.id);
                              }, 'contribute.challenges.proposalSelected')
                            }
                          >
                            {t('contribute.challenges.selectProposal')}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {challenge.status === 'implementation' && project ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="opp-title">{t('contribute.challenges.opportunityTitle')}</Label>
                  <Input id="opp-title" value={oppTitle} onChange={(event) => setOppTitle(event.target.value)} />
                  <Label htmlFor="opp-summary">{t('contribute.challenges.opportunitySummary')}</Label>
                  <Textarea
                    id="opp-summary"
                    value={oppSummary}
                    onChange={(event) => setOppSummary(event.target.value)}
                    rows={2}
                  />
                  <Input
                    value={oppEffort}
                    onChange={(event) => setOppEffort(event.target.value)}
                    placeholder={t('contribute.challenges.opportunityEffort')}
                  />
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await createImplementationOpportunity(project.id, {
                          title: oppTitle,
                          summary: oppSummary,
                          estimatedEffort: oppEffort || null,
                        });
                        setOppTitle('');
                        setOppSummary('');
                        setOppEffort('');
                      }, 'contribute.challenges.opportunityCreated')
                    }
                  >
                    {t('contribute.challenges.createOpportunity')}
                  </Button>
                </div>
                {linkable.length > 0 ? (
                  <div className="space-y-2">
                    <Label>{t('contribute.challenges.linkOpportunity')}</Label>
                    <Select value={linkId || undefined} onValueChange={setLinkId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('contribute.challenges.chooseOpportunity')} />
                      </SelectTrigger>
                      <SelectContent>
                        {linkable.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !linkId}
                      onClick={() =>
                        void run(async () => {
                          await linkImplementationOpportunity(project.id, linkId);
                          setLinkId('');
                        }, 'contribute.challenges.opportunityLinked')
                      }
                    >
                      {t('contribute.challenges.linkOpportunity')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('contribute.challenges.linkNone')}</p>
                )}
                <div className="space-y-2">
                  <h2 className="text-sm font-medium">{t('contribute.challenges.outcomeTitle')}</h2>
                  <Label htmlFor="out-summary">{t('contribute.challenges.outcomeSummary')}</Label>
                  <Textarea
                    id="out-summary"
                    value={outcomeSummary}
                    onChange={(event) => setOutcomeSummary(event.target.value)}
                    rows={3}
                  />
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {t('contribute.challenges.moreDetails')}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      <Textarea
                        value={outcomeEvidence}
                        onChange={(event) => setOutcomeEvidence(event.target.value)}
                        placeholder={t('contribute.challenges.outcomeEvidence')}
                        rows={2}
                      />
                      <Textarea
                        value={criteriaResult}
                        onChange={(event) => setCriteriaResult(event.target.value)}
                        placeholder={t('contribute.challenges.criteriaResult')}
                        rows={2}
                      />
                      <Textarea
                        value={lessons}
                        onChange={(event) => setLessons(event.target.value)}
                        placeholder={t('contribute.challenges.lessons')}
                        rows={2}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await recordChallengeOutcome(challenge.id, {
                            outcomeSummary,
                            outcomeEvidence,
                            successCriteriaResult: criteriaResult,
                            lessonsLearned: lessons,
                          });
                        }, 'contribute.challenges.outcomeSaved')
                      }
                    >
                      {t('contribute.challenges.saveOutcome')}
                    </Button>
                    <Button
                      disabled={busy || !completeCheck.ok}
                      onClick={() =>
                        void run(async () => {
                          if (!challenge.outcomeSummary && outcomeSummary.trim()) {
                            await recordChallengeOutcome(challenge.id, {
                              outcomeSummary,
                              outcomeEvidence,
                              successCriteriaResult: criteriaResult,
                              lessonsLearned: lessons,
                            });
                          }
                          await completeCommunityChallenge(challenge.id);
                        }, 'contribute.challenges.completed')
                      }
                    >
                      {t('contribute.challenges.complete')}
                    </Button>
                  </div>
                  {!completeCheck.ok ? (
                    <p className="text-xs text-muted-foreground">{t('contribute.challenges.cannotComplete')}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}

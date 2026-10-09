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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listCurrentAreas } from '@/lib/classification';
import {
  addOpportunityEvidence,
  applyToContributionOpportunity,
  getMyParticipation,
  getOpportunity,
  listOpportunityParticipations,
  listOwnedLinkedProfileIds,
  listParticipationEvaluations,
  listParticipationEvidence,
  getOpportunityWorkAssessment,
  startOpportunityWork,
  submitOpportunityWork,
  withdrawOpportunityParticipation,
} from '@/lib/opportunities-api';
import {
  canApplyToOpportunity,
  participantNextAction,
  profileCanManagePublisher,
  opportunityUsesEvaluation,
  type ContributionOpportunity,
  type OpportunityEvaluation,
  type OpportunityEvidence,
  type OpportunityParticipation,
  type OpportunityWorkAssessment,
} from '@/lib/opportunities';
import { OpportunityEvidenceList } from '@/pages/contribute/OpportunityEvidenceList';
import { OpportunityOrganizerPanel } from '@/pages/contribute/OpportunityOrganizerPanel';
import { OpportunityAssessmentView } from '@/pages/contribute/OpportunityWorkAssessmentCard';
import { toast } from 'sonner';
import { getChallengeIdForProject } from '@/lib/challenges-api';
import { RelatedAgreementsCard } from '@/components/agreements/RelatedAgreementsCard';
export default function OpportunityDetail() {
  const { opportunityId = '' } = useParams<{ opportunityId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t); tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const [opportunity, setOpportunity] = useState<ContributionOpportunity | null>(null);
  const [mine, setMine] = useState<OpportunityParticipation | null>(null);
  const [applicants, setApplicants] = useState<OpportunityParticipation[]>([]);
  const [evidence, setEvidence] = useState<OpportunityEvidence[]>([]);
  const [evaluations, setEvaluations] = useState<OpportunityEvaluation[]>([]);
  const [assessment, setAssessment] = useState<OpportunityWorkAssessment | null>(null);
  const [reviewEvidence, setReviewEvidence] = useState<OpportunityEvidence[]>([]);
  const [ownedLinkedIds, setOwnedLinkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [evalSkills, setEvalSkills] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [originChallengeId, setOriginChallengeId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!opportunityId) return;
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      setOwnedLinkedIds(linked);
      const row = await getOpportunity(opportunityId);
      setOpportunity(row);
      if (!row) return;
      if (row.opportunityKind === 'community_implementation' && row.implementationProjectId) {
        setOriginChallengeId(await getChallengeIdForProject(row.implementationProjectId).catch(() => null));
      } else {
        setOriginChallengeId(null);
      }
      const participation = profileId ? await getMyParticipation(opportunityId, profileId) : null;
      setMine(participation);
      const canManage = profileCanManagePublisher({
        currentProfileId: profileId,
        publisherProfileId: row.publisherProfileId,
        ownedLinkedProfileIds: linked,
      });
      setApplicants(canManage ? await listOpportunityParticipations(opportunityId) : []);
      if (!participation?.id) {
        setEvidence([]);
        setEvaluations([]);
        setAssessment(null);
      } else {
        const [ev, evals, workAssessment] = await Promise.all([
          listParticipationEvidence(participation.id),
          listParticipationEvaluations(participation.id),
          getOpportunityWorkAssessment(participation.id).catch(() => null),
        ]);
        setEvidence(ev);
        setEvaluations(evals);
        setAssessment(workAssessment);
      }
    } catch {
      toast.error(tRef.current('contribute.opportunities.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [opportunityId, profileId]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!reviewingId) {
      setReviewEvidence([]);
      return;
    }
    let cancelled = false;
    void listParticipationEvidence(reviewingId).then((rows) => {
      if (!cancelled) setReviewEvidence(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [reviewingId]);
  const manages = Boolean(
    opportunity &&
      profileCanManagePublisher({
        currentProfileId: profileId,
        publisherProfileId: opportunity.publisherProfileId,
        ownedLinkedProfileIds: ownedLinkedIds,
      }),
  );
  const next = opportunity
    ? participantNextAction({
        opportunity,
        currentProfileId: profileId,
        ownedLinkedProfileIds: ownedLinkedIds,
        participation: mine,
      })
    : 'none';
  const areaLabel = useMemo(() => {
    if (!opportunity?.areaNodeId) return null;
    return listCurrentAreas().find((node) => node.id === opportunity.areaNodeId)?.displayName ?? null;
  }, [opportunity?.areaNodeId]);
  const run = async (action: () => Promise<unknown>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(t(successKey));
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request_failed';
      const key = `contribute.opportunities.errors.${message}`;
      const translated = t(key);
      toast.error(translated === key ? t('contribute.opportunities.actionFailed') : translated);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !opportunity) {
    return (
      <AppLayout>
        <div className="px-4 py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (!opportunity) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 py-6">
          <AppPageHeader title={t('contribute.opportunities.missingTitle')} fallbackPath="/contribute/professional" />
          <p className="text-sm text-muted-foreground">{t('contribute.opportunities.missingBody')}</p>
        </div>
      </AppLayout>
    );
  }

  const applyAllowed = canApplyToOpportunity({
    opportunity,
    currentProfileId: profileId,
    ownedLinkedProfileIds: ownedLinkedIds,
    existingParticipation: mine,
  }).ok;

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={opportunity.title}
          titleAccessory={opportunity.isDemo ? <DemoBadge /> : undefined}
          subtitle={opportunity.summary}
          fallbackPath={
            opportunity.opportunityKind === 'knowledge_gap' && opportunity.knowledgeSpaceId
              ? `/contribute/knowledge/${opportunity.knowledgeSpaceId}`
              : originChallengeId
                ? `/contribute/challenges/${originChallengeId}`
                : opportunity.opportunityKind === 'community_implementation'
                  ? '/contribute/challenges'
                  : '/contribute/professional'
          }
          actions={
            manages ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/contribute/professional/${opportunity.id}/edit`)}
              >
                {t('common.edit')}
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.opportunities.status.${opportunity.status}`)}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.opportunities.compensation.${opportunity.compensationStatus}`)}
          </Badge>
          {areaLabel ? (
            <Badge variant="outline" className="rounded-full">
              {areaLabel}
            </Badge>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">
          {[
            opportunity.estimatedEffort,
            opportunity.isRemote ? t('contribute.opportunities.remote') : opportunity.locationText,
            ...opportunity.requiredSkills.slice(0, 3),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {opportunity.opportunityKind === 'knowledge_gap' && opportunity.knowledgeSpaceId ? (
          <Link
            to={`/contribute/knowledge/${opportunity.knowledgeSpaceId}`}
            className="text-sm font-medium text-primary"
          >
            {t('contribute.opportunities.originGap')}
          </Link>
        ) : null}
        {opportunity.opportunityKind === 'community_implementation' ? (
          <Link
            to={originChallengeId ? `/contribute/challenges/${originChallengeId}` : '/contribute/challenges'}
            className="text-sm font-medium text-primary"
          >
            {t('contribute.opportunities.originChallenge')}
          </Link>
        ) : null}

        <RelatedAgreementsCard
          entityType="opportunity"
          entityId={opportunity.id}
          entityTitle={opportunity.title}
          launch={{ source: 'opportunity', agreementType: 'service_contribution' }}
        />
        {opportunity.implementationProjectId ? (
          <RelatedAgreementsCard
            entityType="project"
            entityId={opportunity.implementationProjectId}
            entityTitle={opportunity.title}
            launch={{ source: 'project', agreementType: 'general' }}
          />
        ) : null}

        {mine ? (
          <Card className="space-y-2 border-border/70 bg-card/95 p-4">
            <p className="text-sm font-medium text-foreground">
              {t(`contribute.opportunities.participationStatus.${mine.status}`)}
            </p>
            {mine.verificationStatus !== 'not_submitted' ? (
              <p className="text-xs text-muted-foreground">
                {t(`contribute.opportunities.verification.${mine.verificationStatus}`)}
              </p>
            ) : null}
            {next !== 'none' ? (
              <p className="text-sm text-primary">{t(`contribute.opportunities.nextAction.${next}`)}</p>
            ) : null}
          </Card>
        ) : null}

        {applyAllowed ? (
          <Card className="space-y-3 border-border/70 bg-card/95 p-4">
            <Label htmlFor="apply-message">{t('contribute.opportunities.applyMessage')}</Label>
            <Textarea
              id="apply-message"
              value={applyMessage}
              onChange={(event) => setApplyMessage(event.target.value)}
              placeholder={t('contribute.opportunities.applyPlaceholder')}
              rows={3}
            />
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  () => applyToContributionOpportunity(opportunity.id, applyMessage),
                  'contribute.opportunities.applySuccess',
                )
              }
            >
              {t('contribute.opportunities.apply')}
            </Button>
          </Card>
        ) : null}

        {next === 'withdraw' && mine ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(() => withdrawOpportunityParticipation(mine.id), 'contribute.opportunities.withdrawSuccess')
            }
          >
            {t('contribute.opportunities.withdraw')}
          </Button>
        ) : null}

        {next === 'start' && mine ? (
          <Button
            disabled={busy}
            onClick={() => run(() => startOpportunityWork(mine.id), 'contribute.opportunities.startSuccess')}
          >
            {t('contribute.opportunities.startWork')}
          </Button>
        ) : null}

        {(next === 'submit_evidence' || next === 'revise') && mine ? (
          <Card className="space-y-3 border-border/70 bg-card/95 p-4">
            <h2 className="font-semibold text-foreground">{t('contribute.opportunities.evidenceTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('contribute.opportunities.evidenceHint')}</p>
            <Label htmlFor="evidence-desc">{t('contribute.opportunities.evidenceDescription')}</Label>
            <Textarea
              id="evidence-desc"
              value={evidenceDescription}
              onChange={(event) => setEvidenceDescription(event.target.value)}
              rows={3}
            />
            <Label htmlFor="evidence-url">{t('contribute.opportunities.evidenceUrl')}</Label>
            <Input
              id="evidence-url"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy || evidenceDescription.trim().length < 3}
                onClick={() =>
                  run(async () => {
                    await addOpportunityEvidence(mine.id, evidenceDescription, evidenceUrl);
                    setEvidenceDescription('');
                    setEvidenceUrl('');
                  }, 'contribute.opportunities.evidenceAdded')
                }
              >
                {t('contribute.opportunities.addEvidence')}
              </Button>
              <Button
                disabled={busy || evidence.length === 0}
                onClick={() => run(() => submitOpportunityWork(mine.id), 'contribute.opportunities.submitSuccess')}
              >
                {t('contribute.opportunities.submitWork')}
              </Button>
            </div>
            <OpportunityEvidenceList items={evidence} referenceLabel={t('contribute.opportunities.reference')} />
          </Card>
        ) : null}

        {next === 'wait_review' && evidence.length > 0 ? (
          <Card className="space-y-2 border-border/70 bg-card/95 p-4">
            <h2 className="font-semibold text-foreground">{t('contribute.opportunities.evidenceTitle')}</h2>
            <OpportunityEvidenceList items={evidence} referenceLabel={t('contribute.opportunities.reference')} />
          </Card>
        ) : null}

        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.opportunities.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3 text-sm text-muted-foreground">
            {opportunity.description ? <p>{opportunity.description}</p> : null}
            {opportunity.expectedOutcome ? (
              <p>
                <span className="font-medium text-foreground">{t('contribute.opportunities.expectedOutcome')}: </span>
                {opportunity.expectedOutcome}
              </p>
            ) : null}
            {opportunity.evidenceRequirements ? (
              <p>
                <span className="font-medium text-foreground">{t('contribute.opportunities.requirements')}: </span>
                {opportunity.evidenceRequirements}
              </p>
            ) : null}
            {opportunity.evaluationCriteria ? (
              <p>
                <span className="font-medium text-foreground">{t('contribute.opportunities.criteria')}: </span>
                {opportunity.evaluationCriteria}
              </p>
            ) : null}
            {opportunity.optionalSkills.length > 0 ? (
              <p>
                {t('contribute.opportunities.optionalSkills')}: {opportunity.optionalSkills.join(', ')}
              </p>
            ) : null}
          </CollapsibleContent>
        </Collapsible>

        {evaluations.length > 0 && !manages ? (
          <Card className="space-y-2 border-border/70 bg-card/95 p-4">
            <h2 className="font-semibold text-foreground">{t('contribute.opportunities.latestReview')}</h2>
            <p className="text-sm text-muted-foreground">
              {t(`contribute.opportunities.evaluationDecision.${evaluations[0].decision}`)}
              {evaluations[0].feedback ? ` — ${evaluations[0].feedback}` : ''}
            </p>
          </Card>
        ) : null}

        {assessment && !manages && opportunityUsesEvaluation(opportunity) ? (
          <Card className="space-y-2 border-border/70 bg-card/95 p-4">
            <OpportunityAssessmentView
              dimensions={opportunity.evaluationDimensions}
              assessment={assessment}
            />
          </Card>
        ) : null}

        {manages ? (
          <OpportunityOrganizerPanel
            opportunity={opportunity}
            applicants={applicants}
            busy={busy}
            reviewingId={reviewingId}
            reviewEvidence={reviewEvidence}
            evalFeedback={evalFeedback}
            evalSkills={evalSkills}
            onReviewingId={setReviewingId}
            onEvalFeedback={setEvalFeedback}
            onEvalSkills={setEvalSkills}
            onAction={run}
          />
        ) : null}

        <p className="text-sm text-muted-foreground">
          <Link to="/contribute/professional" className="underline-offset-4 hover:underline">
            {t('contribute.opportunities.backToList')}
          </Link>
        </p>
      </div>
    </AppLayout>
  );
}

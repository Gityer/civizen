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
import { getContributionProgram } from '@/lib/challenges-api';
import type { ContributionProgram } from '@/lib/challenges';
import { listCurrentAreas } from '@/lib/classification';
import { RelatedAgreementsCard } from '@/components/agreements/RelatedAgreementsCard';
import { KnowledgeProposalPanel } from '@/components/contribute/KnowledgeProposalPanel';
import {
  KNOWLEDGE_GAP_KINDS,
  canConvertGapToChallenge,
  canConvertGapToOpportunity,
  canManageKnowledgeSpace,
  canResolveKnowledgeGap,
  pathwayResources,
  type KnowledgeGap,
  type KnowledgeGapKind,
  type KnowledgeResource,
  type KnowledgeSpace,
} from '@/lib/knowledge';
import {
  convertGapToChallenge,
  convertGapToOpportunity,
  createKnowledgeGap,
  getKnowledgeSpace,
  listKnowledgeGaps,
  listKnowledgeResources,
  listManagedSolutionRecords,
  listResourceAttributionIdentities,
  publishSolutionRecordAsResource,
  resolveKnowledgeGap,
  setKnowledgeSpaceStatus,
} from '@/lib/knowledge-api';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';
export default function KnowledgeSpaceDetail() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';

  const [space, setSpace] = useState<KnowledgeSpace | null>(null);
  const [program, setProgram] = useState<ContributionProgram | null>(null);
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [attributionByResource, setAttributionByResource] = useState<Record<string, string>>({});
  const [solutions, setSolutions] = useState<{ id: string; title: string; knowledgeResourceId: string | null }[]>([]);
  const [ownedLinkedIds, setOwnedLinkedIds] = useState<string[]>([]);
  const [gapTitle, setGapTitle] = useState('');
  const [gapDescription, setGapDescription] = useState('');
  const [gapKind, setGapKind] = useState<KnowledgeGapKind>('missing');
  const [convertOpp, setConvertOpp] = useState<Record<string, { title: string; summary: string }>>({});
  const [convertCh, setConvertCh] = useState<Record<string, { title: string; problem: string; why: string; criteria: string }>>({});
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [resolveResource, setResolveResource] = useState<Record<string, string>>({});
  const [shareSolutionId, setShareSolutionId] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const failToast = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'request_failed';
    const key = `contribute.knowledge.errors.${message}`;
    const translated = tRef.current(key);
    toast.error(translated === key ? tRef.current('contribute.knowledge.actionFailed') : translated);
  };

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      setOwnedLinkedIds(linked);
      const row = await getKnowledgeSpace(spaceId);
      setSpace(row);
      if (!row) return;
      const [programRow, resourceRows, gapRows] = await Promise.all([
        getContributionProgram(row.programId),
        listKnowledgeResources(row.id),
        listKnowledgeGaps(row.id),
      ]);
      setProgram(programRow);
      setResources(resourceRows);
      setGaps(gapRows);
      if (row.description) setShowDetails(true);
      const labels: Record<string, string> = {};
      await Promise.all(
        resourceRows.map(async (resource) => {
          const identities = await listResourceAttributionIdentities(resource.id);
          labels[resource.id] = identities.map((item) => item.displayName).join(' · ');
        }),
      );
      setAttributionByResource(labels);
      const manages = canManageKnowledgeSpace({
        space: row,
        currentProfileId: profileId,
        ownedLinkedProfileIds: linked,
      });
      if (manages) {
        setSolutions(await listManagedSolutionRecords([row.publisherProfileId, ...linked]));
      }
    } catch {
      toast.error(tRef.current('contribute.knowledge.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId, spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const manages = space
    ? canManageKnowledgeSpace({ space, currentProfileId: profileId, ownedLinkedProfileIds: ownedLinkedIds })
    : false;
  const areaName = useMemo(() => {
    if (!space?.areaNodeId) return null;
    return listCurrentAreas().find((node) => node.id === space.areaNodeId)?.displayName ?? null;
  }, [space?.areaNodeId]);
  const sequence = pathwayResources(resources);
  const visibleResources = resources.filter((row) => manages || row.status !== 'draft');
  const unpublishedSolutions = solutions.filter((row) => !row.knowledgeResourceId);

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

  if (!space) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 py-6">
          <AppPageHeader title={t('contribute.knowledge.missingSpace')} fallbackPath="/contribute/knowledge" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={space.title}
          titleAccessory={space.isDemo ? <DemoBadge /> : undefined}
          subtitle={space.summary}
          fallbackPath="/contribute/knowledge"
          actions={
            manages ? (
              <Button size="sm" variant="outline" onClick={() => navigate(`/contribute/knowledge/${space.id}/edit`)}>
                {t('common.edit')}
              </Button>
            ) : null
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.knowledge.spaceStage.${space.status === 'archived' ? 'draft' : space.status}`)}
          </Badge>
          {areaName ? <span className="text-xs text-muted-foreground">{areaName}</span> : null}
          {program ? (
            <span className="text-xs text-muted-foreground">
              {t('contribute.knowledge.programLabel')}: {program.title}
            </span>
          ) : null}
        </div>

        <RelatedAgreementsCard
          entityType="knowledge_space"
          entityId={space.id}
          entityTitle={space.title}
          launch={{
            source: 'knowledge_space',
            agreementType: 'data_research',
            ...(program ? { relatedTitle: `${space.title} · ${program.title}` } : {}),
          }}
        />

        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.knowledge.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
            {space.description}
          </CollapsibleContent>
        </Collapsible>

        {sequence.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-medium">{t('contribute.knowledge.pathwayTitle')}</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {sequence.map((resource) => (
                <li key={resource.id}>
                  <Link to={`/contribute/knowledge/${space.id}/resources/${resource.id}`} className="underline">
                    {resource.title}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('contribute.knowledge.resourcesTitle')}
            </h2>
            {manages ? (
              <Button size="sm" onClick={() => navigate(`/contribute/knowledge/${space.id}/resources/new`)}>{t('contribute.knowledge.addResource')}</Button>
            ) : null}
          </div>
          {!manages && profileId ? <KnowledgeProposalPanel spaceId={space.id} onSubmitted={() => void load()} /> : null}
          {visibleResources.length === 0 ? (
            <Card className="border-border/70 p-4 text-sm text-muted-foreground">
              {t('contribute.knowledge.noResources')}
            </Card>
          ) : (
            <div className="grid gap-3">
              {visibleResources.map((resource) => (
                <Link key={resource.id} to={`/contribute/knowledge/${space.id}/resources/${resource.id}`}>
                  <Card className="border-border/70 bg-card/95 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{resource.title}</h3>
                      <Badge variant="outline" className="rounded-full">
                        {t(`contribute.knowledge.resourceType.${resource.resourceType}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{resource.summary}</p>
                    {attributionByResource[resource.id] ? (
                      <p className="mt-2 text-xs text-muted-foreground">{attributionByResource[resource.id]}</p>
                    ) : null}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.knowledge.gapsTitle')}
          </h2>
          {gaps.length === 0 ? (
            <Card className="border-border/70 p-4 text-sm text-muted-foreground">{t('contribute.knowledge.noGaps')}</Card>
          ) : (
            gaps.map((gap) => (
              <Card key={gap.id} className="space-y-3 border-border/70 bg-card/95 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{gap.title}</h3>
                  <Badge variant="outline" className="rounded-full">
                    {t(`contribute.knowledge.gapStatus.${gap.status}`)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{gap.description}</p>
                {gap.opportunityId ? (
                  <Link to={`/contribute/professional/${gap.opportunityId}`} className="text-sm font-medium text-primary">
                    {t('contribute.knowledge.joinOpportunity')}
                  </Link>
                ) : null}
                {gap.challengeId ? (
                  <Link to={`/contribute/challenges/${gap.challengeId}`} className="block text-sm font-medium text-primary">
                    {t('contribute.knowledge.openChallenge')}
                  </Link>
                ) : null}
                {gap.resultResourceId ? (
                  <Link
                    to={`/contribute/knowledge/${space.id}/resources/${gap.resultResourceId}`}
                    className="block text-sm text-muted-foreground underline"
                  >
                    {t('contribute.knowledge.viewResult')}
                  </Link>
                ) : null}

                {manages &&
                (canConvertGapToOpportunity({ gap }).ok ||
                  canConvertGapToChallenge({ gap }).ok ||
                  canResolveKnowledgeGap({ gap, resolutionStatus: 'partially_resolved' }).ok) ? (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {t('contribute.knowledge.coordinateGap')}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                {canConvertGapToOpportunity({ gap }).ok ? (
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">
                    <Input
                      placeholder={t('contribute.knowledge.opportunityTitle')}
                      value={convertOpp[gap.id]?.title ?? gap.title}
                      onChange={(event) =>
                        setConvertOpp((current) => ({
                          ...current,
                          [gap.id]: {
                            title: event.target.value,
                            summary: current[gap.id]?.summary ?? gap.description,
                          },
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await convertGapToOpportunity(gap.id, {
                            title: convertOpp[gap.id]?.title || gap.title,
                            summary: convertOpp[gap.id]?.summary || gap.description,
                          });
                        }, 'contribute.knowledge.convertedOpportunity')
                      }
                    >
                      {t('contribute.knowledge.convertOpportunity')}
                    </Button>
                  </div>
                ) : null}

                {canConvertGapToChallenge({ gap }).ok ? (
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">
                    <Input
                      placeholder={t('contribute.knowledge.titleLabel')}
                      value={convertCh[gap.id]?.title ?? gap.title}
                      onChange={(event) =>
                        setConvertCh((current) => ({
                          ...current,
                          [gap.id]: {
                            title: event.target.value,
                            problem: current[gap.id]?.problem ?? gap.description,
                            why: current[gap.id]?.why ?? gap.description,
                            criteria: current[gap.id]?.criteria ?? '',
                          },
                        }))
                      }
                    />
                    <Textarea
                      placeholder={t('contribute.knowledge.challengeCriteria')}
                      value={convertCh[gap.id]?.criteria ?? ''}
                      onChange={(event) =>
                        setConvertCh((current) => ({
                          ...current,
                          [gap.id]: {
                            title: current[gap.id]?.title ?? gap.title,
                            problem: current[gap.id]?.problem ?? gap.description,
                            why: current[gap.id]?.why ?? gap.description,
                            criteria: event.target.value,
                          },
                        }))
                      }
                      rows={2}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await convertGapToChallenge(gap.id, {
                            title: convertCh[gap.id]?.title || gap.title,
                            problemStatement: convertCh[gap.id]?.problem || gap.description,
                            whyItMatters: convertCh[gap.id]?.why || gap.description,
                            successCriteria: convertCh[gap.id]?.criteria || gap.description,
                          });
                        }, 'contribute.knowledge.convertedChallenge')
                      }
                    >
                      {t('contribute.knowledge.convertChallenge')}
                    </Button>
                  </div>
                ) : null}

                {canResolveKnowledgeGap({
                  gap,
                  resolutionStatus: 'partially_resolved',
                }).ok ? (
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">
                    <Select
                      value={resolveResource[gap.id] || undefined}
                      onValueChange={(value) => setResolveResource((current) => ({ ...current, [gap.id]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('contribute.knowledge.resultResource')} />
                      </SelectTrigger>
                      <SelectContent>
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            {resource.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={resolveNotes[gap.id] ?? ''}
                      onChange={(event) => setResolveNotes((current) => ({ ...current, [gap.id]: event.target.value }))}
                      placeholder={t('contribute.knowledge.resolutionNotes')}
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await resolveKnowledgeGap(gap.id, {
                              status: 'partially_resolved',
                              resultResourceId: resolveResource[gap.id] || null,
                              resolutionNotes: resolveNotes[gap.id],
                            });
                          }, 'contribute.knowledge.gapUpdated')
                        }
                      >
                        {t('contribute.knowledge.markPartial')}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy || !resolveResource[gap.id]}
                        onClick={() =>
                          void run(async () => {
                            await resolveKnowledgeGap(gap.id, {
                              status: 'resolved',
                              resultResourceId: resolveResource[gap.id],
                              resolutionNotes: resolveNotes[gap.id],
                            });
                          }, 'contribute.knowledge.gapResolved')
                        }
                      >
                        {t('contribute.knowledge.markResolved')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                    </CollapsibleContent>
                  </Collapsible>
                ) : null}
              </Card>
            ))
          )}
        </section>

        {manages ? (
          <Card className="space-y-4 border-border/70 bg-card/95 p-4">
            {space.status === 'draft' ? (
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await setKnowledgeSpaceStatus(space.id, 'shared');
                  }, 'contribute.knowledge.published')
                }
              >
                {t('contribute.knowledge.publish')}
              </Button>
            ) : null}
            <div className="space-y-2">
              <h2 className="text-sm font-medium">{t('contribute.knowledge.addGap')}</h2>
              <Label htmlFor="kg-title">{t('contribute.knowledge.titleLabel')}</Label>
              <Input
                id="kg-title"
                value={gapTitle}
                onChange={(event) => setGapTitle(event.target.value)}
              />
              <Label htmlFor="kg-desc">{t('contribute.knowledge.gapDescription')}</Label>
              <Textarea
                id="kg-desc"
                value={gapDescription}
                onChange={(event) => setGapDescription(event.target.value)}
                rows={3}
              />
              <Select value={gapKind} onValueChange={(value) => setGapKind(value as KnowledgeGapKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KNOWLEDGE_GAP_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(`contribute.knowledge.gapKind.${kind}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await createKnowledgeGap({
                      spaceId: space.id,
                      title: gapTitle,
                      description: gapDescription,
                      gapKind,
                    });
                    setGapTitle('');
                    setGapDescription('');
                  }, 'contribute.knowledge.gapAdded')
                }
              >
                {t('contribute.knowledge.addGap')}
              </Button>
            </div>
            {unpublishedSolutions.length > 0 ? (
              <div className="space-y-2">
                <Label>{t('contribute.knowledge.shareSolution')}</Label>
                <Select value={shareSolutionId || undefined} onValueChange={setShareSolutionId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('contribute.knowledge.shareSolution')} />
                  </SelectTrigger>
                  <SelectContent>
                    {unpublishedSolutions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !shareSolutionId}
                  onClick={() =>
                    void run(async () => {
                      await publishSolutionRecordAsResource(shareSolutionId, space.id);
                      setShareSolutionId('');
                    }, 'contribute.knowledge.solutionShared')
                  }
                >
                  {t('contribute.knowledge.shareSolution')}
                </Button>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}

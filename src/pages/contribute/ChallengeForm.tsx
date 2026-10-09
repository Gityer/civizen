import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
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
  createCommunityChallenge,
  createContributionProgram,
  getCommunityChallenge,
  listManagedPrograms,
  setCommunityChallengeStatus,
  updateCommunityChallenge,
} from '@/lib/challenges-api';
import { linkChallengeSourceMatter } from '@/lib/matter-links';
import type { ChallengePayload, CommunityChallenge, ContributionProgram } from '@/lib/challenges';
import { emptyChallengeForm, formFromChallenge, type ChallengeFormState } from '@/lib/challenges-form';
import { takeWellbeingHandoff } from '@/lib/happiness/insights/handoff';
import { listCurrentAreas } from '@/lib/classification';
import { profileCanManagePublisher } from '@/lib/opportunities';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';

export default function ChallengeForm() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const editing = Boolean(challengeId);
  const areas = useMemo(() => listCurrentAreas(), []);

  const [searchParams] = useSearchParams();
  // A challenge started from a Matter (step 4.1): title and problem prefilled, the Matter linked after creation.
  const sourceMatterId = searchParams.get('matter') || '';
  const [form, setForm] = useState(() => ({
    ...emptyChallengeForm,
    title: searchParams.get('title') ?? '',
    problemStatement: searchParams.get('problem') ?? '',
  }));
  const [programs, setPrograms] = useState<ContributionProgram[]>([]);
  const [existing, setExisting] = useState<CommunityChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const wellbeingHandoff = useRef(challengeId ? null : takeWellbeingHandoff());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      const publisherIds = profileId ? [profileId, ...linked] : [];
      const managed = publisherIds.length > 0 ? await listManagedPrograms(publisherIds) : [];
      setPrograms(managed);
      if (!challengeId) {
        const handoff = wellbeingHandoff.current;
        setForm((current) => ({
          ...current,
          ...(handoff
            ? {
                title: handoff.title,
                problemStatement: handoff.problemStatement,
                whyItMatters: handoff.whyItMatters,
                evidenceLinks: handoff.evidenceLinks,
                contextDetail: handoff.contextDetail,
                successCriteria: handoff.successCriteria,
              }
            : {}),
          programId: current.programId || managed[0]?.id || '',
        }));
        setShowNewProgram(managed.length === 0);
        setShowDetails(Boolean(handoff));
        setLoading(false);
        return;
      }
      const row = await getCommunityChallenge(challengeId);
      if (!row) {
        setExisting(null);
        return;
      }
      const manages = profileCanManagePublisher({
        currentProfileId: profileId,
        publisherProfileId: row.publisherProfileId,
        ownedLinkedProfileIds: linked,
      });
      if (!manages) {
        setUnauthorized(true);
        setExisting(row);
        return;
      }
      setExisting(row);
      setForm(formFromChallenge(row));
      if (row.evidenceLinks || row.constraints || row.resources || row.contextDetail) {
        setShowDetails(true);
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

  const setField = <K extends keyof ChallengeFormState>(key: K, value: ChallengeFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const fail = (key: string) => {
    toast.error(t(key));
    return false;
  };

  const validate = (): boolean => {
    if (form.title.trim().length < 3) return fail('contribute.challenges.errors.title_required');
    if (form.problemStatement.trim().length < 3) return fail('contribute.challenges.errors.problem_required');
    if (form.whyItMatters.trim().length < 3) return fail('contribute.challenges.errors.why_required');
    if (form.successCriteria.trim().length < 3) return fail('contribute.challenges.errors.criteria_required');
    if (!form.programId && form.newProgramTitle.trim().length < 3) {
      return fail('contribute.challenges.errors.program_required');
    }
    if (!form.programId && form.newProgramSummary.trim().length < 3) {
      return fail('contribute.challenges.errors.summary_required');
    }
    return true;
  };

  const payloadFor = async (status: 'draft' | 'active'): Promise<ChallengePayload> => {
    let programId = form.programId;
    if (!programId) {
      programId = await createContributionProgram({
        title: form.newProgramTitle,
        summary: form.newProgramSummary,
        status: 'active',
        areaNodeId: form.areaNodeId === 'none' ? null : form.areaNodeId,
      });
    }
    return {
      programId,
      title: form.title,
      problemStatement: form.problemStatement,
      whyItMatters: form.whyItMatters,
      successCriteria: form.successCriteria,
      affected: form.affected || null,
      areaNodeId: form.areaNodeId === 'none' ? null : form.areaNodeId,
      scope: form.scope || null,
      evidenceLinks: form.evidenceLinks || null,
      constraints: form.constraints || null,
      resources: form.resources || null,
      contextDetail: form.contextDetail || null,
      status,
    };
  };

  const save = async (status: 'draft' | 'active') => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = await payloadFor(status);
      if (editing && challengeId) {
        await updateCommunityChallenge(challengeId, payload);
        if (status === 'active' && existing?.status === 'draft') {
          await setCommunityChallengeStatus(challengeId, 'active');
          toast.success(t('contribute.challenges.published'));
        } else {
          toast.success(t('contribute.challenges.saved'));
        }
        navigate(`/contribute/challenges/${challengeId}`);
        return;
      }
      const id = await createCommunityChallenge(payload);
      if (sourceMatterId) {
        await linkChallengeSourceMatter(id, sourceMatterId).catch(() => undefined);
      }
      toast.success(status === 'active' ? t('contribute.challenges.published') : t('contribute.challenges.saved'));
      navigate(`/contribute/challenges/${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request_failed';
      toast.error(t(`contribute.challenges.errors.${message}`) || t('contribute.challenges.actionFailed'));
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

  if (unauthorized || (editing && !existing)) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 py-6">
          <AppPageHeader title={t('contribute.challenges.missingTitle')} fallbackPath="/contribute/challenges" />
          <p className="text-sm text-muted-foreground">
            {unauthorized ? t('contribute.challenges.unauthorized') : t('contribute.challenges.missingBody')}
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={editing ? t('contribute.challenges.editTitle') : t('contribute.challenges.newTitle')}
          subtitle={t('contribute.challenges.formHint')}
          fallbackPath="/contribute/challenges"
        />

        <Card className="space-y-4 border-border/70 bg-card/95 p-4">
          <div className="space-y-2">
            <Label>{t('contribute.challenges.programLabel')}</Label>
            {programs.length > 0 && !showNewProgram ? (
              <Select value={form.programId} onValueChange={(value) => setField('programId', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {programs.length > 0 && !showNewProgram ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewProgram(true)}>
                {t('contribute.challenges.newProgram')}
              </Button>
            ) : null}
            {showNewProgram || programs.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{t('contribute.challenges.programHint')}</p>
                <Input
                  value={form.newProgramTitle}
                  onChange={(event) => setField('newProgramTitle', event.target.value)}
                  placeholder={t('contribute.challenges.programTitle')}
                  maxLength={160}
                />
                <Textarea
                  value={form.newProgramSummary}
                  onChange={(event) => setField('newProgramSummary', event.target.value)}
                  placeholder={t('contribute.challenges.programSummary')}
                  rows={2}
                  maxLength={400}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-title">{t('contribute.challenges.titleLabel')}</Label>
            <Input
              id="ch-title"
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-problem">{t('contribute.challenges.problemLabel')}</Label>
            <Textarea
              id="ch-problem"
              value={form.problemStatement}
              onChange={(event) => setField('problemStatement', event.target.value)}
              rows={3}
              maxLength={400}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-why">{t('contribute.challenges.whyLabel')}</Label>
            <Textarea
              id="ch-why"
              value={form.whyItMatters}
              onChange={(event) => setField('whyItMatters', event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-affected">{t('contribute.challenges.affectedLabel')}</Label>
            <Input
              id="ch-affected"
              value={form.affected}
              onChange={(event) => setField('affected', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('contribute.challenges.areaLabel')}</Label>
            <Select value={form.areaNodeId} onValueChange={(value) => setField('areaNodeId', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('contribute.challenges.areaNone')}</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-scope">{t('contribute.challenges.scopeLabel')}</Label>
            <Input id="ch-scope" value={form.scope} onChange={(event) => setField('scope', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-criteria">{t('contribute.challenges.criteriaLabel')}</Label>
            <Textarea
              id="ch-criteria"
              value={form.successCriteria}
              onChange={(event) => setField('successCriteria', event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
        </Card>

        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.challenges.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label htmlFor="ch-evidence">{t('contribute.challenges.evidenceLabel')}</Label>
              <Textarea
                id="ch-evidence"
                value={form.evidenceLinks}
                onChange={(event) => setField('evidenceLinks', event.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-constraints">{t('contribute.challenges.constraintsLabel')}</Label>
              <Textarea
                id="ch-constraints"
                value={form.constraints}
                onChange={(event) => setField('constraints', event.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-resources">{t('contribute.challenges.resourcesLabel')}</Label>
              <Textarea
                id="ch-resources"
                value={form.resources}
                onChange={(event) => setField('resources', event.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-context">{t('contribute.challenges.contextLabel')}</Label>
              <Textarea
                id="ch-context"
                value={form.contextDetail}
                onChange={(event) => setField('contextDetail', event.target.value)}
                rows={3}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void save('draft')}>
            {t('contribute.challenges.saveDraft')}
          </Button>
          <Button disabled={busy} onClick={() => void save('active')}>
            {existing?.status === 'active' ? t('common.save') : t('contribute.challenges.publish')}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

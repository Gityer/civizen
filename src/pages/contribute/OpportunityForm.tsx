import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listCurrentAreas } from '@/lib/classification';
import {
  COMPENSATION_STATUSES,
  EVALUATION_DIMENSIONS,
  profileCanManagePublisher,
  sanitizeEvaluationDimensions,
  type CompensationStatus,
  type ContributionOpportunity,
} from '@/lib/opportunities';
import {
  createContributionOpportunity,
  getOpportunity,
  listOwnedLinkedProfileIds,
  updateContributionOpportunity,
} from '@/lib/opportunities-api';
import {
  emptyOpportunityForm,
  formFromOpportunity,
  formToPayload,
  type OpportunityFormState,
} from '@/pages/contribute/opportunity-form-state';
import { toast } from 'sonner';

export default function OpportunityForm() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t); tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const editing = Boolean(opportunityId);

  const [form, setForm] = useState(emptyOpportunityForm);
  const [existing, setExisting] = useState<ContributionOpportunity | null>(null);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const areas = useMemo(() => listCurrentAreas(), []);

  const load = useCallback(async () => {
    if (!opportunityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      const row = await getOpportunity(opportunityId);
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
      setForm(formFromOpportunity(row));
      if (
        row.description ||
        row.optionalSkills.length > 0 ||
        row.expectedOutcome ||
        row.evidenceRequirements ||
        row.evaluationCriteria ||
        row.areaNodeId ||
        row.evaluationDimensions.length > 0
      ) {
        setShowDetails(true);
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

  const setField = <K extends keyof OpportunityFormState>(key: K, value: OpportunityFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = (): boolean => {
    if (form.title.trim().length < 3) {
      toast.error(t('contribute.opportunities.titleRequired'));
      return false;
    }
    if (form.summary.trim().length < 3) {
      toast.error(t('contribute.opportunities.summaryRequired'));
      return false;
    }
    return true;
  };

  const save = async (status: 'draft' | 'open') => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = formToPayload(form, status);
      if (editing && opportunityId) {
        await updateContributionOpportunity(opportunityId, payload);
        toast.success(t('contribute.opportunities.saved'));
        navigate(`/contribute/professional/${opportunityId}`);
        return;
      }
      const id = await createContributionOpportunity(payload);
      toast.success(
        status === 'open' ? t('contribute.opportunities.published') : t('contribute.opportunities.saved'),
      );
      navigate(`/contribute/professional/${id}`);
    } catch {
      toast.error(t('contribute.opportunities.actionFailed'));
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
          <AppPageHeader
            title={t('contribute.opportunities.missingTitle')}
            fallbackPath="/contribute/professional"
          />
          <p className="text-sm text-muted-foreground">
            {unauthorized
              ? t('contribute.opportunities.unauthorized')
              : t('contribute.opportunities.missingBody')}
          </p>
        </div>
      </AppLayout>
    );
  }

  const publishLabel = existing?.status === 'open'
    ? t('common.save')
    : t('contribute.opportunities.publish');

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={
            editing ? t('contribute.opportunities.editTitle') : t('contribute.opportunities.newTitle')
          }
          subtitle={t('contribute.opportunities.formHint')}
          fallbackPath="/contribute/professional"
        />

        <Card className="space-y-4 border-border/70 bg-card/95 p-4">
          <div className="space-y-2">
            <Label htmlFor="opp-title">{t('contribute.opportunities.titleLabel')}</Label>
            <Input
              id="opp-title"
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opp-summary">{t('contribute.opportunities.summaryLabel')}</Label>
            <Textarea
              id="opp-summary"
              value={form.summary}
              onChange={(event) => setField('summary', event.target.value)}
              rows={3}
              maxLength={400}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opp-skills">{t('contribute.opportunities.requiredSkills')}</Label>
            <Input
              id="opp-skills"
              value={form.requiredSkills}
              onChange={(event) => setField('requiredSkills', event.target.value)}
              placeholder={t('contribute.opportunities.requiredSkillsHint')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opp-effort">{t('contribute.opportunities.effortLabel')}</Label>
            <Input
              id="opp-effort"
              value={form.estimatedEffort}
              onChange={(event) => setField('estimatedEffort', event.target.value)}
              placeholder={t('contribute.opportunities.effortHint')}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="opp-remote"
              checked={form.isRemote}
              onCheckedChange={(value) => setField('isRemote', Boolean(value))}
            />
            <Label htmlFor="opp-remote">{t('contribute.opportunities.remoteToggle')}</Label>
          </div>
          {!form.isRemote ? (
            <div className="space-y-2">
              <Label htmlFor="opp-location">{t('contribute.opportunities.locationLabel')}</Label>
              <Input
                id="opp-location"
                value={form.locationText}
                onChange={(event) => setField('locationText', event.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{t('contribute.opportunities.compensationLabel')}</Label>
            <Select
              value={form.compensationStatus}
              onValueChange={(value) => setField('compensationStatus', value as CompensationStatus)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPENSATION_STATUSES.filter((status) => status !== 'credit' || form.compensationStatus === 'credit').map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`contribute.opportunities.compensation.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('contribute.opportunities.compensationHint')}</p>
          </div>
        </Card>

        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.opportunities.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label htmlFor="opp-description">{t('contribute.opportunities.descriptionLabel')}</Label>
              <Textarea
                id="opp-description"
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('contribute.opportunities.areaLabel')}</Label>
              <Select value={form.areaNodeId} onValueChange={(value) => setField('areaNodeId', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('contribute.opportunities.areaNone')}</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-optional">{t('contribute.opportunities.optionalSkills')}</Label>
              <Input
                id="opp-optional"
                value={form.optionalSkills}
                onChange={(event) => setField('optionalSkills', event.target.value)}
                placeholder={t('contribute.opportunities.requiredSkillsHint')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-deadline">{t('contribute.opportunities.deadlineLabel')}</Label>
              <Input
                id="opp-deadline"
                type="date"
                value={form.applicationDeadline}
                onChange={(event) => setField('applicationDeadline', event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="opp-starts">{t('contribute.opportunities.workStartsLabel')}</Label>
                <Input
                  id="opp-starts"
                  type="date"
                  value={form.workStartsAt}
                  onChange={(event) => setField('workStartsAt', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-ends">{t('contribute.opportunities.workEndsLabel')}</Label>
                <Input
                  id="opp-ends"
                  type="date"
                  value={form.workEndsAt}
                  onChange={(event) => setField('workEndsAt', event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-outcome">{t('contribute.opportunities.expectedOutcome')}</Label>
              <Textarea
                id="opp-outcome"
                value={form.expectedOutcome}
                onChange={(event) => setField('expectedOutcome', event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-requirements">{t('contribute.opportunities.requirements')}</Label>
              <Textarea
                id="opp-requirements"
                value={form.evidenceRequirements}
                onChange={(event) => setField('evidenceRequirements', event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-criteria">{t('contribute.opportunities.criteria')}</Label>
              <Textarea
                id="opp-criteria"
                value={form.evaluationCriteria}
                onChange={(event) => setField('evaluationCriteria', event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {t('contribute.opportunities.assessmentDimensionsLabel')}
              </p>
              <p className="text-xs text-muted-foreground">{t('contribute.opportunities.assessmentHint')}</p>
              <div className="space-y-2">
                {EVALUATION_DIMENSIONS.map((dimension) => {
                  const checked = form.evaluationDimensions.includes(dimension);
                  return (
                    <div key={dimension} className="flex items-center gap-2">
                      <Checkbox
                        id={`opp-dim-${dimension}`}
                        checked={checked}
                        onCheckedChange={(value) => {
                          const next =
                            value === true
                              ? [...form.evaluationDimensions, dimension]
                              : form.evaluationDimensions.filter((item) => item !== dimension);
                          setField('evaluationDimensions', sanitizeEvaluationDimensions(next));
                        }}
                      />
                      <Label htmlFor={`opp-dim-${dimension}`}>
                        {t(`contribute.opportunities.dimension.${dimension}`)}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-wrap gap-2">
          {existing?.status !== 'open' ? (
            <Button variant="outline" disabled={busy} onClick={() => void save('draft')}>
              {t('contribute.opportunities.saveDraft')}
            </Button>
          ) : null}
          <Button disabled={busy} onClick={() => void save('open')}>
            {publishLabel}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

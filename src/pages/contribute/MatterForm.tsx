import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listCurrentAreas } from '@/lib/classification';
import {
  MATTER_TYPES,
  MATTER_VISIBILITIES,
  type MatterActorKind,
  type MatterType,
  type MatterVisibility,
} from '@/lib/matters';
import {
  createMatterRecord,
  listManagedMatterActors,
  resolveOfficialCivizenMatterActor,
  searchMatterActors,
  uploadMatterFile,
  type MatterActorSuggestion,
} from '@/lib/matters-api';
import { listGeoCountryCodes } from '@/lib/geo-locations';
import { MatterScopeFields } from '@/pages/contribute/matter-form/MatterScopeFields';
import {
  EMPTY_MATTER_SCOPE,
  matterScopeForSubmit,
  matterScopeMissingKey,
  type MatterScopeValue,
} from '@/pages/contribute/matter-form/matter-scope';
import { toast } from 'sonner';

type LinkedOrg = { id: string; name: string };

export default function MatterForm() {
  const { t, language } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const improvementIntent = searchParams.get('intent') === 'improvement';
  const profileId = profile?.id ?? '';
  const areas = useMemo(() => listCurrentAreas(), []);
  const countryOptions = useMemo(() => listGeoCountryCodes(language), [language]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matterType, setMatterType] = useState<MatterType>(improvementIntent ? 'suggestion' : 'question');
  const [visibility, setVisibility] = useState<MatterVisibility>('participants');
  const [areaNodeId, setAreaNodeId] = useState('');
  const [scope, setScope] = useState<MatterScopeValue>(EMPTY_MATTER_SCOPE);
  const [initiatorKind, setInitiatorKind] = useState<MatterActorKind>('person');
  const [initiatorProfileId, setInitiatorProfileId] = useState(profileId);
  const [addressee, setAddressee] = useState<MatterActorSuggestion | null>(null);
  const [addresseeQuery, setAddresseeQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MatterActorSuggestion[]>([]);
  const [unitLabel, setUnitLabel] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [orgs, setOrgs] = useState<LinkedOrg[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInitiatorProfileId(profileId);
  }, [profileId]);

  // The official Civizen organization stands for the community: a member can raise a Matter
  // without naming a person (step 2.1).
  const addressCommunity = useCallback(async () => {
    const actor = await resolveOfficialCivizenMatterActor();
    if (actor) {
      setAddressee(actor);
      setAddresseeQuery('');
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (!improvementIntent) return;
    setMatterType('suggestion');
    void addressCommunity();
  }, [addressCommunity, improvementIntent]);

  useEffect(() => {
    if (!profileId) return;
    void (async () => {
      const actors = await listManagedMatterActors(profileId);
      setOrgs(actors.map((actor) => ({ id: actor.profileId, name: actor.displayName })));
    })();
  }, [profileId]);

  useEffect(() => {
    const needle = addresseeQuery.trim();
    if (needle.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchMatterActors(needle, profileId).then(setSuggestions);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [addresseeQuery, profileId]);

  const submit = useCallback(async () => {
    if (!profileId) return;
    if (title.trim().length < 3) {
      toast.error(tRef.current('contribute.matters.titleRequired'));
      return;
    }
    if (description.trim().length < 3) {
      toast.error(tRef.current('contribute.matters.descriptionRequired'));
      return;
    }
    if (!addressee) {
      toast.error(tRef.current('contribute.matters.recipientRequired'));
      return;
    }
    const scopeMissing = matterScopeMissingKey(scope);
    if (scopeMissing) {
      toast.error(tRef.current(scopeMissing));
      return;
    }
    setBusy(true);
    try {
      const id = await createMatterRecord({
        title: title.trim(),
        description: description.trim(),
        matterType,
        initiatorKind,
        initiatorProfileId: initiatorKind === 'organization' ? initiatorProfileId : profileId,
        addresseeKind: addressee.kind,
        addresseeProfileId: addressee.profileId,
        addresseeUnitLabel: unitLabel.trim() || null,
        visibility,
        areaNodeId: areaNodeId || null,
        ...matterScopeForSubmit(scope),
        evidenceUrl: evidenceUrl.trim() || null,
        evidenceLabel: evidenceLabel.trim() || null,
      });
      if (file) {
        await uploadMatterFile(id, file);
      }
      toast.success(tRef.current('contribute.matters.created'));
      navigate(`/contribute/matters/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tRef.current('contribute.matters.actionFailed'));
    } finally {
      setBusy(false);
    }
  }, [
    addressee,
    areaNodeId,
    description,
    evidenceLabel,
    evidenceUrl,
    file,
    initiatorKind,
    initiatorProfileId,
    matterType,
    navigate,
    profileId,
    scope,
    title,
    unitLabel,
    visibility,
  ]);

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={t('contribute.matters.newTitle')}
          subtitle={improvementIntent ? t('contribute.matters.improvementHint') : t('contribute.matters.formHint')}
          fallbackPath="/contribute/matters"
        />
        <Card className="space-y-4 border-border/70 bg-card/95 p-4">
          <OutlinedField label={t('contribute.matters.titleLabel')} htmlFor="matter-title">
            <Input
              id="matter-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
            />
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.descriptionLabel')} htmlFor="matter-body">
            <Textarea
              id="matter-body"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              maxLength={8000}
            />
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.typeLabel')}>
            <Select value={matterType} onValueChange={(value) => setMatterType(value as MatterType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATTER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`contribute.matters.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OutlinedField>
          {orgs.length > 0 ? (
            <OutlinedField label={t('contribute.matters.initiatorLabel')}>
              <Select
                value={initiatorKind === 'organization' ? initiatorProfileId : profileId}
                onValueChange={(value) => {
                  if (value === profileId) {
                    setInitiatorKind('person');
                    setInitiatorProfileId(profileId);
                  } else {
                    setInitiatorKind('organization');
                    setInitiatorProfileId(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={profileId}>{t('contribute.matters.initiatorSelf')}</SelectItem>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OutlinedField>
          ) : null}
          <OutlinedField label={t('contribute.matters.recipientLabel')} htmlFor="matter-recipient">
            {addressee ? (
              <div className="flex items-center justify-between gap-2 py-1">
                <p className="text-sm text-foreground">{addressee.displayName}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddressee(null)}>
                  {t('common.edit')}
                </Button>
              </div>
            ) : (
              <div>
                <Input
                  id="matter-recipient"
                  value={addresseeQuery}
                  onChange={(event) => setAddresseeQuery(event.target.value)}
                  placeholder={t('contribute.matters.recipientHint')}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => void addressCommunity()}
                  data-testid="matter-recipient-community"
                >
                  {t('contribute.matters.recipientCommunity')}
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">{t('contribute.matters.recipientCommunityHint')}</p>
                {suggestions.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {suggestions.map((suggestion) => (
                      <li key={`${suggestion.kind}-${suggestion.profileId}`}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setAddressee(suggestion);
                            setAddresseeQuery('');
                            setSuggestions([]);
                          }}
                        >
                          {suggestion.displayName}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t(`contribute.matters.actorKind.${suggestion.kind}`)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.unitLabel')} htmlFor="matter-unit">
            <Input
              id="matter-unit"
              value={unitLabel}
              onChange={(event) => setUnitLabel(event.target.value)}
              placeholder={t('contribute.matters.unitHint')}
            />
          </OutlinedField>
          <MatterScopeFields value={scope} onChange={setScope} countryOptions={countryOptions} language={language} t={t} />
          <OutlinedField label={t('contribute.matters.areaLabel')}>
            <Select value={areaNodeId || 'none'} onValueChange={(value) => setAreaNodeId(value === 'none' ? '' : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('contribute.matters.areaNone')}</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.visibilityLabel')}>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as MatterVisibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATTER_VISIBILITIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`contribute.matters.visibility.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.evidenceUrlLabel')} htmlFor="matter-url">
            <Input
              id="matter-url"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://"
            />
          </OutlinedField>
          {evidenceUrl.trim() ? (
            <OutlinedField label={t('contribute.matters.evidenceLabelLabel')} htmlFor="matter-url-label">
              <Input
                id="matter-url-label"
                value={evidenceLabel}
                onChange={(event) => setEvidenceLabel(event.target.value)}
              />
            </OutlinedField>
          ) : null}
          <OutlinedField label={t('contribute.matters.fileLabel')}>
            <Input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </OutlinedField>
          <Button type="button" onClick={() => void submit()} disabled={busy || !profileId}>
            {busy ? t('common.saving') : t('contribute.matters.submit')}
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}

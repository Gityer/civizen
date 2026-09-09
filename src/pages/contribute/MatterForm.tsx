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
  type MatterScopeKind,
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
import { getCountryName } from '@/lib/countries';
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
  const [scopeKind, setScopeKind] = useState<MatterScopeKind>('global');
  const [scopeCountryCode, setScopeCountryCode] = useState('');
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

  useEffect(() => {
    if (!improvementIntent) return;
    setMatterType('suggestion');
    void resolveOfficialCivizenMatterActor().then((actor) => {
      if (actor) {
        setAddressee(actor);
        setAddresseeQuery('');
      }
    });
  }, [improvementIntent]);

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
    if (scopeKind !== 'global' && !scopeCountryCode.trim()) {
      toast.error(tRef.current('contribute.matters.scopeCountryRequired'));
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
        scopeKind,
        scopeCountryCode: scopeKind === 'global' ? null : scopeCountryCode.trim().toUpperCase(),
        scopeRegionCode: null,
        scopeLocalityCode: null,
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
    scopeCountryCode,
    scopeKind,
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
          <OutlinedField label={t('contribute.matters.scopeLabel')}>
            <Select
              value={scopeKind === 'global' ? 'global' : 'country'}
              onValueChange={(value) => {
                const next = value === 'global' ? 'global' : 'country';
                setScopeKind(next);
                if (next === 'global') setScopeCountryCode('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">{t('contribute.matters.scope.global')}</SelectItem>
                <SelectItem value="country">{t('contribute.matters.scope.country')}</SelectItem>
              </SelectContent>
            </Select>
          </OutlinedField>
          {scopeKind !== 'global' ? (
            <OutlinedField label={t('contribute.matters.scopeCountryLabel')}>
              <Select
                value={scopeCountryCode || 'none'}
                onValueChange={(value) => setScopeCountryCode(value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('contribute.matters.scopeCountryHint')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('contribute.matters.scopeCountryHint')}</SelectItem>
                  {countryOptions.map((code) => (
                    <SelectItem key={code} value={code}>
                      {getCountryName(code, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OutlinedField>
          ) : null}
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

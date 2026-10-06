import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AgreementCreateMenu } from '@/components/agreements/AgreementCreateMenu';
import { AgreementDocumentActions, AgreementDocumentEditor } from '@/components/agreements/AgreementDocumentEditor';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  createCollaborationAgreement,
  payloadFromLaunchContext,
} from '@/lib/agreements-api';
import {
  agreementsCreatePath,
  agreementTypeDefinition,
  normalizeAgreementCreateType,
  parseAgreementLaunchContext,
  relatedEntityHref,
  resolveEnteredParty,
} from '@/lib/agreements-model';
import {
  agreementDocumentTemplate,
  compileAgreementDocument,
  compiledPartiesFromDocument,
  requiredAgreementGaps,
  seedAgreementDocumentState,
  syncPartyReference,
} from '@/lib/agreements-templates';

export default function AgreementCreate() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const launch = useMemo(() => parseAgreementLaunchContext(searchParams.toString()), [searchParams]);
  const agreementType = normalizeAgreementCreateType(launch.agreementType);
  const customTypeName = launch.customType?.trim() || '';
  const actor = useMemo(
    () => ({
      fullName: profile?.full_name || profile?.username,
      profileId: profile?.id,
    }),
    [profile?.full_name, profile?.id, profile?.username],
  );
  const seeded = useMemo(
    () => payloadFromLaunchContext(launch, {
      fullName: actor.fullName,
      profileId: actor.profileId,
      isOrganization: false,
    }),
    [actor.fullName, actor.profileId, launch],
  );
  const template = useMemo(
    () => agreementDocumentTemplate(agreementType, customTypeName),
    [agreementType, customTypeName],
  );
  const [state, setState] = useState(() => seedAgreementDocumentState({
    type: agreementType,
    launch,
    actor,
  }));
  const [busy, setBusy] = useState(false);
  const [missingFieldId, setMissingFieldId] = useState<string | null>(null);
  const seedKey = `${agreementType}:${searchParams.toString()}:${actor.profileId || ''}:${actor.fullName || ''}`;
  const seedKeyRef = useRef(seedKey);

  useEffect(() => {
    if (seedKeyRef.current === seedKey) return;
    seedKeyRef.current = seedKey;
    setMissingFieldId(null);
    setState((current) => {
      const seeded = seedAgreementDocumentState({
        type: agreementType,
        launch,
        actor,
      });
      if (current.partyReferenceManual) {
        return {
          ...seeded,
          partyReference: current.partyReference,
          partyReferenceManual: true,
          partyReferenceAuto: current.partyReferenceAuto,
        };
      }
      return seeded;
    });
  }, [actor, agreementType, launch, seedKey]);

  const relatedHref = launch.source ? relatedEntityHref(launch.source, launch.relatedId) : null;
  const typeLabel = state.documentHeading
    || customTypeName
    || template.documentHeading
    || t(agreementTypeDefinition(agreementType)?.labelKey || `agreements.types.${agreementType}`);

  const submit = async () => {
    const compiled = compileAgreementDocument({
      type: agreementType,
      customTypeName,
      template,
      state,
      typeLabel,
    });
    const { parties, needsClassification } = compiledPartiesFromDocument(state, (slot) => {
      if (!slot.query.trim() && !slot.selected) return null;
      return resolveEnteredParty({
        query: slot.query,
        selected: slot.selected,
        classification: slot.classification,
      });
    });
    const gaps = requiredAgreementGaps(template, state);
    if (gaps.length > 0) {
      const first = gaps[0];
      setMissingFieldId(first.tokenId);
      toast.error(t(first.messageKey));
      return;
    }
    if (compiled.title.trim().length < 3) {
      toast.error(t('agreements.createTitleRequired'));
      return;
    }
    if (needsClassification) {
      toast.error(t('agreements.partyKindAsk'));
      return;
    }
    setBusy(true);
    try {
      const id = await createCollaborationAgreement({
        title: compiled.title.trim(),
        agreementType,
        summary: compiled.purpose.trim(),
        purpose: compiled.purpose.trim(),
        content: compiled.content,
        startAt: compiled.startAt,
        endAt: compiled.endAt,
        parties: parties.length > 0 ? parties : seeded.parties,
        related: seeded.related,
        partyReference: state.partyReference.trim() || null,
      });
      toast.success(t('agreements.createdToast'));
      navigate(`/agreements/${id}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('agreements.createError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5">
        <AppPageHeader
          title={(
            <AgreementCreateMenu
              trigger={(
                <button
                  type="button"
                  data-testid="agreements-create-title"
                  className="m-0 border-0 bg-transparent p-0 text-left font-[inherit] text-inherit leading-[inherit] outline-none"
                >
                  {t('agreements.createTitle')}
                </button>
              )}
              onSelect={(type, customType) => {
                navigate(agreementsCreatePath({
                  ...launch,
                  agreementType: type,
                  customType: type === 'custom' ? customType : undefined,
                }));
              }}
            />
          )}
          fallbackPath="/agreements"
        />

        {launch.relatedTitle ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{launch.relatedTitle}</span>
            {relatedHref ? (
              <>
                {' · '}
                <a href={relatedHref} className="underline-offset-2 hover:underline">
                  {t('agreements.openRelatedActivity')}
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        <AgreementDocumentEditor
          template={template}
          state={state}
          excludeProfileId={profile?.id}
          highlightTokenId={missingFieldId}
          onChange={(next) => {
            const synced = syncPartyReference(next);
            setState(synced);
            if (missingFieldId) {
              const remaining = requiredAgreementGaps(template, synced);
              setMissingFieldId(remaining.some((gap) => gap.tokenId === missingFieldId)
                ? missingFieldId
                : remaining[0]?.tokenId || null);
            }
          }}
        />

        <p className="text-[11px] leading-snug text-muted-foreground/80">{t('agreements.templateNotLegal')}</p>

        <AgreementDocumentActions busy={busy} onCreate={() => void submit()} />
      </div>
    </AppLayout>
  );
}

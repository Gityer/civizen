import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { AgreementFitInput } from '@/components/agreements/AgreementInlineToken';
import { AgreementFormattedBody, AgreementRichText } from '@/components/agreements/AgreementRichText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  addAgreementReviewNote,
  completeAgreement,
  createAgreementAmendment,
  createNextAgreementVersion,
  proposeAgreementVersion,
  recordAgreementExternalExecution,
  requestAgreementReview,
  signAgreementVersion,
  terminateAgreement,
  updateCollaborationAgreementDraft,
  uploadAgreementFile,
  withdrawAgreementProposal,
  type AgreementDetailBundle,
} from '@/lib/agreements-api';
import {
  allRequiredSignaturesComplete,
  isEditableStatus,
  isExecutedStatus,
  isSigningStatus,
  relatedEntityHref,
  sanitizeAgreementReferenceInput,
  signingProgressLabel,
  type AgreementContent,
} from '@/lib/agreements-model';
import { buildExecutedAgreementPdf, downloadPdfBytes, executedAgreementFilename } from '@/lib/agreements-pdf';

type CollaborationAgreementViewProps = {
  bundle: AgreementDetailBundle;
  onReload: () => Promise<void>;
};

const EVENT_LABEL_KEYS: Record<string, string> = {
  created: 'agreements.events.created',
  edited: 'agreements.events.edited',
  version_created: 'agreements.events.versionCreated',
  review_requested: 'agreements.events.reviewRequested',
  change_requested: 'agreements.events.changeRequested',
  proposed: 'agreements.events.proposed',
  version_locked: 'agreements.events.versionLocked',
  signature_completed: 'agreements.events.signatureCompleted',
  signature_declined: 'agreements.events.signatureDeclined',
  proposal_withdrawn: 'agreements.events.proposalWithdrawn',
  signing_superseded: 'agreements.events.signingSuperseded',
  fully_signed: 'agreements.events.fullySigned',
  activated: 'agreements.events.activated',
  final_pdf_generated: 'agreements.events.finalPdf',
  external_execution_recorded: 'agreements.events.externalExecution',
  amendment_created: 'agreements.events.amendmentCreated',
  completed: 'agreements.events.completed',
  terminated: 'agreements.events.terminated',
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function CollaborationAgreementView({ bundle, onReload }: CollaborationAgreementViewProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const agreement = bundle.agreement;
  const status = text(agreement.status) || 'draft';
  const title = text(agreement.title) || t('agreements.untitled');
  const currentVersion = bundle.versions.find((version) => version.id === agreement.current_version_id)
    || bundle.versions[bundle.versions.length - 1];
  const executedVersion = bundle.versions.find((version) => version.id === agreement.executed_version_id);
  const content: AgreementContent = currentVersion?.content || { sections: [] };

  const [section, setSection] = useState<'agreement' | 'parties' | 'attachments' | 'history' | 'amendments' | 'advanced'>('agreement');
  const [purpose, setPurpose] = useState(content.purpose || '');
  const [sectionDrafts, setSectionDrafts] = useState(content.sections || []);
  const [partyReference, setPartyReference] = useState(
    text(agreement.party_reference)
      || text(content.structured?.partyReference)
      || text(content.structured?.referenceNumber),
  );
  const [note, setNote] = useState('');
  const [signerName, setSignerName] = useState(profile?.full_name || '');
  const [recordsConsent, setRecordsConsent] = useState(false);
  const [signatureConsent, setSignatureConsent] = useState(false);
  const [authorityAttested, setAuthorityAttested] = useState(false);
  const [externalDate, setExternalDate] = useState('');
  const [externalMethod, setExternalMethod] = useState<'paper' | 'external_electronic' | 'other'>('paper');
  const [externalNote, setExternalNote] = useState('');
  const [terminateReason, setTerminateReason] = useState('');
  const [busy, setBusy] = useState(false);

  const progressParties = useMemo(() => bundle.parties.map((party) => {
    const required = bundle.signatories.filter((item) => item.party_id === party.id && item.kind === 'required');
    const signed = required.filter((item) => bundle.signatures.some(
      (signature) => signature.signatory_id === item.id
        && signature.version_id === currentVersion?.id
        && signature.status === 'signed',
    ));
    return {
      partyId: party.id,
      displayName: party.display_name,
      requiredTotal: required.length,
      requiredSigned: signed.length,
    };
  }), [bundle.parties, bundle.signatories, bundle.signatures, currentVersion?.id]);

  const mySignatory = bundle.signatories.find((item) => item.profile_id === profile?.id);
  const myParty = bundle.parties.find((party) => party.id === mySignatory?.party_id);
  const alreadySigned = Boolean(
    mySignatory
    && currentVersion
    && bundle.signatures.some((signature) => (
      signature.signatory_id === mySignatory.id
      && signature.version_id === currentVersion.id
      && signature.status === 'signed'
    )),
  );
  const canEdit = isEditableStatus(status);
  const canSign = Boolean(isSigningStatus(status) && mySignatory && !alreadySigned && currentVersion?.locked_at);
  const executed = isExecutedStatus(status);
  const orgSigning = Boolean(myParty && String(myParty.party_kind).includes('organization'));

  const run = async (action: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(t(successKey));
      await onReload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('agreements.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => run(async () => {
    await updateCollaborationAgreementDraft(text(agreement.id), {
      title,
      summary: text(agreement.summary),
      party_reference: partyReference.trim() || null,
      content: {
        ...content,
        purpose,
        sections: sectionDrafts,
        structured: {
          ...content.structured,
          partyReference: partyReference.trim() || null,
          referenceNumber: partyReference.trim() || null,
        },
      },
    });
  }, 'agreements.saveBodySuccess');

  const downloadExecuted = () => {
    const version = executedVersion || currentVersion;
    if (!version) return;
    const bytes = buildExecutedAgreementPdf({
      referenceCode: text(agreement.reference_code) || null,
      partyReference: partyReference.trim() || null,
      title,
      agreementTypeLabel: t(`agreements.types.${text(agreement.agreement_type) || 'general'}`),
      versionNumber: version.version_number,
      fingerprint: version.fingerprint || '',
      statusLabel: t(`agreements.status.${status}`),
      effectiveAt: text(agreement.effective_at) || text(agreement.executed_at),
      endAt: text(agreement.end_at),
      relatedSummary: bundle.relationships.map((item) => item.label_snapshot).join(', '),
      parties: bundle.parties.map((party) => ({ displayName: party.display_name, role: party.role_in_agreement })),
      content: version.content,
      signatures: bundle.signatures
        .filter((signature) => signature.version_id === version.id && signature.status === 'signed')
        .map((signature) => ({
          signerName: signature.signer_name_snapshot,
          partyName: signature.party_name_snapshot,
          capacity: signature.representative_title_snapshot,
          signedAt: signature.signed_at,
          method: signature.signing_method,
        })),
      executionNote: text(agreement.execution_method) === 'native_electronic'
        ? null
        : t('agreements.externalExecutionPdfNote', { method: text(agreement.execution_method) || 'external' }),
    });
    downloadPdfBytes(
      executedAgreementFilename(text(agreement.reference_code) || partyReference.trim() || 'agreement', version.version_number),
      bytes,
    );
  };

  const related = bundle.relationships[0];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <AppPageHeader
        title={title}
        subtitle={t(`agreements.types.${text(agreement.agreement_type) || 'general'}`)}
        fallbackPath="/agreements"
        actions={<Badge variant="secondary">{t(`agreements.status.${status}`)}</Badge>}
      />

      <Card className="space-y-2 rounded-2xl border-border/60 p-4 text-sm">
        <p>
          <span className="text-muted-foreground">{t('agreements.partiesLabel')}:</span>{' '}
          {bundle.parties.map((party) => party.display_name).join(' · ') || t('agreements.partiesEmpty')}
        </p>
        {related ? (
          <p>
            <span className="text-muted-foreground">{t('agreements.relatedLabel')}:</span>{' '}
            {relatedEntityHref(related.entity_type, related.entity_id) ? (
              <Link
                className="text-primary underline-offset-2 hover:underline"
                to={relatedEntityHref(related.entity_type, related.entity_id) || '/agreements'}
              >
                {related.label_snapshot}
              </Link>
            ) : related.label_snapshot}
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">{t('agreements.signProgress')}:</span>{' '}
          {signingProgressLabel(progressParties) || t('agreements.signProgressEmpty')}
        </p>
        {currentVersion ? (
          <p className="text-xs text-muted-foreground">
            {t('agreements.versionLabel', { n: currentVersion.version_number })}
            {executedVersion && executedVersion.id !== currentVersion.id
              ? ` · ${t('agreements.executedVersionLabel', { n: executedVersion.version_number })}`
              : ''}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <>
            <Button type="button" onClick={() => void saveDraft()} disabled={busy}>{t('agreements.saveBody')}</Button>
            <Button type="button" variant="outline" onClick={() => void run(() => requestAgreementReview(text(agreement.id)), 'agreements.reviewRequested')} disabled={busy}>
              {t('agreements.requestReview')}
            </Button>
            <Button type="button" variant="outline" onClick={() => void run(() => proposeAgreementVersion(text(agreement.id)), 'agreements.proposedToast')} disabled={busy}>
              {t('agreements.proposeAction')}
            </Button>
          </>
        ) : null}
        {status === 'in_review' && profile?.id === agreement.owner_profile_id ? (
          <Button type="button" variant="outline" onClick={() => void run(() => proposeAgreementVersion(text(agreement.id)), 'agreements.proposedToast')} disabled={busy}>
            {t('agreements.proposeAction')}
          </Button>
        ) : null}
        {(status === 'proposed' || status === 'partially_signed' || status === 'in_review') && profile?.id === agreement.owner_profile_id ? (
          <Button type="button" variant="outline" onClick={() => void run(() => withdrawAgreementProposal(text(agreement.id)), 'agreements.withdrawnToast')} disabled={busy}>
            {t('agreements.withdrawProposal')}
          </Button>
        ) : null}
        {(status === 'in_review' || status === 'draft' || status === 'withdrawn' || status === 'proposed' || status === 'partially_signed') && !executed ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run(async () => {
              await createNextAgreementVersion(text(agreement.id), note || t('agreements.newVersionNote'));
            }, 'agreements.versionCreatedToast')}
          >
            {t('agreements.newVersion')}
          </Button>
        ) : null}
        {executed ? (
          <>
            <Button type="button" onClick={downloadExecuted}>{t('agreements.downloadPdf')}</Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void run(async () => {
                const id = await createAgreementAmendment(text(agreement.id));
                navigate(`/agreements/${id}`);
              }, 'agreements.amendmentCreatedToast')}
            >
              {t('agreements.createAmendment')}
            </Button>
          </>
        ) : null}
        {status === 'active' ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void run(() => completeAgreement(text(agreement.id)), 'agreements.completedToast')}>
            {t('agreements.completeAction')}
          </Button>
        ) : null}
      </div>

      {canSign ? (
        <Card className="space-y-3 rounded-2xl border-border/60 p-4">
          <p className="font-medium">{t('agreements.signPanelTitle')}</p>
          <p className="text-sm text-muted-foreground">
            {t('agreements.signPanelParty', { party: myParty?.display_name || t('agreements.partyUnknown') })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('agreements.fingerprintLabel')}: {currentVersion?.fingerprint}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={recordsConsent} onCheckedChange={(value) => setRecordsConsent(value === true)} />
            <span>{t('agreements.consentRecords')}</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={signatureConsent} onCheckedChange={(value) => setSignatureConsent(value === true)} />
            <span>{t('agreements.consentSignature')}</span>
          </label>
          {orgSigning ? (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={authorityAttested} onCheckedChange={(value) => setAuthorityAttested(value === true)} />
              <span>{t('agreements.consentAuthority')}</span>
            </label>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="signer-name">{t('agreements.signerName')}</Label>
            <Input id="signer-name" value={signerName} onChange={(event) => setSignerName(event.target.value)} />
          </div>
          <Button
            type="button"
            disabled={busy || !recordsConsent || !signatureConsent || (orgSigning && !authorityAttested)}
            onClick={() => void run(async () => {
              if (!mySignatory) return;
              await signAgreementVersion({
                agreementId: text(agreement.id),
                signatoryId: mySignatory.id,
                signerName,
                recordsConsent,
                signatureConsent,
                authorityAttested,
              });
            }, 'agreements.signSuccess')}
          >
            {t('agreements.signAgreementAction')}
          </Button>
        </Card>
      ) : null}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {(['agreement', 'parties', 'attachments', 'history', 'amendments', 'advanced'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              section === id ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 text-muted-foreground'
            }`}
          >
            {t(`agreements.tabs.${id}`)}
          </button>
        ))}
      </div>

      {section === 'agreement' ? (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="min-w-0 text-xl font-semibold tracking-tight">
              {text(content.structured?.documentHeading) || t(`agreements.types.${text(agreement.agreement_type) || 'general'}`)}
            </h2>
            {canEdit ? (
              <AgreementFitInput
                id="agreement-view-party-reference"
                testId="agreement-party-reference"
                value={partyReference}
                placeholder={t('agreements.partyReferencePlaceholder')}
                ariaLabel={t('agreements.partyReference')}
                tone="muted"
                className="min-w-19 shrink-0 text-right text-sm"
                onChange={(value) => setPartyReference(sanitizeAgreementReferenceInput(value))}
              />
            ) : partyReference ? (
              <p className="shrink-0 text-right text-sm font-normal text-muted-foreground">{partyReference}</p>
            ) : null}
          </div>
          <Label>{t('agreements.fieldPurpose')}</Label>
          {canEdit ? (
            <AgreementRichText
              value={purpose}
              placeholder={t('agreements.fieldPurpose')}
              ariaLabel={t('agreements.fieldPurpose')}
              testId="agreement-view-purpose"
              onChange={setPurpose}
            />
          ) : (
            <AgreementFormattedBody
              html={purpose}
              empty={t('agreements.emptySection')}
              className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm"
            />
          )}
          {sectionDrafts.map((item, index) => (
            <div key={item.id || index} className="space-y-2">
              <p className="text-sm font-medium">{item.title}</p>
              {canEdit ? (
                <AgreementRichText
                  value={item.body}
                  placeholder={t('agreements.emptySection')}
                  ariaLabel={item.title || t('agreements.emptySection')}
                  testId={`agreement-view-section-${item.id || index}`}
                  onChange={(body) => {
                    const next = [...sectionDrafts];
                    next[index] = { ...item, body };
                    setSectionDrafts(next);
                  }}
                />
              ) : (
                <AgreementFormattedBody
                  html={item.body}
                  empty={t('agreements.emptySection')}
                  className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm"
                />
              )}
            </div>
          ))}
          {text(agreement.reference_code) ? (
            <p
              data-testid="agreement-civizen-reference"
              className="pt-4 text-right text-[11px] leading-none text-muted-foreground/80"
            >
              {text(agreement.reference_code)}
            </p>
          ) : null}
          {status === 'in_review' ? (
            <div className="space-y-2">
              <Label htmlFor="review-note">{t('agreements.reviewNote')}</Label>
              <Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[72px]" />
              <Button
                type="button"
                variant="outline"
                disabled={busy || !note.trim()}
                onClick={() => void run(async () => {
                  await addAgreementReviewNote(text(agreement.id), note);
                  setNote('');
                }, 'agreements.reviewNoteSaved')}
              >
                {t('agreements.requestChange')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {section === 'parties' ? (
        <div className="space-y-3">
          {bundle.parties.map((party) => {
            const signatories = bundle.signatories.filter((item) => item.party_id === party.id);
            return (
              <Card key={party.id} className="rounded-2xl border-border/60 p-4 text-sm">
                <p className="font-medium">{party.display_name}</p>
                <p className="text-muted-foreground">{t(`agreements.partyKind.${party.party_kind}`)}</p>
                {signatories.map((item) => {
                  const signed = bundle.signatures.some((signature) => (
                    signature.signatory_id === item.id
                    && signature.version_id === currentVersion?.id
                    && signature.status === 'signed'
                  ));
                  return (
                    <p key={item.id} className="mt-2">
                      {item.display_name || party.display_name}: {signed ? t('agreements.signedYes') : t('agreements.signedNo')}
                    </p>
                  );
                })}
              </Card>
            );
          })}
          <p className="text-xs text-muted-foreground">
            {allRequiredSignaturesComplete(progressParties) ? t('agreements.allSigned') : t('agreements.waitingSignatures')}
          </p>
        </div>
      ) : null}

      {section === 'attachments' ? (
        <div className="space-y-3">
          {bundle.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('agreements.attachmentsEmpty')}</p>
          ) : (
            bundle.attachments.map((item) => (
              <p key={item.id} className="text-sm">{item.file_name} · {t(`agreements.attachmentKind.${item.kind}`)}</p>
            ))
          )}
          {!executed ? (
            <div className="space-y-2 rounded-2xl border border-border/60 p-4">
              <p className="text-sm font-medium">{t('agreements.externalExecutionTitle')}</p>
              <Input type="date" value={externalDate} onChange={(event) => setExternalDate(event.target.value)} />
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={externalMethod}
                onChange={(event) => setExternalMethod(event.target.value as typeof externalMethod)}
              >
                <option value="paper">{t('agreements.execution.paper')}</option>
                <option value="external_electronic">{t('agreements.execution.external_electronic')}</option>
                <option value="other">{t('agreements.execution.other')}</option>
              </select>
              <Textarea value={externalNote} onChange={(event) => setExternalNote(event.target.value)} placeholder={t('agreements.externalNote')} />
              <Input
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || !externalDate) {
                    toast.error(t('agreements.externalRequired'));
                    return;
                  }
                  void run(async () => {
                    const uploaded = await uploadAgreementFile(text(agreement.id), file);
                    await recordAgreementExternalExecution({
                      agreementId: text(agreement.id),
                      method: externalMethod,
                      executedAt: new Date(externalDate).toISOString(),
                      note: externalNote,
                      filePath: uploaded.path,
                      fileName: uploaded.name,
                    });
                  }, 'agreements.externalRecorded');
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {section === 'history' ? (
        <ol className="space-y-3">
          {bundle.notes.map((item) => (
            <li key={`note-${item.id}`} className="rounded-xl border border-border/60 p-3 text-sm">
              <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()} · {t('agreements.events.changeRequested')}</p>
              <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
            </li>
          ))}
          {bundle.events.map((item) => {
            const key = EVENT_LABEL_KEYS[item.event_type] || 'agreements.events.generic';
            return (
              <li key={item.id} className="text-sm">
                <p className="font-medium">{t(key)}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
              </li>
            );
          })}
        </ol>
      ) : null}

      {section === 'amendments' ? (
        bundle.amendments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('agreements.amendmentsEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {bundle.amendments.map((item) => (
              <li key={item.id}>
                <Link to={`/agreements/${item.id}`} className="flex justify-between text-sm">
                  <span>{item.title}</span>
                  <Badge variant="secondary">{t(`agreements.status.${item.status}`)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {section === 'advanced' ? (
        <div className="space-y-2 text-sm">
          <p>{t('agreements.fieldEffective')}: {text(agreement.effective_at) || t('agreements.notSet')}</p>
          <p>{t('agreements.fieldEnd')}: {text(agreement.end_at) || t('agreements.notSet')}</p>
          <p>{t('agreements.executionMethod')}: {text(agreement.execution_method) || t('agreements.notSet')}</p>
          {currentVersion?.fingerprint ? (
            <p className="break-all">{t('agreements.fingerprintLabel')}: {currentVersion.fingerprint}</p>
          ) : null}
          {status === 'active' || status === 'signed' ? (
            <div className="space-y-2 pt-2">
              <Label htmlFor="terminate-reason">{t('agreements.terminateReason')}</Label>
              <Textarea id="terminate-reason" value={terminateReason} onChange={(event) => setTerminateReason(event.target.value)} />
              <Button
                type="button"
                variant="outline"
                disabled={busy || !terminateReason.trim()}
                onClick={() => void run(() => terminateAgreement(text(agreement.id), terminateReason), 'agreements.terminatedToast')}
              >
                {t('agreements.terminateAction')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

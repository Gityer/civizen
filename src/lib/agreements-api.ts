import { supabase } from '@/integrations/supabase/client';
import { isMissingAgreementsBackend } from '@/lib/agreements-backend';
import {
  agreementListBucket,
  compactEmploymentTerms,
  compactSalePurchaseTerms,
  starterContentForType,
  salePurchaseTermsFromLaunch,
  type AgreementContent,
  type AgreementLaunchContext,
  type AgreementListBucket,
  type AgreementPartyKind,
  type AgreementType,
  defaultAgreementTypeForSource,
  normalizeAgreementCreateType,
  relatedEntityTypeForSource,
} from '@/lib/agreements-model';
import { parseSearchDirectoryPayload } from '@/lib/search-directory';

type QueryError = { message?: string; code?: string | null } | null;
type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: QueryError }>;
};

function db(): RpcClient {
  return supabase as unknown as RpcClient;
}

function rpcErrorMessage(error: QueryError): string {
  const message = error?.message?.trim() || 'request_failed';
  return message.replace(/^.*ERROR:\s*/i, '').split('CONTEXT:')[0].trim();
}

export type AgreementListItem = {
  id: string;
  referenceCode: string | null;
  partyReference: string | null;
  title: string;
  agreementType: string | null;
  status: string;
  summary: string | null;
  marketListingId: string | null;
  createdAt: string;
  effectiveAt: string | null;
  endAt: string | null;
  executionMethod: string | null;
  needsAction: boolean;
  parties: { id?: string; displayName: string; profileId?: string | null; roleInAgreement?: string | null }[];
  bucket: AgreementListBucket;
};

export type AgreementPartyRecord = {
  id: string;
  party_kind: AgreementPartyKind | string;
  display_name: string;
  legal_name: string | null;
  profile_id: string | null;
  role_in_agreement: string | null;
  contact: string | null;
  representative_name: string | null;
  representative_title: string | null;
};

export type AgreementVersionRecord = {
  id: string;
  version_number: number;
  content: AgreementContent;
  locked_at: string | null;
  fingerprint: string | null;
  change_note: string | null;
  created_at: string;
};

export type AgreementSignatoryRecord = {
  id: string;
  party_id: string;
  profile_id: string | null;
  kind: 'required' | 'optional' | string;
  display_name: string | null;
  title_snapshot: string | null;
};

export type AgreementSignatureRecord = {
  id: string;
  version_id: string;
  signatory_id: string;
  party_id: string;
  signer_name_snapshot: string;
  party_name_snapshot: string;
  representative_title_snapshot: string | null;
  fingerprint: string;
  signing_method: string;
  signed_at: string;
  status: string;
};

export type AgreementEventRecord = {
  id: string;
  event_type: string;
  actor_profile_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type AgreementDetailBundle = {
  agreement: Record<string, unknown>;
  parties: AgreementPartyRecord[];
  versions: AgreementVersionRecord[];
  signatories: AgreementSignatoryRecord[];
  signatures: AgreementSignatureRecord[];
  relationships: { entity_type: string; entity_id: string | null; label_snapshot: string }[];
  attachments: { id: string; kind: string; file_name: string; file_path: string }[];
  notes: { id: string; body: string; created_at: string; author_profile_id: string | null }[];
  events: AgreementEventRecord[];
  amendments: { id: string; title: string; status: string; referenceCode: string | null }[];
};

export type RelatedAgreementSummary = {
  id: string;
  title: string;
  status: string;
  referenceCode: string | null;
  agreementType: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    return record ? [record] : [];
  });
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function mapListItem(row: Record<string, unknown>): AgreementListItem {
  const needsAction = Boolean(row.needs_action ?? row.needsAction);
  const status = str(row.status) || 'draft';
  const parties = asRows(row.parties).map((party) => ({
    id: str(party.id) || undefined, displayName: str(party.displayName) || str(party.display_name) || 'Party',
    profileId: str(party.profileId) || str(party.profile_id) || null, roleInAgreement: str(party.roleInAgreement) || str(party.role_in_agreement) || null,
  }));
  return {
    id: str(row.id) || '',
    referenceCode: str(row.reference_code) || str(row.referenceCode),
    partyReference: str(row.party_reference) || str(row.partyReference),
    title: str(row.title) || 'Agreement',
    agreementType: str(row.agreement_type) || str(row.agreementType),
    status,
    summary: str(row.summary),
    marketListingId: str(row.market_listing_id) || str(row.marketListingId),
    createdAt: str(row.created_at) || str(row.createdAt) || '',
    effectiveAt: str(row.effective_at) || str(row.effectiveAt),
    endAt: str(row.end_at) || str(row.endAt),
    executionMethod: str(row.execution_method) || str(row.executionMethod),
    needsAction,
    parties,
    bucket: agreementListBucket({ status, needsAction }),
  };
}

export async function listAccessibleAgreements(): Promise<AgreementListItem[]> {
  const { data, error } = await db().rpc('list_accessible_agreements');
  if (!error) {
    return asRows(data).map(mapListItem).filter((row) => row.id);
  }
  if (!isMissingAgreementsBackend(error)) {
    throw new Error(rpcErrorMessage(error));
  }
  const fallback = await supabase
    .from('agreements')
    .select('*')
    .order('created_at', { ascending: false });
  if (fallback.error) {
    if (isMissingAgreementsBackend(fallback.error)) return [];
    throw new Error(fallback.error.message);
  }
  return ((fallback.data ?? []) as Record<string, unknown>[]).map((row) => mapListItem({
    ...row,
    needs_action: false,
    parties: [],
    title: row.title || row.listing_title_snapshot,
  }));
}

export async function getAgreementDetail(agreementId: string): Promise<AgreementDetailBundle | null> {
  const { data, error } = await db().rpc('get_agreement_detail', { p_agreement_id: agreementId });
  if (error) {
    if (isMissingAgreementsBackend(error)) return null;
    throw new Error(rpcErrorMessage(error));
  }
  const record = asRecord(data);
  if (!record) return null;
  return {
    agreement: asRecord(record.agreement) || {},
    parties: asRows(record.parties) as unknown as AgreementPartyRecord[],
    versions: asRows(record.versions).map((version) => ({
      id: str(version.id) || '',
      version_number: Number(version.version_number) || 1,
      content: (asRecord(version.content) || { sections: [] }) as AgreementContent,
      locked_at: str(version.locked_at),
      fingerprint: str(version.fingerprint),
      change_note: str(version.change_note),
      created_at: str(version.created_at) || '',
    })),
    signatories: asRows(record.signatories) as unknown as AgreementSignatoryRecord[],
    signatures: asRows(record.signatures) as unknown as AgreementSignatureRecord[],
    relationships: asRows(record.relationships).map((row) => ({
      entity_type: str(row.entity_type) || '',
      entity_id: str(row.entity_id),
      label_snapshot: str(row.label_snapshot) || '',
    })),
    attachments: asRows(record.attachments).map((row) => ({
      id: str(row.id) || '',
      kind: str(row.kind) || 'working',
      file_name: str(row.file_name) || 'file',
      file_path: str(row.file_path) || '',
    })),
    notes: asRows(record.notes).map((row) => ({
      id: str(row.id) || '',
      body: str(row.body) || '',
      created_at: str(row.created_at) || '',
      author_profile_id: str(row.author_profile_id),
    })),
    events: asRows(record.events).map((row) => ({
      id: str(row.id) || '',
      event_type: str(row.event_type) || '',
      actor_profile_id: str(row.actor_profile_id),
      created_at: str(row.created_at) || '',
      metadata: asRecord(row.metadata) || {},
    })),
    amendments: asRows(record.amendments).map((row) => ({
      id: str(row.id) || '',
      title: str(row.title) || 'Amendment',
      status: str(row.status) || 'draft',
      referenceCode: str(row.referenceCode) || str(row.reference_code),
    })),
  };
}

export async function listAgreementsForEntity(
  entityType: string,
  entityId: string,
): Promise<RelatedAgreementSummary[]> {
  const { data, error } = await db().rpc('list_agreements_for_entity', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) {
    if (isMissingAgreementsBackend(error)) return [];
    throw new Error(rpcErrorMessage(error));
  }
  return asRows(data).map((row) => ({
    id: str(row.id) || '',
    title: str(row.title) || 'Agreement',
    status: str(row.status) || 'draft',
    referenceCode: str(row.referenceCode) || str(row.reference_code),
    agreementType: str(row.agreementType) || str(row.agreement_type),
  })).filter((row) => row.id);
}

export type CreateAgreementInput = {
  title: string;
  agreementType: AgreementType | string;
  summary?: string;
  purpose?: string;
  content?: AgreementContent;
  startAt?: string | null;
  endAt?: string | null;
  parties: {
    kind: AgreementPartyKind | string;
    displayName: string;
    legalName?: string;
    profileId?: string;
    role?: string;
    contact?: string;
    representativeName?: string;
    representativeTitle?: string;
    signatoryProfileId?: string;
  }[];
  related?: { entityType: string; entityId?: string; label: string }[];
  partyReference?: string | null;
};

export function payloadFromLaunchContext(
  context: AgreementLaunchContext,
  actor: { fullName?: string | null; profileId?: string | null; isOrganization?: boolean },
): CreateAgreementInput {
  const agreementType = (context.agreementType || defaultAgreementTypeForSource(context.source)) as AgreementType;
  const relatedType = relatedEntityTypeForSource(context.source) || context.source || undefined;
  const parties = [
    {
      kind: actor.isOrganization ? 'civizen_organization' : 'civizen_individual',
      displayName: actor.fullName?.trim() || 'Civizen party',
      profileId: actor.profileId || undefined,
      role: 'Initiating party',
      signatoryProfileId: actor.profileId || undefined,
    },
  ];
  if (context.partyName) {
    parties.push({
      kind: context.partyKind || 'external_organization',
      displayName: context.partyName,
      profileId: context.partyProfileId,
      role: 'Other party',
      signatoryProfileId: context.partyProfileId,
    });
  }
  const related: NonNullable<CreateAgreementInput['related']> = [];
  if (context.relatedTitle || context.relatedId) {
    related.push({
      entityType: relatedType || 'program',
      entityId: context.relatedId,
      label: context.relatedTitle || context.product || 'Related activity',
    });
  }
  if (context.orderId) {
    related.push({
      entityType: 'market_order',
      entityId: context.orderId,
      label: context.relatedTitle || context.product || 'Related order',
    });
  }
  const productLabel = context.product || context.relatedTitle;
  const purpose = productLabel
    ? (agreementType === 'sale_purchase' ? `Sale / purchase of ${productLabel}.` : `Related to ${productLabel}.`)
    : '';
  const content = starterContentForType(normalizeAgreementCreateType(agreementType), purpose);
  const normalizedType = normalizeAgreementCreateType(agreementType);
  if (normalizedType === 'sale_purchase') {
    content.structured = {
      ...content.structured,
      salePurchase: compactSalePurchaseTerms(salePurchaseTermsFromLaunch(context, actor.fullName)),
    };
  }
  if (normalizedType === 'employment') {
    content.structured = {
      ...content.structured,
      employment: compactEmploymentTerms({
        position: context.position || context.relatedTitle || null,
        workLocation: context.workLocation || null,
        compensation: context.compensation || null,
        payFrequency: context.payFrequency || null,
        employmentStatus: context.employmentStatus || null,
        employer: context.employmentSelfRole === 'employee' ? context.partyName : actor.fullName,
        employee: context.employmentSelfRole === 'employee' ? actor.fullName : context.partyName,
      }),
    };
  }
  if (context.customType?.trim()) {
    content.structured = {
      ...content.structured,
      customTypeName: context.customType.trim(),
    };
  }
  return {
    title: context.customType?.trim()
      || (productLabel && normalizeAgreementCreateType(agreementType) === 'sale_purchase' ? productLabel : context.relatedTitle)
      || '',
    agreementType: normalizeAgreementCreateType(agreementType),
    summary: purpose,
    purpose,
    content,
    parties,
    related,
  };
}

export type AgreementPartySuggestion = {
  profileId: string;
  displayName: string;
  subtitle?: string;
  civizenKind: 'individual' | 'organization';
};

export async function searchAgreementParties(
  query: string,
  excludeProfileId?: string | null,
): Promise<AgreementPartySuggestion[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];
  const { data, error } = await db().rpc('search_civizen_directory', {
    p_query: needle,
    p_exclude_profile_id: excludeProfileId ?? null,
    p_limit: 8,
  });
  if (error) {
    if (isMissingAgreementsBackend(error)) return [];
    return [];
  }
  const parsed = parseSearchDirectoryPayload(data);
  const companies: AgreementPartySuggestion[] = parsed.companies.map((company) => ({
    profileId: company.profile_id,
    displayName: company.profile.full_name || company.business_name_normalized || company.profile.username || 'Organization',
    subtitle: company.profile.username || undefined,
    civizenKind: 'organization',
  }));
  const people: AgreementPartySuggestion[] = parsed.people.map((person) => ({
    profileId: person.id,
    displayName: person.full_name || person.username || 'Member',
    subtitle: person.username || undefined,
    civizenKind: 'individual',
  }));
  return [...companies, ...people].slice(0, 8);
}

export type PeekedAgreementReference = {
  year: number;
  sequence: number;
  referenceCode: string;
};

export async function peekNextAgreementNumber(): Promise<PeekedAgreementReference> {
  const year = new Date().getUTCFullYear();
  const fallback: PeekedAgreementReference = {
    year,
    sequence: 1,
    referenceCode: `AGR-${year}-0001`,
  };
  const { data, error } = await db().rpc('peek_agreement_next_reference');
  if (error) {
    if (isMissingAgreementsBackend(error)) return fallback;
    return fallback;
  }
  const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const sequence = Number(row.sequence);
  return {
    year: Number(row.year) || year,
    sequence: Number.isFinite(sequence) && sequence > 0 ? sequence : 1,
    referenceCode: typeof row.referenceCode === 'string' && row.referenceCode
      ? row.referenceCode
      : fallback.referenceCode,
  };
}

export async function createCollaborationAgreement(input: CreateAgreementInput): Promise<string> {
  const payload = {
    title: input.title,
    agreement_type: input.agreementType,
    summary: input.summary || null,
    content: input.content || starterContentForType(input.agreementType as AgreementType, input.purpose),
    start_at: input.startAt || null,
    end_at: input.endAt || null,
    parties: input.parties.map((party) => ({
      kind: party.kind,
      display_name: party.displayName,
      legal_name: party.legalName || null,
      profile_id: party.profileId || null,
      role: party.role || null,
      contact: party.contact || null,
      representative_name: party.representativeName || null,
      representative_title: party.representativeTitle || null,
      signatory_profile_id: party.signatoryProfileId || party.profileId || null,
    })),
    related: (input.related || []).map((item) => ({
      entity_type: item.entityType,
      entity_id: item.entityId || null,
      label: item.label,
    })),
    party_reference: input.partyReference || null,
  };
  const { data, error } = await db().rpc('create_collaboration_agreement', { p_payload: payload });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string' || !data) throw new Error('Could not create the agreement.');
  return data;
}

async function rpcVoid(name: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await db().rpc(name, args);
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function updateCollaborationAgreementDraft(agreementId: string, payload: Record<string, unknown>) {
  await rpcVoid('update_collaboration_agreement_draft', { p_agreement_id: agreementId, p_payload: payload });
}

export async function createNextAgreementVersion(agreementId: string, changeNote?: string) {
  const { data, error } = await db().rpc('create_next_agreement_version', {
    p_agreement_id: agreementId,
    p_change_note: changeNote || null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return typeof data === 'string' ? data : null;
}

export async function requestAgreementReview(agreementId: string) {
  await rpcVoid('request_agreement_review', { p_agreement_id: agreementId });
}

export async function addAgreementReviewNote(agreementId: string, body: string) {
  await rpcVoid('add_agreement_review_note', { p_agreement_id: agreementId, p_body: body });
}

export async function proposeAgreementVersion(agreementId: string) {
  await rpcVoid('propose_agreement_version', { p_agreement_id: agreementId });
}

export async function withdrawAgreementProposal(agreementId: string) {
  await rpcVoid('withdraw_agreement_proposal', { p_agreement_id: agreementId });
}

export async function signAgreementVersion(params: {
  agreementId: string;
  signatoryId: string;
  signerName: string;
  recordsConsent: boolean;
  signatureConsent: boolean;
  authorityAttested?: boolean;
}) {
  await rpcVoid('sign_agreement_version', {
    p_agreement_id: params.agreementId,
    p_signatory_id: params.signatoryId,
    p_signer_name: params.signerName,
    p_electronic_records_consent: params.recordsConsent,
    p_electronic_signature_consent: params.signatureConsent,
    p_authority_attested: Boolean(params.authorityAttested),
  });
}

export async function recordAgreementExternalExecution(params: {
  agreementId: string;
  method: 'paper' | 'external_electronic' | 'other';
  executedAt: string;
  note?: string;
  filePath: string;
  fileName: string;
}) {
  await rpcVoid('record_agreement_external_execution', {
    p_agreement_id: params.agreementId,
    p_method: params.method,
    p_executed_at: params.executedAt,
    p_note: params.note || null,
    p_file_path: params.filePath,
    p_file_name: params.fileName,
  });
}

export async function completeAgreement(agreementId: string) {
  await rpcVoid('complete_agreement', { p_agreement_id: agreementId });
}

export async function terminateAgreement(agreementId: string, reason: string) {
  await rpcVoid('terminate_agreement', { p_agreement_id: agreementId, p_reason: reason });
}

export async function createAgreementAmendment(agreementId: string, title?: string) {
  const { data, error } = await db().rpc('create_agreement_amendment', {
    p_agreement_id: agreementId,
    p_title: title || null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string' || !data) throw new Error('Could not create the amendment.');
  return data;
}

export async function uploadAgreementFile(agreementId: string, file: File): Promise<{ path: string; name: string }> {
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${agreementId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('agreement-files').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return { path, name: file.name };
}

export function isCollaborationAgreement(bundle: AgreementDetailBundle | null): boolean {
  if (!bundle) return false;
  if (bundle.versions.length > 0) return true;
  const type = str(bundle.agreement.agreement_type);
  return Boolean(type && !type.startsWith('market_'));
}

import { supabase } from '@/integrations/supabase/client';
import type { PublicPlace, ScopeKind } from '@/lib/public-functions';

/**
 * After a Matter is routed to a public function: delivery to the body, the answer within its deadline, offices held by
 * officials, coverage of a place, and a body's page (see docs/01-governance/roles-and-permissions/public-functions.md).
 */
export type DeliveryStatus = 'delivered' | 'overdue' | 'answered';
export type AnswerOutcome = 'resolved' | 'answered' | 'refused' | 'redirected';
export const ANSWER_OUTCOMES: AnswerOutcome[] = ['resolved', 'answered', 'redirected', 'refused'];

export type PublicDelivery = {
  id: string;
  bodyName: string;
  channelKind: string;
  reference: string | null;
  deliveredAt: string;
  answerDueAt: string;
  status: DeliveryStatus;
  outcome: AnswerOutcome | null;
  answerSummary: string | null;
  answeredAt: string | null;
  externalId: string | null;
  externalStatus: string | null;
};

export type MatterPublicStatus = {
  functionKey: string;
  functionName: string;
  body: { id: string; name: string; website: string | null; answerDeadlineDays: number | null; channelKind: string } | null;
  office: string | null;
  deliveries: PublicDelivery[];
  candidateBodies: Array<{ id: string; name: string; scopeKind: ScopeKind }>;
  canHandle: boolean;
};

export type CoverageRow = {
  functionKey: string;
  name: string;
  divisionCode: string;
  bodies: Array<{ id: string; name: string; scopeKind: ScopeKind }>;
  status: 'gap' | 'covered' | 'overlap';
};

export type PublicBodyDetail = {
  id: string;
  name: string;
  kind: string;
  scopeKind: ScopeKind;
  scopeCountryCode: string | null;
  scopeRegionCode: string | null;
  scopeLocalityCode: string | null;
  website: string | null;
  channelKind: string;
  channelAddress: string;
  answerDeadlineDays: number | null;
  sourceUrl: string;
  reviewedAt: string | null;
  functions: Array<{ functionKey: string; name: string; coverageNote: string | null }>;
  offices: Array<{ positionKey: string; title: string; held: boolean }>;
};

type Row = Record<string, unknown>;
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const numOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

export function parseMatterPublicStatus(raw: unknown): MatterPublicStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Row;
  const body = r.body && typeof r.body === 'object' ? (r.body as Row) : null;
  return {
    functionKey: str(r.function_key),
    functionName: str(r.function_name),
    body: body ? { id: str(body.id), name: str(body.name), website: strOrNull(body.website), answerDeadlineDays: numOrNull(body.answer_deadline_days), channelKind: str(body.channel_kind) } : null,
    office: strOrNull(r.office),
    deliveries: rows(r.deliveries).map((d) => ({
      id: str(d.id), bodyName: str(d.body_name), channelKind: str(d.channel_kind), reference: strOrNull(d.reference),
      deliveredAt: str(d.delivered_at), answerDueAt: str(d.answer_due_at),
      status: (['delivered', 'overdue', 'answered'].includes(str(d.status)) ? d.status : 'delivered') as DeliveryStatus,
      outcome: (strOrNull(d.outcome) as AnswerOutcome | null), answerSummary: strOrNull(d.answer_summary), answeredAt: strOrNull(d.answered_at),
      externalId: strOrNull(d.external_id), externalStatus: strOrNull(d.external_status),
    })),
    candidateBodies: rows(r.candidate_bodies).map((b) => ({ id: str(b.id), name: str(b.name), scopeKind: (str(b.scope_kind) || 'global') as ScopeKind })),
    canHandle: r.can_handle === true,
  };
}

export function parseCoverage(raw: unknown): CoverageRow[] {
  return rows(raw).map((r) => ({
    functionKey: str(r.function_key), name: str(r.name), divisionCode: str(r.division_code),
    bodies: rows(r.bodies).map((b) => ({ id: str(b.id), name: str(b.name), scopeKind: (str(b.scope_kind) || 'global') as ScopeKind })),
    status: (['gap', 'covered', 'overlap'].includes(str(r.status)) ? r.status : 'gap') as CoverageRow['status'],
  }));
}

export function parseBodyDetail(raw: unknown): PublicBodyDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Row;
  return {
    id: str(r.id), name: str(r.name), kind: str(r.kind), scopeKind: (str(r.scope_kind) || 'global') as ScopeKind,
    scopeCountryCode: strOrNull(r.scope_country_code), scopeRegionCode: strOrNull(r.scope_region_code), scopeLocalityCode: strOrNull(r.scope_locality_code),
    website: strOrNull(r.website), channelKind: str(r.channel_kind), channelAddress: str(r.channel_address),
    answerDeadlineDays: numOrNull(r.answer_deadline_days), sourceUrl: str(r.source_url), reviewedAt: strOrNull(r.reviewed_at),
    functions: rows(r.functions).map((f) => ({ functionKey: str(f.function_key), name: str(f.name), coverageNote: strOrNull(f.coverage_note) })),
    offices: rows(r.offices).map((o) => ({ positionKey: str(o.position_key), title: str(o.title), held: o.held === true })),
  };
}

/** Whether a delivery's answer is late (still open after its due date). */
export function isAnswerLate(delivery: Pick<PublicDelivery, 'status' | 'answerDueAt'>, now = Date.now()): boolean {
  return delivery.status !== 'answered' && Date.parse(delivery.answerDueAt) < now;
}

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'request_failed');
}

export async function loadMatterPublicStatus(matterId: string): Promise<MatterPublicStatus | null> {
  const { data, error } = await supabase.rpc('matter_public_status', { p_matter_id: matterId });
  fail(error);
  return parseMatterPublicStatus(data);
}

export async function recordPublicDelivery(matterId: string, reference: string): Promise<void> {
  const { error } = await supabase.rpc('record_public_delivery', { p_matter_id: matterId, p_reference: reference });
  fail(error);
}

export async function recordPublicAnswer(deliveryId: string, outcome: AnswerOutcome, summary: string): Promise<void> {
  const { error } = await supabase.rpc('record_public_answer', { p_delivery_id: deliveryId, p_outcome: outcome, p_summary: summary });
  fail(error);
}

export async function assignMatterPublicBody(matterId: string, bodyId: string): Promise<void> {
  const { error } = await supabase.rpc('assign_matter_public_body', { p_matter_id: matterId, p_body_id: bodyId });
  fail(error);
}

export async function loadCoverage(place: PublicPlace): Promise<CoverageRow[]> {
  const { data, error } = await supabase.rpc('public_coverage', {
    p_scope_kind: place.scopeKind, p_country: place.scopeCountryCode ?? undefined, p_region: place.scopeRegionCode ?? undefined,
    p_locality: place.scopeLocalityCode ?? undefined,
  });
  fail(error);
  return parseCoverage(data);
}

export async function loadPublicBody(bodyId: string): Promise<PublicBodyDetail | null> {
  const { data, error } = await supabase.rpc('public_body_detail', { p_body_id: bodyId });
  fail(error);
  return parseBodyDetail(data);
}

export async function requestPublicOffice(bodyId: string, title: string, evidenceUrl: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('request_public_office', { p_body_id: bodyId, p_title: title, p_evidence_url: evidenceUrl, p_note: note });
  fail(error);
}

export async function approvePublicOffice(itemId: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('approve_public_office', { p_item_id: itemId, p_note: note });
  fail(error);
}

/** Sends the Matter through the body's city service-request system (Open311); the request id becomes the reference. */
export async function submitOpen311(matterId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('public-delivery-open311', { body: { action: 'submit', matter_id: matterId } });
  if (error) throw new Error((data as { error?: string } | null)?.error || error.message || 'request_failed');
}

/** Reads the request's status from the city; a closed request records its notes as the answer. */
export async function refreshOpen311(deliveryId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('public-delivery-open311', { body: { action: 'refresh', delivery_id: deliveryId } });
  if (error) throw new Error((data as { error?: string } | null)?.error || error.message || 'request_failed');
}

const DELIVERY_ERRORS = ['endpoint_not_allowed', 'not_a_service_request_body', 'not_authorized', 'no_body', 'delivery_already_open', 'delivery_not_open', 'answer_required', 'body_not_for_function',
  'evidence_required', 'request_already_open', 'note_required'];

export function deliveryErrorKey(message: string): string {
  const hit = DELIVERY_ERRORS.find((code) => message.includes(code));
  return hit ? `organisation.public.delivery.errors.${hit}` : 'organisation.errors.generic';
}

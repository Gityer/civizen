import { supabase } from '@/integrations/supabase/client';

/**
 * Organisation positions (see docs/01-governance/roles-and-permissions/organisation-positions.md): responsibility
 * sits with a position in a unit; holders come and go, the position keeps its queue, journal and handover notes.
 */
export type PositionPerson = { profileId: string; username: string | null; fullName: string | null };
export type PositionHolder = PositionPerson & { kind: 'holder' | 'acting'; since: string };

export type ChartPosition = {
  positionKey: string;
  title: string;
  mandate: string;
  parentPositionKey: string | null;
  seats: number;
  contactTopic: string | null;
  holders: PositionHolder[];
  openItems: number;
};
export type ChartUnit = { unitKey: string; name: string; description: string; domainKey: string; positions: ChartPosition[] };

export type PositionTerm = PositionPerson & {
  id: string;
  kind: 'holder' | 'acting';
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
  handoverNote: string | null;
};
export type PositionItemStatus = 'open' | 'in_progress' | 'waiting' | 'done' | 'declined';
export type PositionItem = {
  id: string;
  kind: 'decision' | 'task' | 'review' | 'inquiry';
  title: string;
  body: string;
  recommendation: string | null;
  status: PositionItemStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueAt: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  claimedBy: { profileId: string; username: string | null } | null;
  matterId: string | null;
  publicBodyId: string | null;
  officeRequest: boolean;
  contact: { name: string; email: string; topic: string } | null;
};
export type PositionLogEntry = { id: number; event: string; itemId: string | null; body: string; createdAt: string; actor: string | null };

export type PositionDetail = {
  positionKey: string;
  title: string;
  mandate: string;
  duties: string[];
  seats: number;
  contactTopic: string | null;
  parentPositionKey: string | null;
  parentTitle: string | null;
  unit: { unitKey: string; name: string; domainKey: string } | null;
  terms: PositionTerm[];
  vacant: boolean;
  answeredBy: PositionPerson[];
  openItems: number;
  canWork: boolean;
  canAppoint: boolean;
  isHolder: boolean;
  items: PositionItem[];
  log: PositionLogEntry[];
};

export const OPEN_STATUSES: PositionItemStatus[] = ['open', 'in_progress', 'waiting'];
export const CONTACT_TOPICS = ['general', 'privacy', 'safety', 'security', 'press'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

type Row = Record<string, unknown>;
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0);
const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

function person(row: Row): PositionPerson {
  return { profileId: str(row.profile_id), username: strOrNull(row.username), fullName: strOrNull(row.full_name) };
}

export function personName(p: { username: string | null; fullName?: string | null }): string {
  return p.fullName || (p.username ? `@${p.username}` : '—');
}

export function parseChart(raw: unknown): ChartUnit[] {
  return rows(raw).map((unit) => ({
    unitKey: str(unit.unit_key),
    name: str(unit.name),
    description: str(unit.description),
    domainKey: str(unit.domain_key),
    positions: rows(unit.positions).map((p) => ({
      positionKey: str(p.position_key),
      title: str(p.title),
      mandate: str(p.mandate),
      parentPositionKey: strOrNull(p.parent_position_key),
      seats: num(p.seats) || 1,
      contactTopic: strOrNull(p.contact_topic),
      holders: rows(p.holders).map((h) => ({ ...person(h), kind: h.kind === 'acting' ? 'acting' : 'holder', since: str(h.since) })),
      openItems: num(p.open_items),
    })),
  }));
}

function parseItem(i: Row): PositionItem {
  const meta = i.metadata && typeof i.metadata === 'object' ? (i.metadata as Row) : {};
  const claimed = i.claimed_by && typeof i.claimed_by === 'object' ? (i.claimed_by as Row) : null;
  return {
    id: str(i.id),
    kind: (['decision', 'task', 'review', 'inquiry'].includes(str(i.kind)) ? i.kind : 'task') as PositionItem['kind'],
    title: str(i.title),
    body: str(i.body),
    recommendation: strOrNull(i.recommendation),
    status: (['open', 'in_progress', 'waiting', 'done', 'declined'].includes(str(i.status)) ? i.status : 'open') as PositionItemStatus,
    priority: (['low', 'normal', 'high', 'urgent'].includes(str(i.priority)) ? i.priority : 'normal') as PositionItem['priority'],
    dueAt: strOrNull(i.due_at),
    resolution: strOrNull(i.resolution),
    resolvedAt: strOrNull(i.resolved_at),
    createdAt: str(i.created_at),
    claimedBy: claimed ? { profileId: str(claimed.profile_id), username: strOrNull(claimed.username) } : null,
    matterId: i.source_type === 'matter' ? strOrNull(i.source_ref) : null,
    publicBodyId: i.source_type === 'public_body' ? strOrNull(i.source_ref) : null,
    officeRequest: i.source_type === 'office_request',
    contact: meta.email ? { name: str(meta.name), email: str(meta.email), topic: str(meta.topic) } : null,
  };
}

export function parsePositionDetail(raw: unknown): PositionDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Row;
  const unit = d.unit && typeof d.unit === 'object' ? (d.unit as Row) : null;
  return {
    positionKey: str(d.position_key),
    title: str(d.title),
    mandate: str(d.mandate),
    duties: Array.isArray(d.duties) ? (d.duties as unknown[]).map(str).filter(Boolean) : [],
    seats: num(d.seats) || 1,
    contactTopic: strOrNull(d.contact_topic),
    parentPositionKey: strOrNull(d.parent_position_key),
    parentTitle: strOrNull(d.parent_title),
    unit: unit ? { unitKey: str(unit.unit_key), name: str(unit.name), domainKey: str(unit.domain_key) } : null,
    terms: rows(d.terms).map((t) => ({
      ...person(t),
      id: str(t.id),
      kind: t.kind === 'acting' ? 'acting' : 'holder',
      startedAt: str(t.started_at),
      endedAt: strOrNull(t.ended_at),
      endReason: strOrNull(t.end_reason),
      handoverNote: strOrNull(t.handover_note),
    })),
    vacant: d.vacant === true,
    answeredBy: rows(d.answered_by).map(person),
    openItems: num(d.open_items),
    canWork: d.can_work === true,
    canAppoint: d.can_appoint === true,
    isHolder: d.is_holder === true,
    items: rows(d.items).map(parseItem),
    log: rows(d.log).map((l) => ({
      id: num(l.id),
      event: str(l.event),
      itemId: strOrNull(l.item_id),
      body: str(l.body),
      createdAt: str(l.created_at),
      actor: strOrNull(l.actor),
    })),
  };
}

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'request_failed');
}

export async function loadOrgChart(): Promise<ChartUnit[]> {
  const { data, error } = await supabase.rpc('org_chart');
  fail(error);
  return parseChart(data);
}

export async function loadPositionDetail(positionKey: string): Promise<PositionDetail | null> {
  const { data, error } = await supabase.rpc('org_position_detail', { p_position_key: positionKey });
  fail(error);
  return parsePositionDetail(data);
}

export async function loadMyPositions(): Promise<Array<{ positionKey: string; title: string; held: boolean; openItems: number }>> {
  const { data, error } = await supabase.rpc('org_my_positions');
  fail(error);
  return rows(data).map((p) => ({ positionKey: str(p.position_key), title: str(p.title), held: p.held === true, openItems: num(p.open_items) }));
}

export async function appointPositionHolder(positionKey: string, profileId: string, kind: 'holder' | 'acting', note: string): Promise<void> {
  const { error } = await supabase.rpc('org_appoint_position_holder', { p_position_key: positionKey, p_profile: profileId, p_kind: kind, p_note: note });
  fail(error);
}

export async function endPositionTerm(termId: string, reason: string, handoverNote: string): Promise<void> {
  const { error } = await supabase.rpc('org_end_position_term', { p_term_id: termId, p_reason: reason, p_handover_note: handoverNote });
  fail(error);
}

export type ItemAction = 'claim' | 'release' | 'wait' | 'note' | 'done' | 'declined';

export async function updatePositionItem(itemId: string, action: ItemAction, text: string): Promise<void> {
  const { error } = await supabase.rpc('org_update_position_item', { p_item_id: itemId, p_action: action, p_text: text });
  fail(error);
}

export async function openPositionItem(positionKey: string, kind: 'decision' | 'task' | 'review', title: string, body: string, recommendation: string): Promise<void> {
  const { error } = await supabase.rpc('org_open_position_item', {
    p_position_key: positionKey, p_kind: kind, p_title: title, p_body: body, p_recommendation: recommendation,
  });
  fail(error);
}

export async function addPositionNote(positionKey: string, text: string): Promise<void> {
  const { error } = await supabase.rpc('org_add_position_note', { p_position_key: positionKey, p_text: text });
  fail(error);
}

export async function submitContactMessage(topic: ContactTopic, name: string, email: string, message: string): Promise<void> {
  const { error } = await supabase.rpc('submit_contact_message', { p_topic: topic, p_name: name, p_email: email, p_message: message });
  if (error) throw Object.assign(new Error(error.message || 'request_failed'), { code: error.code, details: error.details, hint: error.hint });
}

const ORG_ERRORS = [
  'not_authorized', 'position_not_found', 'position_full', 'already_holds_position', 'member_not_found', 'reason_required',
  'handover_note_required', 'resolution_required', 'text_required', 'item_closed', 'unknown_topic', 'email_invalid', 'message_length',
];

/** i18n key for a failed organisation call. */
export function organisationErrorKey(message: string): string {
  const hit = ORG_ERRORS.find((code) => message.includes(code));
  return hit ? `organisation.errors.${hit}` : 'organisation.errors.generic';
}

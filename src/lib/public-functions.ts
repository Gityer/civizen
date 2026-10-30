import { supabase } from '@/integrations/supabase/client';

/**
 * One planet-wide model of public functions (see docs/01-governance/roles-and-permissions/public-functions.md):
 * every place performs the same functions through its own bodies; bodies are mapped onto functions with an official
 * source and verified by the function's Civizen liaison; a function and a place route to the most local verified body,
 * or to the liaison while none is mapped. No country is first.
 */
export type FunctionOrigin = 'cofog' | 'civizen_addition' | 'catch_all';

/** A public function: a UN COFOG group, a marked Civizen addition, or a division's catch-all. */
export type PublicFunction = {
  functionKey: string;
  name: string;
  description: string;
  divisionCode: string;
  divisionName: string;
  cofogCode: string | null;
  origin: FunctionOrigin;
  keywords: string[];
  liaisonPositionKey: string | null;
  verifiedBodies: number;
};

export type ScopeKind = 'global' | 'country' | 'region' | 'locality';
export type PublicPlace = { scopeKind: ScopeKind; scopeCountryCode: string | null; scopeRegionCode: string | null; scopeLocalityCode: string | null };

export type PublicBody = {
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
};

export type PublicRoute = { functionKey: string; functionName: string; divisionCode: string; liaisonPositionKey: string | null; liaisonTitle: string | null; body: PublicBody | null };

export const BODY_KINDS = ['international', 'legislature', 'executive', 'ministry', 'agency', 'court', 'independent',
  'regional_government', 'local_government', 'service_provider', 'other'] as const;
export const CHANNEL_KINDS = ['web_form', 'email', 'service_request_api', 'postal', 'phone'] as const;

type Row = Record<string, unknown>;
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const numOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function parseBody(row: Row | null): PublicBody | null {
  if (!row || typeof row !== 'object' || !row.id) return null;
  return {
    id: str(row.id), name: str(row.name), kind: str(row.kind),
    scopeKind: (str(row.scope_kind) || 'global') as ScopeKind,
    scopeCountryCode: strOrNull(row.scope_country_code), scopeRegionCode: strOrNull(row.scope_region_code),
    scopeLocalityCode: strOrNull(row.scope_locality_code), website: strOrNull(row.website),
    channelKind: str(row.channel_kind), channelAddress: str(row.channel_address),
    answerDeadlineDays: numOrNull(row.answer_deadline_days), sourceUrl: str(row.source_url),
  };
}

export function parseRoute(raw: unknown): PublicRoute | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Row;
  return {
    functionKey: str(r.function_key), functionName: str(r.function_name), divisionCode: str(r.division_code),
    liaisonPositionKey: strOrNull(r.liaison_position_key), liaisonTitle: strOrNull(r.liaison_title),
    body: parseBody((r.body as Row | null) ?? null),
  };
}

export function parseCatalog(raw: unknown): PublicFunction[] {
  return (Array.isArray(raw) ? (raw as Row[]) : []).map((r) => ({
    functionKey: str(r.function_key), name: str(r.name), description: str(r.description),
    divisionCode: str(r.division_code), divisionName: str(r.division_name), cofogCode: strOrNull(r.cofog_code),
    origin: (['cofog', 'civizen_addition', 'catch_all'].includes(str(r.origin)) ? r.origin : 'cofog') as FunctionOrigin,
    keywords: Array.isArray(r.keywords) ? (r.keywords as unknown[]).map(str).filter(Boolean) : [],
    liaisonPositionKey: strOrNull(r.liaison_position_key),
    verifiedBodies: typeof r.verified_bodies === 'number' ? r.verified_bodies : Number(r.verified_bodies) || 0,
  }));
}

/** The function whose keywords the text mentions most (whole words or phrases), or null. */
export function suggestPublicFunction(title: string, body: string, functions: readonly PublicFunction[]): PublicFunction | null {
  const text = ` ${`${title} ${body}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  let best: PublicFunction | null = null;
  let bestScore = 0;
  for (const fn of functions) {
    const score = fn.keywords.reduce((total, keyword) => (text.includes(` ${keyword.toLowerCase()} `) ? total + keyword.split(' ').length : total), 0);
    if (score > bestScore) {
      best = fn;
      bestScore = score;
    }
  }
  return best;
}

/** "Planet", or the place's codes from the widest to the narrowest. */
export function placeLabel(place: Pick<PublicPlace, 'scopeKind' | 'scopeCountryCode' | 'scopeRegionCode' | 'scopeLocalityCode'>, planet: string): string {
  if (place.scopeKind === 'global') return planet;
  return [place.scopeCountryCode, place.scopeRegionCode, place.scopeLocalityCode].filter(Boolean).join(' / ');
}

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'request_failed');
}

export async function loadFunctionCatalog(): Promise<PublicFunction[]> {
  const { data, error } = await supabase.rpc('public_function_catalog');
  fail(error);
  return parseCatalog(data);
}

export async function routePublicFunction(functionKey: string, place: PublicPlace): Promise<PublicRoute | null> {
  const { data, error } = await supabase.rpc('route_public_function', {
    p_function_key: functionKey, p_scope_kind: place.scopeKind, p_country: place.scopeCountryCode ?? undefined,
    p_region: place.scopeRegionCode ?? undefined, p_locality: place.scopeLocalityCode ?? undefined,
  });
  fail(error);
  return parseRoute(data);
}

export async function setMatterPublicRoute(matterId: string, functionKey: string): Promise<PublicRoute | null> {
  const { data, error } = await supabase.rpc('set_matter_public_route', { p_matter_id: matterId, p_function_key: functionKey });
  fail(error);
  return parseRoute(data);
}

export type BodyProposal = PublicPlace & {
  name: string;
  kind: string;
  functions: string[];
  website: string;
  channelKind: string;
  channelAddress: string;
  answerDeadlineDays: number | null;
  sourceUrl: string;
  notes: string;
};

export async function proposePublicBody(proposal: BodyProposal): Promise<string> {
  const { data, error } = await supabase.rpc('propose_public_body', {
    payload: {
      name: proposal.name, kind: proposal.kind, scope_kind: proposal.scopeKind, scope_country_code: proposal.scopeCountryCode,
      scope_region_code: proposal.scopeRegionCode, scope_locality_code: proposal.scopeLocalityCode, functions: proposal.functions,
      website: proposal.website, channel_kind: proposal.channelKind, channel_address: proposal.channelAddress,
      answer_deadline_days: proposal.answerDeadlineDays, source_url: proposal.sourceUrl, notes: proposal.notes,
    },
  });
  fail(error);
  return String(data);
}

export async function reviewPublicBody(bodyId: string, decision: 'verified' | 'rejected', note: string): Promise<void> {
  const { error } = await supabase.rpc('review_public_body', { p_body_id: bodyId, p_decision: decision, p_note: note });
  fail(error);
}

const PUBLIC_ERRORS = ['functions_required', 'source_required', 'not_authorized', 'note_required', 'unknown_function', 'rate_limited'];

export function publicFunctionErrorKey(message: string): string {
  const hit = PUBLIC_ERRORS.find((code) => message.includes(code));
  return hit ? `organisation.public.errors.${hit}` : 'organisation.errors.generic';
}

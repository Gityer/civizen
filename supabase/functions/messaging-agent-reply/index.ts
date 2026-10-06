import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { prepareNelaTurn, learnedMemoryFromRow, reviewLlmAnswerForLearning } from './nela-bundle.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Civi — Civizen’s AI assistant (system profile). */
const AGENT_PROFILE_ID = 'a0000000-0000-4000-8000-000000000001';

/** Canonical product framing — keep in sync with in-app Study / governance positioning. */
const CIVIZEN_PRODUCT_SUMMARY =
  'Civizen is a human-centered platform and movement designed to help people unite, grow, and govern more wisely through education, responsibility, transparency, and AI-assisted civic collaboration.';

const NELA_FALLBACK_SYSTEM_PROMPT =
  'You are Civi, Civizen’s AI assistant for this Civizen build. ' +
  CIVIZEN_PRODUCT_SUMMARY +
  ' For questions about Civizen current functionality, architecture, rules, governance, terminology, capabilities, or policies, rely on the supplied current Civizen knowledge and retrieved project sources. Do not invent missing project facts from general model knowledge. ' +
  'Simple by default. Detailed by choice. Keep replies concise and readable. ' +
  'If you cannot verify a Civizen fact from the supplied knowledge, say you could not verify it.';

type Body = {
  conversation_id?: string;
  message?: string;
  history?: HistoryTurn[];
  public?: boolean;
  debug?: boolean;
};

type HistoryTurn = { role: 'user' | 'assistant'; content: string };
type ModerationMetricCategory =
  | 'off_topic'
  | 'greeting'
  | 'policy_civizen_summary'
  | 'policy_safety'
  | 'policy_governance'
  | 'policy_marketplace'
  | 'policy_privacy'
  | 'abuse_illegal'
  | 'abuse_violence'
  | 'abuse_self_harm'
  | 'abuse_security_abuse'
  | 'abuse_harassment'
  | 'abuse_sexual_minors';

/** Prior Nela placeholder replies confuse Gemini (HTTP 200 but no output `parts`). */
function isFailedNelaPlaceholderAssistant(turn: HistoryTurn): boolean {
  if (turn.role !== 'assistant') return false;
  const c = turn.content.trim().toLowerCase();
  if (!c) return true;
  if (c.includes('could not generate a reply')) return true;
  if (c.includes('not fully configured')) return true;
  if (c.includes('no ai provider key configured')) return true;
  if (c.includes('automated replies are not available')) return true;
  return false;
}

/**
 * Historical wrong framing can poison future generations.
 * Drop prior assistant turns that conflict with Civizen's canonical positioning.
 */
function isInaccurateCivizenFramingAssistant(turn: HistoryTurn): boolean {
  if (turn.role !== 'assistant') return false;
  const c = turn.content.trim().toLowerCase();
  if (!c) return false;
  if (!c.includes('civizen')) return false;

  const inaccuratePhrases = [
    'community platform',
    'connect people with shared interests',
    'shared interests',
    'facilitate group activities',
    'group activities',
    'hobby',
    'meetup',
    'not designed for individual legal agreements',
    'i can only help with civizen-related topics',
  ];
  return inaccuratePhrases.some((p) => c.includes(p));
}

function compactHistoryForLlm(turns: HistoryTurn[]): HistoryTurn[] {
  const filtered = turns.filter((t) => {
    if (!t.content.trim()) return false;
    if (isFailedNelaPlaceholderAssistant(t)) return false;
    if (isInaccurateCivizenFramingAssistant(t)) return false;
    return true;
  });
  const out: HistoryTurn[] = [];
  for (const t of filtered) {
    const content = t.content.trim();
    const prev = out[out.length - 1];
    if (prev && prev.role === t.role) {
      prev.content = `${prev.content}\n${content}`;
    } else {
      out.push({ role: t.role, content });
    }
  }
  return out;
}

type ResolvedLlm =
  | { kind: 'none' }
  | { kind: 'gemini'; key: string; model: string }
  | { kind: 'openai'; key: string };

function resolveLlm(): ResolvedLlm {
  const explicit = (Deno.env.get('NELA_LLM_PROVIDER') ?? '').trim().toLowerCase();
  const geminiKey = (Deno.env.get('GEMINI_API_KEY') ?? '').trim();
  const openaiKey = (Deno.env.get('OPENAI_API_KEY') ?? '').trim();
  const geminiModel = (Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite').trim();

  if (explicit === 'openai') {
    return openaiKey ? { kind: 'openai', key: openaiKey } : { kind: 'none' };
  }
  if (explicit === 'gemini') {
    return geminiKey ? { kind: 'gemini', key: geminiKey, model: geminiModel } : { kind: 'none' };
  }
  // auto: prefer Gemini when present (typical free-tier path); else OpenAI
  if (geminiKey) return { kind: 'gemini', key: geminiKey, model: geminiModel };
  if (openaiKey) return { kind: 'openai', key: openaiKey };
  return { kind: 'none' };
}

function isWhatIsCivizenQuestion(content: string): boolean {
  const c = content.trim().toLowerCase();
  if (!c) return false;
  if (!c.includes('civizen')) return false;
  return (
    /^what\s+is\s+civizen\b/.test(c) ||
    /^what['’]?s\s+civizen\b/.test(c) ||
    /^define\s+civizen\b/.test(c) ||
    /^describe\s+civizen\b/.test(c) ||
    c.includes('civizen in one sentence') ||
    c.includes('what is civizen in one sentence')
  );
}

type AbuseCategory = 'illegal' | 'violence' | 'self-harm' | 'security-abuse' | 'harassment' | 'sexual-minors';

function classifyAbuse(content: string): AbuseCategory | null {
  const c = content.trim().toLowerCase();
  if (!c) return null;

  const hasAny = (terms: string[]) => terms.some((t) => c.includes(t));

  if (
    hasAny([
      'child porn',
      'minor sexual',
      'underage sexual',
      'sexual with minors',
      'groom a child',
      'cp ',
    ])
  ) {
    return 'sexual-minors';
  }

  if (
    hasAny([
      'kill myself',
      'suicide',
      'self harm',
      'hurt myself',
      'end my life',
      'want to die',
    ])
  ) {
    return 'self-harm';
  }

  if (
    hasAny([
      'how to kill',
      'make a bomb',
      'build a bomb',
      'attack someone',
      'shoot someone',
      'stabbing',
      'poison someone',
    ])
  ) {
    return 'violence';
  }

  if (
    hasAny([
      'hack account',
      'steal password',
      'phishing',
      'ddos',
      'sql injection',
      'bypass auth',
      'crack wifi',
      'exploit',
      'malware',
      'ransomware',
      'keylogger',
    ])
  ) {
    return 'security-abuse';
  }

  if (
    hasAny([
      'how to scam',
      'forge document',
      'fake id',
      'counterfeit',
      'money laundering',
      'sell drugs',
      'buy drugs',
      'evade police',
      'tax fraud',
    ])
  ) {
    return 'illegal';
  }

  if (
    hasAny([
      'harass',
      'bully',
      'doxx',
      'revenge porn',
      'blackmail',
      'threaten',
      'stalk',
    ])
  ) {
    return 'harassment';
  }

  return null;
}

function abuseRefusalReply(category: AbuseCategory): string {
  switch (category) {
    case 'self-harm':
      return 'I can’t help with self-harm instructions. If you might act on these thoughts, please contact local emergency services right now. You can also reach immediate support through your local crisis hotline.';
    case 'sexual-minors':
      return 'I can’t help with any sexual content involving minors.';
    case 'violence':
      return 'I can’t help with violence or instructions to harm people.';
    case 'security-abuse':
      return 'I can’t help with hacking, exploitation, credential theft, or other abuse. If you are securing Civizen, ask about defensive best practices instead.';
    case 'harassment':
      return 'I can’t help with harassment, stalking, doxxing, or coercion.';
    case 'illegal':
      return 'I can’t help with illegal activity.';
    default:
      return 'I can’t help with that request.';
  }
}

function isConstitutionAnalysisRequest(content: string): boolean {
  const c = content.trim().toLowerCase();
  if (!c) return false;
  const hasAny = (terms: string[]) => terms.some((t) => c.includes(t));
  const hasStructureHints =
    c.includes('article ') ||
    c.includes('section ') ||
    c.includes('amendment') ||
    c.includes('constitution') ||
    c.includes('proposal');
  const hasAnalysisIntent = hasAny([
    'analyze',
    'analysis',
    'review',
    'impact',
    'risk',
    'rollout',
    'what changed',
    'what do you think',
    'diff',
    'updated',
    'update',
  ]);
  return hasStructureHints && hasAnalysisIntent;
}

function abuseMetricCategory(category: AbuseCategory): ModerationMetricCategory {
  switch (category) {
    case 'illegal':
      return 'abuse_illegal';
    case 'violence':
      return 'abuse_violence';
    case 'self-harm':
      return 'abuse_self_harm';
    case 'security-abuse':
      return 'abuse_security_abuse';
    case 'harassment':
      return 'abuse_harassment';
    case 'sexual-minors':
      return 'abuse_sexual_minors';
    default:
      return 'off_topic';
  }
}

function normalizeNelaStyle(text: string): string {
  const stripped = text
    .replace(/\bAs an AI assistant,?\s*/i, '')
    .replace(/\bAs an AI language model,?\s*/i, '')
    .replace(/\bI don'?t have personal opinions[^.?!]*[.?!]\s*/i, '')
    .replace(/\*\*/g, '')
    .trim();
  return stripped || text.trim();
}

function buildConstitutionAnalysisPrompt(userLine: string): string {
  return (
    'Analyze the following Civizen constitutional/governance update in a concise, practical format.\n' +
    'Return only these sections with short bullets:\n' +
    '1) Intent\n' +
    '2) Governance Impact\n' +
    '3) Risks / Ambiguities\n' +
    '4) Rollout Checklist\n' +
    'If specific text is missing, state assumptions briefly and still provide useful next steps.\n\n' +
    `User request/update:\n${userLine}`
  );
}

async function recordModerationMetric(
  admin: ReturnType<typeof createClient>,
  category: ModerationMetricCategory,
) {
  try {
    const { error } = await admin.rpc('increment_nela_moderation_event_count', {
      target_category: category,
    });
    if (error) {
      console.warn('[messaging-agent-reply] moderation metric rpc failed', error.message);
    }
  } catch (error) {
    console.warn('[messaging-agent-reply] moderation metric failed', error);
  }
}

async function completeOpenAi(key: string, history: HistoryTurn[], systemPrompt: string): Promise<string | null> {
  let turns = compactHistoryForLlm(history);
  if (!turns.length) {
    const lastUser = [...history].reverse().find((h) => h.role === 'user');
    if (lastUser?.content.trim()) turns = [{ role: 'user', content: lastUser.content.trim() }];
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt || NELA_FALLBACK_SYSTEM_PROMPT },
        ...turns.map((h) => ({ role: h.role, content: h.content })),
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw.slice(0, 800);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {
      /* keep slice */
    }
    console.error(`[messaging-agent-reply] OpenAI HTTP ${res.status}: ${detail}`);
    return null;
  }
  const json = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    console.warn('[messaging-agent-reply] OpenAI returned no assistant text in choices');
  }
  return text || null;
}

function extractGeminiText(raw: string): { text: string | null; finishReason: string } {
  let json: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  try {
    json = JSON.parse(raw);
  } catch {
    return { text: null, finishReason: 'json_parse_error' };
  }
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? null;
  const finishReason = candidate?.finishReason ?? 'unknown';
  return { text: text || null, finishReason };
}

async function completeGemini(
  key: string,
  model: string,
  history: HistoryTurn[],
  latestUserLine: string,
  systemPrompt: string,
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  const buildBody = (turns: HistoryTurn[]) => ({
    systemInstruction: { parts: [{ text: systemPrompt || NELA_FALLBACK_SYSTEM_PROMPT }] },
    contents: turns.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600,
    },
  });

  const turns = compactHistoryForLlm(history);
  const primaryTurns =
    turns.length > 0 ? turns : [{ role: 'user' as const, content: latestUserLine.trim() || 'Hello' }];

  const doFetch = async (bodyTurns: HistoryTurn[]) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(buildBody(bodyTurns)),
    });
    const raw = await res.text();
    return { res, raw };
  };

  const { res, raw } = await doFetch(primaryTurns);
  if (!res.ok) {
    let detail = raw.slice(0, 800);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string; status?: string } };
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {
      /* keep slice */
    }
    console.error(`[messaging-agent-reply] Gemini HTTP ${res.status}: ${detail}`);
    return null;
  }

  let { text, finishReason } = extractGeminiText(raw);
  const minimalTurn: HistoryTurn = {
    role: 'user',
    content: latestUserLine.trim() || 'Hello',
  };
  const alreadyMinimal =
    primaryTurns.length === 1 &&
    primaryTurns[0].role === 'user' &&
    primaryTurns[0].content === minimalTurn.content;
  if (!text && !alreadyMinimal) {
    console.warn(
      `[messaging-agent-reply] Gemini empty output (finishReason=${finishReason}); retrying with latest user only`,
    );
    const retry = await doFetch([minimalTurn]);
    if (!retry.res.ok) {
      console.error(`[messaging-agent-reply] Gemini retry HTTP ${retry.res.status}`);
      return null;
    }
    ({ text, finishReason } = extractGeminiText(retry.raw));
  }

  if (!text) {
    console.warn(`[messaging-agent-reply] Gemini returned no text (finishReason=${finishReason})`);
  }
  return text;
}

const PUBLIC_MESSAGE_MAX = 2000;
const PUBLIC_HISTORY_LIMIT = 12;
const publicHits = new Map<string, number[]>();

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

function allowPublicIp(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 30;
  const hits = (publicHits.get(ip) ?? []).filter((time) => now - time < windowMs);
  if (hits.length >= max) {
    publicHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  publicHits.set(ip, hits);
  return true;
}

function sanitizePublicHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((turn): turn is HistoryTurn => {
      if (!turn || typeof turn !== 'object') return false;
      const role = (turn as HistoryTurn).role;
      const content = (turn as HistoryTurn).content;
      return (role === 'user' || role === 'assistant') && typeof content === 'string';
    })
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, PUBLIC_MESSAGE_MAX),
    }))
    .filter((turn) => turn.content.length > 0)
    .slice(-PUBLIC_HISTORY_LIMIT);
}

function classifyCiviInteractionSource(args: {
  prep: ReturnType<typeof prepareNelaTurn> | null;
  usedModel: boolean;
  abused?: boolean;
}): 'knowledge' | 'memory' | 'model' | 'refusal' | 'greeting' {
  if (args.abused) return 'refusal';
  if (!args.prep) return 'refusal';
  if (args.prep.isGreeting) return 'greeting';
  if (!args.prep.inScope) return 'refusal';
  if (args.prep.diagnostics.usedLearnedMemoryKey) return 'memory';
  if (args.usedModel) return 'model';
  return 'knowledge';
}

function shouldRecordCiviInteraction(args: {
  question: string;
  source: 'knowledge' | 'memory' | 'model' | 'refusal' | 'greeting';
}): boolean {
  if (args.source === 'greeting') return false;
  return args.question.trim().length > 0;
}

function redactSensitiveCiviQuestion(question: string, abused: boolean): string {
  if (abused) return '[Blocked]';
  return question.trim();
}

async function loadLearnedMemories(admin: ReturnType<typeof createClient>) {
  try {
    const { data, error } = await admin.rpc('list_civi_learned_memories', { p_limit: 200 });
    if (error || !Array.isArray(data)) return [];
    return data.map(learnedMemoryFromRow).filter((row): row is NonNullable<typeof row> => Boolean(row));
  } catch (err) {
    console.warn('[messaging-agent-reply] learned memory load skipped', err);
    return [];
  }
}

async function rememberCheckedReply(
  admin: ReturnType<typeof createClient>,
  question: string,
  replyText: string,
  prep: ReturnType<typeof prepareNelaTurn>,
): Promise<boolean> {
  try {
    if (prep.diagnostics.usedLearnedMemoryKey) {
      await admin.rpc('touch_civi_learned_memory', { p_question_key: prep.diagnostics.usedLearnedMemoryKey });
      return false;
    }
    if (prep.skipLlm) return false;
    const decision = reviewLlmAnswerForLearning({ question, llmAnswer: replyText, prep });
    if (decision.action !== 'learn') return false;
    await admin.rpc('ingest_civi_learned_memory', {
      p_question_key: decision.questionKey,
      p_question: decision.question,
      p_answer: decision.answer,
      p_kind: decision.kind,
    });
    return true;
  } catch (err) {
    console.warn('[messaging-agent-reply] learned memory persist skipped', err);
    return false;
  }
}

async function recordInteraction(
  admin: ReturnType<typeof createClient>,
  args: {
    question: string;
    answer: string;
    audience: 'guest' | 'member';
    channel: 'public' | 'messaging';
    prep: ReturnType<typeof prepareNelaTurn> | null;
    usedModel: boolean;
    abused?: boolean;
    remembered?: boolean;
    actorProfileId?: string | null;
    conversationId?: string | null;
  },
) {
  const source = classifyCiviInteractionSource({
    prep: args.prep,
    usedModel: args.usedModel,
    abused: args.abused,
  });
  const question = redactSensitiveCiviQuestion(args.question, Boolean(args.abused));
  if (!shouldRecordCiviInteraction({ question, source })) return;
  try {
    await admin.rpc('ingest_civi_interaction', {
      p_audience: args.audience,
      p_channel: args.channel,
      p_question: question,
      p_answer: args.answer.trim().slice(0, 8000),
      p_answer_source: source,
      p_remembered: Boolean(args.remembered),
      p_actor_profile_id: args.actorProfileId ?? null,
      p_conversation_id: args.conversationId ?? null,
    });
  } catch (err) {
    console.warn('[messaging-agent-reply] interaction log skipped', err);
  }
}

async function replyFromHistory(
  admin: ReturnType<typeof createClient>,
  history: HistoryTurn[],
  latestUserLine: string,
  audience: 'member' | 'guest',
) {
  const llm = resolveLlm();
  const abuseCategory = classifyAbuse(latestUserLine);
  if (abuseCategory) {
    return {
      replyText: abuseRefusalReply(abuseCategory),
      prep: null as ReturnType<typeof prepareNelaTurn> | null,
      usedModel: false,
      remembered: false,
      abused: true,
    };
  }

  const memories = await loadLearnedMemories(admin);
  const prep = prepareNelaTurn(history, { audience, learnedMemories: memories });
  if (!prep.inScope || prep.isGreeting || prep.skipLlm || llm.kind === 'none') {
    const remembered = await rememberCheckedReply(admin, latestUserLine, prep.groundedAnswer, prep);
    return { replyText: prep.groundedAnswer, prep, usedModel: false, remembered, abused: false };
  }

  try {
    let text: string | null = null;
    if (llm.kind === 'gemini') {
      text = await completeGemini(llm.key, llm.model, history, latestUserLine, prep.systemPrompt);
    } else {
      text = await completeOpenAi(llm.key, history, prep.systemPrompt);
    }
    const usedModel = Boolean(text);
    const replyText = text ? normalizeNelaStyle(text) : prep.groundedAnswer;
    const remembered = await rememberCheckedReply(admin, latestUserLine, replyText, { ...prep, skipLlm: false });
    return { replyText, prep, usedModel, remembered, abused: false };
  } catch (err) {
    console.error('[messaging-agent-reply] LLM request failed:', err);
    return { replyText: prep.groundedAnswer, prep, usedModel: false, remembered: false, abused: false };
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = request.headers.get('Authorization') ?? '';

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server misconfigured' });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.public === true) {
    if (!allowPublicIp(clientIp(request))) {
      return jsonResponse(429, { error: 'Too many questions. Try again in a few minutes.' });
    }
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, PUBLIC_MESSAGE_MAX) : '';
    if (!message) return jsonResponse(400, { error: 'message required' });
    const history = [...sanitizePublicHistory(body.history), { role: 'user' as const, content: message }];
    const generated = await replyFromHistory(admin, history, message, 'guest');
    const replyText = generated.replyText.trim() || 'I could not verify that from Civizen’s current project information.';
    await recordInteraction(admin, {
      question: message,
      answer: replyText,
      audience: 'guest',
      channel: 'public',
      prep: generated.prep,
      usedModel: generated.usedModel,
      abused: generated.abused,
      remembered: generated.remembered,
    });
    return jsonResponse(200, { ok: true, reply: replyText });
  }

  if (authError || !user) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const conversationId = body.conversation_id?.trim();
  if (!conversationId) {
    return new Response(JSON.stringify({ error: 'conversation_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: conv, error: convError } = await admin
    .from('private_conversations')
    .select('id, kind')
    .eq('id', conversationId)
    .single();

  if (convError || !conv || conv.kind !== 'agent') {
    return new Response(JSON.stringify({ error: 'Not an agent conversation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: members, error: membersError } = await admin
    .from('private_conversation_members')
    .select('profile_id')
    .eq('conversation_id', conversationId);

  if (membersError || !members?.length) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile, error: profileError } = await userClient
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !callerProfile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const memberIds = new Set(members.map((m) => m.profile_id as string));
  if (!memberIds.has(callerProfile.id) || !memberIds.has(AGENT_PROFILE_ID)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Newest 40 messages, then back to chronological order: long threads must answer the latest turn.
  const { data: newestRows, error: msgError } = await admin
    .from('private_messages')
    .select('id, sender_id, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(40);
  const rows = newestRows ? [...newestRows].reverse() : newestRows;

  if (msgError) {
    return new Response(JSON.stringify({ error: 'Failed to load messages' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const last = rows?.length ? rows[rows.length - 1] : null;
  if (!last || last.sender_id !== callerProfile.id) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const history: HistoryTurn[] =
    rows?.map((r) => ({
      role: r.sender_id === AGENT_PROFILE_ID ? ('assistant' as const) : ('user' as const),
      content: String(r.content ?? ''),
    })) ?? [];

  const llm = resolveLlm();
  let replyText: string;
  let moderationMetric: ModerationMetricCategory | null = null;
  let diagnostics: Record<string, unknown> | null = null;
  let usedModel = false;
  let remembered = false;
  let abused = false;
  let memberPrep: ReturnType<typeof prepareNelaTurn> | null = null;

  const latestUserLine = String(last.content ?? '');
  const abuseCategory = classifyAbuse(latestUserLine);
  if (abuseCategory) {
    replyText = abuseRefusalReply(abuseCategory);
    moderationMetric = abuseMetricCategory(abuseCategory);
    abused = true;
  } else {
    const memories = await loadLearnedMemories(admin);
    const prep = prepareNelaTurn(history, { learnedMemories: memories });
    memberPrep = prep;
    const debugRequested = body.debug === true;
    const debugRole = String((callerProfile as { role?: string }).role ?? '');
    const debugAllowed =
      debugRequested &&
      (debugRole === 'founder' ||
        debugRole === 'admin' ||
        debugRole === 'system' ||
        (Deno.env.get('NELA_KNOWLEDGE_DEBUG') ?? '').trim() === '1');
    if (debugAllowed) {
      diagnostics = prep.diagnostics as unknown as Record<string, unknown>;
    }

    if (!prep.inScope) {
      replyText = prep.groundedAnswer;
      moderationMetric = 'off_topic';
    } else if (prep.isGreeting) {
      replyText = prep.groundedAnswer;
      moderationMetric = 'greeting';
    } else if (prep.skipLlm || llm.kind === 'none') {
      replyText = prep.groundedAnswer;
      if (isWhatIsCivizenQuestion(latestUserLine)) moderationMetric = 'policy_civizen_summary';
    } else {
      try {
        let text: string | null = null;
        const effectiveHistory = isConstitutionAnalysisRequest(latestUserLine)
          ? [...history, { role: 'user' as const, content: buildConstitutionAnalysisPrompt(latestUserLine) }]
          : history;
        if (llm.kind === 'gemini') {
          text = await completeGemini(llm.key, llm.model, effectiveHistory, latestUserLine, prep.systemPrompt);
        } else {
          text = await completeOpenAi(llm.key, effectiveHistory, prep.systemPrompt);
        }
        usedModel = Boolean(text);
        replyText = text ? normalizeNelaStyle(text) : prep.groundedAnswer;
      } catch (err) {
        console.error('[messaging-agent-reply] LLM request failed:', err);
        replyText = prep.groundedAnswer;
      }
    }
    remembered = await rememberCheckedReply(admin, latestUserLine, replyText, prep);
  }

  if (!replyText.trim()) {
    replyText = 'I could not verify that from Civizen’s current project information.';
  }

  await recordInteraction(admin, {
    question: latestUserLine,
    answer: replyText,
    audience: 'member',
    channel: 'messaging',
    prep: memberPrep,
    usedModel,
    abused,
    remembered,
    actorProfileId: callerProfile.id,
    conversationId,
  });

  if (moderationMetric) {
    await recordModerationMetric(admin, moderationMetric);
  }

  const { error: insertError } = await admin.from('private_messages').insert({
    conversation_id: conversationId,
    sender_id: AGENT_PROFILE_ID,
    content: replyText,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: 'Failed to save reply' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(diagnostics ? { ok: true, diagnostics } : { ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

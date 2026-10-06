import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENT_PROFILES = {
  chatgpt: 'a0000000-0000-4000-8000-000000000002',
  gemini: 'a0000000-0000-4000-8000-000000000003',
  claude: 'a0000000-0000-4000-8000-000000000004',
} as const;

type AgentSpeaker = keyof typeof AGENT_PROFILES;
const AGENT_ORDER: AgentSpeaker[] = ['chatgpt', 'gemini', 'claude'];

const DISPLAY_NAMES: Record<AgentSpeaker, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
};

const CIVIZEN_CONTEXT =
  'Civizen is a voluntary, non-governmental platform helping people unite as citizens of humanity and build a legitimate pathway toward recognized planetary citizenship. ' +
  'It is not currently a government and does not replace public-law elections or official citizenship. ' +
  'Distinguish “not currently” from “never.” Guidance is advisory, not legal advice.';

const COUNCIL_SYSTEM =
  'You are one of three AI advisors on Civizen Solutions, debating a citizen-posted civic or practical problem. ' +
  CIVIZEN_CONTEXT +
  ' Speak as your named model brand. Be concrete, constructive, and concise. ' +
  'Do not invent laws, elections, or official Civizen powers. ' +
  'Reply with ONLY valid JSON (no markdown fences) matching: ' +
  '{"action":"propose"|"revise"|"agree"|"dissent","proposal_title":string,"proposal_summary":string,"content":string,"agrees_with_speaker":"chatgpt"|"gemini"|"claude"|null,"dissent_reason":string|null}. ' +
  'action=propose on first useful idea; revise to improve another idea; agree only when you truly endorse the same proposal_summary; dissent when you cannot. ' +
  'content is the human-readable thread message (2–6 short sentences). proposal_summary is a stable one-paragraph solution statement.';

type Stance = {
  action: 'propose' | 'revise' | 'agree' | 'dissent';
  proposal_title: string;
  proposal_summary: string;
  content: string;
  agrees_with_speaker: AgentSpeaker | null;
  dissent_reason: string | null;
};

type TurnRow = {
  id: string;
  speaker: string;
  content: string;
  stance: Record<string, unknown> | null;
  round: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeSummary(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function classifyAbuse(content: string): string | null {
  const c = content.toLowerCase();
  if (/\b(child\s*porn|csam|sexual\s+content\s+involving\s+(a\s+)?minors?)\b/.test(c)) {
    return 'sexual-minors';
  }
  if (/\b(how to (make|build) (a )?bomb|kill (someone|people)|assassinate)\b/.test(c)) {
    return 'violence';
  }
  if (/\b(suicide methods|how to (kill|harm) myself)\b/.test(c)) return 'self-harm';
  if (/\b(hack into|steal (credit )?cards?|buy stolen)\b/.test(c)) return 'illegal';
  return null;
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    /* try fence or embedded object */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim()) as Record<string, unknown>;
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function parseStance(raw: string, fallbackTitle: string): Stance {
  const obj = extractJsonObject(raw);
  if (!obj) {
    return {
      action: 'propose',
      proposal_title: fallbackTitle,
      proposal_summary: raw.trim().slice(0, 600),
      content: raw.trim().slice(0, 1200) || 'I suggest we focus on a practical next step.',
      agrees_with_speaker: null,
      dissent_reason: null,
    };
  }
  const actionRaw = String(obj.action ?? 'propose').toLowerCase();
  const action =
    actionRaw === 'revise' || actionRaw === 'agree' || actionRaw === 'dissent'
      ? actionRaw
      : 'propose';
  const agrees = obj.agrees_with_speaker;
  const agrees_with_speaker =
    agrees === 'chatgpt' || agrees === 'gemini' || agrees === 'claude' ? agrees : null;
  return {
    action,
    proposal_title: String(obj.proposal_title ?? fallbackTitle).trim().slice(0, 160) || fallbackTitle,
    proposal_summary:
      String(obj.proposal_summary ?? obj.content ?? '').trim().slice(0, 1200) ||
      String(obj.content ?? '').trim().slice(0, 600),
    content:
      String(obj.content ?? obj.proposal_summary ?? '').trim().slice(0, 2000) ||
      'Here is my view on this problem.',
    agrees_with_speaker,
    dissent_reason: obj.dissent_reason != null ? String(obj.dissent_reason).slice(0, 500) : null,
  };
}

async function completeOpenAi(key: string, system: string, user: string): Promise<string | null> {
  const model = (Deno.env.get('SOLUTIONS_OPENAI_MODEL') ?? 'gpt-4o-mini').trim();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error(`[solutions-agent-council] OpenAI HTTP ${res.status}: ${raw.slice(0, 400)}`);
    return null;
  }
  try {
    const json = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function completeGemini(key: string, model: string, system: string, user: string): Promise<string | null> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
        responseMimeType: 'application/json',
      },
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error(`[solutions-agent-council] Gemini HTTP ${res.status}: ${raw.slice(0, 400)}`);
    return null;
  }
  try {
    const json = JSON.parse(raw) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
    return text || null;
  } catch {
    return null;
  }
}

async function completeClaude(key: string, system: string, user: string): Promise<string | null> {
  const model = (Deno.env.get('SOLUTIONS_ANTHROPIC_MODEL') ?? 'claude-3-5-haiku-latest').trim();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.4,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error(`[solutions-agent-council] Anthropic HTTP ${res.status}: ${raw.slice(0, 400)}`);
    return null;
  }
  try {
    const json = JSON.parse(raw) as { content?: Array<{ type?: string; text?: string }> };
    const text = (json.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

async function callAgent(speaker: AgentSpeaker, system: string, user: string): Promise<string | null> {
  if (speaker === 'chatgpt') {
    const key = (Deno.env.get('OPENAI_API_KEY') ?? '').trim();
    if (!key) return null;
    return completeOpenAi(key, system, user);
  }
  if (speaker === 'gemini') {
    const key = (Deno.env.get('GEMINI_API_KEY') ?? '').trim();
    if (!key) return null;
    const model = (Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite').trim();
    return completeGemini(key, model, system, user);
  }
  const key = (Deno.env.get('ANTHROPIC_API_KEY') ?? '').trim();
  if (!key) return null;
  return completeClaude(key, system, user);
}

function buildPrompt(input: {
  speaker: AgentSpeaker;
  title: string;
  body: string;
  round: number;
  turns: TurnRow[];
}): string {
  const history = input.turns
    .map((t) => {
      const name =
        t.speaker === 'citizen'
          ? 'Citizen'
          : DISPLAY_NAMES[t.speaker as AgentSpeaker] ?? t.speaker;
      const stance = t.stance && typeof t.stance === 'object' ? t.stance : {};
      const summary = typeof stance.proposal_summary === 'string' ? stance.proposal_summary : '';
      const action = typeof stance.action === 'string' ? stance.action : '';
      return `[Round ${t.round}] ${name}${action ? ` (${action})` : ''}:\n${t.content}${
        summary ? `\nProposal summary: ${summary}` : ''
      }`;
    })
    .join('\n\n');

  return (
    `You are ${DISPLAY_NAMES[input.speaker]} (speaker id: ${input.speaker}).\n` +
    `This is debate round ${input.round} of up to 3.\n\n` +
    `Problem title: ${input.title}\n` +
    `Problem details:\n${input.body}\n\n` +
    (history ? `Prior discussion:\n${history}\n\n` : 'No prior agent turns yet.\n\n') +
    'Respond with the required JSON only.'
  );
}

function roundAgentTurns(turns: TurnRow[], round: number): TurnRow[] {
  return turns.filter((t) => t.round === round && AGENT_ORDER.includes(t.speaker as AgentSpeaker));
}

function evaluateConsensus(roundTurns: TurnRow[]): { summary: string; title: string } | null {
  if (roundTurns.length < 3) return null;
  const stances = roundTurns.map((t) => {
    const s = (t.stance ?? {}) as Record<string, unknown>;
    return {
      action: String(s.action ?? ''),
      summary: normalizeSummary(String(s.proposal_summary ?? '')),
      title: String(s.proposal_title ?? 'Agreed solution').trim() || 'Agreed solution',
    };
  });
  if (!stances.every((s) => s.action === 'agree' && s.summary.length > 0)) return null;
  const first = stances[0].summary;
  if (!stances.every((s) => s.summary === first)) return null;
  return { summary: String((roundTurns[0].stance as Record<string, unknown>)?.proposal_summary ?? ''), title: stances[0].title };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ error: 'Server not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as {
      problem_id?: string;
      continue?: boolean;
    };
    const problemId = (body.problem_id ?? '').trim();
    const continueDebate = Boolean(body.continue);
    if (!problemId) {
      return jsonResponse({ error: 'problem_id required' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: problem, error: problemError } = await admin
      .from('solution_problems')
      .select('*')
      .eq('id', problemId)
      .maybeSingle();

    if (problemError || !problem) {
      return jsonResponse({ error: 'Problem not found' }, 404);
    }

    // Solve-mode issues are routed to authorities/professionals; council is for Discuss.
    if (problem.mode === 'solve') {
      return jsonResponse({ ok: true, status: problem.status, skipped: true, reason: 'solve_mode' });
    }

    if (problem.status === 'closed' || problem.status === 'consensus') {
      return jsonResponse({ ok: true, status: problem.status, skipped: true });
    }

    // Split: only resume when the client explicitly asks to continue.
    if (problem.status === 'split' && !continueDebate) {
      return jsonResponse({ ok: true, status: problem.status, skipped: true });
    }

    // Each council run makes several model calls, so members get a few runs per hour.
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!callerProfile?.id) {
      return jsonResponse({ error: 'Profile not found' }, 403);
    }
    const { data: withinQuota, error: quotaError } = await admin.rpc('consume_ai_quota', {
      p_profile_id: callerProfile.id,
      p_bucket: 'solutions_council',
      p_limit: 10,
      p_window: '1 hour',
    });
    if (quotaError || withinQuota !== true) {
      return jsonResponse({ error: 'Too many council runs. Try again later.' }, 429);
    }

    if (problem.status === 'split' && continueDebate) {
      const nextMax = Math.min(8, Math.max(Number(problem.max_rounds) || 3, Number(problem.current_round) || 0) + 1);
      await admin
        .from('solution_problems')
        .update({
          status: 'debating',
          max_rounds: nextMax,
          current_round: Number(problem.current_round) || 0,
        })
        .eq('id', problemId);
      problem.status = 'debating';
      problem.max_rounds = nextMax;
    }

    const abuse = classifyAbuse(`${problem.title}\n${problem.body}`);
    if (abuse) {
      await admin
        .from('solution_problems')
        .update({ status: 'closed' })
        .eq('id', problemId);
      return jsonResponse({ error: 'Problem closed by safety policy', category: abuse }, 400);
    }

    await admin
      .from('solution_problems')
      .update({ status: 'debating' })
      .eq('id', problemId);

    const maxRounds = Math.max(1, Math.min(5, Number(problem.max_rounds) || 3));
    let currentRound = Math.max(1, Number(problem.current_round) || 0);
    if (currentRound === 0) currentRound = 1;

    const loadTurns = async (): Promise<TurnRow[]> => {
      const { data } = await admin
        .from('solution_turns')
        .select('id, speaker, content, stance, round')
        .eq('problem_id', problemId)
        .order('created_at', { ascending: true });
      return (data ?? []) as TurnRow[];
    };

    let turns = await loadTurns();
    let roundsRun = 0;

    while (currentRound <= maxRounds && roundsRun < maxRounds) {
      roundsRun += 1;
      await admin
        .from('solution_problems')
        .update({ current_round: currentRound, status: 'debating' })
        .eq('id', problemId);

      const spoken = new Set(
        roundAgentTurns(turns, currentRound).map((t) => t.speaker as AgentSpeaker),
      );

      for (const speaker of AGENT_ORDER) {
        if (spoken.has(speaker)) continue;

        const system = `${COUNCIL_SYSTEM} Your identity in this debate is ${DISPLAY_NAMES[speaker]}.`;
        const prompt = buildPrompt({
          speaker,
          title: problem.title,
          body: problem.body,
          round: currentRound,
          turns,
        });

        const raw = await callAgent(speaker, system, prompt);
        let stance: Stance;
        if (!raw) {
          stance = {
            action: 'dissent',
            proposal_title: 'Unavailable',
            proposal_summary: `${DISPLAY_NAMES[speaker]} is temporarily unavailable (API key or provider error).`,
            content: `${DISPLAY_NAMES[speaker]} could not join this round. Configure the provider key to include this agent.`,
            agrees_with_speaker: null,
            dissent_reason: 'provider_unavailable',
          };
        } else {
          stance = parseStance(raw, problem.title);
        }

        const { data: inserted, error: insertError } = await admin
          .from('solution_turns')
          .insert({
            problem_id: problemId,
            speaker,
            speaker_profile_id: AGENT_PROFILES[speaker],
            content: stance.content,
            stance: {
              action: stance.action,
              proposal_title: stance.proposal_title,
              proposal_summary: stance.proposal_summary,
              agrees_with_speaker: stance.agrees_with_speaker,
              dissent_reason: stance.dissent_reason,
            },
            round: currentRound,
          })
          .select('id, speaker, content, stance, round')
          .single();

        if (insertError) {
          console.error('[solutions-agent-council] insert turn failed', insertError.message);
          return jsonResponse({ error: 'Failed to save agent turn' }, 500);
        }
        turns = [...turns, inserted as TurnRow];
        spoken.add(speaker);
      }

      const roundTurns = roundAgentTurns(turns, currentRound);
      const consensus = evaluateConsensus(roundTurns);
      if (consensus) {
        const { data: proposal, error: proposalError } = await admin
          .from('solution_proposals')
          .insert({
            problem_id: problemId,
            source: 'consensus',
            title: consensus.title,
            body: consensus.summary,
            supporting_speakers: AGENT_ORDER,
          })
          .select('id')
          .single();

        if (proposalError) {
          console.error('[solutions-agent-council] consensus proposal failed', proposalError.message);
          return jsonResponse({ error: 'Failed to save consensus proposal' }, 500);
        }

        await admin
          .from('solution_problems')
          .update({
            status: 'consensus',
            agreed_proposal_id: proposal.id,
            current_round: currentRound,
          })
          .eq('id', problemId);

        return jsonResponse({
          ok: true,
          status: 'consensus',
          round: currentRound,
          proposal_id: proposal.id,
        });
      }

      if (currentRound >= maxRounds) break;
      currentRound += 1;
    }

    // Split: group by normalized proposal_summary from latest round
    const latestRound = Math.max(...turns.filter((t) => AGENT_ORDER.includes(t.speaker as AgentSpeaker)).map((t) => t.round), 1);
    const latest = roundAgentTurns(turns, latestRound);
    const groups = new Map<string, { title: string; body: string; speakers: AgentSpeaker[] }>();

    for (const t of latest) {
      const s = (t.stance ?? {}) as Record<string, unknown>;
      const body = String(s.proposal_summary ?? t.content ?? '').trim();
      if (!body) continue;
      const key = normalizeSummary(body);
      const speaker = t.speaker as AgentSpeaker;
      const existing = groups.get(key);
      if (existing) {
        if (!existing.speakers.includes(speaker)) existing.speakers.push(speaker);
      } else {
        groups.set(key, {
          title: String(s.proposal_title ?? 'Proposed solution').trim() || 'Proposed solution',
          body,
          speakers: [speaker],
        });
      }
    }

    const proposalIds: string[] = [];
    for (const group of groups.values()) {
      const source =
        group.speakers.length >= 3
          ? 'consensus'
          : group.speakers.length === 1
            ? group.speakers[0]
            : 'coalition';
      const { data: proposal, error } = await admin
        .from('solution_proposals')
        .insert({
          problem_id: problemId,
          source,
          title: group.title,
          body: group.body,
          supporting_speakers: group.speakers,
        })
        .select('id')
        .single();
      if (!error && proposal?.id) proposalIds.push(proposal.id);
    }

    await admin
      .from('solution_problems')
      .update({ status: 'split', current_round: latestRound })
      .eq('id', problemId);

    return jsonResponse({
      ok: true,
      status: 'split',
      round: latestRound,
      proposal_ids: proposalIds,
    });
  } catch (error) {
    console.error('[solutions-agent-council] unexpected', error);
    return jsonResponse({ error: 'Unexpected server error' }, 500);
  }
});

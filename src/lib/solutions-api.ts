import { supabase, type UntypedSupabaseClient } from '@/integrations/supabase/untyped';
import { categorizeSolutionIssue } from '@/lib/solution-categorize';
import { getSolutionAuthority } from '@/lib/solution-authorities';
import type {
  SolutionAgentSpeaker,
  SolutionIssueMode,
  SolutionProblemStatus,
  SolutionProposalSource,
  SolutionSpeaker,
  SolutionTurnStance,
} from '@/lib/solutions-constants';

type SupabaseErrorLike = { code?: string | null; message?: string | null; details?: string | null } | null;

/** Minimal client for tables not yet in generated Database types. */
type SolutionsClient = {
  from: UntypedSupabaseClient['from'];
  channel: UntypedSupabaseClient['channel'];
  removeChannel: (channel: unknown) => Promise<unknown>;
  functions: {
    invoke: (
      name: string,
      options?: { body?: Record<string, unknown> },
    ) => Promise<{ data: unknown; error: SupabaseErrorLike }>;
  };
};

function client(): SolutionsClient {
  return supabase as unknown as SolutionsClient;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export type SolutionProblem = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  mode: SolutionIssueMode;
  status: SolutionProblemStatus;
  authorityId: string | null;
  authorityName?: string | null;
  categoryConfidence: number | null;
  categoryKeywords: string[];
  assigneeProfileId: string | null;
  routingNote: string | null;
  agreedProposalId: string | null;
  currentRound: number;
  maxRounds: number;
  createdAt: string;
  updatedAt: string;
  authorName?: string | null;
};

export type SolutionTurn = {
  id: string;
  problemId: string;
  speaker: SolutionSpeaker;
  speakerProfileId: string | null;
  content: string;
  stance: SolutionTurnStance;
  round: number;
  createdAt: string;
};

export type SolutionProposal = {
  id: string;
  problemId: string;
  source: SolutionProposalSource;
  title: string;
  body: string;
  supportingSpeakers: SolutionAgentSpeaker[];
  createdAt: string;
  endorsementCount: number;
  endorsedByMe: boolean;
};

export type SolutionComment = {
  id: string;
  problemId: string;
  authorId: string;
  body: string;
  createdAt: string;
  authorName?: string | null;
};

export type SolutionRoutingEvent = {
  id: string;
  problemId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
};

export function isMissingSolutionsBackend(error: SupabaseErrorLike) {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    message.includes('solution_problem') ||
    message.includes('solution_turn') ||
    message.includes('solution_proposal') ||
    message.includes('solution_comment') ||
    message.includes('solution_authorit') ||
    message.includes('solution_routing')
  );
}

function parseStance(raw: unknown): SolutionTurnStance {
  if (!raw || typeof raw !== 'object') return {};
  return raw as SolutionTurnStance;
}

function mapProblem(row: Record<string, unknown>): SolutionProblem {
  const author = (row.author ?? row.profiles) as Record<string, unknown> | null | undefined;
  const authorityId = row.authority_id ? asString(row.authority_id) : null;
  const authorityFromJoin = row.solution_authorities as Record<string, unknown> | null | undefined;
  const authority = getSolutionAuthority(authorityId);
  return {
    id: asString(row.id),
    authorId: asString(row.author_id),
    title: asString(row.title),
    body: asString(row.body),
    mode: asString(row.mode, 'discuss') === 'solve' ? 'solve' : 'discuss',
    status: asString(row.status, 'debating') as SolutionProblemStatus,
    authorityId,
    authorityName:
      (authorityFromJoin ? asString(authorityFromJoin.name) : null) ||
      authority?.name ||
      null,
    categoryConfidence:
      typeof row.category_confidence === 'number' ? row.category_confidence : null,
    categoryKeywords: Array.isArray(row.category_keywords)
      ? (row.category_keywords as string[])
      : [],
    assigneeProfileId: row.assignee_profile_id ? asString(row.assignee_profile_id) : null,
    routingNote: row.routing_note ? asString(row.routing_note) : null,
    agreedProposalId: row.agreed_proposal_id ? asString(row.agreed_proposal_id) : null,
    currentRound: asNumber(row.current_round),
    maxRounds: asNumber(row.max_rounds, 3),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    authorName: author ? asString(author.full_name || author.username, '') || null : null,
  };
}

function mapTurn(row: Record<string, unknown>): SolutionTurn {
  return {
    id: asString(row.id),
    problemId: asString(row.problem_id),
    speaker: asString(row.speaker, 'citizen') as SolutionSpeaker,
    speakerProfileId: row.speaker_profile_id ? asString(row.speaker_profile_id) : null,
    content: asString(row.content),
    stance: parseStance(row.stance),
    round: asNumber(row.round),
    createdAt: asString(row.created_at),
  };
}

function mapProposal(
  row: Record<string, unknown>,
  endorsementCount: number,
  endorsedByMe: boolean,
): SolutionProposal {
  const speakers = Array.isArray(row.supporting_speakers)
    ? (row.supporting_speakers as string[]).filter(
        (s): s is SolutionAgentSpeaker =>
          s === 'chatgpt' || s === 'gemini' || s === 'claude',
      )
    : [];
  return {
    id: asString(row.id),
    problemId: asString(row.problem_id),
    source: asString(row.source, 'coalition') as SolutionProposalSource,
    title: asString(row.title),
    body: asString(row.body),
    supportingSpeakers: speakers,
    createdAt: asString(row.created_at),
    endorsementCount,
    endorsedByMe,
  };
}

function mapComment(row: Record<string, unknown>): SolutionComment {
  const author = (row.author ?? row.profiles) as Record<string, unknown> | null | undefined;
  return {
    id: asString(row.id),
    problemId: asString(row.problem_id),
    authorId: asString(row.author_id),
    body: asString(row.body),
    createdAt: asString(row.created_at),
    authorName: author ? asString(author.full_name || author.username, '') || null : null,
  };
}

function mapRoutingEvent(row: Record<string, unknown>): SolutionRoutingEvent {
  return {
    id: asString(row.id),
    problemId: asString(row.problem_id),
    fromStatus: row.from_status ? asString(row.from_status) : null,
    toStatus: asString(row.to_status),
    note: row.note ? asString(row.note) : null,
    createdAt: asString(row.created_at),
  };
}

async function findCertifiedProfessional(professionIds: string[]) {
  if (!professionIds.length) return null;
  const { data, error } = await client()
    .from('profile_professions')
    .select('profile_id, profession_id, status')
    .eq('status', 'approved')
    .in('profession_id', professionIds)
    .limit(5);

  if (error || !data?.length) return null;
  const row = data[0] as Record<string, unknown>;
  return {
    profileId: asString(row.profile_id),
    professionId: asString(row.profession_id),
  };
}

export async function listSolutionProblems(limit = 40) {
  const { data, error } = await client()
    .from('solution_problems')
    .select('*, author:profiles!author_id(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { problems: [] as SolutionProblem[], error: error as SupabaseErrorLike };
  }
  return {
    problems: ((data ?? []) as Record<string, unknown>[]).map(mapProblem),
    error: null as SupabaseErrorLike,
  };
}

export async function getSolutionProblem(problemId: string) {
  const { data, error } = await client()
    .from('solution_problems')
    .select('*, author:profiles!author_id(full_name, username)')
    .eq('id', problemId)
    .maybeSingle();

  if (error) return { problem: null as SolutionProblem | null, error: error as SupabaseErrorLike };
  if (!data) return { problem: null, error: null };
  return { problem: mapProblem(data as Record<string, unknown>), error: null };
}

export async function createSolutionProblem(input: {
  authorId: string;
  title: string;
  body: string;
  mode: SolutionIssueMode;
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  const categorized = categorizeSolutionIssue(title, body);
  const authority = categorized.authority;

  let status: SolutionProblemStatus =
    input.mode === 'discuss' ? 'debating' : 'routed';
  let assigneeProfileId: string | null = null;
  let routingNote = `Categorized to ${authority.name} (${Math.round(categorized.confidence * 100)}% confidence).`;

  if (input.mode === 'solve') {
    const professional = await findCertifiedProfessional(authority.relatedProfessionIds);
    if (professional) {
      status = 'accepted';
      assigneeProfileId = professional.profileId;
      routingNote = `${routingNote} Matched certified professional (${professional.professionId}).`;
    } else {
      status = 'seeking_professional';
      routingNote = `${routingNote} No Civizen-registered authority entity found; seeking certified professionals in ${authority.relatedProfessionIds.join(', ') || 'related fields'}.`;
    }
  } else {
    routingNote = `${routingNote} Opened for public discussion with AI agent participation.`;
  }

  const { data, error } = await client()
    .from('solution_problems')
    .insert({
      author_id: input.authorId,
      title,
      body,
      mode: input.mode,
      status,
      authority_id: authority.id,
      category_confidence: categorized.confidence,
      category_keywords: categorized.matchedKeywords,
      assignee_profile_id: assigneeProfileId,
      routing_note: routingNote,
      current_round: 0,
      max_rounds: 3,
    })
    .select('*, author:profiles!author_id(full_name, username)')
    .single();

  if (error) return { problem: null as SolutionProblem | null, error: error as SupabaseErrorLike };

  const problem = mapProblem(data as Record<string, unknown>);

  await client().from('solution_routing_events').insert({
    problem_id: problem.id,
    from_status: 'categorizing',
    to_status: status,
    note: routingNote,
    actor_profile_id: input.authorId,
  });

  return { problem, error: null };
}

export async function listSolutionTurns(problemId: string) {
  const { data, error } = await client()
    .from('solution_turns')
    .select('*')
    .eq('problem_id', problemId)
    .order('created_at', { ascending: true });

  if (error) return { turns: [] as SolutionTurn[], error: error as SupabaseErrorLike };
  return {
    turns: ((data ?? []) as Record<string, unknown>[]).map(mapTurn),
    error: null as SupabaseErrorLike,
  };
}

export async function listSolutionProposals(problemId: string, myProfileId?: string | null) {
  const { data, error } = await client()
    .from('solution_proposals')
    .select('*')
    .eq('problem_id', problemId)
    .order('created_at', { ascending: true });

  if (error) return { proposals: [] as SolutionProposal[], error: error as SupabaseErrorLike };

  const rows = (data ?? []) as Record<string, unknown>[];
  const ids = rows.map((r) => asString(r.id)).filter(Boolean);
  const counts = new Map<string, number>();
  const mine = new Set<string>();

  if (ids.length) {
    const { data: endorsements } = await client()
      .from('solution_proposal_endorsements')
      .select('proposal_id, profile_id')
      .in('proposal_id', ids);

    for (const row of (endorsements ?? []) as Record<string, unknown>[]) {
      const pid = asString(row.proposal_id);
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
      if (myProfileId && asString(row.profile_id) === myProfileId) mine.add(pid);
    }
  }

  return {
    proposals: rows.map((row) => {
      const id = asString(row.id);
      return mapProposal(row, counts.get(id) ?? 0, mine.has(id));
    }),
    error: null as SupabaseErrorLike,
  };
}

export async function listSolutionComments(problemId: string) {
  const { data, error } = await client()
    .from('solution_comments')
    .select('*, author:profiles!author_id(full_name, username)')
    .eq('problem_id', problemId)
    .order('created_at', { ascending: true });

  if (error) return { comments: [] as SolutionComment[], error: error as SupabaseErrorLike };
  return {
    comments: ((data ?? []) as Record<string, unknown>[]).map(mapComment),
    error: null as SupabaseErrorLike,
  };
}

export async function listSolutionRoutingEvents(problemId: string) {
  const { data, error } = await client()
    .from('solution_routing_events')
    .select('*')
    .eq('problem_id', problemId)
    .order('created_at', { ascending: true });

  if (error) return { events: [] as SolutionRoutingEvent[], error: error as SupabaseErrorLike };
  return {
    events: ((data ?? []) as Record<string, unknown>[]).map(mapRoutingEvent),
    error: null as SupabaseErrorLike,
  };
}

export async function addSolutionComment(input: {
  problemId: string;
  authorId: string;
  body: string;
}) {
  const { data, error } = await client()
    .from('solution_comments')
    .insert({
      problem_id: input.problemId,
      author_id: input.authorId,
      body: input.body.trim(),
    })
    .select('*, author:profiles!author_id(full_name, username)')
    .single();

  if (error) return { comment: null as SolutionComment | null, error: error as SupabaseErrorLike };
  return { comment: mapComment(data as Record<string, unknown>), error: null };
}

export async function toggleProposalEndorsement(input: {
  proposalId: string;
  profileId: string;
  currentlyEndorsed: boolean;
}) {
  if (input.currentlyEndorsed) {
    const { error } = await client()
      .from('solution_proposal_endorsements')
      .delete()
      .eq('proposal_id', input.proposalId)
      .eq('profile_id', input.profileId);
    return { error: error as SupabaseErrorLike };
  }
  const { error } = await client().from('solution_proposal_endorsements').insert({
    proposal_id: input.proposalId,
    profile_id: input.profileId,
  });
  return { error: error as SupabaseErrorLike };
}

export async function invokeSolutionsCouncil(problemId: string, options?: { continue?: boolean }) {
  return client().functions.invoke('solutions-agent-council', {
    body: { problem_id: problemId, continue: Boolean(options?.continue) },
  });
}

export function subscribeSolutionProblem(
  problemId: string,
  handlers: {
    onTurn?: () => void;
    onProblem?: () => void;
    onProposal?: () => void;
    onRouting?: () => void;
  },
) {
  const channel = client()
    .channel(`solutions-${problemId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'solution_turns', filter: `problem_id=eq.${problemId}` },
      () => handlers.onTurn?.(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'solution_problems', filter: `id=eq.${problemId}` },
      () => handlers.onProblem?.(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'solution_proposals',
        filter: `problem_id=eq.${problemId}`,
      },
      () => handlers.onProposal?.(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'solution_routing_events',
        filter: `problem_id=eq.${problemId}`,
      },
      () => handlers.onRouting?.(),
    )
    .subscribe();

  return () => {
    void client().removeChannel(channel);
  };
}

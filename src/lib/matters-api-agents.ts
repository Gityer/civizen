import { supabase } from '@/integrations/supabase/client';
import type { AiAgent, AiAgentRoleType, AiContextScope } from '@/lib/matters-ai';
import { type DbClient, asRows, db, rpcErrorMessage } from '@/lib/matters-api-core';
import { mapAiAgent } from '@/lib/matters-api-mappers-work';

export async function listAiAgents(client: DbClient = supabase): Promise<AiAgent[]> {
  const { data, error } = await db(client).rpc('list_ai_agents');
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map(mapAiAgent);
}

export async function assignMatterAiAgent(
  input: {
    matterId: string;
    agentRoleType: AiAgentRoleType;
    instructions: string;
    supervisingProfileId: string;
    taskTitle?: string;
    allowedContext?: AiContextScope[];
  },
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('assign_matter_ai_agent', {
    payload: {
      matter_id: input.matterId,
      agent_role_type: input.agentRoleType,
      instructions: input.instructions,
      supervising_profile_id: input.supervisingProfileId,
      task_title: input.taskTitle ?? null,
      allowed_context: input.allowedContext ?? null,
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not assign AI assistance.');
  return data;
}

export async function assignMatterCodingAgent(
  input: {
    matterId: string;
    instructions: string;
    supervisingProfileId: string;
    allowedPaths: string[];
    repositorySlug?: string;
    taskTitle?: string;
    requiredGates?: string[];
  },
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('assign_matter_coding_agent', {
    payload: {
      matter_id: input.matterId,
      instructions: input.instructions,
      supervising_profile_id: input.supervisingProfileId,
      allowed_paths: input.allowedPaths,
      repository_slug: input.repositorySlug ?? 'maturehumanity/civizen',
      task_title: input.taskTitle ?? 'Implement authorized code change',
      required_gates: input.requiredGates ?? [],
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not assign Coding Agent.');
  return data;
}

export async function approveMatterCodingPlan(
  artifactId: string,
  note?: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('approve_matter_coding_plan', {
    p_artifact_id: artifactId,
    p_note: note ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not approve coding plan.');
  return data;
}

export async function approveMatterCodingScopeExpansion(
  artifactId: string,
  path: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('approve_matter_coding_scope_expansion', {
    p_artifact_id: artifactId,
    p_path: path,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function reviewMatterAgentWork(
  actionId: string,
  action: 'accept' | 'request_changes' | 'reject',
  message?: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('review_matter_agent_work', {
    p_action_id: actionId,
    p_action: action,
    p_message: message ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function retryMatterAgentRun(assignmentId: string, client: DbClient = supabase): Promise<string> {
  const { data, error } = await db(client).rpc('retry_matter_agent_run', { p_assignment_id: assignmentId });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not retry agent run.');
  return data;
}

export async function cancelMatterAgentAssignment(assignmentId: string, client: DbClient = supabase): Promise<void> {
  const { error } = await db(client).rpc('cancel_matter_agent_assignment', { p_assignment_id: assignmentId });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function adoptMatterAgentPlanTask(
  artifactId: string,
  title: string,
  description?: string,
  dependsOnTitles?: string[],
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('adopt_matter_agent_plan_task', {
    p_artifact_id: artifactId,
    p_title: title,
    p_description: description ?? null,
    p_depends_on_titles: dependsOnTitles ?? [],
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not adopt proposed Task.');
  return data;
}

export async function promoteAgentDecisionSuggestion(
  artifactId: string,
  title: string,
  statement: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('promote_agent_decision_suggestion', {
    p_artifact_id: artifactId,
    p_title: title,
    p_statement: statement,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not promote Decision suggestion.');
  return data;
}

export async function invokeMatterAgentRun(runId: string, client: DbClient = supabase): Promise<void> {
  const { error } = await client.functions.invoke('matter-agent-execute', { body: { run_id: runId } });
  if (error) throw new Error(error.message || 'Agent execution failed.');
}

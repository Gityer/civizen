import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

type Response = { data?: unknown; error?: unknown };
export type RecordedCall = { table: string; ops: Array<[method: string, args: unknown[]]> };

/**
 * Supabase client stub for service tests. Every query builder method is chainable and records its
 * arguments; awaiting the chain resolves the next scripted response for that table (the last one
 * repeats), so tests can assert both what was sent and how errors are handled.
 *
 *   const { client, calls } = createRecordingClient({ governance_proposal_votes: [{ error: null }] });
 */
export function createRecordingClient(script: Record<string, Response[]> = {}) {
  const calls: RecordedCall[] = [];
  const used: Record<string, number> = {};

  const nextResponse = (table: string): Response => {
    const responses = script[table] ?? [{ data: null, error: null }];
    const index = Math.min(used[table] ?? 0, responses.length - 1);
    used[table] = (used[table] ?? 0) + 1;
    return { data: null, error: null, ...responses[index] };
  };

  const from = (table: string) => {
    const call: RecordedCall = { table, ops: [] };
    calls.push(call);

    const builder: Record<string, unknown> = {};
    const chainable = (method: string) => (...args: unknown[]) => {
      call.ops.push([method, args]);
      return builder;
    };
    for (const method of [
      'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'ilike', 'order', 'limit', 'single', 'maybeSingle',
    ]) {
      builder[method] = chainable(method);
    }
    builder.then = (resolve: (value: Response) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(nextResponse(table)).then(resolve, reject);
    return builder;
  };

  // rpc calls are recorded under the pseudo-table `rpc:<function name>` and scripted the same way.
  const rpc = (name: string, args: unknown) => {
    const table = `rpc:${name}`;
    calls.push({ table, ops: [['rpc', [args]]] });
    return Promise.resolve(nextResponse(table));
  };

  return { client: { from, rpc } as unknown as SupabaseClient<Database>, calls };
}

/** Arguments of the first recorded call to `method` on `table`, or undefined. */
export function argsOf(calls: RecordedCall[], table: string, method: string): unknown[] | undefined {
  return calls.find((call) => call.table === table)?.ops.find(([name]) => name === method)?.[1];
}

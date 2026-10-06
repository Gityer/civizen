import { supabase } from '@/integrations/supabase/client';
import { isMatterActorKind, type MatterActorKind, type MatterActorRef } from '@/lib/matters';

export type DbClient = typeof supabase;
type QueryError = { message?: string } | null;
type ProfileQuery = {
  select: (columns: string) => ProfileQuery;
  in: (column: string, values: readonly unknown[]) => Promise<{ data: unknown; error: QueryError }>;
  eq: (column: string, value: unknown) => Promise<{ data: unknown; error: QueryError }>;
};
type MattersClient = {
  from: (table: string) => ProfileQuery;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: QueryError }>;
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options?: { upsert?: boolean; contentType?: string },
      ) => Promise<{ error: QueryError }>;
    };
  };
};

export function db(client: DbClient): MattersClient {
  return client as unknown as MattersClient;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    return record ? [record] : [];
  });
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function strOrNull(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

export function rpcErrorMessage(error: { message?: string } | null): string {
  const message = error?.message?.trim() || 'request_failed';
  const marker = message.split('\n')[0]?.trim() || message;
  return marker.replace(/^.*ERROR:\s*/i, '').split('CONTEXT:')[0].trim();
}

export function actorFrom(
  kindValue: unknown,
  profileId: unknown,
  unitLabel: unknown,
  displayName: unknown,
  agentId?: unknown,
): MatterActorRef {
  const kind = isMatterActorKind(str(kindValue)) ? (kindValue as MatterActorKind) : 'person';
  return {
    kind,
    profileId: kind === 'ai_agent' ? null : strOrNull(profileId),
    agentId: kind === 'ai_agent' ? strOrNull(agentId ?? profileId) : strOrNull(agentId),
    unitLabel: strOrNull(unitLabel),
    displayName: strOrNull(displayName),
  };
}

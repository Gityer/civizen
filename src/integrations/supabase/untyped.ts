import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from './client';

/**
 * Supabase client without generated table typing.
 *
 * Use only for tables and RPCs that are not in `types.ts` yet. Prefer the typed `supabase` client
 * everywhere else, and move call sites back to it once `types.ts` is regenerated to include them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types do not cover every table/RPC yet
export type UntypedSupabaseClient = SupabaseClient<any, 'public', any>;

export const supabaseUntyped = supabase as unknown as UntypedSupabaseClient;

/** Re-exported so files that need both clients (or the generated `Database` type) can import them in one line. */
export { supabase };
export type { Database } from './types';

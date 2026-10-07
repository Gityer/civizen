import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types';

/**
 * The app's Supabase client type, for libraries that accept an injected client
 * (tests pass a stub, the app passes `supabase` from `./client`).
 */
export type SupabaseDbClient = SupabaseClient<Database, 'public'>;

/** Re-exported so files that need the client and its types can import them in one line. */
export { supabase } from './client';
export type { Database, Json } from './types';

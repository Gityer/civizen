import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PublicFunctions = Database['public']['Functions'];

/** Calls a database function with its generated argument and return types; throws on error. */
export async function callRpc<Name extends keyof PublicFunctions & string>(
  name: Name,
  args?: PublicFunctions[Name]['Args'],
): Promise<PublicFunctions[Name]['Returns']> {
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) throw new Error(error.message);
  return data as PublicFunctions[Name]['Returns'];
}

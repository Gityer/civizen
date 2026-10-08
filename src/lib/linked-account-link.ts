import type { SupabaseDbClient } from '@/integrations/supabase/client-type';

/**
 * Linking a business account needs proof of control of BOTH accounts:
 * the owner session mints a short-lived token (begin), and a session for the business account
 * redeems it (complete). The server inserts the `linked_accounts` row; clients never write it.
 */

export const LINK_ERROR_CODES = [
  'already_linked',
  'business_name_taken',
  'business_name_required',
  'invalid_or_expired_link_token',
  'link_target_mismatch',
  'cannot_link_self',
  'profile_not_ready',
  'too_many_pending_links',
  'not_authenticated',
] as const;

export type LinkErrorCode = (typeof LINK_ERROR_CODES)[number] | 'unknown';

type RpcError = { message?: string | null; code?: string | null; details?: string | null } | null | undefined;

export function linkErrorCode(error: RpcError): LinkErrorCode {
  const haystack = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return LINK_ERROR_CODES.find((code) => haystack.includes(code)) ?? 'unknown';
}

export type LinkRpcClient = Pick<SupabaseDbClient, 'rpc'>;

export type EstablishLinkResult =
  | { linkedProfileId: string; error: null }
  | { linkedProfileId: null; error: LinkErrorCode };

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function establishBusinessAccountLink(params: {
  ownerClient: LinkRpcClient;
  businessClient: LinkRpcClient;
  businessName?: string | null;
  linkedProfileId?: string | null;
  /** The profile row is created by a trigger right after sign-up; retry briefly if it lags. */
  retries?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<EstablishLinkResult> {
  const retries = params.retries ?? 8;
  const delayMs = params.delayMs ?? 250;
  const sleep = params.sleep ?? defaultSleep;

  const { data: token, error: beginError } = await params.ownerClient.rpc('begin_business_account_link', {
    p_business_name: params.businessName?.trim() || null,
    p_linked_profile_id: params.linkedProfileId ?? null,
  });

  if (beginError || typeof token !== 'string' || !token) {
    return { linkedProfileId: null, error: linkErrorCode(beginError) };
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { data, error } = await params.businessClient.rpc('complete_business_account_link', { p_token: token });
    if (!error && typeof data === 'string' && data) {
      return { linkedProfileId: data, error: null };
    }
    const code = linkErrorCode(error);
    if (code !== 'profile_not_ready' || attempt === retries) {
      return { linkedProfileId: null, error: code };
    }
    await sleep(delayMs);
  }

  return { linkedProfileId: null, error: 'profile_not_ready' };
}

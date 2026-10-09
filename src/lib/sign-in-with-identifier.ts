import type { Session } from '@supabase/supabase-js';

/**
 * Sign-in by username or phone number goes through the `sign-in-with-identifier` edge function:
 * the identifier → e-mail lookup and the password grant happen server-side, so the browser never
 * learns which identifiers exist and the anonymous lookup RPC is no longer needed.
 *
 * While the lookup RPC is still granted on the database, an unreachable function (network error,
 * relay error, 5xx) falls back to the legacy client-side path so sign-in keeps working during the
 * rollout. A clean refusal (400) is never retried that way.
 */
export const SIGN_IN_WITH_IDENTIFIER_FUNCTION = 'sign-in-with-identifier';

export const INVALID_LOGIN_MESSAGE = 'Invalid login credentials';

type AuthError = { message?: string } | null;

type SignInClient = {
  functions: {
    invoke: (
      name: string,
      options: { body: { identifier: string; password: string } },
    ) => Promise<{ data: unknown; error: (Error & { context?: { status?: number } }) | null }>;
  };
  rpc: (
    name: 'resolve_login_email',
    args: { identifier: string },
  ) => PromiseLike<{ data: unknown; error: AuthError }>;
  auth: {
    setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<{
      data: { session: Session | null };
      error: AuthError;
    }>;
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{
      data: { session: Session | null };
      error: AuthError;
    }>;
  };
};

type FunctionResponse = {
  session?: { access_token?: string; refresh_token?: string };
  error?: string;
};

export type IdentifierSignInResult = { session: Session | null; error: Error | null };

export function isEmailIdentifier(identifier: string) {
  return identifier.includes('@');
}

/** A 400 from the function is a definitive refusal; anything else means the function was unavailable. */
function functionRefused(error: { context?: { status?: number } } | null) {
  return error?.context?.status === 400;
}

async function legacySignIn(client: SignInClient, identifier: string, password: string): Promise<IdentifierSignInResult> {
  const { data, error } = await client.rpc('resolve_login_email', { identifier });
  if (error || typeof data !== 'string' || !data) {
    return { session: null, error: new Error(INVALID_LOGIN_MESSAGE) };
  }
  const result = await client.auth.signInWithPassword({ email: data, password });
  return { session: result.data.session, error: result.error ? new Error(result.error.message || INVALID_LOGIN_MESSAGE) : null };
}

/**
 * Resolves a username/phone sign-in into a session on the given client.
 * Every refusal surfaces as the same generic error, as the login form expects.
 */
export async function signInWithIdentifier(
  client: SignInClient,
  identifier: string,
  password: string,
): Promise<IdentifierSignInResult> {
  const trimmed = identifier.trim();
  const { data, error } = await client.functions.invoke(SIGN_IN_WITH_IDENTIFIER_FUNCTION, {
    body: { identifier: trimmed, password },
  });

  if (error && !functionRefused(error)) {
    return legacySignIn(client, trimmed, password);
  }

  const body = (data ?? null) as FunctionResponse | null;
  const accessToken = body?.session?.access_token;
  const refreshToken = body?.session?.refresh_token;

  if (error || !accessToken || !refreshToken) {
    return { session: null, error: new Error(INVALID_LOGIN_MESSAGE) };
  }

  const result = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (result.error) {
    return { session: null, error: new Error(result.error.message || INVALID_LOGIN_MESSAGE) };
  }

  return { session: result.data.session, error: null };
}

import { describe, expect, it, vi } from 'vitest';

import {
  INVALID_LOGIN_MESSAGE,
  SIGN_IN_WITH_IDENTIFIER_FUNCTION,
  isEmailIdentifier,
  signInWithIdentifier,
} from './sign-in-with-identifier';

type InvokeError = (Error & { context?: { status?: number } }) | null;

function createClient(options: {
  invokeData?: unknown;
  invokeError?: InvokeError;
  setSessionError?: { message?: string } | null;
  rpcData?: unknown;
  rpcError?: { message?: string } | null;
  passwordError?: { message?: string } | null;
}) {
  const session = { access_token: 'at', refresh_token: 'rt', user: { id: 'user-1' } };
  const invoke = vi.fn().mockResolvedValue({ data: options.invokeData ?? null, error: options.invokeError ?? null });
  const setSession = vi.fn().mockResolvedValue({
    data: { session: options.setSessionError ? null : session },
    error: options.setSessionError ?? null,
  });
  const rpc = vi.fn().mockResolvedValue({ data: options.rpcData ?? null, error: options.rpcError ?? null });
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: { session: options.passwordError ? null : session },
    error: options.passwordError ?? null,
  });
  return { client: { functions: { invoke }, rpc, auth: { setSession, signInWithPassword } }, invoke, setSession, rpc, signInWithPassword };
}

function httpError(status: number): InvokeError {
  const error = new Error('Edge Function returned a non-2xx status code') as Error & { context?: { status?: number } };
  error.name = 'FunctionsHttpError';
  error.context = { status };
  return error;
}

describe('signInWithIdentifier', () => {
  it('treats anything with an @ as an e-mail', () => {
    expect(isEmailIdentifier('member@test.civizen.local')).toBe(true);
    expect(isEmailIdentifier('member')).toBe(false);
    expect(isEmailIdentifier('+37495550990')).toBe(false);
  });

  it('calls the edge function and installs the returned session', async () => {
    const { client, invoke, setSession, rpc } = createClient({
      invokeData: { session: { access_token: 'at', refresh_token: 'rt' } },
    });

    const result = await signInWithIdentifier(client as never, ' member ', 'secret');

    expect(invoke).toHaveBeenCalledWith(SIGN_IN_WITH_IDENTIFIER_FUNCTION, {
      body: { identifier: 'member', password: 'secret' },
    });
    expect(setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
    expect(rpc).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(result.session?.user.id).toBe('user-1');
  });

  it('returns the generic login error when the function refuses, without any legacy retry', async () => {
    const { client, setSession, rpc } = createClient({
      invokeData: { error: 'invalid_login_credentials' },
      invokeError: httpError(400),
    });

    const result = await signInWithIdentifier(client as never, 'nobody', 'wrong');

    expect(result.session).toBeNull();
    expect(result.error?.message).toBe(INVALID_LOGIN_MESSAGE);
    expect(setSession).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('falls back to the legacy lookup when the function is unreachable', async () => {
    const fetchError = new Error('Failed to send a request to the Edge Function') as InvokeError;
    const { client, rpc, signInWithPassword, setSession } = createClient({
      invokeError: fetchError,
      rpcData: 'member@test.civizen.local',
    });

    const result = await signInWithIdentifier(client as never, 'member', 'secret');

    expect(rpc).toHaveBeenCalledWith('resolve_login_email', { identifier: 'member' });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'member@test.civizen.local', password: 'secret' });
    expect(setSession).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(result.session?.user.id).toBe('user-1');
  });

  it('legacy fallback keeps the generic error when the lookup is denied', async () => {
    const { client, signInWithPassword } = createClient({
      invokeError: httpError(503),
      rpcError: { message: 'permission denied for function resolve_login_email' },
    });

    const result = await signInWithIdentifier(client as never, 'member', 'secret');

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(result.error?.message).toBe(INVALID_LOGIN_MESSAGE);
  });

  it('returns the generic login error when no session comes back', async () => {
    const { client, setSession } = createClient({ invokeData: {} });

    const result = await signInWithIdentifier(client as never, 'member', 'secret');

    expect(result.error?.message).toBe(INVALID_LOGIN_MESSAGE);
    expect(setSession).not.toHaveBeenCalled();
  });

  it('surfaces a setSession failure', async () => {
    const { client } = createClient({
      invokeData: { session: { access_token: 'at', refresh_token: 'rt' } },
      setSessionError: { message: 'Session expired' },
    });

    const result = await signInWithIdentifier(client as never, 'member', 'secret');

    expect(result.session).toBeNull();
    expect(result.error?.message).toBe('Session expired');
  });
});

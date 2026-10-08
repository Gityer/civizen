import { describe, expect, it, vi } from 'vitest';

import { establishBusinessAccountLink, linkErrorCode, type LinkRpcClient } from '@/lib/linked-account-link';

function rpcClient(impl: (fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => impl(fn, args ?? {}));
  return { client: { rpc } as unknown as LinkRpcClient, rpc };
}

describe('linked-account-link', () => {
  it('maps server error messages to link error codes', () => {
    expect(linkErrorCode({ message: 'already_linked' })).toBe('already_linked');
    expect(linkErrorCode({ message: 'ERROR: business_name_taken', details: null })).toBe('business_name_taken');
    expect(linkErrorCode({ message: 'permission denied for table linked_accounts' })).toBe('unknown');
    expect(linkErrorCode(null)).toBe('unknown');
  });

  it('begins with the owner session and completes with the business session', async () => {
    const owner = rpcClient((fn, args) => {
      expect(fn).toBe('begin_business_account_link');
      expect(args).toEqual({ p_business_name: 'Acme LLC', p_linked_profile_id: null });
      return { data: 'tok-123', error: null };
    });
    const business = rpcClient((fn, args) => {
      expect(fn).toBe('complete_business_account_link');
      expect(args).toEqual({ p_token: 'tok-123' });
      return { data: 'biz-profile', error: null };
    });

    const result = await establishBusinessAccountLink({
      ownerClient: owner.client,
      businessClient: business.client,
      businessName: ' Acme LLC ',
    });

    expect(result).toEqual({ linkedProfileId: 'biz-profile', error: null });
    expect(owner.rpc).toHaveBeenCalledTimes(1);
    expect(business.rpc).toHaveBeenCalledTimes(1);
  });

  it('passes the selected existing business to the owner step for Connect', async () => {
    const owner = rpcClient((_fn, args) => {
      expect(args).toEqual({ p_business_name: null, p_linked_profile_id: 'existing-biz' });
      return { data: 'tok', error: null };
    });
    const business = rpcClient(() => ({ data: 'existing-biz', error: null }));

    const result = await establishBusinessAccountLink({
      ownerClient: owner.client,
      businessClient: business.client,
      businessName: '',
      linkedProfileId: 'existing-biz',
    });

    expect(result.linkedProfileId).toBe('existing-biz');
  });

  it('retries while the business profile row is not ready, then succeeds', async () => {
    const owner = rpcClient(() => ({ data: 'tok', error: null }));
    let calls = 0;
    const business = rpcClient(() => {
      calls += 1;
      return calls < 3 ? { data: null, error: { message: 'profile_not_ready' } } : { data: 'biz', error: null };
    });
    const sleep = vi.fn(async () => {});

    const result = await establishBusinessAccountLink({
      ownerClient: owner.client,
      businessClient: business.client,
      businessName: 'Acme',
      sleep,
    });

    expect(result).toEqual({ linkedProfileId: 'biz', error: null });
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('stops on the first non-retryable server error and never completes without a token', async () => {
    const owner = rpcClient(() => ({ data: null, error: { message: 'business_name_taken' } }));
    const business = rpcClient(() => ({ data: 'biz', error: null }));

    const result = await establishBusinessAccountLink({
      ownerClient: owner.client,
      businessClient: business.client,
      businessName: 'Acme',
    });

    expect(result).toEqual({ linkedProfileId: null, error: 'business_name_taken' });
    expect(business.rpc).not.toHaveBeenCalled();

    const owner2 = rpcClient(() => ({ data: 'tok', error: null }));
    const business2 = rpcClient(() => ({ data: null, error: { message: 'already_linked' } }));
    const sleep = vi.fn(async () => {});
    const result2 = await establishBusinessAccountLink({
      ownerClient: owner2.client,
      businessClient: business2.client,
      businessName: 'Acme',
      sleep,
    });
    expect(result2).toEqual({ linkedProfileId: null, error: 'already_linked' });
    expect(sleep).not.toHaveBeenCalled();
  });
});

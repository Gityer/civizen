import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));

import { pushSupported, urlBase64ToUint8Array } from './push-subscriptions';

describe('push subscriptions', () => {
  it('decodes a base64url VAPID key into bytes', () => {
    // "hello" in base64url without padding
    expect(Array.from(urlBase64ToUint8Array('aGVsbG8'))).toEqual([104, 101, 108, 108, 111]);
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
  });

  it('reports support from the environment', () => {
    expect(typeof pushSupported()).toBe('boolean');
  });
});

import { describe, expect, it } from 'vitest';

import { parseServerLanguagePack } from './i18n.server-pack';

describe('server language pack', () => {
  it('accepts a built pack and rejects building or empty answers', () => {
    expect(parseServerLanguagePack({ ok: true, version: 'abc', pack: { common: { save: 'Պահել' } } })).toEqual({ pack: { common: { save: 'Պահել' } }, version: 'abc', stale: false });
    expect(parseServerLanguagePack({ ok: true, status: 'building' })).toBeNull();
    expect(parseServerLanguagePack({ ok: true, pack: {} })).toBeNull();
    expect(parseServerLanguagePack({ ok: false, pack: { a: 'b' } })).toBeNull();
    expect(parseServerLanguagePack(null)).toBeNull();
    expect(parseServerLanguagePack({ ok: true, version: 'v', pack: { a: 'b' }, stale: true })?.stale).toBe(true);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { m_messages_moderation } from '@/lib/i18n/base/messages-moderation';
import { moderationHy } from '@/lib/i18n/curated/moderation.hy';
import { moderationRu } from '@/lib/i18n/curated/moderation.ru';

import {
  MODERATION_REASON_CODES,
  MODERATION_TARGET_KINDS,
  isReasonCode,
  moderationErrorKey,
  moderationTargetRoute,
} from './moderation';

describe('moderation client', () => {
  it('uses the same reason codes as the database', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261013110000_content_moderation.sql'), 'utf8');
    const sqlList = migration.match(/SELECT ARRAY\[([^\]]+)\]/)?.[1] ?? '';
    const sqlCodes = [...sqlList.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect([...MODERATION_REASON_CODES].sort()).toEqual(sqlCodes);
  });

  it('labels every reason and target kind in English, Armenian and Russian', () => {
    for (const messages of [m_messages_moderation.moderation, moderationHy.moderation, moderationRu.moderation]) {
      for (const code of MODERATION_REASON_CODES) expect(messages.reasons[code]).toBeTruthy();
      for (const kind of MODERATION_TARGET_KINDS) expect(messages.kinds[kind]).toBeTruthy();
    }
  });

  it('recognises reason codes and routes moderators to openable targets', () => {
    expect(isReasonCode('spam')).toBe(true);
    expect(isReasonCode('rude')).toBe(false);
    expect(moderationTargetRoute('matter', 'm1')).toBe('/contribute/matters/m1');
    expect(moderationTargetRoute('user', 'p1')).toBe('/user/p1');
    expect(moderationTargetRoute('post', 'x')).toBeNull();
  });

  it('maps server errors to explained messages', () => {
    expect(moderationErrorKey('ERROR: appeal_needs_another_moderator')).toBe('moderation.errors.appeal_needs_another_moderator');
    expect(moderationErrorKey('boom')).toBe('moderation.errors.generic');
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  assignableRoles,
  founderOnlyRoles,
  resolveRequestedRole,
} from '../../supabase/functions/admin-create-user/authorize';

describe('admin-create-user role authorization', () => {
  it('refuses founder and admin for a caller without founder authority (the minting case)', () => {
    for (const role of ['founder', 'admin']) {
      const decision = resolveRequestedRole(role, false);
      expect(decision.ok).toBe(false);
      if (!decision.ok) expect(decision.status).toBe(403);
    }
  });

  it('refuses every founder-only role for a non-founder, whatever the role list grows to', () => {
    for (const role of founderOnlyRoles) {
      expect(resolveRequestedRole(role, false).ok).toBe(false);
    }
  });

  it('allows ordinary roles for a steward without founder authority', () => {
    for (const role of assignableRoles) {
      if (founderOnlyRoles.has(role)) continue;
      expect(resolveRequestedRole(role, false)).toEqual({ ok: true, role });
    }
  });

  it('allows founder and admin only for a caller with founder authority', () => {
    expect(resolveRequestedRole('founder', true)).toEqual({ ok: true, role: 'founder' });
    expect(resolveRequestedRole('admin', true)).toEqual({ ok: true, role: 'admin' });
  });

  it('treats unknown or malformed roles as member and does not trust truthy non-booleans', () => {
    expect(resolveRequestedRole('superuser', false)).toEqual({ ok: true, role: 'member' });
    expect(resolveRequestedRole(undefined, false)).toEqual({ ok: true, role: 'member' });
    expect(resolveRequestedRole('founder', 'yes' as unknown as boolean).ok).toBe(false);
  });

  it('the edge function checks authority before creating the user', () => {
    const source = readFileSync('supabase/functions/admin-create-user/index.ts', 'utf8');
    const check = source.indexOf('resolveRequestedRole(');
    const create = source.indexOf('auth.admin.createUser');
    expect(source).toContain("rpc('my_founder_authority')");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(create);
  });
});

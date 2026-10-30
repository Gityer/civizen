import { execFileSync } from 'node:child_process';
import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Edge functions, called over HTTP the way the app and the scheduler call them (readiness backlog "Edge functions
 * have no tests"). Every function must boot; every member-facing one must refuse anonymous callers; the sign-in,
 * user-creation, account-switch, call-relay and language-pack contracts hold. Needs `supabase functions serve` on the
 * local stack (CI starts it), with CIVIZEN_E2E_SUPABASE_URL and CIVIZEN_E2E_ANON_KEY set. Never production.
 */
const API = process.env.CIVIZEN_E2E_SUPABASE_URL ?? '';
const ANON = process.env.CIVIZEN_E2E_ANON_KEY ?? '';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';

const FUNCTIONS = [
  'admin-create-user', 'language-pack', 'linked-account-switch', 'matter-agent-execute', 'messaging-agent-reply',
  'notification-digest', 'public-delivery-open311', 'push-dispatch', 'sign-in-with-identifier', 'social-accounts', 'social-oauth-callback',
  'solutions-agent-council', 'turn-credentials',
];
/** Functions a signed-out caller must not be able to use. */
const MEMBER_ONLY = [
  'admin-create-user', 'linked-account-switch', 'messaging-agent-reply', 'notification-digest', 'public-delivery-open311', 'push-dispatch',
  'social-accounts', 'solutions-agent-council', 'turn-credentials',
];

test.skip(!API || !ANON, 'edge functions are not served (set CIVIZEN_E2E_SUPABASE_URL and CIVIZEN_E2E_ANON_KEY)');
test.beforeAll(() => {
  expect(API, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
});

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}

const fn = (name: string) => `${API}/functions/v1/${name}`;

async function call(request: APIRequestContext, name: string, body: unknown, token = ANON) {
  return request.post(fn(name), { headers: { apikey: ANON, Authorization: `Bearer ${token}` }, data: body, timeout: 60_000 });
}

async function tokenFor(request: APIRequestContext, username: string): Promise<string> {
  const response = await request.post(`${API}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON }, data: { email: `${username}@test.civizen.local`, password: PASSWORD },
  });
  expect(response.status(), `password sign-in for ${username}`).toBe(200);
  return (await response.json()).access_token as string;
}

test('every function boots', async ({ request }) => {
  test.setTimeout(240_000);
  for (const name of FUNCTIONS) {
    const response = await request.post(fn(name), { headers: { apikey: ANON }, data: {}, maxRedirects: 0, timeout: 90_000 });
    const text = await response.text();
    expect(text, `${name} failed to boot`).not.toContain('BOOT_ERROR');
    expect(response.status(), `${name}: ${text.slice(0, 200)}`).toBeLessThan(500);
  }
});

test('member-only functions refuse anonymous callers', async ({ request }) => {
  test.setTimeout(120_000);
  for (const name of MEMBER_ONLY) {
    const response = await call(request, name, {});
    expect(response.status(), `${name} with the anon key`).toBe(401);
  }
  // a Matter agent run is authorised per run by the database; an unknown run is refused
  const run = await call(request, 'matter-agent-execute', { run_id: '00000000-0000-0000-0000-000000000000' });
  expect(run.status()).toBe(403);
});

test('sign-in with a username: success, wrong password, missing fields, suspended account', async ({ request }) => {
  test.setTimeout(120_000);
  const ok = await call(request, 'sign-in-with-identifier', { identifier: 'guest', password: PASSWORD });
  expect(ok.status()).toBe(200);
  expect(JSON.stringify(await ok.json())).toContain('access_token');

  const wrong = await call(request, 'sign-in-with-identifier', { identifier: 'guest', password: 'not-the-password' });
  expect(wrong.status()).toBe(400);
  expect(await wrong.json()).toEqual({ error: 'invalid_login_credentials' });

  const missing = await call(request, 'sign-in-with-identifier', { identifier: 'guest' });
  expect(missing.status()).toBe(400);
  expect(await missing.json()).toEqual({ error: 'identifier_and_password_required' });

  const uid = sql("SELECT user_id FROM public.profiles WHERE username = 'market_manager' AND deleted_at IS NULL LIMIT 1");
  sql(`UPDATE auth.users SET banned_until = now() + interval '1 day' WHERE id = '${uid}'`);
  try {
    const banned = await call(request, 'sign-in-with-identifier', { identifier: 'market_manager', password: PASSWORD });
    expect(banned.status()).toBe(403);
    expect(await banned.json()).toEqual({ error: 'user_banned' });
  } finally {
    sql(`UPDATE auth.users SET banned_until = NULL WHERE id = '${uid}'`);
    sql("DELETE FROM public.sign_in_attempts WHERE created_at > now() - interval '1 hour'");
  }
});

test('creating users needs user-management rights; a founder can create one with a role', async ({ request }) => {
  test.setTimeout(120_000);
  const email = `fn-e2e-${Date.now().toString(36)}@test.civizen.local`;
  const payload = { email, password: 'fn-e2e-password-1', full_name: 'Edge Function Fixture', role: 'citizen' };

  const member = await call(request, 'admin-create-user', payload, await tokenFor(request, 'member'));
  expect(member.status()).toBe(403);

  const founder = await call(request, 'admin-create-user', payload, await tokenFor(request, 'maturehumanity'));
  try {
    expect(founder.status(), await founder.text()).toBe(200);
    const id = (await founder.json()).user.id as string;
    await expect.poll(() => sql(`SELECT role FROM public.profiles WHERE user_id = '${id}'`)).toBe('citizen');
  } finally {
    sql(`DELETE FROM auth.users WHERE email = '${email}'`);
  }
});

test('a member cannot switch into an account that is not linked to theirs', async ({ request }) => {
  const target = sql("SELECT id FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1");
  const response = await call(request, 'linked-account-switch', { targetProfileId: target }, await tokenFor(request, 'member'));
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: 'Target account is not linked.' });
});

test('call relay credentials: a member gets a (possibly empty) ICE server list', async ({ request }) => {
  const response = await call(request, 'turn-credentials', {}, await tokenFor(request, 'member'));
  expect(response.status()).toBe(200);
  expect(Array.isArray((await response.json()).iceServers)).toBe(true);
});

test('language packs: English and unknown codes are refused; without a provider an uncached pack is unavailable', async ({ request }) => {
  const get = (lang: string) => request.get(`${fn('language-pack')}?lang=${lang}`, { headers: { apikey: ANON }, timeout: 60_000 });
  expect((await get('en')).status()).toBe(400);
  expect((await get('xx')).status()).toBe(400);
  sql("DELETE FROM public.language_packs WHERE language = 'de'");
  const de = await get('de');
  expect([200, 202, 503], await de.text()).toContain(de.status());
  if (de.status() === 503) expect(await de.json()).toEqual({ error: 'translation_provider_unavailable' });
});

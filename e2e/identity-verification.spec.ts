import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { mrzCheckDigit } from '../src/lib/mrz';

/**
 * In-house live identity verification, end to end: an unverified member (fixture `newcomer`) is stopped before writing
 * and before voting, goes through /verify (consent, document photo and machine-readable lines, live camera check with
 * the server's code and moves), a reviewer sees the recording with the challenge and flags and approves, and the member
 * then votes. Chromium's fake camera stands in for a face; the browser automation flag replaces the face checks
 * (src/lib/face-checks.ts). Local stack only.
 */
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';
const MEMBER = 'newcomer@test.civizen.local';
const REVIEWER = 'maturehumanity@test.civizen.local';
// 1x1 PNG: the document photo (the face match is replaced under automation)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['camera', 'microphone'],
});

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}

/** A passport's two machine-readable lines (ICAO 9303 TD3) for the fixture, with valid check digits. */
function passportMrz(number: string): string {
  const pad = (value: string, length: number) => value.padEnd(length, '<');
  const doc = pad(number, 9);
  const birth = '900101';
  const expiry = '351231';
  const personal = pad('', 14);
  const withDigit = (value: string) => value + mrzCheckDigit(value);
  const composite = withDigit(doc) + withDigit(birth) + withDigit(expiry) + withDigit(personal);
  return [
    pad('P<KENNEWCOMER<<FIXTURE', 44),
    `${withDigit(doc)}KEN${withDigit(birth)}F${withDigit(expiry)}${withDigit(personal)}${mrzCheckDigit(composite)}`,
  ].join('\n');
}

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  await context.addInitScript(() => window.localStorage.setItem('civizen.e2e.faceChecks', 'pass'));
  const page = await context.newPage();
  await page.goto('/login');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
  await page.getByPlaceholder(/janesmith/).fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return page;
}

// The "verified before acting" requirement is off by default (20261101100000); this journey tests it switched on.
const REQUIRE = (on: boolean) => sql(`UPDATE public.platform_flags SET enabled = ${on} WHERE key = 'identity_verification_required'`);
test.beforeAll(() => { REQUIRE(true); });
test.afterAll(() => { REQUIRE(false); });

test('an unverified member verifies live, a reviewer approves, and the member votes', async ({ browser }) => {
  test.setTimeout(240_000);
  // every run starts unverified, with no case and no ballot
  const profileId = sql(`SELECT id FROM public.profiles WHERE username = 'newcomer'`);
  sql(`DELETE FROM public.civic_ballots WHERE profile_id = '${profileId}'`);
  sql(`DELETE FROM public.org_position_items WHERE source_type = 'identity_verification' AND source_ref IN (SELECT id::text FROM public.identity_verification_cases WHERE profile_id = '${profileId}')`);
  sql(`DELETE FROM public.identity_verification_cases WHERE profile_id = '${profileId}'`);
  sql(`UPDATE public.profiles SET is_verified = false WHERE id = '${profileId}'`);

  const member = await signedIn(browser, MEMBER);

  // a write is refused and the app offers verification (on the page sign-in landed on, already rendered)
  await member.evaluate(async (id) => {
    const mod = await import('/src/integrations/supabase/client.ts');
    const client = (mod as { supabase: { from: (t: string) => { insert: (row: object) => Promise<unknown> } } }).supabase;
    await client.from('posts').insert({ author_id: id, content: 'Hello from an unverified account' });
  }, profileId);
  const prompt = member.getByTestId('verification-prompt');
  await expect(prompt).toBeVisible();
  await prompt.getByRole('button', { name: 'Later' }).click();
  await expect(prompt).toHaveCount(0);

  // the vote is closed until verified, with the way in
  await member.goto('/governance/workspace');
  await member.locator('div').filter({ has: member.getByText('A Single World Citizenship', { exact: true }) })
    .filter({ has: member.getByRole('button', { name: /Open ballot|Review my ballot/ }) }).last()
    .getByRole('button', { name: /Open ballot|Review my ballot/ }).click();
  await member.waitForURL(/\/governance\/voting\//);
  const ballotPath = new URL(member.url()).pathname;
  await expect(member.getByTestId('consultation-blocked')).toBeVisible();
  await member.getByTestId('consultation-verify').click();
  await member.waitForURL(/\/verify\?next=/);

  // consent → document → live check
  await member.getByTestId('verify-consent').click();
  await member.getByTestId('verify-consent-next').click();
  await member.getByTestId('verify-document-photo').setInputFiles({ name: 'passport.png', mimeType: 'image/png', buffer: PNG });
  await member.getByTestId('verify-mrz').fill('P<KEN');
  await expect(member.getByTestId('verify-mrz-invalid')).toBeVisible();
  const number = `E2E${Date.now().toString(36).slice(-6).toUpperCase()}`;
  await member.getByTestId('verify-mrz').fill(passportMrz(number));
  await expect(member.getByTestId('verify-mrz-valid')).toContainText('FIXTURE NEWCOMER');
  await member.getByTestId('verify-document-next').click();

  await expect(member.getByTestId('verify-challenge-code')).toHaveText(/^\d{3}-\d{3}$/);
  await member.getByTestId('verify-camera-start').click();
  await member.getByTestId('verify-live-record').click();
  await expect(member.getByTestId('verify-status')).toContainText('Sent for review', { timeout: 30_000 });

  // the reviewer sees the recording, the code and moves, the device results, and no flags
  const reviewer = await signedIn(browser, REVIEWER);
  await reviewer.goto('/governance/tools/steward');
  const caseId = sql(`SELECT id FROM public.identity_verification_cases WHERE profile_id = '${profileId}'`);
  const card = reviewer.getByTestId(`identity-review-case-${caseId}`);
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.getByTestId('identity-review-live-video')).toBeVisible();
  await expect(card.getByTestId('identity-review-live-evidence')).toContainText('No flags from the checks.');
  await card.getByTestId('identity-review-approve').click();
  await expect(card).toHaveCount(0, { timeout: 20_000 });
  expect(sql(`SELECT is_verified FROM public.profiles WHERE id = '${profileId}'`)).toBe('t');
  expect(sql(`SELECT status FROM public.org_position_items WHERE source_type = 'identity_verification' AND source_ref = '${caseId}'`)).toBe('done');

  // back to the vote: it counts now
  await member.goto(ballotPath);
  const vote = member.getByTestId('consultation-vote');
  await expect(vote).toBeVisible();
  await expect(member.getByTestId('consultation-blocked')).toHaveCount(0);
  await vote.getByRole('button', { name: 'Support', exact: true }).click();
  await expect(member.getByTestId('consultation-receipt')).toBeVisible();
  await vote.getByRole('button', { name: 'Withdraw ballot' }).click();
  await expect(member.getByTestId('consultation-receipt')).toHaveCount(0);
});

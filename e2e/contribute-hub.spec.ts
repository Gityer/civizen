import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

/**
 * Contribute hub (plan step D4): the "waiting for you" strip shows the counts the database computes for the member,
 * each leading to its place, and the lane cards are real links. Uses the `armen` fixture. Local stack only.
 */
const EMAIL = 'armen@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';

function waitingFor(username: string): Record<string, number> {
  const out = execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c',
    `SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = '${username}' AND deleted_at IS NULL LIMIT 1), 'role', 'authenticated')::text, false);
     SELECT public.contribute_waiting_for_me();`], { encoding: 'utf8' }).trim().split('\n');
  return JSON.parse(out[out.length - 1]);
}

test('the Contribute hub shows what is waiting for the member, and lanes are links', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/login');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
  await page.getByPlaceholder(/janesmith/).fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));

  const expected = waitingFor('armen');
  await page.goto('/contribute');
  const strip = page.getByTestId('contribute-waiting');
  await expect(strip).toBeVisible({ timeout: 20_000 });
  const items = [
    ['actionsDue', 'actions_due', 'Matter actions due', '/contribute/matters?view=needs_action'],
    ['proposalsToSupport', 'proposals_to_support', 'Proposals to support', '/governance'],
    ['ballotsOpen', 'ballots_open', 'Open votes', '/governance/voting'],
  ] as const;
  for (const [field, key, label, href] of items) {
    const link = strip.getByTestId(`contribute-waiting-${field}`);
    if (expected[key] > 0) {
      await expect(link).toHaveText(`${label}: ${expected[key]}`);
      await expect(link).toHaveAttribute('href', href);
    } else {
      await expect(link).toHaveCount(0);
    }
  }
  if (items.every(([, key]) => expected[key] === 0)) await expect(strip).toContainText('Nothing is waiting for you right now.');

  await page.getByTestId('contribute-lane-knowledge').click();
  await expect(page).toHaveURL(/\/contribute\/knowledge$/);
});

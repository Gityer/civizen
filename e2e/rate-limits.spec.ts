import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

/**
 * Per-account limits (PM decision TD4): a member who has reached the post limit tries to post from the Home composer
 * and is told plainly when they can post again; nothing is published. The quota is filled by logging earlier posts
 * for the `certified` fixture (no other spec uses it), so the shared limits stay untouched for parallel specs.
 * Local stack only.
 */
const EMAIL = 'certified@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}

test('a member at the post limit is told when they can post again, and nothing is published', async ({ page }) => {
  test.setTimeout(90_000);
  const profileId = sql("SELECT id FROM public.profiles WHERE username = 'certified' AND deleted_at IS NULL LIMIT 1");
  expect(profileId).toMatch(/^[0-9a-f-]{36}$/);
  const stamp = `Rate limit e2e ${Date.now().toString(36)}`;
  sql(`DELETE FROM public.rate_limit_events WHERE profile_id = '${profileId}'`);
  sql(`INSERT INTO public.rate_limit_events (profile_id, action)
       SELECT '${profileId}', 'post' FROM generate_series(1, (SELECT max_count FROM public.rate_limits WHERE action = 'post'))`);

  try {
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

    await page.goto('/');
    const editor = page.getByRole('textbox', { name: /Share an idea, update, or opportunity/i });
    await expect(editor).toBeVisible({ timeout: 30_000 });
    await editor.click();
    await page.keyboard.type(stamp);
    await page.getByRole('button', { name: 'Post', exact: true }).click();

    await expect(page.getByText(/You have posted a lot in a short time\. You can post again at \d{1,2}:\d{2}/)).toBeVisible();
    expect(sql(`SELECT count(*) FROM public.posts WHERE author_id = '${profileId}' AND content LIKE '%${stamp}%'`)).toBe('0');
  } finally {
    sql(`DELETE FROM public.rate_limit_events WHERE profile_id = '${profileId}'`);
  }
});

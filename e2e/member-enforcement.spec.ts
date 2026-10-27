import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Enforcement steps for members (PM decision TD2): a reported member gets a warning and then a 7-day stop on posting
 * from the moderation queue; their next post is refused with a plain sentence; they appeal from Moderation; a second
 * moderator overturns it and they can post again. Uses the `law` fixture (no other spec does). Local stack only.
 */
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const TARGET = 'law@test.civizen.local';
const MODERATOR = 'moderator@test.civizen.local';
const SECOND_MODERATOR = process.env.CIVIZEN_E2E_SECOND_MODERATOR_EMAIL || 'moderator_two@test.civizen.local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
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

async function tryToPost(page: Page, text: string) {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: /Share an idea, update, or opportunity/i });
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  await page.keyboard.type(text);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
}

async function applyStep(page: Page, targetId: string, step: RegExp) {
  const form = page.getByTestId(`enforcement-form-${targetId}`);
  await expect(form).toBeVisible({ timeout: 20_000 });
  await form.getByTestId('enforcement-step').click();
  await page.getByRole('option', { name: step }).click();
  await form.getByTestId('enforcement-apply').click();
  await expect(page.getByText('Step applied. The member is notified and can appeal once.').last()).toBeVisible();
}

test('a reported member is restricted step by step, appeals, and a second moderator lifts it', async ({ browser }) => {
  test.setTimeout(180_000);
  const targetId = sql("SELECT id FROM public.profiles WHERE username = 'law' AND deleted_at IS NULL LIMIT 1");
  const targetUid = sql("SELECT user_id FROM public.profiles WHERE username = 'law' AND deleted_at IS NULL LIMIT 1");
  const reporterUid = sql("SELECT user_id FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1");
  expect(targetId).toMatch(/^[0-9a-f-]{36}$/);
  const reset = () => {
    sql(`DELETE FROM public.member_enforcement_actions WHERE profile_id = '${targetId}'`);
    sql(`UPDATE auth.users SET banned_until = NULL WHERE id = '${targetUid}'`);
    sql(`UPDATE public.reports SET status = 'resolved', decision = 'dismissed' WHERE target_kind = 'user' AND target_id = '${targetId}' AND status IN ('pending', 'reviewed')`);
    sql(`DELETE FROM public.rate_limit_events WHERE profile_id = '${targetId}'`);
  };
  reset();
  sql(`SELECT set_config('request.jwt.claims', '{"sub": "${reporterUid}", "role": "authenticated"}', false);
       SELECT public.report_content('user', '${targetId}', 'harassment', 'e2e enforcement');`);
  const stamp = Date.now().toString(36);

  try {
    // 1. the moderator applies a warning, then a 7-day stop on posting, from the reported profile in the queue
    const moderator = await signedIn(browser, MODERATOR);
    await moderator.goto('/moderation?tab=queue');
    await applyStep(moderator, targetId, /^Warning$/);
    await applyStep(moderator, targetId, /Cannot post or comment/);

    // 2. the member's next post is refused with a sentence, and nothing is published
    const member = await signedIn(browser, TARGET);
    await tryToPost(member, `Enforcement e2e ${stamp}`);
    await expect(member.getByText(/A moderation decision stops you from posting or commenting until/)).toBeVisible();
    expect(sql(`SELECT count(*) FROM public.posts WHERE author_id = '${targetId}' AND content LIKE '%Enforcement e2e ${stamp}%'`)).toBe('0');

    // 3. the member sees the decisions and appeals the restriction
    await member.goto('/moderation?tab=mine');
    const mine = member.getByTestId('enforcement-mine');
    await expect(mine.getByText('Cannot post or comment (7 days)')).toBeVisible({ timeout: 20_000 });
    const restriction = sql(`SELECT id FROM public.member_enforcement_actions WHERE profile_id = '${targetId}' AND step = 'content_restriction'`);
    const card = member.getByTestId(`enforcement-action-${restriction}`);
    await card.getByTestId('enforcement-appeal-text').fill('I was quoting someone else.');
    await card.getByTestId('enforcement-appeal-send').click();
    await expect(card.getByText('Appeal waiting for a decision')).toBeVisible();

    // 4. the deciding moderator cannot review it; a second moderator overturns it
    await moderator.goto('/moderation?tab=appeals');
    await expect(moderator.getByTestId(`enforcement-action-${restriction}`).getByTestId('enforcement-appeal-overturn')).toHaveCount(0);
    const second = await signedIn(browser, SECOND_MODERATOR);
    await second.goto('/moderation?tab=appeals');
    await second.getByTestId(`enforcement-action-${restriction}`).getByTestId('enforcement-appeal-overturn').click();
    await expect(second.getByTestId(`enforcement-action-${restriction}`)).toHaveCount(0, { timeout: 20_000 });

    // 5. the member can post again
    await tryToPost(member, `Enforcement e2e ${stamp} after appeal`);
    await expect.poll(() => sql(`SELECT count(*) FROM public.posts WHERE author_id = '${targetId}' AND content LIKE '%Enforcement e2e ${stamp} after appeal%'`), { timeout: 20_000 }).toBe('1');
  } finally {
    sql(`DELETE FROM public.posts WHERE author_id = '${targetId}' AND content LIKE '%Enforcement e2e ${stamp}%'`);
    reset();
  }
});

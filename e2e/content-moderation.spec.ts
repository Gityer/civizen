import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Moderation (v2 step A6): a member reports another member's post; a moderator hides it with a reason; the author
 * sees the reason and appeals once; a different moderator restores it; the member sees it again. Runs against the
 * local stack with the role fixtures. Never production. The test deletes its post at the end.
 */
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const MEMBER = 'member@test.civizen.local';
const AUTHOR = 'citizen@test.civizen.local';
const MODERATOR = 'moderator@test.civizen.local';
const SECOND_MODERATOR = process.env.CIVIZEN_E2E_FOUNDER_EMAIL || 'maturehumanity@gmail.com';

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
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
  // fixtures that predate the current Terms see the re-consent screen once
  const accept = page.getByRole('button', { name: 'I accept these Terms' });
  await accept.waitFor({ timeout: 8_000 }).then(() => accept.click()).catch(() => undefined);
  await expect(accept).toHaveCount(0, { timeout: 10_000 });
  return page;
}

type TestClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => { single: () => Promise<{ data: { id: string } | null }> } & Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => { select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } };
    delete: () => { eq: (col: string, value: string) => Promise<unknown> };
  };
};

async function rpc(page: Page, fn: string, args: Record<string, unknown>) {
  return page.evaluate(async ({ fn, args }) => {
    const mod = await import('/src/integrations/supabase/client.ts');
    const client = (mod as { supabase: { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> } }).supabase;
    const { data, error } = await client.rpc(fn, args);
    return { data, error: error?.message ?? null };
  }, { fn, args });
}

test('report, hide with a reason, appeal once, a second moderator restores', async ({ browser }) => {
  test.setTimeout(180_000);
  const marker = `Moderation e2e ${Date.now()}`;

  const author = await signedIn(browser, AUTHOR);
  const postId = await author.evaluate(async (content) => {
    const mod = await import('/src/integrations/supabase/client.ts');
    const client = (mod as unknown as { supabase: TestClient }).supabase;
    const { data: me } = await client.rpc('my_profile').single();
    const { data, error } = await client.from('posts').insert({ author_id: me?.id, content }).select('id').single();
    if (error || !data) throw new Error(error?.message ?? 'insert failed');
    return data.id;
  }, marker);

  // member reports it from the post menu
  const member = await signedIn(browser, MEMBER);
  await member.goto('/');
  const card = member.locator('[data-home-post-editing]').filter({ hasText: marker });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.getByTestId('home-post-overflow').click();
  await member.getByTestId('home-post-report').click();
  await member.getByTestId('report-reason-spam').click();
  await member.getByTestId('report-content-submit').click();
  await expect(member.getByTestId('report-content-dialog')).toBeHidden({ timeout: 10_000 });

  // moderator hides it from the queue
  const moderator = await signedIn(browser, MODERATOR);
  await moderator.goto('/moderation?tab=queue');
  const item = moderator.getByTestId(`moderation-queue-post-${postId}`);
  await expect(item).toBeVisible({ timeout: 30_000 });
  await item.getByTestId('moderation-hide').click();
  await expect(item).toBeHidden({ timeout: 15_000 });

  // others no longer see it; the author sees the reason and appeals
  await member.reload();
  await expect(member.getByText(marker)).toHaveCount(0, { timeout: 20_000 });
  await author.goto('/');
  await expect(author.locator('[data-home-post-editing]').filter({ hasText: marker }).getByTestId('moderation-hidden-notice')).toBeVisible({ timeout: 30_000 });
  await author.goto('/moderation');
  const own = author.locator('[data-testid^="moderation-action-"]').filter({ hasText: marker });
  await expect(own).toBeVisible({ timeout: 20_000 });
  await own.getByTestId('moderation-appeal-text').fill('This is a community event announcement, not an advert.');
  await own.getByTestId('moderation-appeal-send').click();
  await expect(own.getByTestId('moderation-appeal-send')).toHaveCount(0, { timeout: 15_000 });

  // the moderator who hid it cannot decide; a second moderator restores it
  const ownDecision = await rpc(moderator, 'moderation_actions_list', { p_scope: 'appeals' });
  const actionId = (ownDecision.data as Array<{ id: string; excerpt: string }>).find((row) => row.excerpt.includes(marker))?.id;
  expect(actionId).toBeTruthy();
  const refused = await rpc(moderator, 'moderation_decide_appeal', { p_action_id: actionId, p_overturn: true });
  expect(refused.error).toContain('appeal_needs_another_moderator');

  const second = await signedIn(browser, SECOND_MODERATOR);
  await second.goto('/moderation?tab=appeals');
  const appeal = second.getByTestId(`moderation-action-${actionId}`);
  await expect(appeal).toBeVisible({ timeout: 30_000 });
  await appeal.getByTestId('moderation-appeal-overturn').click();
  await expect(appeal).toBeHidden({ timeout: 15_000 });

  await member.reload();
  await expect(member.locator('[data-home-post-editing]').filter({ hasText: marker })).toBeVisible({ timeout: 30_000 });

  await author.evaluate(async (id) => {
    const mod = await import('/src/integrations/supabase/client.ts');
    await (mod as unknown as { supabase: TestClient }).supabase.from('posts').delete().eq('id', id);
  }, postId);
});

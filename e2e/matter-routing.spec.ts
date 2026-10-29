import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Launch gaps 1 and 2: a Matter for the Civizen community lands in Member Support's queue and opens from there for
 * whoever answers for Civizen (the founder office while the position is vacant); when an addressee misses the
 * deadline, the initiator passes the Matter to Civic Operations from the Matter page. Local stack only.
 */
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}

function raiseAsCitizen(title: string, addressee: 'civizen' | 'member'): string {
  const out = sql(`SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), 'role', 'authenticated')::text, false);
    SELECT public.create_matter(jsonb_build_object('title', '${title}', 'description', 'Fictional Matter for the routing spec.',
      'matter_type', 'issue', 'visibility', 'participants',
      'addressee_kind', '${addressee === 'civizen' ? 'organization' : 'person'}',
      'addressee_profile_id', ${addressee === 'civizen' ? 'public.resolve_civizen_org_profile()' : "(SELECT id FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1)"},
      'scope_kind', 'global', 'submit', true));`).split('\n');
  return out[out.length - 1];
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

test('community Matters reach Member Support, and an initiator escalates an unanswered Matter', async ({ browser }) => {
  test.setTimeout(150_000);
  const stamp = Date.now().toString(36);
  const ids: string[] = [];
  try {
    // 1. a Matter for the community is in Member Support's queue and opens from there
    ids.push(raiseAsCitizen(`Routing e2e ${stamp}: broken bench`, 'civizen'));
    sql(`UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'e2e reset' WHERE position_key IN ('member_support', 'civic_operations_lead') AND ended_at IS NULL`);
    const founder = await signedIn(browser, 'maturehumanity@test.civizen.local');
    await founder.goto('/organisation/member_support');
    const item = founder.getByTestId('position-queue').locator('[data-testid^="position-item-"]').filter({ hasText: stamp });
    await expect(item).toBeVisible({ timeout: 20_000 });
    await item.getByRole('link', { name: 'Open the Matter' }).click();
    await expect(founder).toHaveURL(new RegExp(`/contribute/matters/${ids[0]}$`));
    await expect(founder.getByRole('heading', { name: new RegExp(`broken bench`) })).toBeVisible({ timeout: 20_000 });

    // 2. a member misses the deadline; the initiator passes the Matter to Civic Operations
    ids.push(raiseAsCitizen(`Routing e2e ${stamp}: unanswered question`, 'member'));
    sql(`UPDATE public.matter_action_requirements SET due_at = now() - interval '1 day', reminder_at = now() - interval '2 days' WHERE matter_id = '${ids[1]}' AND status = 'pending'`);
    const citizen = await signedIn(browser, 'citizen@test.civizen.local');
    await citizen.goto(`/contribute/matters/${ids[1]}`);
    const card = citizen.getByTestId('matter-escalate');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.getByRole('textbox').fill(`Waiting since last week (${stamp}).`);
    await card.getByTestId('matter-escalate-send').click();
    await expect(citizen.getByText('Passed to Civic Operations. You will be told what happens next.').last()).toBeVisible();
    expect(sql(`SELECT count(*) FROM public.org_position_items WHERE position_key = 'civic_operations_lead' AND source_ref = '${ids[1]}' AND status = 'open'`)).toBe('1');
  } finally {
    for (const id of ids.filter(Boolean)) {
      sql(`DELETE FROM public.org_position_log WHERE item_id IN (SELECT id FROM public.org_position_items WHERE source_ref = '${id}')`);
      sql(`DELETE FROM public.org_position_items WHERE source_ref = '${id}'`);
      sql(`DELETE FROM public.matters WHERE id = '${id}'`);
    }
  }
});

import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Planet-wide public functions: a visitor sees that an unmapped place is answered by a Civizen liaison; a member
 * suggests the body that performs a function in a place, with an official source; the liaison (the founder office
 * while vacant) verifies it from the queue; the finder then names that body, and a Matter for that function there is
 * handed to the liaison to deliver. Bodies and places are fictional. Local stack only.
 */
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
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

test('a body is suggested, verified by the liaison, and then receives Matters for its function', async ({ browser, page }) => {
  test.setTimeout(150_000);
  const stamp = Date.now().toString(36);
  const bodyName = `E2E Planetary Water Body ${stamp}`;
  let matterId = '';
  const reset = () => {
    sql(`DELETE FROM public.org_position_log WHERE item_id IN (SELECT id FROM public.org_position_items WHERE title LIKE '%${stamp}%')`);
    sql(`DELETE FROM public.org_position_items WHERE title LIKE '%${stamp}%'`);
    if (matterId) sql(`DELETE FROM public.matters WHERE id = '${matterId}'`);
    sql(`DELETE FROM public.public_bodies WHERE name = '${bodyName}'`);
  };
  sql(`UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'e2e reset' WHERE position_key LIKE 'liaison_%' AND ended_at IS NULL`);
  try {
    // 1. a visitor: with nothing mapped, the planet-wide water function is answered by its liaison
    await page.goto('/organisation');
    await page.getByTestId('organisation-public-link').click();
    await expect(page).toHaveURL(/\/organisation\/public$/);
    await page.getByTestId('public-route-function').click();
    await page.getByRole('option', { name: 'Water Resources' }).click();
    await expect(page.getByTestId('public-route-result')).toContainText('Liaison: Planet and Resources');

    // 2. a member suggests a planetary body for water, with an official source
    const member = await signedIn(browser, 'member@test.civizen.local');
    await member.goto('/organisation/public');
    const form = member.getByTestId('propose-body');
    await form.getByLabel('Name of the body').fill(bodyName);
    await form.getByRole('checkbox', { name: 'Water Resources' }).check();
    await form.getByLabel('Address, link or number for requests').fill('contact@water.example.org');
    await form.getByLabel('Official source (https link)').fill('https://water.example.org/about');
    await form.getByTestId('propose-body-send').click();
    await expect(member.getByTestId('propose-body-sent')).toBeVisible();

    // 3. the liaison (the founder office while the position is vacant) verifies it from the queue
    const founder = await signedIn(browser, 'maturehumanity@test.civizen.local');
    await founder.goto('/organisation/liaison_planet');
    const item = founder.getByTestId('position-queue').locator('[data-testid^="position-item-"]').filter({ hasText: bodyName });
    await expect(item).toBeVisible({ timeout: 20_000 });
    await item.getByRole('textbox').fill('Opened the source: it is the body for water at planetary level.');
    await item.getByTestId('position-item-verify').click();
    await expect.poll(() => sql(`SELECT status FROM public.public_bodies WHERE name = '${bodyName}'`)).toBe('verified');

    // 4. the finder now names the body; a planetary Matter about water goes to the liaison to deliver
    await page.reload();
    await page.getByTestId('public-route-function').click();
    await page.getByRole('option', { name: 'Water Resources' }).click();
    await expect(page.getByTestId('public-route-result')).toContainText(bodyName);
    const out = sql(`SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'citizen' LIMIT 1), 'role', 'authenticated')::text, false);
      SELECT public.create_matter(jsonb_build_object('title', 'Water e2e ${stamp}', 'description', 'Fictional planetary water Matter.', 'matter_type', 'issue',
        'visibility', 'public', 'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(), 'scope_kind', 'global', 'submit', true));`).split('\n');
    matterId = out[out.length - 1];
    sql(`SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'citizen' LIMIT 1), 'role', 'authenticated')::text, false);
      SELECT public.set_matter_public_route('${matterId}', 'water');`);
    await founder.goto('/organisation/liaison_planet');
    await expect(founder.getByTestId('position-queue')).toContainText(`Deliver to ${bodyName}: Water e2e ${stamp}`, { timeout: 20_000 });
  } finally {
    reset();
  }
});

import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Organisation positions: a visitor's contact message reaches the position for its topic; while the position is
 * vacant the founder office answers for it; an appointed holder resolves it and steps down with a handover note,
 * which stays with the position. Uses the Member Support position and the `certified` fixture. Local stack only.
 */
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';
const POSITION = 'member_support';

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

test('a contact message reaches its position, and a holder hands over to the next', async ({ browser, page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString(36);
  const sender = `visitor-${stamp}@example.org`;
  const reset = () => {
    sql(`UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'e2e reset' WHERE position_key = '${POSITION}' AND ended_at IS NULL`);
    sql(`DELETE FROM public.org_position_log WHERE item_id IN (SELECT id FROM public.org_position_items WHERE metadata ->> 'email' = '${sender}')`);
    sql(`DELETE FROM public.org_position_items WHERE metadata ->> 'email' = '${sender}'`);
  };
  reset();
  try {
    // 1. a visitor reads the chart and writes through the contact form
    await page.goto('/organisation');
    await expect(page.getByTestId(`organisation-position-${POSITION}`)).toBeVisible({ timeout: 20_000 });
    await page.goto('/contact');
    const form = page.getByTestId('contact-form');
    await form.getByLabel('Your e-mail, for the reply').fill(sender);
    await form.getByLabel('Your message').fill(`How do I join a consultation? (${stamp})`);
    await form.getByTestId('contact-form-send').click();
    await expect(page.getByTestId('contact-form-sent')).toBeVisible();

    // 2. the position is vacant, so the founder office answers for it and sees the message
    const founder = await signedIn(browser, 'maturehumanity@test.civizen.local');
    await founder.goto(`/organisation/${POSITION}`);
    await expect(founder.getByTestId('position-vacant')).toBeVisible({ timeout: 20_000 });
    await expect(founder.getByTestId('position-queue')).toContainText(stamp);

    // 3. the founder appoints a holder
    const appoint = founder.getByTestId('position-appoint');
    await appoint.getByTestId('position-appoint-search').fill('certified');
    await appoint.getByRole('button', { name: /certified/i }).first().click();
    await appoint.getByTestId('position-appoint-submit').click();
    await expect(founder.getByText('Appointed. They have been notified.').last()).toBeVisible();

    // 4. the holder resolves the message, then steps down with a handover note
    const holder = await signedIn(browser, 'certified@test.civizen.local');
    await holder.goto(`/organisation/${POSITION}`);
    const item = holder.getByTestId('position-queue').locator('[data-testid^="position-item-"]').filter({ hasText: stamp });
    await item.getByTestId('position-item-claim').click();
    await item.getByRole('textbox').fill('Replied by e-mail with the link to the voting hub.');
    await item.getByTestId('position-item-done').click();
    await expect.poll(() => sql(`SELECT status FROM public.org_position_items WHERE metadata ->> 'email' = '${sender}'`)).toBe('done');
    await holder.getByRole('button', { name: 'Step down' }).click();
    const end = holder.getByTestId('position-end-term');
    await end.getByLabel('Reason').fill('Moving to Civic Education');
    await end.getByLabel('Handover note').fill(`Two answers in the canned replies; ask the lead about press questions (${stamp}).`);
    await end.getByRole('button', { name: 'End the term' }).click();
    await expect(holder.getByTestId('position-vacant')).toBeVisible({ timeout: 20_000 });

    // 5. whoever answers next reads the handover note
    await founder.reload();
    await expect(founder.getByTestId('position-handover-note').filter({ hasText: stamp })).toBeVisible({ timeout: 20_000 });
  } finally {
    reset();
  }
});

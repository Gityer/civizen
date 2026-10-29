import { expect, test } from '@playwright/test';

/**
 * Error reports reach staff: an uncaught error in a visitor's browser is sent to Civizen's collector
 * (record_client_error, no identifiers kept) and shows on the staff Participation page. Local stack only.
 */
const STAFF = 'maturehumanity@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';

test('an uncaught error in a visitor\'s browser shows on the staff error card', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const marker = `E2E collector probe ${Date.now().toString(36)}`;

  await page.goto('/matters');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
  const sent = page.waitForResponse((r) => r.url().includes('/rest/v1/rpc/record_client_error'));
  await page.evaluate((message) => {
    setTimeout(() => {
      throw new Error(message);
    }, 0);
  }, marker);
  expect((await sent).ok()).toBe(true);

  const staff = await (await browser.newContext()).newPage();
  await staff.goto('/login');
  await staff.getByPlaceholder(/janesmith/).fill(STAFF);
  await staff.getByPlaceholder('••••••••').fill(PASSWORD);
  await staff.getByRole('button', { name: 'Sign In' }).click();
  await staff.waitForURL((u) => !u.pathname.startsWith('/login'));
  await staff.goto('/settings/admin/participation');
  const card = staff.getByTestId('client-errors-card');
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.getByText(marker, { exact: true })).toBeVisible();
  await expect(card.getByText('/matters').first()).toBeVisible();
});

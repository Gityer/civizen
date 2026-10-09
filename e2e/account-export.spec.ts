import { expect, test, type Page } from '@playwright/test';

/**
 * Account lifecycle (Phase 3 step 3.B): a member downloads their data as one JSON file from Settings › Account, and
 * the file holds their profile. Runs against the local stack with the member fixture. Never production.
 */
const MEMBER = process.env.CIVIZEN_E2E_MEMBER_EMAIL || 'member@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';

async function assertLocalBackend(page: Page) {
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await assertLocalBackend(page);
  await page.getByPlaceholder(/janesmith/).fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test('a member downloads their data as one JSON file', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, MEMBER);
  await page.goto('/settings/account');
  await expect(page.getByTestId('account-export-card')).toBeVisible({ timeout: 20_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Download my data' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  const { readFileSync } = await import('node:fs');
  const body = JSON.parse(readFileSync(path!, 'utf8')) as Record<string, unknown>;
  const text = JSON.stringify(body);
  expect(text).toContain('member');
  expect(Object.keys(body).length).toBeGreaterThan(0);
});

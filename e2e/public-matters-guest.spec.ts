import { expect, test } from '@playwright/test';

/**
 * Public Matters for visitors (v2 step B3) and the return path (B1): a signed-out visitor opens the public list,
 * reads a Matter, signs in from it and lands on the same Matter in the member workspace. Local stack only.
 */
const MEMBER = process.env.CIVIZEN_E2E_MEMBER_EMAIL || 'member@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';

test('a visitor reads a public Matter and returns to it after signing in', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/matters');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);

  const first = page.locator('[data-testid^="public-matter-"]').first();
  await expect(first).toBeVisible({ timeout: 20_000 });
  const matterId = (await first.getAttribute('data-testid'))!.replace('public-matter-', '');
  await first.click();
  await expect(page).toHaveURL(new RegExp(`/matters/${matterId}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByTestId('public-matter-sign-in').click();
  await page.getByPlaceholder(/janesmith/).fill(MEMBER);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(new RegExp(`/contribute/matters/${matterId}`), { timeout: 30_000 });
});

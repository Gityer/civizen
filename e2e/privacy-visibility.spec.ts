import { expect, test, type Page } from '@playwright/test';

/**
 * Privacy (Phase 3): a member chooses what their public profile shows. Flipping "City" is saved on the server
 * (set_my_privacy_settings) and still flipped after a reload; the test flips it back so the fixture is left as found.
 * Runs against the local stack with the member fixture. Never production.
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

function citySwitch(page: Page) {
  return page.getByTestId('profile-visibility-card').getByRole('switch', { name: 'City' });
}

async function expectCity(page: Page, checked: boolean) {
  await expect(citySwitch(page)).toBeVisible({ timeout: 20_000 });
  await expect(citySwitch(page)).toHaveAttribute('aria-checked', String(checked));
}

test('a member flips what their public profile shows and the choice persists', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, MEMBER);
  await page.goto('/settings/privacy');
  await expect(page.getByTestId('profile-visibility-card')).toBeVisible({ timeout: 20_000 });
  await expect(citySwitch(page)).toBeVisible({ timeout: 20_000 });
  const initial = (await citySwitch(page).getAttribute('aria-checked')) === 'true';

  await citySwitch(page).click();
  await expectCity(page, !initial);
  await page.reload();
  await expectCity(page, !initial);

  await citySwitch(page).click();
  await expectCity(page, initial);
  await page.reload();
  await expectCity(page, initial);
});

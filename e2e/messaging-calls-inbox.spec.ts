import { expect, test, type Page } from '@playwright/test';

/**
 * Messaging opens for a member with the private call inbox wired: the calls tab offers direct calls
 * only, and the page produces no client errors while subscribing. Local stack only.
 */
const EMAIL = process.env.CIVIZEN_E2E_EMAIL || 'member@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';

async function assertLocalBackend(page: Page) {
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
}

test('messaging loads with direct-only calls and no client errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /ChatBar|call signal|realtime/i.test(message.text())) errors.push(message.text());
  });

  await page.goto('/login');
  await assertLocalBackend(page);
  await page.getByPlaceholder(/janesmith/).fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));

  await page.goto('/messaging');
  await expect(page).not.toHaveURL(/\/onboarding|\/login/);
  await page.waitForTimeout(2500);

  // Call scope selectors offer direct calls only; the roster-less group option is gone.
  const groupOptions = await page.locator('select option[value="group"]').count();
  expect(groupOptions).toBe(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

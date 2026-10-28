import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Settings › Reading: a member enlarges text, turns on high contrast and reduces motion; the choice applies at once,
 * survives a reload, and the page still has no serious accessibility violations. Local stack only.
 */
const MEMBER = process.env.CIVIZEN_E2E_MEMBER_EMAIL || 'member@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';

test('reading preferences apply at once and persist on this device', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/login');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
  await page.getByPlaceholder(/janesmith/).fill(MEMBER);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));

  await page.goto('/settings');
  const card = page.getByTestId('reading-preferences');
  await expect(card).toBeVisible({ timeout: 20_000 });
  const rootFontSize = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  const before = await rootFontSize();

  await card.getByTestId('reading-textSize').click();
  await page.getByRole('option', { name: 'Larger' }).click();
  await card.getByTestId('reading-contrast').click();
  await page.getByRole('option', { name: 'High' }).click();
  await card.getByTestId('reading-motion').click();
  await page.getByRole('option', { name: 'Reduce' }).click();

  expect(await rootFontSize()).toBeCloseTo(before * 1.25, 0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'larger');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');

  await expect(page.getByTestId('reading-preferences')).toBeVisible({ timeout: 20_000 });
  // reduced motion still fades opacity in (Framer Motion drops only movement): measure colours once it has settled
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
});

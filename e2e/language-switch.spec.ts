import { expect, test } from '@playwright/test';

/**
 * Language (Phase 8): a visitor switches the interface language from the public language selector; the choice is
 * applied at once (document language, selector label) and remembered on the device across a reload. Runs against
 * the local stack. Never production.
 */
test('a visitor switches to Armenian and the choice survives a reload', async ({ page }) => {
  await page.goto('/market');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);

  const trigger = page.locator('button[aria-label^="Language:"]');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  const armenian = page.getByRole('option', { name: /հայերեն/i });
  await expect(armenian).toBeVisible();
  await armenian.click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'hy', { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /Հայերեն/ })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('civizen-language'))).toBe('hy');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hy', { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /Հայերեն/ })).toBeVisible();

  // public documents with a hand-written text open in the chosen language, with a note that English stays the reference
  await page.goto('/about/mission');
  await expect(page.getByTestId('institutional-doc-translation-note')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Առաքելության և անկախության խարտիա').first()).toBeVisible();
});

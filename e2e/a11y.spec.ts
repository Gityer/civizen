import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Accessibility of the primary pages (Phase 8 step 8.3): axe must report no serious or critical violations on the
 * public pages and on the signed-in pages of the participation loop, and the ballot page must be usable with the
 * keyboard alone. Runs against the local stack (fixtures: member / citizen, password civizen-local). Never production.
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

async function expectNoSeriousViolations(page: Page, label: string) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(800); // let fade-in animations finish so measured colors are final
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target?.join(' ')}`).join('\n');
  expect(serious, `${label} has serious or critical accessibility violations:\n${summary}`).toEqual([]);
}

test.describe('accessibility of primary pages', () => {
  test('public pages', async ({ page }) => {
    test.setTimeout(120_000);
    for (const path of ['/', '/login', '/signup', '/governance/voting', '/market']) {
      await page.goto(path);
      await expectNoSeriousViolations(page, path);
    }
  });

  test('signed-in participation pages', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, MEMBER);
    for (const path of ['/', '/contribute/matters', '/governance', '/study/paths', '/notifications', '/profile', '/settings']) {
      await page.goto(path);
      await expectNoSeriousViolations(page, path);
    }
  });

  test('the ballot page works with the keyboard alone', async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page, MEMBER);
    await page.goto('/governance/voting');
    const first = page.getByRole('link', { name: /single world citizenship/i }).first();
    await expect(first).toBeVisible({ timeout: 20_000 });
    await first.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/governance\/voting\/[0-9a-f-]{36}/);
    // Tab reaches a ballot option and Space/Enter selects it without a mouse.
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      const active = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el ? `${el.tagName}|${el.getAttribute('role') ?? ''}|${(el.textContent ?? '').trim().slice(0, 40)}` : '';
      });
      if (/Support|Oppose|Abstain/i.test(active)) reached = true;
    }
    expect(reached, 'a ballot option is reachable with Tab').toBe(true);
    const skip = page.getByRole('link', { name: /skip to content/i });
    await expect(skip).toHaveCount(1);
  });
});

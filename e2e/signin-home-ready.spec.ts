import { expect, test } from '@playwright/test';

/**
 * Perf / regression guard: after local sign-in, Home must become usable quickly.
 * Runs only against the local Vite + local Supabase stack (never production).
 *
 *   CIVIZEN_E2E_BASE_URL=http://localhost:8082 npx playwright test e2e/signin-home-ready.spec.ts
 */
const email = process.env.CIVIZEN_E2E_MEMBER_EMAIL || 'member@test.civizen.local';
const password = process.env.CIVIZEN_E2E_MEMBER_PASSWORD || 'civizen-local';
const budgetMs = Number(process.env.CIVIZEN_E2E_SIGNIN_BUDGET_MS || '3000');

test.describe('sign-in to usable Home', () => {
  test('reaches Home without Loading within the budget', async ({ page }) => {
    const base = process.env.CIVIZEN_E2E_BASE_URL || 'http://127.0.0.1:8082';
    test.skip(!/localhost|127\.0\.0\.1/.test(base), 'local stack only');

    await page.goto(base + '/login', { waitUntil: 'networkidle' });
    await page.getByLabel(/email, username, or phone/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);

    const t0 = Date.now();
    await page.getByRole('button', { name: /^sign in$/i }).click();

    let readyAt: number | null = null;
    for (let i = 0; i < 120; i += 1) {
      await page.waitForTimeout(100);
      const url = page.url();
      const loadingCount = await page.locator('text=/^loading$/i').count();
      const busy = await page.locator('[aria-busy="true"]').count();
      if (!url.includes('/login') && loadingCount === 0 && busy === 0) {
        readyAt = Date.now() - t0;
        break;
      }
    }

    expect(readyAt, 'Home never left the Loading state').not.toBeNull();
    expect(readyAt!, `sign-in to usable Home exceeded ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs);
  });
});

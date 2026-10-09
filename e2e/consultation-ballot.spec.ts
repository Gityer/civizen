import { expect, test, type Page } from '@playwright/test';

/**
 * The public consultation flow a member actually uses: sign in, open the live consultation,
 * cast, receive a receipt, check it is counted, withdraw. Decision D2: only a verified member's
 * ballot is counted (fixture `citizen`); an unverified member (fixture `member`) casts an
 * advisory ballot and is told so.
 *
 * Needs the local stack with production-derived data (import-dump.sh): every account signs in
 * with the local password. Override with CIVIZEN_E2E_EMAIL / CIVIZEN_E2E_PASSWORD.
 */
const EMAIL = process.env.CIVIZEN_E2E_EMAIL || 'citizen@test.civizen.local';
const UNVERIFIED_EMAIL = process.env.CIVIZEN_E2E_UNVERIFIED_EMAIL || 'member@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';

async function assertLocalBackend(page: Page) {
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
}

async function signIn(page: Page, email = EMAIL) {
  await page.goto('/login');
  await assertLocalBackend(page);
  await page.getByPlaceholder(/janesmith/).fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function openLiveBallot(page: Page) {
  await page.goto('/governance/workspace');
  await page.getByRole('button', { name: /Open ballot|Review my ballot/ }).first().click();
  await page.waitForURL(/\/governance\/voting\//);
  const vote = page.getByTestId('consultation-vote');
  await expect(vote).toBeVisible();
  if (await vote.getByRole('button', { name: 'Withdraw ballot' }).isVisible()) {
    await vote.getByRole('button', { name: 'Withdraw ballot' }).click();
    await expect(page.getByTestId('consultation-receipt')).toHaveCount(0);
  }
  return vote;
}

test('guest sees the observer console with real counts', async ({ page }) => {
  await page.goto('/governance/voting');
  await page.getByRole('link', { name: /A Single World Citizenship/ }).first().click();
  await page.getByRole('link', { name: 'Observe' }).click();
  await expect(page.getByRole('heading', { name: 'Observer console' })).toBeVisible();
  await expect(page.getByText('Countable ballots', { exact: false })).toBeVisible();
  await expect(page.getByText(/50\.0%/)).toHaveCount(0);
});

test('verified member casts, gets a receipt, checks it, and withdraws', async ({ page }) => {
  await signIn(page);
  const vote = await openLiveBallot(page);
  await expect(page.getByTestId('consultation-advisory')).toHaveCount(0);

  await vote.getByRole('button', { name: 'Support', exact: true }).click();
  const receipt = page.getByTestId('consultation-receipt');
  await expect(receipt).toBeVisible();
  await expect(receipt.locator('.font-mono')).toHaveText(/^[0-9A-F]{4}(-[0-9A-F]{4}){5}$/);

  await receipt.getByRole('button', { name: /Check that my receipt is counted/ }).click();
  await expect(page.getByText('Your receipt is on the list of counted ballots.')).toBeVisible();

  await vote.getByRole('button', { name: 'Withdraw ballot' }).click();
  await expect(page.getByTestId('consultation-receipt')).toHaveCount(0);
  await expect(page.getByText('No countable ballots yet.')).toBeVisible();
});

test('unverified member casts an advisory ballot and is told how to make it count', async ({ page }) => {
  await signIn(page, UNVERIFIED_EMAIL);
  const vote = await openLiveBallot(page);
  await expect(page.getByTestId('consultation-advisory')).toBeVisible();

  await vote.getByRole('button', { name: 'Support', exact: true }).click();
  const receipt = page.getByTestId('consultation-receipt');
  await expect(receipt).toBeVisible();
  await expect(receipt.getByText('Your advisory receipt')).toBeVisible();
  await expect(receipt.getByRole('button', { name: /Check that my receipt is counted/ })).toHaveCount(0);
  await expect(page.getByText('No countable ballots yet.')).toBeVisible();
  await expect(page.getByText(/1 advisory from accounts not yet verified/)).toBeVisible();

  await vote.getByRole('button', { name: 'Withdraw ballot' }).click();
  await expect(page.getByTestId('consultation-receipt')).toHaveCount(0);
});

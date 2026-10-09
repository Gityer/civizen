import { expect, test, type Page } from '@playwright/test';

/**
 * Messaging key backup (Phase 7 step 7.1): a member creates a recovery code, loses the device key (site data cleared),
 * and restores the same keys with the code. Runs against the local stack with the member fixture. Never production.
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

test('a member backs up messaging keys with a recovery code and restores them after losing the device key', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, MEMBER);
  await page.goto('/settings/messaging-security');
  const card = page.getByTestId('messaging-key-backup-card');
  await expect(card).toBeVisible({ timeout: 20_000 });

  // make sure this device holds a key
  const localOff = page.getByText('This device does not have a saved secret key for you yet.');
  if (await localOff.isVisible()) {
    await page.getByRole('button', { name: 'Create or repair keys on this device' }).click();
    await expect(page.getByText('This device has a saved secret key for you.')).toBeVisible({ timeout: 20_000 });
  }

  // create the recovery code
  await card.getByRole('button', { name: /Create (a new )?recovery code/ }).click();
  const codeBox = page.getByTestId('messaging-recovery-code');
  await expect(codeBox).toBeVisible({ timeout: 20_000 });
  const code = (await codeBox.locator('p.font-mono').innerText()).trim();
  expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
  await expect(page.getByTestId('messaging-key-backup-status')).toContainText('Backup saved on');
  await card.getByRole('button', { name: 'I have saved it' }).click();

  // lose the device key (as clearing site data would) and reload
  await page.evaluate(() => new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('civizen-messaging-e2ee');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  }));
  await page.reload();
  await expect(page.getByText('This device does not have a saved secret key for you yet.')).toBeVisible({ timeout: 20_000 });

  // restore with the code
  const restore = page.getByTestId('messaging-key-restore');
  await expect(restore).toBeVisible({ timeout: 20_000 });
  await restore.getByRole('textbox').fill(code.toLowerCase());
  await restore.getByRole('button', { name: 'Restore keys' }).click();
  await expect(page.getByText('This device has a saved secret key for you.')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('messaging-key-restore')).toHaveCount(0);

  // a wrong code never restores: prove it on a fresh loss of the key
  await page.evaluate(() => new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('civizen-messaging-e2ee');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  }));
  await page.reload();
  const restoreAgain = page.getByTestId('messaging-key-restore');
  await expect(restoreAgain).toBeVisible({ timeout: 20_000 });
  await restoreAgain.getByRole('textbox').fill('AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA');
  await restoreAgain.getByRole('button', { name: 'Restore keys' }).click();
  await expect(page.getByText('That code does not open the backup. Check it and try again.')).toBeVisible({ timeout: 20_000 });

  // restore properly and remove the backup so the fixture is left as found
  await restoreAgain.getByRole('textbox').fill(code);
  await restoreAgain.getByRole('button', { name: 'Restore keys' }).click();
  await expect(page.getByText('This device has a saved secret key for you.')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('messaging-key-backup-card').getByRole('button', { name: 'Delete backup' }).click();
  await expect(page.getByTestId('messaging-key-backup-status')).toContainText('No backup yet.', { timeout: 20_000 });
});

import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

/**
 * The participation loop end to end (Phase 2 step 2.9): a verified member raises a Matter for the
 * community, drafts a proposal from it, another member supports it, the author publishes and votes,
 * the lifecycle tick closes the consultation, the outcome returns to the Matter, and the supporter
 * finds the notifications.
 *
 * Needs the local stack with production-derived fixtures (import-dump.sh) and the local database
 * container (the close tick is run through psql). Never points at production.
 */
const AUTHOR = process.env.CIVIZEN_E2E_EMAIL || 'citizen@test.civizen.local';
const SUPPORTER = process.env.CIVIZEN_E2E_SUPPORTER_EMAIL || 'verified_member@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}

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

async function signOut(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/onboarding');
}

test('a Matter becomes a consultation, is voted on, closes, and its outcome returns to the Matter', async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString(36);
  const title = `Loop e2e ${stamp}: shade at bus stops`;

  // 1. the author raises a Matter for the community
  await signIn(page, AUTHOR);
  await page.goto('/contribute/matters/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill('End-to-end check of the participation loop.');
  await page.getByTestId('matter-recipient-community').click();
  // Phase 4.1: the form asks how the problem is handled; community discussion is the default
  const handling = page.getByTestId('matter-handling');
  await expect(handling).toBeVisible();
  await expect(handling.getByRole('radio', { name: 'Community discussion' })).toHaveAttribute('aria-checked', 'true');
  await expect(handling.getByRole('radio', { name: 'AI council' })).toBeVisible();
  await expect(handling.getByRole('radio', { name: 'Community project' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Intended party' }).getByText('Civizen', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Submit Matter' }).click();
  await page.waitForURL(/\/contribute\/matters\/[0-9a-f-]{36}$/);
  const matterUrl = page.url();
  await expect(page.getByText(title)).toBeVisible();

  // 2. a proposal is drafted from it and opened for support with a threshold of one
  await page.getByRole('button', { name: 'Create voting proposal' }).click();
  await page.waitForURL(/\/governance\/voting\/proposals\//);
  const proposalUrl = page.url();
  await page.getByLabel('Supporters needed').fill('1');
  await page.getByRole('button', { name: 'Open for support' }).click();
  await expect(page.getByTestId('proposal-support-author-note')).toBeVisible();

  // 3. another member supports it
  await signOut(page);
  await signIn(page, SUPPORTER);
  await page.goto(proposalUrl);
  await page.getByRole('button', { name: 'Support this proposal' }).click();
  await expect(page.getByText('Threshold reached')).toBeVisible();

  // 4. the author publishes and votes; the Matter is now public
  await signOut(page);
  await signIn(page, AUTHOR);
  await page.goto(proposalUrl);
  await page.getByRole('button', { name: 'Publish ballot' }).click();
  await page.waitForURL(/\/governance\/voting\/[0-9a-f-]{36}$/);
  const electionId = page.url().split('/').pop() ?? '';
  const vote = page.getByTestId('consultation-vote');
  await expect(vote).toBeVisible();
  await vote.getByRole('button', { name: 'Support', exact: true }).click();
  await expect(page.getByTestId('consultation-receipt')).toBeVisible();
  const matterId = matterUrl.split('/').pop() ?? '';
  expect(sql(`select visibility from public.matters where id = '${matterId}'`)).toBe('public');
  expect(sql(`select count(*) from public.matter_events where matter_id = '${matterId}' and event_type = 'made_public_for_consultation'`)).toBe('1');

  // 5. the window ends and the hourly tick closes the consultation
  sql(`update public.civic_elections set voting_opens_at = now() - interval '2 minutes', voting_closes_at = now() - interval '1 minute' where id = '${electionId}'`);
  sql('select public.civic_close_due_elections()');
  expect(sql(`select status from public.civic_elections where id = '${electionId}'`)).toBe('closed');

  // 6. the outcome is on the Matter
  await page.goto(matterUrl);
  await expect(page.getByTestId('matter-consultation-outcome')).toContainText(/Passed/);
  await expect(page.getByText(`Consultation result: ${title}`)).toBeVisible();

  // 7. the supporter was told about the publication, and the author about the result
  await signOut(page);
  await signIn(page, SUPPORTER);
  await page.goto('/notifications');
  await expect(page.getByText(`Consultation published: ${title}`)).toBeVisible();
  await signOut(page);
  await signIn(page, AUTHOR);
  await page.goto('/notifications');
  await expect(page.getByText(`Result published: ${title}`)).toBeVisible();
});

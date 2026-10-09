import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

/**
 * Knowledge proposals end to end (Phase 4 step 4.3): a member who can read a shared knowledge space proposes a
 * resource and reports a gap; both land as drafts owned by the space's publisher, the proposer is recorded, and the
 * publisher is notified. Runs against the local stack with the fixtures (member, maturehumanity's shared space).
 */
const MEMBER = process.env.CIVIZEN_E2E_MEMBER_EMAIL || 'member@test.civizen.local';
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

test('a member proposes a resource and reports a gap in a shared knowledge space', async ({ page }) => {
  test.setTimeout(120_000);
  const spaceId = sql("SELECT id FROM public.knowledge_spaces WHERE status = 'shared' ORDER BY created_at LIMIT 1");
  expect(spaceId).toMatch(/^[0-9a-f-]{36}$/);
  const memberId = sql("SELECT id FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1");
  const stamp = Date.now().toString(36);
  const resourceTitle = `E2E proposed guide ${stamp}`;
  const gapTitle = `E2E gap ${stamp}`;

  await signIn(page, MEMBER);
  await page.goto(`/contribute/knowledge/${spaceId}`);
  await expect(page.getByTestId('knowledge-proposal-actions')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Propose a resource' }).click();
  await page.getByLabel('Title').fill(resourceTitle);
  await page.getByLabel('Why it helps (a few lines)').fill('A practical guide neighbours asked for during the e2e run.');
  await page.getByLabel('Link (optional)').fill('https://example.org/guide');
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByText('Proposal sent to the coordinators.')).toBeVisible();

  await page.getByRole('button', { name: 'Report a gap' }).click();
  await page.getByLabel('Title').fill(gapTitle);
  await page.getByLabel('What is missing or still weak').fill('Nothing covers winter heating help.');
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByText('Gap reported to the coordinators.')).toBeVisible();

  expect(sql(`SELECT status || '|' || (proposed_by_profile_id = '${memberId}')::text FROM public.knowledge_resources WHERE title = '${resourceTitle}'`)).toBe('draft|true');
  expect(sql(`SELECT count(*) FROM public.knowledge_gaps WHERE title = '${gapTitle}' AND proposed_by_profile_id = '${memberId}'`)).toBe('1');
  const resourceId = sql(`SELECT id FROM public.knowledge_resources WHERE title = '${resourceTitle}'`);
  const gapId = sql(`SELECT id FROM public.knowledge_gaps WHERE title = '${gapTitle}'`);
  expect(Number(sql(`SELECT count(*) FROM public.user_notifications WHERE metadata->>'resource_id' = '${resourceId}' OR metadata->>'gap_id' = '${gapId}'`))).toBeGreaterThanOrEqual(2);

  sql(`DELETE FROM public.user_notifications WHERE metadata->>'resource_id' = '${resourceId}' OR metadata->>'gap_id' = '${gapId}'`);
  sql(`DELETE FROM public.knowledge_resources WHERE title = '${resourceTitle}'`);
  sql(`DELETE FROM public.knowledge_gaps WHERE title = '${gapTitle}'`);
});

import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

/**
 * Study learning paths end to end (Phase 5 steps 5.1–5.2): a member opens the paths, reads a path lesson by
 * lesson, every completion is saved, the path completes at the last lesson, and the completed path shows on
 * the member's public profile for another signed-in member.
 *
 * Needs the local stack with fixtures (member, citizen) and the local database container. Never points at
 * production.
 */
const MEMBER = process.env.CIVIZEN_E2E_MEMBER_EMAIL || 'member@test.civizen.local';
const VIEWER = process.env.CIVIZEN_E2E_EMAIL || 'citizen@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';
const PATH_ID = 'charter-and-pathway';

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}

function resetPathForMember(profileId: string) {
  sql(`DELETE FROM public.study_progress WHERE profile_id = '${profileId}' AND document_key LIKE 'path:${PATH_ID}:%'`);
  sql(`DELETE FROM public.study_certifications WHERE profile_id = '${profileId}' AND certification_key = 'path:${PATH_ID}'`);
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

test('a member completes a learning path lesson by lesson and the completion shows on the public profile', async ({ page }) => {
  test.setTimeout(120_000);
  const memberProfileId = sql("SELECT id FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1");
  expect(memberProfileId).toMatch(/^[0-9a-f-]{36}$/);
  resetPathForMember(memberProfileId);

  await signIn(page, MEMBER);
  await page.goto('/study/paths');
  await expect(page.getByTestId('study-learning-paths')).toBeVisible();
  await expect(page.getByTestId('study-path-charter-and-pathway')).toBeVisible();
  await expect(page.getByTestId('study-path-how-civizen-decides')).toBeVisible();
  await expect(page.getByTestId('study-path-rights-and-duties')).toBeVisible();

  await page.getByTestId(`study-path-${PATH_ID}`).getByRole('link', { name: 'Start' }).click();
  await page.waitForURL(new RegExp(`/study/paths/${PATH_ID}/mission$`));
  await expect(page.getByText('not a government')).toBeVisible({ timeout: 15_000 }).catch(() => undefined);

  // five lessons: four "Completed, next lesson", then the final "Mark as completed"
  for (let i = 0; i < 4; i += 1) {
    await page.getByTestId('study-lesson-complete').click();
    await expect(page.getByText(`${i + 1} of 5 lessons completed`)).toBeVisible();
  }
  await page.getByTestId('study-lesson-complete').click();
  await expect(page.getByText('You completed this path. It now shows on your profile.')).toBeVisible();
  await expect(page.getByText('5 of 5 lessons completed')).toBeVisible();

  expect(sql(`SELECT status FROM public.study_certifications WHERE profile_id = '${memberProfileId}' AND certification_key = 'path:${PATH_ID}'`)).toBe('earned');
  expect(sql(`SELECT count(*) FROM public.study_progress WHERE profile_id = '${memberProfileId}' AND document_key LIKE 'path:${PATH_ID}:%' AND progress_percent = 100`)).toBe('5');

  await page.goto('/study/paths');
  await expect(page.getByTestId(`study-path-${PATH_ID}`).getByText('Completed', { exact: true })).toBeVisible();

  // another member sees the completion on the public profile
  await signOut(page);
  await signIn(page, VIEWER);
  await page.goto(`/user/${memberProfileId}`);
  await expect(page.getByTestId('study-completion-badges')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('study-completion-badges').getByText('The Civizen Charter and pathway')).toBeVisible();

  resetPathForMember(memberProfileId);
});

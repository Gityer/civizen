import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * After routing: the liaison (the founder office while vacant) records delivery to a mapped body on the Matter page,
 * the initiator sees when the answer is due, and the answer is recorded; an official requests an office for the body
 * and the liaison approves it from the queue; the place's coverage shows the body. Fictional bodies. Local stack only.
 */
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}
const last = (out: string) => out.split('\n').filter((line) => !line.startsWith('INSERT ')).pop() ?? '';

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
  await page.getByPlaceholder(/janesmith/).fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return page;
}

test('delivery, answer, an official\'s office and coverage for a mapped body', async ({ browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString(36);
  const bodyName = `E2E Lighting Office ${stamp}`;
  const asCitizen = "SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'citizen' LIMIT 1), 'role', 'authenticated')::text, false);";
  let bodyId = '';
  let matterId = '';
  sql(`UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'e2e reset' WHERE (position_key LIKE 'liaison_%' OR position_key LIKE 'office_%') AND ended_at IS NULL`);
  try {
    bodyId = last(sql(`INSERT INTO public.public_bodies (name, kind, scope_kind, scope_country_code, scope_region_code, scope_locality_code, channel_kind, channel_address,
        answer_deadline_days, source_url, status) VALUES ('${bodyName}', 'local_government', 'locality', 'EZ', 'E1', 'Etown', 'web_form', 'https://lights.example.org/form', 15,
        'https://etown.example.org/departments', 'verified') RETURNING id`));
    sql(`INSERT INTO public.public_body_functions (body_id, function_key) VALUES ('${bodyId}', 'street_lighting')`);
    matterId = last(sql(`${asCitizen} SELECT public.create_matter(jsonb_build_object('title', 'Delivery e2e ${stamp}', 'description', 'Fictional dark street.',
        'matter_type', 'issue', 'visibility', 'public', 'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(),
        'scope_kind', 'locality', 'scope_country_code', 'EZ', 'scope_region_code', 'E1', 'scope_locality_code', 'Etown', 'submit', true));`));
    sql(`${asCitizen} SELECT public.set_matter_public_route('${matterId}', 'street_lighting');`);

    // 1. the liaison records delivery on the Matter page; the answer is due in the body's 15 days
    const founder = await signedIn(browser, 'maturehumanity@test.civizen.local');
    await founder.goto(`/contribute/matters/${matterId}`);
    const card = founder.getByTestId('matter-public-status');
    await expect(card).toContainText(bodyName, { timeout: 20_000 });
    await card.getByLabel("The body's reference number (optional)").fill(`REQ-${stamp}`);
    await card.getByTestId('public-delivery-record').click();
    await expect(card.getByTestId('public-delivery')).toContainText(`reference REQ-${stamp}`);

    // 2. the initiator sees the delivery and the due date, without handling it
    const citizen = await signedIn(browser, 'citizen@test.civizen.local');
    await citizen.goto(`/contribute/matters/${matterId}`);
    await expect(citizen.getByTestId('public-delivery')).toContainText('Answer due by', { timeout: 20_000 });
    await expect(citizen.getByTestId('public-delivery-actions')).toHaveCount(0);

    // 3. the answer is recorded and shown on the Matter
    await founder.getByTestId('public-answer-form').getByRole('textbox').fill('The lamp is fixed.');
    await founder.getByTestId('public-answer-send').click();
    await expect(founder.getByTestId('public-delivery')).toContainText('The lamp is fixed.');

    // 4. an official requests an office for the body; the liaison approves it from the queue
    const official = await signedIn(browser, 'certified@test.civizen.local');
    await official.goto(`/organisation/public/body/${bodyId}`);
    const request = official.getByTestId('office-request');
    await request.getByLabel('Your office (for example: Citizen requests desk)').fill('Lighting requests desk');
    await request.getByLabel('Evidence: an https link to an official page that lists you').fill('https://etown.example.org/staff');
    await request.getByTestId('office-request-send').click();
    await expect(official.getByTestId('office-request-sent')).toBeVisible();
    await founder.goto('/organisation/liaison_housing_community');
    const item = founder.getByTestId('position-queue').locator('[data-testid^="position-item-"]').filter({ hasText: bodyName });
    await item.getByRole('textbox').fill('The staff page lists this member.');
    await item.getByTestId('position-item-approve-office').click();
    await expect.poll(() => sql(`SELECT count(*) FROM public.org_positions p JOIN public.org_position_terms t ON t.position_key = p.position_key AND t.ended_at IS NULL
      WHERE p.public_body_id = '${bodyId}'`)).toBe('1');

    // 5. the body's page lists the official's office
    await official.goto(`/organisation/public/body/${bodyId}`);
    await expect(official.getByTestId('public-body')).toContainText('Lighting requests desk');
  } finally {
    if (matterId) {
      sql(`DELETE FROM public.org_position_log WHERE item_id IN (SELECT id FROM public.org_position_items WHERE source_ref = '${matterId}')`);
      sql(`DELETE FROM public.org_position_items WHERE source_ref = '${matterId}'`);
      sql(`DELETE FROM public.matters WHERE id = '${matterId}'`);
    }
    if (bodyId) {
      sql(`DELETE FROM public.org_position_log WHERE item_id IN (SELECT id FROM public.org_position_items WHERE source_ref = '${bodyId}')`);
      sql(`DELETE FROM public.org_position_items WHERE source_ref = '${bodyId}'`);
      sql(`DELETE FROM public.org_position_log WHERE position_key IN (SELECT position_key FROM public.org_positions WHERE public_body_id = '${bodyId}')`);
      sql(`DELETE FROM public.org_position_terms WHERE position_key IN (SELECT position_key FROM public.org_positions WHERE public_body_id = '${bodyId}')`);
      sql(`DELETE FROM public.org_positions WHERE public_body_id = '${bodyId}'`);
      sql(`DELETE FROM public.public_bodies WHERE id = '${bodyId}'`);
    }
  }
});

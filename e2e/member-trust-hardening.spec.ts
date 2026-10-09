import { expect, test, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Phase 0 trust hardening, seen from a real member session in the browser: ordinary profile edits
 * still work, while the writes that used to allow self-promotion, self-verification, forged
 * eligibility and public Story defacement are refused by the database.
 *
 * Needs the local stack (import-dump.sh fixtures); every account signs in with the local password.
 */
const EMAIL = process.env.CIVIZEN_E2E_EMAIL || 'member@test.civizen.local';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';

type WriteOutcome = { code: string | null; message: string | null };
type ProbeResult = {
  profileId: string | null;
  bio: WriteOutcome;
  role: WriteOutcome;
  verified: WriteOutcome;
  eligibility: WriteOutcome;
  snapshot: WriteOutcome;
  storyRpc: WriteOutcome;
  approvedCase: WriteOutcome;
};

async function assertLocalBackend(page: Page) {
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
}

async function signIn(page: Page) {
  await page.goto('/login');
  await assertLocalBackend(page);
  await page.getByPlaceholder(/janesmith/).fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test('a member keeps ordinary edits and loses every privileged write', async ({ page }) => {
  await signIn(page);

  const result: ProbeResult = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    // Untyped client on purpose: the probe only needs each write's error shape.
    const supabase = (mod as { supabase: SupabaseClient }).supabase;
    const outcome = (error: { code?: string; message?: string } | null): WriteOutcome => ({
      code: error?.code ?? null,
      message: error?.message ?? null,
    });

    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, bio')
      .eq('user_id', userData.user?.id)
      .single();
    const profileId: string | null = profile?.id ?? null;

    const bio = await supabase.from('profiles').update({ bio: profile?.bio ?? null }).eq('id', profileId);
    const role = await supabase.from('profiles').update({ role: 'admin' }).eq('id', profileId);
    const verified = await supabase.from('profiles').update({ is_verified: true }).eq('id', profileId);
    const eligibility = await supabase.from('profiles').update({ is_governance_eligible: true }).eq('id', profileId);
    const snapshot = await supabase.from('governance_eligibility_snapshots').upsert(
      {
        profile_id: profileId,
        citizenship_status: 'registered_member',
        is_verified: true,
        is_active_citizen: true,
        civizen_score: 100,
        governance_score: 100,
        influence_weight: 1,
        eligible: true,
        reason_codes: [],
        calculated_at: new Date().toISOString(),
        calculation_version: 'e2e-forged',
        source: 'client_projection',
      },
      { onConflict: 'profile_id' },
    );
    const storyRpc = await supabase.rpc('ingest_development_story', {
      p_source_story_key: 'e2e-forged-story',
      p_title: 'Forged',
      p_original_instruction: 'forged',
      p_rephrased_description: 'forged',
      p_section: 'Platform',
      p_area: 'General',
      p_created_features: [],
      p_expected_behavior: 'none',
      p_source: 'e2e',
      p_requested_at: new Date().toISOString(),
      p_story_kind: 'development',
      p_status: 'published',
      p_visibility: 'public',
    });
    const approvedCase = await supabase.from('identity_verification_cases').insert({
      profile_id: profileId,
      status: 'approved',
      verification_method: 'manual_id_selfie',
    });

    return {
      profileId,
      bio: outcome(bio.error),
      role: outcome(role.error),
      verified: outcome(verified.error),
      eligibility: outcome(eligibility.error),
      snapshot: outcome(snapshot.error),
      storyRpc: outcome(storyRpc.error),
      approvedCase: outcome(approvedCase.error),
    };
  });

  expect(result.profileId).not.toBeNull();
  expect(result.bio.code, 'ordinary profile edit must still work').toBeNull();
  for (const [name, write] of Object.entries({
    role: result.role,
    verified: result.verified,
    eligibility: result.eligibility,
    snapshot: result.snapshot,
    storyRpc: result.storyRpc,
    approvedCase: result.approvedCase,
  })) {
    expect(write.code, `${name} must be refused by the database (${write.message ?? 'no message'})`).toBe('42501');
  }

  // The member pages that read these tables still render after the hardening.
  await page.goto('/settings/profile');
  await expect(page).not.toHaveURL(/\/onboarding|\/login/);
  await expect(page.locator('main, [role="main"], body')).toContainText(/.+/);
  await page.goto('/governance/workspace');
  await expect(page).not.toHaveURL(/\/onboarding|\/login/);
});

#!/usr/bin/env node
/**
 * Verifies consultation public participation UI (guest + signed-in @390px).
 * Does not publish United World.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-consultation-participation';
mkdirSync(outDir, { recursive: true });

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) => src.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'))?.[1]?.trim();
  const getLocal = (key) =>
    local.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
  return {
    url: get(root, 'VITE_SUPABASE_URL'),
    anon: get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    email: getLocal('TEST_USER_ROLE_MEMBER_EMAIL'),
    password: getLocal('TEST_USER_ROLE_MEMBER_PASSWORD'),
  };
}

function applySql(sql) {
  const file = '/tmp/civizen-consultation-participation.sql';
  writeFileSync(file, sql);
  const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'SQL failed');
  return result.stdout || '';
}

async function acceptTermsIfPresent(page) {
  const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
  if (await acceptTerms.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptTerms.click();
    await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
  await acceptTermsIfPresent(page);
}

const env = loadEnv();
if (!env.url || !env.anon || !env.email || !env.password) {
  throw new Error('Missing credentials');
}

const client = createClient(env.url, env.anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: authError } = await client.auth.signInWithPassword({
  email: env.email,
  password: env.password,
});
if (authError) throw new Error(authError.message);
const { data: me } = await client.auth.getUser();
const { data: profile } = await client.from('profiles').select('id').eq('user_id', me.user.id).single();
const { data: civizenId } = await client.rpc('resolve_civizen_org_profile');
if (!profile?.id || !civizenId) throw new Error('profile/civizen missing');

const { data: matterId, error: mErr } = await client.rpc('create_matter', {
  payload: {
    title: 'Participation verify temporary matter',
    description: 'Temporary Matter for consultation participation UI verify. Safe to delete.',
    matter_type: 'suggestion',
    initiator_kind: 'person',
    initiator_profile_id: profile.id,
    addressee_kind: 'organization',
    addressee_profile_id: civizenId,
    visibility: 'participants',
    area_node_id: null,
    scope_kind: 'global',
    submit: true,
  },
});
if (mErr || typeof matterId !== 'string') throw new Error(mErr?.message || 'matter failed');

const { data: proposalId, error: pErr } = await client.rpc('create_voting_proposal_from_matter', {
  p_matter_id: matterId,
  p_title: 'Participation verify temporary proposal',
  p_summary: 'Temporary',
  p_body: 'Temporary proposal for participation UI.',
});
if (pErr || !proposalId) throw new Error(pErr?.message || 'proposal failed');

// Publish requires founder/admin — seed an ordinary open election linked for UI if member cannot publish.
let electionId = null;
const { data: published, error: pubErr } = await client.rpc('publish_voting_proposal', {
  p_proposal_id: proposalId,
});
if (!pubErr && published) {
  electionId = String(published);
} else {
  // Fallback: create ordinary consultation election directly via SQL for verify only.
  const sql = `
WITH e AS (
  INSERT INTO public.civic_elections (
    title, summary, body, tier, security_class, status,
    scope_country_code, voting_opens_at, voting_closes_at,
    primary_window_seconds, max_attempts, retry_spacing_hours,
    require_home_presence, require_solitude, require_face_liveness,
    metadata
  ) VALUES (
    'Participation verify temporary election',
    'Temporary',
    'Temporary consultation for UI verify.',
    'supranational', 'ordinary', 'open',
    'GLOBAL', now() - interval '1 hour', now() + interval '30 days',
    900, 5, 24, false, false, false,
    jsonb_build_object('consultation_kind','nonbinding','catalog','live','verify','participation')
  ) RETURNING id
), c AS (
  INSERT INTO public.civic_contests (election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata)
  SELECT id, 'Participation verify temporary election', 'Temporary', 'measure', 'consultation_measure', 1, true, 0, '{}'::jsonb FROM e
  RETURNING id, election_id
), cand AS (
  INSERT INTO public.civic_candidates (contest_id, display_name, statement, option_key, sort_order, metadata)
  SELECT c.id, x.n, x.s, x.k, x.o, '{}'::jsonb
  FROM c,
  (VALUES
    ('Support','Support this consultation.','support',0),
    ('Oppose','Oppose this consultation.','oppose',1),
    ('Abstain','Abstain from this consultation.','abstain',2)
  ) AS x(n,s,k,o)
  RETURNING 1
)
SELECT id FROM e;
`;
  const out = applySql(sql);
  const match = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (!match) throw new Error(`Could not create verify election: ${out}`);
  electionId = match[0];
}

const browser = await chromium.launch({ headless: true });
try {
  // Guest / public
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await guest.goto(`${baseUrl}/governance/voting/${electionId}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  const guestText = await guest.locator('body').innerText();
  for (const needle of [
    'Public counts',
    'Country of residence',
    'Public participants',
    'Create an account or sign in',
  ]) {
    if (!guestText.includes(needle)) throw new Error(`Guest UI missing: ${needle}`);
  }
  if (/@/.test(guestText) && /gmail|hotmail|yahoo/i.test(guestText)) {
    throw new Error('Guest UI appears to expose an email');
  }
  await guest.screenshot({ path: `${outDir}/guest-390.png`, fullPage: true });
  await guest.close();

  // Signed-in
  const member = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(member, env.email, env.password);
  await member.goto(`${baseUrl}/governance/voting/${electionId}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await member.getByRole('button', { name: /^Support$/i }).click();
  await member.waitForTimeout(1500);
  const toggle = member.getByText('List me publicly');
  if (!(await toggle.isVisible())) throw new Error('Directory toggle missing after cast');
  await member.getByRole('switch', { name: /List me publicly/i }).click();
  await member.waitForTimeout(1500);
  const signedText = await member.locator('body').innerText();
  if (!signedText.includes('Public participants')) throw new Error('Directory section missing');
  if (!signedText.includes('Your current choice')) throw new Error('Private choice label missing');
  await member.screenshot({ path: `${outDir}/signed-in-390.png`, fullPage: true });

  // Withdraw
  await member.getByRole('switch', { name: /List me publicly/i }).click();
  await member.waitForTimeout(1000);
  await member.close();
} finally {
  await browser.close();
  applySql(`
DELETE FROM public.civic_consultation_public_presence WHERE election_id = '${electionId}';
DELETE FROM public.civic_ballot_selections WHERE ballot_id IN (SELECT id FROM public.civic_ballots WHERE election_id = '${electionId}');
DELETE FROM public.civic_ballots WHERE election_id = '${electionId}';
DELETE FROM public.civic_vote_sessions WHERE election_id = '${electionId}';
DELETE FROM public.civic_candidates WHERE contest_id IN (SELECT id FROM public.civic_contests WHERE election_id = '${electionId}');
DELETE FROM public.civic_contests WHERE election_id = '${electionId}';
DELETE FROM public.civic_voting_proposals WHERE id = '${proposalId}' OR election_id = '${electionId}';
DELETE FROM public.civic_elections WHERE id = '${electionId}';
DELETE FROM public.matters WHERE id = '${matterId}';
`);
}

console.log(`PASS: consultation participation guest+signed-in @390px (${outDir})`);

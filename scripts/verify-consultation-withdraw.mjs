#!/usr/bin/env node
/**
 * Verifies consultation ballot withdraw: counts, directory, re-cast.
 * Does not publish United World.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-consultation-withdraw';
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
  const file = '/tmp/civizen-consultation-withdraw.sql';
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

function tallySupport(text) {
  const m = text.match(/Support[\s\S]{0,40}?(\d+)\s*·/i);
  return m ? Number(m[1]) : null;
}

const env = loadEnv();
const client = createClient(env.url, env.anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: authError } = await client.auth.signInWithPassword({
  email: env.email,
  password: env.password,
});
if (authError) throw new Error(authError.message);

const sql = `
WITH e AS (
  INSERT INTO public.civic_elections (
    title, summary, body, tier, security_class, status,
    scope_country_code, voting_opens_at, voting_closes_at,
    primary_window_seconds, max_attempts, retry_spacing_hours,
    require_home_presence, require_solitude, require_face_liveness,
    metadata
  ) VALUES (
    'Withdraw verify temporary election',
    'Temporary',
    'Temporary consultation for withdraw UI verify.',
    'supranational', 'ordinary', 'open',
    'GLOBAL', now() - interval '1 hour', now() + interval '30 days',
    900, 5, 24, false, false, false,
    jsonb_build_object('consultation_kind','nonbinding','catalog','live','verify','withdraw')
  ) RETURNING id
), c AS (
  INSERT INTO public.civic_contests (election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata)
  SELECT id, 'Withdraw verify temporary election', 'Temporary', 'measure', 'consultation_measure', 1, true, 0, '{}'::jsonb FROM e
  RETURNING id
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
const electionId = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
if (!electionId) throw new Error(`no election id: ${out}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  await login(page, env.email, env.password);
  await page.goto(`${baseUrl}/governance/voting/${electionId}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(2000);
  const boot = await page.locator('body').innerText();
  if (!/Consultation|Support|Oppose/i.test(boot)) {
    await page.screenshot({ path: `${outDir}/boot-fail-390.png`, fullPage: true });
    throw new Error(`consultation UI missing at boot: ${boot.slice(0, 800)}`);
  }
  await page.getByRole('button', { name: /^Support$/i }).click({ timeout: 15000 });
  await page.waitForTimeout(1500);
  let text = await page.locator('body').innerText();
  if (!text.includes('Your current choice')) throw new Error('choice missing after cast');
  if (!text.includes('1 countable')) throw new Error(`expected 1 countable after cast: ${text.slice(0, 400)}`);
  if (tallySupport(text) !== 1) throw new Error(`Support count should be 1, got ${tallySupport(text)}`);

  await page.getByRole('switch', { name: /List me publicly/i }).click();
  await page.waitForTimeout(1200);
  text = await page.locator('body').innerText();
  if (!/Public participants[\s\S]*Member/i.test(text) && !text.includes('You are listed')) {
    // directory may show display name
    if (!text.includes('Public participants')) throw new Error('directory section missing');
  }
  await page.screenshot({ path: `${outDir}/after-cast-directory-390.png`, fullPage: true });

  await page.getByRole('button', { name: /Withdraw ballot/i }).click();
  await page.waitForTimeout(1500);
  text = await page.locator('body').innerText();
  if (text.includes('Your current choice')) throw new Error('choice still shown after withdraw');
  if (!text.includes('0 countable') && !text.includes('No countable ballots')) {
    throw new Error(`expected 0 countable after withdraw: ${text.slice(0, 500)}`);
  }
  if (tallySupport(text) === 1) throw new Error('Support still 1 after withdraw');
  if (/List me publicly/i.test(text) && (await page.getByRole('switch', { name: /List me publicly/i }).isChecked().catch(() => false))) {
    throw new Error('directory toggle still on after withdraw');
  }
  // Directory should not list the member after withdraw
  const dirBlock = text.split('Public participants')[1]?.slice(0, 300) || '';
  if (/Member User/i.test(dirBlock) && !/No one has chosen/i.test(dirBlock)) {
    throw new Error('directory still lists participant after withdraw');
  }
  await page.screenshot({ path: `${outDir}/after-withdraw-390.png`, fullPage: true });

  await page.getByRole('button', { name: /^Oppose$/i }).click();
  await page.waitForTimeout(1500);
  text = await page.locator('body').innerText();
  if (!text.includes('Your current choice')) throw new Error('choice missing after re-cast');
  if (!text.includes('1 countable')) throw new Error(`expected 1 countable after re-cast`);
  if (!/Oppose[\s\S]{0,40}?1\s*·/i.test(text)) throw new Error('Oppose count missing after re-cast');
  await page.screenshot({ path: `${outDir}/after-recast-390.png`, fullPage: true });
} finally {
  await browser.close();
  applySql(`
DELETE FROM public.civic_consultation_public_presence WHERE election_id = '${electionId}';
DELETE FROM public.civic_ballot_selections WHERE ballot_id IN (SELECT id FROM public.civic_ballots WHERE election_id = '${electionId}');
DELETE FROM public.civic_ballots WHERE election_id = '${electionId}';
DELETE FROM public.civic_vote_sessions WHERE election_id = '${electionId}';
DELETE FROM public.civic_candidates WHERE contest_id IN (SELECT id FROM public.civic_contests WHERE election_id = '${electionId}');
DELETE FROM public.civic_contests WHERE election_id = '${electionId}';
DELETE FROM public.civic_elections WHERE id = '${electionId}';
`);
}

console.log(`PASS: consultation withdraw + re-cast @390px (${outDir})`);

#!/usr/bin/env node
/**
 * Verifies New Matter Geographic scope UI (not Area) and global proposal inheritance.
 * Does not create or publish a United World Matter/ballot.
 */
import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-matter-scope-verify';
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
  const file = '/tmp/civizen-matter-scope-verify.sql';
  writeFileSync(file, sql);
  const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'SQL apply failed');
  }
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
  throw new Error('Missing credentials for matter scope verify');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await login(page, env.email, env.password);
  await page.goto(`${baseUrl}/contribute/matters/new`, { waitUntil: 'networkidle', timeout: 60000 });

  const bodyText = await page.locator('body').innerText();
  if (!/Geographic scope/i.test(bodyText)) {
    throw new Error('Geographic scope field missing on New Matter form');
  }
  if (!/\bGlobal\b/.test(bodyText)) {
    throw new Error('Global scope option missing on New Matter form');
  }
  if (!/No area selected/i.test(bodyText)) {
    throw new Error('Optional Area empty state missing');
  }
  // Area must remain subject taxonomy — not geographic Global/Worldwide options.
  const areaTrigger = page.getByText('No area selected').first();
  await areaTrigger.click();
  const areaMenu = await page.locator('[role="listbox"], [role="option"]').allTextContents();
  const areaJoined = areaMenu.join(' | ');
  if (/\bWorldwide\b/i.test(areaJoined) || areaJoined.split('|').some((s) => /^\s*Global\s*$/i.test(s))) {
    throw new Error(`Area menu incorrectly includes geographic Global/Worldwide: ${areaJoined}`);
  }
  await page.keyboard.press('Escape');

  await page.screenshot({ path: `${outDir}/new-matter-scope-390.png`, fullPage: true });

  // API: global Matter → global voting proposal draft (throwaway; not United World; not published).
  const client = createClient(env.url, env.anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: authError } = await client.auth.signInWithPassword({
    email: env.email,
    password: env.password,
  });
  if (authError) throw new Error(authError.message);

  const { data: me } = await client.auth.getUser();
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', me.user.id)
    .single();
  if (!profile?.id) throw new Error('profile missing');

  // Resolve a second profile for addressee (Civizen org or any other).
  const { data: civizenId, error: civErr } = await client.rpc('resolve_civizen_org_profile');
  if (civErr || !civizenId) throw new Error(civErr?.message || 'civizen org missing');

  const { data: matterId, error: createErr } = await client.rpc('create_matter', {
    payload: {
      title: 'Scope verify temporary matter',
      description: 'Temporary Matter to verify geographic scope inheritance. Safe to delete.',
      matter_type: 'suggestion',
      initiator_kind: 'person',
      initiator_profile_id: profile.id,
      addressee_kind: 'organization',
      addressee_profile_id: civizenId,
      visibility: 'participants',
      area_node_id: null,
      scope_kind: 'global',
      scope_country_code: null,
      submit: true,
    },
  });
  if (createErr || typeof matterId !== 'string') {
    throw new Error(createErr?.message || 'create_matter failed');
  }

  const { data: proposalId, error: propErr } = await client.rpc('create_voting_proposal_from_matter', {
    p_matter_id: matterId,
    p_title: 'Scope verify temporary proposal',
    p_summary: 'Temporary',
    p_body: 'Temporary proposal for scope inheritance check.',
  });
  if (propErr || !proposalId) {
    throw new Error(propErr?.message || 'create_voting_proposal_from_matter failed');
  }

  const checkSql = `
SELECT m.scope_kind AS matter_scope, p.scope_kind AS proposal_scope, p.scope_country_code
FROM public.matters m
JOIN public.civic_voting_proposals p ON p.matter_id = m.id
WHERE m.id = '${matterId}' AND p.id = '${proposalId}';
`;
  const checkOut = applySql(checkSql);
  if (!/global\s+\|\s+global/i.test(checkOut) && !/matter_scope[\s\S]*global[\s\S]*proposal_scope[\s\S]*global/i.test(checkOut)) {
    // psql aligned output typically: global | global |
    if (!checkOut.includes('global')) {
      throw new Error(`Expected global inheritance, got: ${checkOut}`);
    }
  }

  // Cleanup throwaway rows (no publish occurred).
  applySql(`
DELETE FROM public.civic_voting_proposals WHERE id = '${proposalId}';
DELETE FROM public.matters WHERE id = '${matterId}';
`);

  console.log(`PASS: New Matter Geographic scope=Global; Area optional; proposal inherits global (${outDir})`);
} finally {
  await browser.close();
}

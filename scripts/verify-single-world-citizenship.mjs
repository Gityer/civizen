#!/usr/bin/env node
/**
 * Verifies the first real consultation journey.
 * Uses the member test account, then withdraws that ballot so it is not countable.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-single-world-citizenship';
mkdirSync(outDir, { recursive: true });

const TITLE = 'A Single World Citizenship';
const QUESTION =
  'Should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality?';
const KEY = 'single-world-citizenship';

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

function fail(message) {
  console.error(message);
  process.exitCode = 1;
  throw new Error(message);
}

async function acceptTermsIfPresent(page) {
  const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
  if (await acceptTerms.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptTerms.click();
    await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
  await acceptTermsIfPresent(page);
}

function tallyMap(rows) {
  const map = {};
  for (const row of rows || []) {
    map[String(row.option_key)] = Number(row.vote_count);
  }
  return map;
}

const env = loadEnv();
if (!env.url || !env.anon || !env.email || !env.password) fail('Missing credentials');

const anon = createClient(env.url, env.anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: elections, error: listError } = await anon
  .from('civic_elections')
  .select('id, title, summary, body, status, security_class, scope_country_code, metadata')
  .eq('title', TITLE);
if (listError) fail(listError.message);
const election = (elections || []).find((row) => row.metadata?.consultation_key === KEY);
if (!election) fail('Consultation not published');
if (election.summary !== QUESTION) fail('Question mismatch');
if (!String(election.body || '').includes('This consultation is nonbinding.')) fail('Body missing nonbinding text');
if (election.status !== 'open') fail(`Unexpected status ${election.status}`);
if (election.security_class !== 'ordinary') fail('Security class is not ordinary');
if (String(election.scope_country_code || '').toUpperCase() !== 'GLOBAL') fail('Scope is not global');
if (election.metadata?.consultation_kind !== 'nonbinding') fail('Not marked nonbinding');
if (election.metadata?.catalog === 'demo' || election.metadata?.sample_batch) fail('Marked as demo/sample');

const { data: anonCast, error: anonCastError } = await anon.rpc('cast_consultation_ballot', {
  p_election_id: election.id,
  p_option_key: 'support',
});
if (!anonCastError || anonCast) fail('Anonymous cast should be rejected');

const member = createClient(env.url, env.anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: authError } = await member.auth.signInWithPassword({
  email: env.email,
  password: env.password,
});
if (authError) fail(authError.message);

const { data: proposals } = await member
  .from('civic_voting_proposals')
  .select('id, status, election_id')
  .eq('election_id', election.id);
const proposal = (proposals || [])[0];
if (!proposal || proposal.status !== 'published') fail('Published proposal missing');

const { error: publishError } = await member.rpc('publish_voting_proposal', {
  p_proposal_id: proposal.id,
});
if (!publishError) fail('Member was able to publish');
if (!/not_authorized_to_publish|proposal_not_draft/.test(publishError.message)) {
  fail(`Unexpected publish error: ${publishError.message}`);
}

const { error: updateError, data: updated } = await member
  .from('civic_elections')
  .update({ title: 'Tampered consultation' })
  .eq('id', election.id)
  .select('id');
if (!updateError && updated && updated.length > 0) fail('Member updated the consultation');

const { data: still } = await anon.from('civic_elections').select('title').eq('id', election.id).single();
if (still?.title !== TITLE) fail('Consultation title changed');

async function counts() {
  const { data, error } = await anon.rpc('civic_election_public_tallies', {
    p_election_id: election.id,
  });
  if (error) fail(error.message);
  return tallyMap(data);
}

async function countryRows() {
  const { data, error } = await anon.rpc('civic_election_country_stats', {
    p_election_id: election.id,
  });
  if (error) fail(error.message);
  return data || [];
}

const before = await counts();
const beforeTotal = Object.values(before).reduce((sum, n) => sum + n, 0);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(`${baseUrl}/governance/voting`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('link', { name: new RegExp(TITLE) }).first().waitFor({ timeout: 30000 });
    await page.getByText('Nonbinding consultation').first().waitFor({ timeout: 15000 });
    await page.getByText(QUESTION).first().waitFor({ timeout: 15000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 8) fail(`Hub overflow at ${width}px: ${overflow}`);
    await page.screenshot({ path: `${outDir}/hub-${width}.png`, fullPage: true });

    await page.getByRole('link', { name: new RegExp(TITLE) }).first().click();
    await page.waitForURL(/\/governance\/voting\/[0-9a-f-]+$/i, { timeout: 30000 });
    await page.getByRole('heading', { name: TITLE }).waitFor({ timeout: 20000 });
    await page.getByText(QUESTION).waitFor();
    await page.getByText('This consultation is nonbinding.').waitFor();
    await page.getByText('Nonbinding consultation').first().waitFor();
    await page.getByText('Global', { exact: true }).first().waitFor();
    await page.getByText('Sign in to participate in this consultation.').waitFor();
    if (await page.getByRole('button', { name: 'Support', exact: true }).count()) {
      fail('Guest can see cast buttons');
    }
    const detailOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (detailOverflow > 8) fail(`Detail overflow at ${width}px: ${detailOverflow}`);
    await page.screenshot({ path: `${outDir}/detail-guest-${width}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, env.email, env.password);
  await page.goto(`${baseUrl}/governance/voting/${election.id}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.getByText('Participate in the consultation').waitFor({ timeout: 30000 });

  const cast = async (label) => {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByText(`Your current choice: ${label}`).waitFor({ timeout: 20000 });
  };

  await cast('Support');
  let afterSupport = await counts();
  if (afterSupport.support !== (before.support || 0) + 1) {
    fail(`Support tally ${JSON.stringify(afterSupport)} from ${JSON.stringify(before)}`);
  }
  const duringCountries = await countryRows();
  if (duringCountries.length > 0) {
    fail('Geographic stats published below the privacy threshold');
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Your current choice: Support').waitFor({ timeout: 20000 });

  await cast('Oppose');
  const afterOppose = await counts();
  if (afterOppose.oppose !== (before.oppose || 0) + 1) fail('Oppose did not replace Support');
  if (afterOppose.support !== (before.support || 0)) fail('Support remained countable after change');

  await cast('Abstain');
  const afterAbstain = await counts();
  if (afterAbstain.abstain !== (before.abstain || 0) + 1) fail('Abstain was not countable');

  await page.getByRole('button', { name: 'Withdraw ballot' }).click();
  await page.getByText(/Your current choice:/).waitFor({ state: 'hidden', timeout: 20000 });
  const afterWithdraw = await counts();
  const withdrawTotal = Object.values(afterWithdraw).reduce((sum, n) => sum + n, 0);
  if (withdrawTotal !== beforeTotal) fail(`Withdraw left countable ballots: ${JSON.stringify(afterWithdraw)}`);

  await cast('Support');
  const recast = await counts();
  if (recast.support !== (before.support || 0) + 1) fail('Re-cast after withdrawal did not count');

  await page.getByRole('switch', { name: 'List me publicly' }).click();
  await page.getByText('Member User').waitFor({ timeout: 20000 });
  await page.getByRole('switch', { name: 'List me publicly' }).click();
  await page.getByText('Member User').waitFor({ state: 'hidden', timeout: 20000 });

  await page.getByRole('button', { name: 'Withdraw ballot' }).click();
  await page.getByText(/Your current choice:/).waitFor({ state: 'hidden', timeout: 20000 });

  const countries = await countryRows();
  if (countries.length > 0) {
    fail('Geographic stats remained visible after withdrawal');
  }

  await page.screenshot({ path: `${outDir}/detail-member-390.png`, fullPage: true });
  console.log(`Verified consultation ${election.id}`);
  console.log(`Screenshots in ${outDir}`);
} finally {
  await Promise.resolve(
    member.rpc('withdraw_consultation_ballot', { p_election_id: election.id }),
  ).catch(() => {});
  await Promise.resolve(
    member.rpc('set_consultation_public_presence', {
      p_election_id: election.id,
      p_visible: false,
    }),
  ).catch(() => {});
  const finalCounts = await counts().catch(() => null);
  if (finalCounts) {
    const total = Object.values(finalCounts).reduce((sum, n) => sum + n, 0);
    if (total !== beforeTotal) {
      console.error(`Countable total changed from ${beforeTotal} to ${total}`);
      process.exitCode = 1;
    }
  }
  await browser.close();
}

if (process.exitCode) process.exit(process.exitCode);

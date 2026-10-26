-- Test fixtures for supabase/tests/*_test.sql on a database built from migrations alone (CI, a fresh local stack).
--
-- The SQL tests look people and records up by name (profiles 'member', 'citizen', 'verified_member', 'moderator',
-- the founders 'maturehumanity' and 'armen', the consultation 'single-world-citizenship', ...). A developer database
-- loaded from the production-derived dump already has them; an empty database built by replay-migrations.sh does
-- not. This file creates them with fixed ids and fixture emails (<username>@test.civizen.local). No personal data.
--
-- Deterministic and idempotent: every fixture is skipped when its username / key already exists, so running it on a
-- developer database that already has these rows changes nothing.
--
--   docker exec -i <db container> psql -U postgres -v ON_ERROR_STOP=1 < scripts/local-supabase/seed-test-fixtures.sql

BEGIN;

-- ---- people ----------------------------------------------------------------------------------------------------
-- One auth user per fixture; the on_auth_user_created trigger creates the profile from raw_user_meta_data, then the
-- role and status columns are set as the database owner (the server path the privileged-column guard allows).
CREATE TEMP TABLE ci_fixture_people (
  user_id uuid PRIMARY KEY,
  username text NOT NULL,
  full_name text NOT NULL,
  role public.app_role NOT NULL,
  is_verified boolean NOT NULL,
  is_admin boolean NOT NULL,
  citizenship_status public.citizenship_status NOT NULL,
  is_active_citizen boolean NOT NULL,
  country_code text NOT NULL,
  language_code text NOT NULL,
  date_of_birth date
) ON COMMIT DROP;

INSERT INTO ci_fixture_people VALUES
  ('c1000000-0000-4000-8000-000000000001', 'maturehumanity',  'Fixture Founder',         'founder',         false, true,  'citizen',           true,  'US', 'en',    '1976-05-11'),
  ('c1000000-0000-4000-8000-000000000002', 'armen',           'Fixture Founder Staff',   'founder',         true,  true,  'citizen',           true,  'US', 'en-US', '1976-05-11'),
  ('c1000000-0000-4000-8000-000000000003', 'member',          'Fixture Member',          'member',          false, false, 'registered_member', false, 'CA', 'en-CA', NULL),
  ('c1000000-0000-4000-8000-000000000004', 'citizen',         'Fixture Citizen',         'citizen',         true,  false, 'citizen',           false, 'AM', 'en-US', NULL),
  ('c1000000-0000-4000-8000-000000000005', 'verified_member', 'Fixture Verified Member', 'verified_member', true,  false, 'citizen',           false, 'FR', 'fr',    NULL),
  ('c1000000-0000-4000-8000-000000000006', 'certified',       'Fixture Certified',       'certified',       true,  false, 'citizen',           false, 'DE', 'de',    NULL),
  ('c1000000-0000-4000-8000-000000000007', 'law',             'Fixture Law',             'certified',       true,  false, 'citizen',           false, 'BE', 'fr',    NULL),
  ('c1000000-0000-4000-8000-000000000008', 'moderator',       'Fixture Moderator',       'moderator',       true,  false, 'citizen',           false, 'NL', 'nl',    NULL),
  ('c1000000-0000-4000-8000-000000000009', 'market_manager',  'Fixture Market Manager',  'market_manager',  true,  false, 'citizen',           false, 'BR', 'pt-BR', NULL),
  ('c1000000-0000-4000-8000-00000000000a', 'guest',           'Fixture Guest',           'guest',           false, false, 'registered_member', false, 'US', 'en-US', NULL),
  -- the official Civizen organization account (resolve_civizen_org_profile()); linked as a business below
  ('c1000000-0000-4000-8000-00000000000b', 'civizen',         'Civizen',                 'member',          false, false, 'registered_member', false, 'US', 'en',    NULL);

-- Skip fixtures whose username (or fixed user id / email) is already taken.
DELETE FROM ci_fixture_people f
 WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = f.username)
    OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = f.user_id OR u.email = f.username || '@test.civizen.local');

-- Fixture logins use the shared local password "civizen-local". GoTrue refuses to load a user whose token columns are
-- NULL ("converting NULL to string is unsupported", sign-in answers 500), so they are empty strings, as GoTrue writes.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, confirmation_token, recovery_token,
                        email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token,
                        reauthentication_token, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000', f.user_id, 'authenticated', 'authenticated',
       f.username || '@test.civizen.local', extensions.crypt('civizen-local', extensions.gen_salt('bf')),
       '', '', '', '', '', '', '', '', now(),
       '{"provider": "email", "providers": ["email"]}'::jsonb,
       jsonb_build_object('username', f.username, 'full_name', f.full_name, 'country_code', f.country_code,
                          'language_code', f.language_code, 'terms_version', '2026-08-01-purpose-alignment-v1',
                          'terms_accepted_at', now()::text),
       -- created_at orders "the first founder" and "the oldest other verified profile" lookups the same way every run
       timestamptz '2026-01-01 00:00:00+00' + (row_number() OVER (ORDER BY f.user_id)) * interval '1 minute',
       now()
  FROM ci_fixture_people f;

-- Profiles created by the trigger; create any the trigger did not (older schemas).
INSERT INTO public.profiles (user_id, username, full_name)
SELECT f.user_id, f.username, f.full_name FROM ci_fixture_people f
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = f.user_id);

UPDATE public.profiles p
   SET role = f.role,
       is_verified = f.is_verified,
       is_admin = f.is_admin,
       citizenship_status = f.citizenship_status,
       citizenship_accepted_at = CASE WHEN f.citizenship_status = 'citizen' THEN timestamptz '2026-01-01 00:00:00+00' END,
       citizenship_acceptance_mode = CASE WHEN f.citizenship_status = 'citizen' THEN 'bootstrap' END,
       is_active_citizen = f.is_active_citizen,
       active_citizen_since = CASE WHEN f.is_active_citizen THEN timestamptz '2026-01-01 00:00:00+00' END,
       country_code = f.country_code,
       language_code = f.language_code,
       date_of_birth = f.date_of_birth,
       created_at = (SELECT u.created_at FROM auth.users u WHERE u.id = f.user_id)
  FROM ci_fixture_people f
 WHERE p.user_id = f.user_id;

-- The founder office (the dump has it for maturehumanity).
INSERT INTO public.constitutional_offices (profile_id, office_key, is_active)
SELECT p.id, 'founder', true
  FROM public.profiles p JOIN ci_fixture_people f ON f.user_id = p.user_id
 WHERE f.username = 'maturehumanity'
   AND NOT EXISTS (SELECT 1 FROM public.constitutional_offices o WHERE o.profile_id = p.id AND o.office_key = 'founder');

-- The Civizen organization is a business account owned by the founder 'armen' (as in the dump).
INSERT INTO public.linked_accounts (owner_profile_id, linked_profile_id, relationship_type, business_name_normalized, established_at, established_via)
SELECT o.id, b.id, 'business', 'civizen', timestamptz '2026-01-01 00:00:00+00', 'legacy_backfill'
  FROM public.profiles o, public.profiles b
 WHERE o.username = 'armen' AND b.username = 'civizen'
   AND b.user_id = 'c1000000-0000-4000-8000-00000000000b'
   AND NOT EXISTS (SELECT 1 FROM public.linked_accounts la WHERE la.relationship_type = 'business' AND la.business_name_normalized = 'civizen');

-- ---- the live consultation -------------------------------------------------------------------------------------
DO $$
DECLARE
  v_election uuid := 'c2000000-0000-4000-8000-000000000001';
  v_contest uuid := 'c2000000-0000-4000-8000-000000000002';
BEGIN
  IF EXISTS (SELECT 1 FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship') THEN
    RETURN;
  END IF;
  INSERT INTO public.civic_elections (id, title, summary, body, tier, security_class, status, scope_country_code,
                                      voting_opens_at, voting_closes_at, metadata)
  VALUES (v_election, 'A Single World Citizenship',
          'Should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality?',
          'Fixture copy of the live nonbinding consultation.',
          'supranational', 'ordinary', 'open', 'GLOBAL', now() - interval '1 day', now() + interval '365 days',
          '{"catalog": "live", "consultation_key": "single-world-citizenship", "consultation_kind": "nonbinding"}'::jsonb);
  INSERT INTO public.civic_contests (id, election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order)
  VALUES (v_contest, v_election, 'A Single World Citizenship',
          'Should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality?',
          'measure', 'consultation_measure', 1, true, 0);
  INSERT INTO public.civic_candidates (id, contest_id, display_name, statement, option_key, is_write_in_slot, sort_order) VALUES
    ('c2000000-0000-4000-8000-000000000011', v_contest, 'Support', 'Support this consultation.', 'support', false, 0),
    ('c2000000-0000-4000-8000-000000000012', v_contest, 'Oppose',  'Oppose this consultation.',  'oppose',  false, 1),
    ('c2000000-0000-4000-8000-000000000013', v_contest, 'Abstain', 'Abstain from this consultation.', 'abstain', false, 2);
END $$;

-- ---- a seeded (demo) contribution program ------------------------------------------------------------------------
-- The demo seed migrations skip on an empty database (no founder yet). Tests need one program to borrow a
-- program_kind from, and the demo-flag test checks that seeded programs are flagged as demo.
INSERT INTO public.contribution_programs (id, publisher_profile_id, title, summary, description, status, program_kind, seed_key, is_demo)
SELECT 'c3000000-0000-4000-8000-000000000001', p.id, 'Fixture demo program', 'Fixture program for SQL tests.',
       'Created by scripts/local-supabase/seed-test-fixtures.sql.', 'active', 'community_problem_solving', 'ci-fixture-program', true
  FROM public.profiles p
 WHERE p.username = 'maturehumanity' AND p.deleted_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.contribution_programs);

COMMIT;

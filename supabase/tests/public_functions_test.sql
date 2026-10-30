-- Planet-wide public functions: bodies anywhere are proposed with a source, verified by the function's liaison, and
-- then used for routing (most local first); a Matter for a public authority moves from triage to the liaison.
-- Places and bodies below are fictional. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.liaison_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.liaison_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'test reset' WHERE ended_at IS NULL;
INSERT INTO public.org_position_terms (position_key, profile_id) VALUES ('liaison_economic_affairs', current_setting('t.liaison_pid')::uuid);

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
CREATE TEMP TABLE t_ids (label text PRIMARY KEY, id uuid) ON COMMIT DROP;
GRANT ALL ON t_ids TO authenticated;

-- the model covers the 10 COFOG divisions, each with a catch-all and an existing liaison; every Solutions category
-- points to a function; Civizen additions are marked as such
DO $$
BEGIN
  IF (SELECT count(*) FROM public.public_function_divisions WHERE cofog_code IS NOT NULL) <> 10 THEN
    RAISE EXCEPTION 'the model should cover the 10 COFOG divisions';
  END IF;
  IF EXISTS (SELECT 1 FROM public.public_function_divisions d WHERE d.cofog_code IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM public.public_functions f WHERE f.division_code = d.division_code AND f.origin = 'catch_all')) THEN
    RAISE EXCEPTION 'every division needs a catch-all so nothing falls outside';
  END IF;
  IF EXISTS (SELECT 1 FROM public.public_function_divisions d WHERE NOT EXISTS (SELECT 1 FROM public.org_positions p WHERE p.position_key = d.liaison_position_key)) THEN
    RAISE EXCEPTION 'every division needs an existing liaison position';
  END IF;
  IF EXISTS (SELECT 1 FROM public.solution_authorities WHERE function_key IS NULL) THEN
    RAISE EXCEPTION 'every Solutions category should point to a function';
  END IF;
  IF EXISTS (SELECT 1 FROM public.public_functions WHERE origin = 'cofog' AND cofog_code IS NULL) THEN
    RAISE EXCEPTION 'functions taken from COFOG should carry their COFOG code';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.public_functions WHERE function_key = 'digital_government' AND origin = 'civizen_addition') THEN
    RAISE EXCEPTION 'digital government and IT should be in the model';
  END IF;
END $$;

-- a member proposes a country-level and a city-level transport body (fictional), and a planetary health body
SELECT pg_temp.act_as(current_setting('t.member_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'country', public.propose_public_body(jsonb_build_object(
  'name', 'Testland Transport Ministry', 'kind', 'ministry', 'scope_kind', 'country', 'scope_country_code', 'tl',
  'functions', jsonb_build_array('transport'), 'channel_kind', 'web_form', 'channel_address', 'https://transport.example.org/contact',
  'answer_deadline_days', 30, 'source_url', 'https://gov.example.org/structure'));
INSERT INTO t_ids SELECT 'city', public.propose_public_body(jsonb_build_object(
  'name', 'Testville Streets Department', 'kind', 'local_government', 'scope_kind', 'locality', 'scope_country_code', 'TL',
  'scope_locality_code', 'Testville', 'functions', jsonb_build_array('transport', 'street_lighting'),
  'channel_kind', 'service_request_api', 'channel_address', 'https://311.example.org/requests', 'source_url', 'https://testville.example.org/departments'));
INSERT INTO t_ids SELECT 'planet', public.propose_public_body(jsonb_build_object(
  'name', 'Test Planetary Health Body', 'kind', 'international', 'scope_kind', 'global',
  'functions', jsonb_build_array('public_health'), 'channel_kind', 'email', 'channel_address', 'contact@health.example.org', 'source_url', 'https://health.example.org/about'));
RESET ROLE;

DO $$
DECLARE
  v_country uuid := (SELECT id FROM t_ids WHERE label = 'country');
  v_city uuid := (SELECT id FROM t_ids WHERE label = 'city');
  v_route jsonb;
  v_failed boolean;
  v_visible integer;
BEGIN
  -- 1. proposals need a source and a function; each opens a review item for the function's liaison
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.propose_public_body(jsonb_build_object('name', 'No source', 'scope_kind', 'country', 'scope_country_code', 'TL',
      'functions', jsonb_build_array('transport'), 'channel_address', 'somewhere', 'source_url', 'http://insecure.example.org'));
  EXCEPTION WHEN invalid_parameter_value THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'a proposal without an https source should fail'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'liaison_economic_affairs' AND source_type = 'public_body'
                   AND source_ref = v_city::text AND status = 'open') THEN
    RAISE EXCEPTION 'a proposal should open a review item for the liaison';
  END IF;

  -- 2. proposed bodies are not public and not used for routing
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_visible FROM public.public_bodies WHERE id IN (v_country, v_city);
  RESET ROLE;
  IF v_visible <> 0 THEN RAISE EXCEPTION 'proposed bodies should not be public'; END IF;
  IF public.route_public_function('transport', 'locality', 'TL', NULL, 'Testville') -> 'body' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'unverified bodies should not be routed to';
  END IF;

  -- 3. only the liaison verifies, with a note; then routing prefers the most local body
  PERFORM pg_temp.act_as(current_setting('t.citizen_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.review_public_body(v_city, 'verified', 'looks right');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'only the liaison should verify'; END IF;
  PERFORM pg_temp.act_as(current_setting('t.liaison_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.review_public_body(v_city, 'verified', 'Checked the city department page.');
  PERFORM public.review_public_body(v_country, 'verified', 'Checked the government structure page.');
  -- the health body is not the Economic Affairs liaison's to verify; the founder office answers for the vacant Health liaison
  v_failed := false;
  BEGIN
    PERFORM public.review_public_body((SELECT id FROM t_ids WHERE label = 'planet'), 'verified', 'Checked the about page.');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'a liaison should verify only bodies for its own functions'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'maturehumanity'), 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.review_public_body((SELECT id FROM t_ids WHERE label = 'planet'), 'verified', 'Checked the about page.');
  RESET ROLE;
  IF EXISTS (SELECT 1 FROM public.org_position_items WHERE source_type = 'public_body' AND source_ref = v_city::text AND status = 'open') THEN
    RAISE EXCEPTION 'verifying should close the review item';
  END IF;
  v_route := public.route_public_function('transport', 'locality', 'TL', NULL, 'Testville');
  IF v_route -> 'body' ->> 'name' <> 'Testville Streets Department' THEN RAISE EXCEPTION 'the city body should win in the city: %', v_route; END IF;
  v_route := public.route_public_function('transport', 'locality', 'TL', NULL, 'Othertown');
  IF v_route -> 'body' ->> 'name' <> 'Testland Transport Ministry' THEN RAISE EXCEPTION 'elsewhere the country body should answer: %', v_route; END IF;
  v_route := public.route_public_function('transport', 'country', 'ZZ', NULL, NULL);
  IF v_route -> 'body' <> 'null'::jsonb OR v_route ->> 'liaison_position_key' <> 'liaison_economic_affairs' THEN
    RAISE EXCEPTION 'an unmapped country should go to the liaison: %', v_route;
  END IF;
  v_route := public.route_public_function('public_health', 'global', NULL, NULL, NULL);
  IF v_route -> 'body' ->> 'name' <> 'Test Planetary Health Body' THEN RAISE EXCEPTION 'a planetary Matter should reach a planetary body: %', v_route; END IF;
END $$;

-- 4. a citizen raises a Matter for a public authority: triage closes, the liaison gets a delivery item
SELECT pg_temp.act_as(current_setting('t.citizen_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'matter', public.create_matter(jsonb_build_object(
  'title', 'Public route test: pothole on Main Street', 'description', 'Fictional Matter for the public-functions test.',
  'matter_type', 'issue', 'visibility', 'public', 'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(),
  'scope_kind', 'locality', 'scope_country_code', 'TL', 'scope_region_code', 'TS', 'scope_locality_code', 'Testville', 'submit', true));
SELECT public.set_matter_public_route((SELECT id FROM t_ids WHERE label = 'matter'), 'transport');
RESET ROLE;

DO $$
DECLARE
  v_matter uuid := (SELECT id FROM t_ids WHERE label = 'matter');
  v_failed boolean;
BEGIN
  IF (SELECT public_body_id FROM public.matters WHERE id = v_matter) IS DISTINCT FROM (SELECT id FROM t_ids WHERE label = 'city') THEN
    RAISE EXCEPTION 'the Matter should record the city body';
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'member_support' AND source_ref = v_matter::text AND status = 'open') THEN
    RAISE EXCEPTION 'triage should close once the Matter is routed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'liaison_economic_affairs' AND source_ref = v_matter::text
                   AND status = 'open' AND title LIKE 'Deliver to Testville Streets Department:%' AND body LIKE '%311.example.org%') THEN
    RAISE EXCEPTION 'the liaison should get a delivery item with the channel';
  END IF;
  -- the liaison acts for Civizen on it
  PERFORM pg_temp.act_as(current_setting('t.liaison_uid'));
  SET LOCAL ROLE authenticated;
  IF NOT public.current_profile_represents_actor('organization', public.resolve_civizen_org_profile()) THEN
    RAISE EXCEPTION 'the liaison should act for Civizen';
  END IF;
  RESET ROLE;
  -- only the initiator sets the route
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.set_matter_public_route(v_matter, 'public_health');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'only the initiator should route the Matter'; END IF;
END $$;
-- 5. where no body is mapped, the liaison is asked to find the responsible office
SELECT pg_temp.act_as(current_setting('t.citizen_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'unmapped', public.create_matter(jsonb_build_object(
  'title', 'Public route test: no office mapped', 'description', 'Fictional Matter for the public-functions test.',
  'matter_type', 'issue', 'visibility', 'public', 'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(),
  'scope_kind', 'country', 'scope_country_code', 'ZZ', 'submit', true));
SELECT public.set_matter_public_route((SELECT id FROM t_ids WHERE label = 'unmapped'), 'transport');
RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'liaison_economic_affairs'
                   AND source_ref = (SELECT id FROM t_ids WHERE label = 'unmapped')::text
                   AND title = 'Find the responsible office: Public route test: no office mapped') THEN
    RAISE EXCEPTION 'with no body mapped, the liaison should be asked to find the office';
  END IF;
END $$;
DO $$ BEGIN RAISE NOTICE 'ok: public functions'; END $$;

ROLLBACK;

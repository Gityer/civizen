-- After routing: delivery and answer deadlines, offices held by officials, and coverage of a place. Bodies and places
-- are fictional. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.liaison_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.liaison_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.official_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'certified' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.official_pid', (SELECT id::text FROM public.profiles WHERE username = 'certified' AND deleted_at IS NULL LIMIT 1), true);
UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'test reset' WHERE ended_at IS NULL;
INSERT INTO public.org_position_terms (position_key, profile_id) VALUES ('liaison_economic_affairs', current_setting('t.liaison_pid')::uuid);

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
CREATE TEMP TABLE t_ids (label text PRIMARY KEY, id uuid) ON COMMIT DROP;
GRANT ALL ON t_ids TO authenticated;

-- verified bodies: a city streets department (10-day deadline), a second city transport body, and an ombudsman
INSERT INTO public.public_bodies (name, kind, scope_kind, scope_country_code, scope_region_code, scope_locality_code, channel_kind, channel_address,
                                  answer_deadline_days, source_url, status)
VALUES ('Testville Streets Department', 'local_government', 'locality', 'TL', 'TS', 'Testville', 'web_form', 'https://streets.example.org/form', 10, 'https://testville.example.org', 'verified'),
       ('Testville Transit Authority', 'agency', 'locality', 'TL', 'TS', 'Testville', 'email', 'transit@example.org', NULL, 'https://transit.example.org', 'verified'),
       ('Testland Ombudsman', 'independent', 'country', 'TL', NULL, NULL, 'email', 'complaints@ombuds.example.org', 30, 'https://ombuds.example.org', 'verified');
INSERT INTO t_ids SELECT 'streets', id FROM public.public_bodies WHERE name = 'Testville Streets Department';
INSERT INTO t_ids SELECT 'transit', id FROM public.public_bodies WHERE name = 'Testville Transit Authority';
INSERT INTO public.public_body_functions (body_id, function_key)
SELECT id, 'transport' FROM public.public_bodies WHERE name IN ('Testville Streets Department', 'Testville Transit Authority')
UNION ALL SELECT id, 'street_lighting' FROM public.public_bodies WHERE name = 'Testville Streets Department'
UNION ALL SELECT id, 'audit_oversight' FROM public.public_bodies WHERE name = 'Testland Ombudsman';

-- coverage: transport overlaps (two city bodies), street lighting is covered, water supply is a gap
DO $$
DECLARE
  v_cov jsonb := public.public_coverage('locality', 'TL', 'TS', 'Testville');
BEGIN
  IF (SELECT e ->> 'status' FROM jsonb_array_elements(v_cov) e WHERE e ->> 'function_key' = 'transport') <> 'overlap' THEN RAISE EXCEPTION 'transport should overlap: %', v_cov; END IF;
  IF (SELECT e ->> 'status' FROM jsonb_array_elements(v_cov) e WHERE e ->> 'function_key' = 'street_lighting') <> 'covered' THEN RAISE EXCEPTION 'street lighting should be covered'; END IF;
  IF (SELECT e ->> 'status' FROM jsonb_array_elements(v_cov) e WHERE e ->> 'function_key' = 'water_supply') <> 'gap' THEN RAISE EXCEPTION 'water supply should be a gap'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_cov) e WHERE e ->> 'function_key' IN ('general_other', 'not_sure', 'civizen_network')) THEN
    RAISE EXCEPTION 'catch-alls and Civizen itself are not coverage rows';
  END IF;
END $$;

-- a citizen raises a street-lighting Matter in Testville; it goes to the Economic Affairs liaison? no: street lighting
-- is division 06, so the Housing and Community liaison (vacant, answered up the chain); the liaison of 04 cannot act on it
SELECT pg_temp.act_as(current_setting('t.citizen_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'lamp', public.create_matter(jsonb_build_object(
  'title', 'Delivery test: broken street lamp', 'description', 'Fictional Matter.', 'matter_type', 'issue', 'visibility', 'public',
  'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(),
  'scope_kind', 'locality', 'scope_country_code', 'TL', 'scope_region_code', 'TS', 'scope_locality_code', 'Testville', 'submit', true));
SELECT public.set_matter_public_route((SELECT id FROM t_ids WHERE label = 'lamp'), 'street_lighting');
RESET ROLE;

DO $$
DECLARE
  v_lamp uuid := (SELECT id FROM t_ids WHERE label = 'lamp');
  v_failed boolean;
  v_status jsonb;
  v_delivery uuid;
BEGIN
  -- 1. only those working the matter's liaison may record delivery
  PERFORM pg_temp.act_as(current_setting('t.liaison_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.record_public_delivery(v_lamp, 'REF-1');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'a liaison of another division should not deliver'; END IF;

  -- the founder office answers for the vacant Housing and Community liaison
  PERFORM set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'maturehumanity'), 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  v_delivery := public.record_public_delivery(v_lamp, 'REF-1');
  RESET ROLE;
  IF (SELECT answer_due_at::date FROM public.public_deliveries WHERE id = v_delivery) <> (now() + interval '10 days')::date THEN
    RAISE EXCEPTION 'the answer should be due within the body''s 10-day deadline';
  END IF;

  -- 2. the initiator sees the delivery on the Matter
  PERFORM pg_temp.act_as(current_setting('t.citizen_uid'));
  SET LOCAL ROLE authenticated;
  v_status := public.matter_public_status(v_lamp);
  RESET ROLE;
  IF v_status -> 'body' ->> 'name' <> 'Testville Streets Department' OR (v_status -> 'deliveries' -> 0 ->> 'reference') <> 'REF-1'
     OR (v_status ->> 'can_handle')::boolean THEN
    RAISE EXCEPTION 'the initiator should see the body and delivery, without handling rights: %', v_status;
  END IF;

  -- 3. no answer by the deadline: overdue, the initiator is told, the Public Liaison Lead gets the ombudsman as next step
  UPDATE public.public_deliveries SET answer_due_at = now() - interval '1 day' WHERE id = v_delivery;
  PERFORM set_config('request.jwt.claims', '', true);  -- the daily job runs with no signed-in member
  PERFORM public.process_public_delivery_deadlines();
  IF (SELECT status FROM public.public_deliveries WHERE id = v_delivery) <> 'overdue' THEN RAISE EXCEPTION 'the delivery should be overdue'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'public_liaison_lead' AND source_ref = v_lamp::text
                   AND recommendation LIKE '%Testland Ombudsman%') THEN
    RAISE EXCEPTION 'the overdue item should name the oversight body for the place';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE notification_type = 'matter_public_overdue') THEN
    RAISE EXCEPTION 'the initiator should be told the answer is overdue';
  END IF;

  -- 4. the answer arrives: recorded on the Matter, the Matter's position items close
  PERFORM set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'maturehumanity'), 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.record_public_answer(v_delivery, 'resolved', 'The lamp was replaced on Tuesday.');
  RESET ROLE;
  IF (SELECT status FROM public.public_deliveries WHERE id = v_delivery) <> 'answered' THEN RAISE EXCEPTION 'the delivery should be answered'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matter_events WHERE matter_id = v_lamp AND event_type = 'public_answered' AND summary LIKE '%replaced on Tuesday%') THEN
    RAISE EXCEPTION 'the answer should be on the Matter';
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_position_items WHERE source_ref = v_lamp::text AND status IN ('open', 'in_progress', 'waiting')) THEN
    RAISE EXCEPTION 'the Matter''s position items should close with the answer';
  END IF;
END $$;

-- 5. an official asks for an office for the streets department; the liaison for its division approves
SELECT pg_temp.act_as(current_setting('t.official_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'request', public.request_public_office((SELECT id FROM t_ids WHERE label = 'streets'), 'Citizen requests desk',
  'https://testville.example.org/staff/requests-desk', 'I run the desk.');
RESET ROLE;

DO $$
DECLARE
  v_request uuid := (SELECT id FROM t_ids WHERE label = 'request');
  v_office text;
  v_failed boolean;
BEGIN
  IF (SELECT position_key FROM public.org_position_items WHERE id = v_request) <> 'liaison_economic_affairs' THEN
    RAISE EXCEPTION 'the request should go to the liaison of the body''s first function (transport, division 04)';
  END IF;
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.approve_public_office(v_request, 'looks fine');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'only the liaison should approve an office'; END IF;
  PERFORM pg_temp.act_as(current_setting('t.liaison_uid'));
  SET LOCAL ROLE authenticated;
  v_office := public.approve_public_office(v_request, 'Staff page lists the member at the requests desk.');
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.org_position_terms WHERE position_key = v_office AND profile_id = current_setting('t.official_pid')::uuid AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'the official should hold the new office';
  END IF;
  IF (SELECT acts_for_civizen FROM public.org_positions WHERE position_key = v_office) THEN
    RAISE EXCEPTION 'an office of a public body must not act for Civizen';
  END IF;
  PERFORM set_config('t.office', v_office, true);
END $$;

-- 6. a new street-lighting Matter now goes to the office's queue, delivered at once; the official answers it
SELECT pg_temp.act_as(current_setting('t.citizen_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'lamp2', public.create_matter(jsonb_build_object(
  'title', 'Delivery test: another dark street', 'description', 'Fictional Matter.', 'matter_type', 'issue', 'visibility', 'public',
  'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(),
  'scope_kind', 'locality', 'scope_country_code', 'TL', 'scope_region_code', 'TS', 'scope_locality_code', 'Testville', 'submit', true));
SELECT public.set_matter_public_route((SELECT id FROM t_ids WHERE label = 'lamp2'), 'street_lighting');
RESET ROLE;

DO $$
DECLARE
  v_lamp2 uuid := (SELECT id FROM t_ids WHERE label = 'lamp2');
  v_delivery uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = current_setting('t.office') AND source_ref = v_lamp2::text
                   AND title LIKE 'Answer for Testville Streets Department:%') THEN
    RAISE EXCEPTION 'the Matter should reach the body''s office';
  END IF;
  SELECT id INTO v_delivery FROM public.public_deliveries WHERE matter_id = v_lamp2 AND channel_kind = 'civizen';
  IF v_delivery IS NULL THEN RAISE EXCEPTION 'delivery to an office on Civizen should be recorded at once'; END IF;
  PERFORM pg_temp.act_as(current_setting('t.official_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.record_public_answer(v_delivery, 'answered', 'A crew is scheduled for Friday.');
  RESET ROLE;
  IF (SELECT status FROM public.public_deliveries WHERE id = v_delivery) <> 'answered' THEN RAISE EXCEPTION 'the official should record the answer'; END IF;
END $$;

-- 7. a Matter in a place with no body: the liaison maps one later and attaches it, then delivers
SELECT pg_temp.act_as(current_setting('t.citizen_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'road', public.create_matter(jsonb_build_object(
  'title', 'Delivery test: pothole elsewhere', 'description', 'Fictional Matter.', 'matter_type', 'issue', 'visibility', 'public',
  'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(),
  'scope_kind', 'country', 'scope_country_code', 'ZZ', 'submit', true));
SELECT public.set_matter_public_route((SELECT id FROM t_ids WHERE label = 'road'), 'transport');
RESET ROLE;

DO $$
DECLARE
  v_road uuid := (SELECT id FROM t_ids WHERE label = 'road');
  v_body uuid;
  v_failed boolean;
BEGIN
  INSERT INTO public.public_bodies (name, kind, scope_kind, scope_country_code, channel_kind, channel_address, source_url, status)
  VALUES ('Zedland Roads Agency', 'agency', 'country', 'ZZ', 'web_form', 'https://roads.example.org', 'https://zz.example.org', 'verified') RETURNING id INTO v_body;
  INSERT INTO public.public_body_functions (body_id, function_key) VALUES (v_body, 'transport');
  PERFORM pg_temp.act_as(current_setting('t.liaison_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.record_public_delivery(v_road, 'X');
  EXCEPTION WHEN invalid_parameter_value THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'delivery needs a body first'; END IF;
  PERFORM public.assign_matter_public_body(v_road, v_body);
  PERFORM public.record_public_delivery(v_road, 'ZZ-77');
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.public_deliveries WHERE matter_id = v_road AND reference = 'ZZ-77' AND answer_due_at::date = (now() + interval '30 days')::date) THEN
    RAISE EXCEPTION 'a body with no recorded deadline gets 30 days';
  END IF;
END $$;
DO $$ BEGIN RAISE NOTICE 'ok: public delivery, offices and coverage'; END $$;

ROLLBACK;

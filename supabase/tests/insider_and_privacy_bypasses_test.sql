-- v2 step A7: each insider or privacy bypass reported by Security, Trust & Safety and QA now fails.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_pid', (SELECT id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);

-- fixtures written as the database owner
UPDATE public.profiles SET is_verified = true WHERE id = current_setting('t.citizen_pid')::uuid;
UPDATE public.profiles SET phone_country_code = '+374', phone_number = '91000222', privacy_settings = '{}'::jsonb WHERE id = current_setting('t.citizen_pid')::uuid;
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('t.founder_pid')::uuid;
INSERT INTO public.identity_verification_cases (id, profile_id, status) VALUES ('7c000000-0000-4000-8000-000000000001', current_setting('t.founder_pid')::uuid, 'submitted');
INSERT INTO public.governance_emergency_access_requests (id, target_profile_id, requested_by, request_reason, request_status, reviewed_by, reviewed_at)
VALUES ('7c000000-0000-4000-8000-000000000002', current_setting('t.member_pid')::uuid, current_setting('t.citizen_pid')::uuid, 'test', 'approved',
        current_setting('t.founder_pid')::uuid, now());

SET LOCAL ROLE authenticated;

-- ---- T1: a reviewer cannot approve their own case, directly or by assignment ----------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.founder_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    UPDATE public.identity_verification_cases SET status = 'approved' WHERE id = '7c000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'reviewer approved own case by direct write';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.assign_identity_verification_case('7c000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'reviewer assigned own case';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.decide_identity_verification_case('7c000000-0000-4000-8000-000000000001', 'approved', NULL);
    RAISE EXCEPTION 'reviewer decided own case';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%cannot_review_own_case%' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'ok: T1 self-verification closed';
END $$;

-- ---- T3: staff cannot approve emergency access by direct write; only the requester claims ---------------
DO $$
BEGIN
  BEGIN
    UPDATE public.governance_emergency_access_requests SET request_status = 'approved' WHERE id = '7c000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'staff updated an emergency request directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.claim_governance_emergency_access_request_for_impersonation('7c000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'someone other than the requester claimed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: T3 direct approval and foreign claims refused';
END $$;

-- ---- M1 / T2: tables without row security are closed to members ------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['governance_emergency_access_request_events', 'governance_emergency_access_ops_policies',
                                 'gpav_fed_exchange_receipt_policies', 'activation_demographic_feed_worker_escalation_policies',
                                 'agreement_reference_counters', 'identity_verification_providers'] LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', v_table);
      RAISE EXCEPTION 'member read %', v_table;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  BEGIN
    INSERT INTO public.governance_emergency_access_request_events (request_id, event_type, event_message)
    VALUES ('7c000000-0000-4000-8000-000000000002', 'approved', 'forged');
    RAISE EXCEPTION 'member forged an emergency event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: M1/T2 governance tables closed';
END $$;

-- ---- H2: a verified member cannot move birth date or country; an unverified one can --------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.citizen_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET country_code = 'FR' WHERE id = current_setting('t.citizen_pid')::uuid;
    RAISE EXCEPTION 'verified member changed country';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET date_of_birth = '1950-01-01' WHERE id = current_setting('t.citizen_pid')::uuid;
    RAISE EXCEPTION 'verified member changed birth date';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.profiles SET bio = 'still editable' WHERE id = current_setting('t.citizen_pid')::uuid;
  RAISE NOTICE 'ok: H2 verified identity fields locked';
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
UPDATE public.profiles SET country_code = coalesce(country_code, 'AM') WHERE id = current_setting('t.member_pid')::uuid;

-- ---- H1: no option counts while voting is open --------------------------------------------------------------
DO $$
DECLARE v_open uuid;
BEGIN
  SELECT id INTO v_open FROM public.civic_elections WHERE status = 'open' AND voting_closes_at > now() LIMIT 1;
  IF v_open IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.civic_election_public_tallies(v_open) WHERE vote_count IS NOT NULL) THEN
      RAISE EXCEPTION 'option counts published while voting is open';
    END IF;
    PERFORM public.civic_election_participation(v_open);
  END IF;
  BEGIN
    PERFORM public.civic_election_outcome(coalesce(v_open, gen_random_uuid()));
    RAISE EXCEPTION 'member called the outcome function';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: H1 tallies hidden while open';
END $$;

-- ---- phone lookup: opt-in only, capped ------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.lookup_civizen_contacts_by_phone(ARRAY['+37491000222'])) THEN
    RAISE EXCEPTION 'phone lookup found a member who did not opt in';
  END IF;
  RAISE NOTICE 'ok: phone lookup ignores members who did not opt in';
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.citizen_uid'), 'role', 'authenticated')::text, true);
SELECT public.set_my_privacy_settings('{"discoverable_by_phone": true, "show_full_name": false}'::jsonb);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_name text; v_numbers text[];
BEGIN
  SELECT full_name INTO v_name FROM public.lookup_civizen_contacts_by_phone(ARRAY['+37491000222']);
  IF NOT FOUND THEN RAISE EXCEPTION 'opted-in member not found by phone'; END IF;
  IF v_name IS NOT NULL THEN RAISE EXCEPTION 'full name returned although hidden'; END IF;
  SELECT array_agg('+3749100' || lpad(g::text, 4, '0')) INTO v_numbers FROM generate_series(1, 60) g;
  BEGIN
    PERFORM * FROM public.lookup_civizen_contacts_by_phone(v_numbers);
    PERFORM * FROM public.lookup_civizen_contacts_by_phone(v_numbers);
    PERFORM * FROM public.lookup_civizen_contacts_by_phone(v_numbers);
    PERFORM * FROM public.lookup_civizen_contacts_by_phone(v_numbers);
    PERFORM * FROM public.lookup_civizen_contacts_by_phone(v_numbers);
    RAISE EXCEPTION 'phone sweep not limited';
  EXCEPTION WHEN program_limit_exceeded THEN NULL;
  END;
  RAISE NOTICE 'ok: phone lookup opt-in, name hidden, daily limit';
END $$;
RESET ROLE;

-- ---- M2: guests see usernames, never real names ----------------------------------------------------------------
DO $$
BEGIN
  IF public.public_display_name(current_setting('t.citizen_pid')::uuid) NOT LIKE '@%' THEN
    RAISE EXCEPTION 'guest name is not the username';
  END IF;
  IF public.public_display_name(gen_random_uuid()) <> 'Former member' THEN RAISE EXCEPTION 'missing profile not shown as former member'; END IF;
  RAISE NOTICE 'ok: M2 guest names';
END $$;

ROLLBACK;

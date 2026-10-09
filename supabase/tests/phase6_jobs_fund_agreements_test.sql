-- Phase 6 batch 1: a poster edits and withdraws only their own Jobs posting; a Fund inquiry notifies founders;
-- the agreements list carries each party's profile and role.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.founder_pid', (SELECT id::text FROM public.profiles WHERE role::text = 'founder' AND deleted_at IS NULL LIMIT 1), true);

-- ---- Jobs: own posting -----------------------------------------------------------------------------------------
INSERT INTO public.market_job_interests (id, mode, job_types, city, country_code, pay_amount, pay_period, full_name, phone_country_code, phone_number, status, user_id, profile_id)
VALUES ('77777777-7777-4777-8777-777777777771', 'seeker', ARRAY['Carpenter'], 'Yerevan', 'AM', '1000', 'monthly', 'Member Test', '+374', '95000000', 'new',
        current_setting('test.member_uid')::uuid, current_setting('test.member_pid')::uuid);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM public.update_market_job_interest('77777777-7777-4777-8777-777777777771', '{"city": "Gyumri"}'::jsonb);
    RAISE EXCEPTION 'another member edited the posting';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'not_authorized' THEN RAISE EXCEPTION 'expected not_authorized, got %', SQLERRM; END IF;
  END;
  BEGIN
    PERFORM public.withdraw_market_job_interest('77777777-7777-4777-8777-777777777771');
    RAISE EXCEPTION 'another member withdrew the posting';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'not_authorized' THEN RAISE EXCEPTION 'expected not_authorized, got %', SQLERRM; END IF;
  END;
  RAISE NOTICE 'ok: only the poster may edit or withdraw';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
DECLARE r record;
BEGIN
  PERFORM public.update_market_job_interest('77777777-7777-4777-8777-777777777771', '{"city": "Gyumri", "pay_amount": "1200", "job_types": ["Carpenter", "Joiner"]}'::jsonb);
  BEGIN
    PERFORM public.update_market_job_interest('77777777-7777-4777-8777-777777777771', '{"status": "spam"}'::jsonb);
    RAISE EXCEPTION 'status was editable by the poster';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'field_not_editable%' THEN RAISE EXCEPTION 'expected field_not_editable, got %', SQLERRM; END IF;
  END;
  SELECT * INTO r FROM public.market_job_interests WHERE id = '77777777-7777-4777-8777-777777777771';
  IF r.city <> 'Gyumri' OR r.pay_amount <> '1200' OR r.job_types <> ARRAY['Carpenter', 'Joiner'] OR r.status <> 'new' THEN
    RAISE EXCEPTION 'edit not applied: % % % %', r.city, r.pay_amount, r.job_types, r.status;
  END IF;
  PERFORM public.withdraw_market_job_interest('77777777-7777-4777-8777-777777777771');
  SELECT * INTO r FROM public.market_job_interests WHERE id = '77777777-7777-4777-8777-777777777771';
  IF r.status <> 'closed' THEN RAISE EXCEPTION 'withdraw did not close the posting: %', r.status; END IF;
  IF EXISTS (SELECT 1 FROM public.list_public_market_job_listings('seeker', 200) l WHERE l.id = '77777777-7777-4777-8777-777777777771') THEN
    RAISE EXCEPTION 'withdrawn posting still public';
  END IF;
  RAISE NOTICE 'ok: poster edits allowed fields, cannot touch status, withdraw hides the posting';
END $$;
RESET ROLE;

-- ---- Fund: inquiry notifies founders and admins ----------------------------------------------------------------
INSERT INTO public.funding_interest_inquiries (id, lane, full_name, email, organization, currency)
VALUES ('77777777-7777-4777-8777-777777777772', 'donation', 'Inquiry Test', 'inquiry@test.civizen.local', 'Test Org', 'USD');
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.user_notifications
  WHERE notification_type = 'fund_inquiry_received' AND entity_id = '77777777-7777-4777-8777-777777777772'
    AND recipient_profile_id = current_setting('test.founder_pid')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'founder not notified of the inquiry (rows=%)', n; END IF;
  RAISE NOTICE 'ok: founder notified of a new Fund inquiry';
END $$;

-- ---- Agreements: parties carry profile and role -----------------------------------------------------------------
INSERT INTO public.agreements (id, initiator_profile_id, body_markdown, status, title, agreement_type)
VALUES ('77777777-7777-4777-8777-777777777773', current_setting('test.member_pid')::uuid, 'Body', 'active', 'Role test agreement', 'employment');
INSERT INTO public.agreement_parties (agreement_id, party_kind, display_name, profile_id, role_in_agreement, sort_order)
VALUES ('77777777-7777-4777-8777-777777777773', 'civizen_individual', 'Member Test', current_setting('test.member_pid')::uuid, 'employee', 0);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
DECLARE v jsonb; item jsonb;
BEGIN
  v := public.list_accessible_agreements();
  SELECT x INTO item FROM jsonb_array_elements(v) x WHERE x->>'id' = '77777777-7777-4777-8777-777777777773';
  IF item IS NULL THEN RAISE EXCEPTION 'party cannot list the agreement: %', v; END IF;
  IF item->'parties'->0->>'roleInAgreement' <> 'employee' OR item->'parties'->0->>'profileId' <> current_setting('test.member_pid') THEN
    RAISE EXCEPTION 'party role/profile missing: %', item->'parties';
  END IF;
  RAISE NOTICE 'ok: agreements list carries party profile and role';
END $$;
RESET ROLE;

ROLLBACK;

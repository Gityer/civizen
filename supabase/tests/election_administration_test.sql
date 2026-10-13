-- v2 step C2: election administration (reschedule, extend, cancel, two-person certification, audit).
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.ops_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.ops_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

-- fixtures written as the database owner: 'citizen' joins Civic Operations; three live elections
INSERT INTO public.profile_governance_roles (profile_id, domain_key, role_key)
SELECT current_setting('t.ops_pid')::uuid, 'civic_operations', role_key
FROM public.governance_domain_roles WHERE domain_key = 'civic_operations' ORDER BY role_key LIMIT 1;

INSERT INTO public.civic_elections (id, title, summary, body, tier, security_class, status, voting_opens_at, voting_closes_at, metadata)
SELECT v.id, v.title, 'test', 'test', e.tier, e.security_class, v.status::public.civic_election_status, v.opens, v.closes, '{}'::jsonb
FROM (SELECT tier, security_class FROM public.civic_elections LIMIT 1) e,
     (VALUES
       ('7e000000-0000-4000-8000-000000000001'::uuid, 'Open test consultation', 'open', now() - interval '1 day', now() + interval '2 days'),
       ('7e000000-0000-4000-8000-000000000002'::uuid, 'Scheduled test consultation', 'scheduled', now() + interval '1 day', now() + interval '3 days'),
       ('7e000000-0000-4000-8000-000000000003'::uuid, 'Closed test consultation', 'closed', now() - interval '3 days', now() - interval '1 day')
     ) AS v(id, title, status, opens, closes);

SET LOCAL ROLE authenticated;

-- ---- an ordinary member cannot administer elections -----------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF public.my_can_administer_elections() THEN RAISE EXCEPTION 'member is an election administrator'; END IF;
  BEGIN
    PERFORM public.admin_extend_election('7e000000-0000-4000-8000-000000000001', now() + interval '3 days', 'More time please');
    RAISE EXCEPTION 'member extended an election';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM * FROM public.election_admin_list();
    RAISE EXCEPTION 'member listed elections for administration';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: members cannot administer elections';
END $$;

-- ---- the founder extends, reschedules and cancels, with reasons --------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.founder_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_closes timestamptz; v_events integer;
BEGIN
  IF NOT public.my_can_administer_elections() THEN RAISE EXCEPTION 'founder is not an election administrator'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.election_admin_list() l WHERE l.election_id = '7e000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'open election missing from the admin list';
  END IF;

  BEGIN
    PERFORM public.admin_extend_election('7e000000-0000-4000-8000-000000000001', now() + interval '1 day', 'Shorter is not allowed');
    RAISE EXCEPTION 'extension shortened the window';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%extension_must_be_later%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.admin_extend_election('7e000000-0000-4000-8000-000000000001', now() + interval '30 days', 'Too long an extension');
    RAISE EXCEPTION 'extension beyond 14 days accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%extension_too_long%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.admin_extend_election('7e000000-0000-4000-8000-000000000001', now() + interval '4 days', 'no');
    RAISE EXCEPTION 'extension without a reason accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%reason_required%' THEN RAISE; END IF;
  END;
  PERFORM public.admin_extend_election('7e000000-0000-4000-8000-000000000001', now() + interval '4 days', 'Holiday week in several countries');
  SELECT voting_closes_at INTO v_closes FROM public.civic_elections WHERE id = '7e000000-0000-4000-8000-000000000001';
  IF v_closes < now() + interval '3 days' THEN RAISE EXCEPTION 'extension not applied'; END IF;

  BEGIN
    PERFORM public.admin_reschedule_election('7e000000-0000-4000-8000-000000000001', now() + interval '1 day', now() + interval '3 days', 'Cannot move an open vote');
    RAISE EXCEPTION 'open election rescheduled';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%election_not_scheduled%' THEN RAISE; END IF;
  END;
  PERFORM public.admin_reschedule_election('7e000000-0000-4000-8000-000000000002', now() + interval '2 days', now() + interval '5 days', 'Translation not ready yet');

  BEGIN
    PERFORM public.admin_cancel_election('7e000000-0000-4000-8000-000000000002', '');
    RAISE EXCEPTION 'cancel without a reason accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%reason_required%' THEN RAISE; END IF;
  END;
  PERFORM public.admin_cancel_election('7e000000-0000-4000-8000-000000000002', 'Question was worded in a misleading way');
  IF (SELECT status FROM public.civic_elections WHERE id = '7e000000-0000-4000-8000-000000000002') <> 'cancelled' THEN
    RAISE EXCEPTION 'election not cancelled';
  END IF;
  IF public.civic_election_results_published('7e000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'cancelled results published'; END IF;

  SELECT count(*) INTO v_events FROM public.election_admin_history('7e000000-0000-4000-8000-000000000002') h
  WHERE h.event_type IN ('election_rescheduled', 'election_cancelled') AND h.actor_username = 'maturehumanity' AND h.payload ? 'reason';
  IF v_events <> 2 THEN RAISE EXCEPTION 'audit trail incomplete: % events', v_events; END IF;

  -- the founder requests certification of the closed election, and cannot also certify it
  PERFORM public.request_election_certification('7e000000-0000-4000-8000-000000000003', 'Counts checked against receipts');
  BEGIN
    PERFORM public.certify_election('7e000000-0000-4000-8000-000000000003');
    RAISE EXCEPTION 'one person requested and certified';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: extend, reschedule and cancel need reasons and are logged; certification needs a second person';
END $$;

-- ---- a second administrator (Civic Operations) certifies ---------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ops_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT public.my_can_administer_elections() THEN RAISE EXCEPTION 'civic operations member is not an administrator'; END IF;
  PERFORM public.certify_election('7e000000-0000-4000-8000-000000000003');
  IF (SELECT status FROM public.civic_elections WHERE id = '7e000000-0000-4000-8000-000000000003') <> 'certified' THEN
    RAISE EXCEPTION 'election not certified';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.election_admin_history('7e000000-0000-4000-8000-000000000003') h
                 WHERE h.event_type = 'election_certified' AND h.actor_username = 'citizen') THEN
    RAISE EXCEPTION 'certification not logged';
  END IF;
  RAISE NOTICE 'ok: second administrator certified the result';
END $$;

ROLLBACK;

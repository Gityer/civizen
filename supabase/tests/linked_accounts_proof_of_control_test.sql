-- Linked business accounts need proof of control: no client inserts, owner+business handshake,
-- owner approval of access requests, rights only from established rows, business-only lookup.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.owner_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.owner_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.biz_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.biz_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.third_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.third_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.personal_email', (SELECT u.email FROM auth.users u JOIN public.profiles p ON p.user_id = u.id WHERE p.username = 'moderator' LIMIT 1), true);

-- ---- 1. a member cannot write linked_accounts directly any more ------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner_uid'))::text, true);

DO $$
BEGIN
  INSERT INTO public.linked_accounts (owner_profile_id, linked_profile_id, relationship_type, business_name_normalized)
  VALUES (current_setting('test.owner_pid')::uuid, current_setting('test.biz_pid')::uuid, 'business', 'forged co');
  RAISE EXCEPTION 'direct insert accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: direct insert into linked_accounts denied';
END $$;

DO $$
BEGIN
  PERFORM public.complete_business_account_link('not-a-real-token');
  RAISE EXCEPTION 'bogus token accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'invalid_or_expired_link_token' THEN RAISE EXCEPTION 'expected invalid_or_expired_link_token, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: bogus token rejected';
END $$;

-- ---- 2. even a privileged insert needs proof of control ---------------------------------------
RESET ROLE;
DO $$
BEGIN
  INSERT INTO public.linked_accounts (owner_profile_id, linked_profile_id, relationship_type, business_name_normalized)
  VALUES (current_setting('test.owner_pid')::uuid, current_setting('test.biz_pid')::uuid, 'business', 'forged co');
  RAISE EXCEPTION 'unestablished insert accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'linked_account_requires_proof_of_control' THEN RAISE EXCEPTION 'expected linked_account_requires_proof_of_control, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: insert without established_at rejected by the guard trigger';
END $$;

-- ---- 3. handshake: owner begins, business session completes ----------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner_uid'))::text, true);

DO $$
BEGIN
  IF public.current_profile_manages_publisher(current_setting('test.biz_pid')::uuid) THEN
    RAISE EXCEPTION 'owner manages the business before any link';
  END IF;
  RAISE NOTICE 'ok: no publisher rights before the link';
END $$;

SELECT set_config('test.token', public.begin_business_account_link('Proof Test Co', NULL), true);

DO $$
BEGIN
  IF char_length(current_setting('test.token')) < 32 THEN RAISE EXCEPTION 'token too short'; END IF;
  RAISE NOTICE 'ok: owner received a link token';
END $$;

DO $$
BEGIN
  PERFORM public.complete_business_account_link(current_setting('test.token'));
  RAISE EXCEPTION 'owner redeemed own token';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'cannot_link_self' THEN RAISE EXCEPTION 'expected cannot_link_self, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: owner cannot link to itself';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.biz_uid'))::text, true);

DO $$
DECLARE linked uuid;
BEGIN
  linked := public.complete_business_account_link(current_setting('test.token'));
  IF linked <> current_setting('test.biz_pid')::uuid THEN RAISE EXCEPTION 'completed for the wrong profile %', linked; END IF;
  RAISE NOTICE 'ok: business session completed the link';
END $$;

DO $$
BEGIN
  PERFORM public.complete_business_account_link(current_setting('test.token'));
  RAISE EXCEPTION 'token reused';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'invalid_or_expired_link_token' THEN RAISE EXCEPTION 'expected invalid_or_expired_link_token on reuse, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: token is single-use';
END $$;

RESET ROLE;
DO $$
DECLARE r public.linked_accounts%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.linked_accounts
  WHERE owner_profile_id = current_setting('test.owner_pid')::uuid AND linked_profile_id = current_setting('test.biz_pid')::uuid;
  IF r.id IS NULL THEN RAISE EXCEPTION 'link row missing'; END IF;
  IF r.established_via <> 'session_handshake' OR r.established_at IS NULL THEN RAISE EXCEPTION 'link not established: %', r; END IF;
  IF r.business_name_normalized <> 'proof test co' THEN RAISE EXCEPTION 'business name not stored: %', r.business_name_normalized; END IF;
  IF r.established_by_profile_id <> current_setting('test.biz_pid')::uuid THEN RAISE EXCEPTION 'established_by should be the business profile'; END IF;
  RAISE NOTICE 'ok: row established via session_handshake';
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner_uid'))::text, true);
DO $$
BEGIN
  IF NOT public.current_profile_manages_publisher(current_setting('test.biz_pid')::uuid) THEN
    RAISE EXCEPTION 'owner does not manage the linked business';
  END IF;
  IF NOT (current_setting('test.owner_pid')::uuid = ANY (public.linked_account_owner_ids_for_viewer())) THEN
    RAISE EXCEPTION 'owner missing from sibling owner ids';
  END IF;
  RAISE NOTICE 'ok: established link grants publisher rights and sibling visibility';
END $$;

-- a second handshake for the same pair is refused
SELECT set_config('test.token2', public.begin_business_account_link(NULL, current_setting('test.biz_pid')::uuid), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.biz_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.complete_business_account_link(current_setting('test.token2'));
  RAISE EXCEPTION 'duplicate link accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'already_linked' THEN RAISE EXCEPTION 'expected already_linked, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: duplicate link refused';
END $$;

-- ---- 4. a business name maps to one business profile -----------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.third_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.begin_business_account_link('proof   TEST co', NULL);
  RAISE EXCEPTION 'taken business name accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'business_name_taken' THEN RAISE EXCEPTION 'expected business_name_taken, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: taken business name refused for a different profile';
END $$;

-- ---- 5. access request: owner approves, requester becomes a second established owner ---------
INSERT INTO public.business_account_access_requests (target_profile_id, requester_profile_id)
VALUES (current_setting('test.biz_pid')::uuid, current_setting('test.third_pid')::uuid);
SELECT set_config('test.request_id', (SELECT id::text FROM public.business_account_access_requests
  WHERE target_profile_id = current_setting('test.biz_pid')::uuid AND requester_profile_id = current_setting('test.third_pid')::uuid), true);

DO $$
BEGIN
  IF public.current_profile_manages_publisher(current_setting('test.biz_pid')::uuid) THEN
    RAISE EXCEPTION 'requester manages the business before approval';
  END IF;
  RAISE NOTICE 'ok: a pending request grants nothing';
END $$;

-- the requester cannot approve their own request
DO $$
BEGIN
  PERFORM public.review_business_account_access_request(current_setting('test.request_id')::uuid, 'approved');
  RAISE EXCEPTION 'requester approved own request';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'not_business_owner' THEN RAISE EXCEPTION 'expected not_business_owner, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: only an established owner may review';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner_uid'))::text, true);
SELECT public.review_business_account_access_request(current_setting('test.request_id')::uuid, 'approved');

DO $$
BEGIN
  PERFORM public.review_business_account_access_request(current_setting('test.request_id')::uuid, 'rejected');
  RAISE EXCEPTION 'reviewed request reviewed again';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'request_already_reviewed' THEN RAISE EXCEPTION 'expected request_already_reviewed, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: a request is reviewed once';
END $$;

RESET ROLE;
DO $$
DECLARE r public.linked_accounts%ROWTYPE; s text;
BEGIN
  SELECT * INTO r FROM public.linked_accounts
  WHERE owner_profile_id = current_setting('test.third_pid')::uuid AND linked_profile_id = current_setting('test.biz_pid')::uuid;
  IF r.id IS NULL OR r.established_via <> 'owner_approval' THEN RAISE EXCEPTION 'approval did not establish the link: %', r; END IF;
  IF r.business_name_normalized <> 'proof test co' THEN RAISE EXCEPTION 'approved link lost the business name'; END IF;
  SELECT status INTO s FROM public.business_account_access_requests WHERE id = current_setting('test.request_id')::uuid;
  IF s <> 'approved' THEN RAISE EXCEPTION 'request status is %', s; END IF;
  RAISE NOTICE 'ok: approval established the second owner';
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.third_uid'))::text, true);
DO $$
BEGIN
  IF NOT public.current_profile_manages_publisher(current_setting('test.biz_pid')::uuid) THEN
    RAISE EXCEPTION 'approved owner does not manage the business';
  END IF;
  RAISE NOTICE 'ok: approved owner manages the business';
END $$;

-- ---- 6. Connect lookup returns business profiles only -----------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner_uid'))::text, true);
DO $$
DECLARE hits jsonb;
BEGIN
  hits := public.lookup_business_accounts_for_connect(NULL, current_setting('test.personal_email'), 5);
  IF jsonb_array_length(hits) <> 0 THEN RAISE EXCEPTION 'personal e-mail resolved to a profile: %', hits; END IF;
  hits := public.lookup_business_accounts_for_connect('proof test', NULL, 5);
  IF jsonb_array_length(hits) <> 1 OR (hits->0->>'profile_id') <> current_setting('test.biz_pid') THEN
    RAISE EXCEPTION 'business lookup by name failed: %', hits;
  END IF;
  IF (hits->0->>'already_linked_to_requester')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'already_linked flag missing: %', hits; END IF;
  RAISE NOTICE 'ok: lookup exposes business profiles only';
END $$;

RESET ROLE;
ROLLBACK;

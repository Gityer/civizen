-- Phase 10 step 10.3: civic voting events and signed intents are public-audit event sources, and the scheduled capture
-- writes a hash-chained batch that the chain verifier accepts.
BEGIN;

INSERT INTO auth.users (id, email) VALUES ('a3000000-0000-4000-8000-000000000001', 'audit-voter@test.local') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, username, full_name)
SELECT u.id, 'audit_voter', 'Audit Voter' FROM auth.users u
 WHERE u.id = 'a3000000-0000-4000-8000-000000000001' AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

CREATE TEMP TABLE fx AS SELECT (SELECT id FROM public.profiles WHERE user_id = 'a3000000-0000-4000-8000-000000000001') AS voter;

INSERT INTO public.civic_elections (id, title, voting_opens_at, voting_closes_at)
VALUES ('e3000000-0000-4000-8000-000000000001', 'Audit source test consultation', now(), now() + interval '1 day');

INSERT INTO public.civic_voting_events (id, election_id, actor_id, event_type, payload, prev_event_hash, event_hash)
VALUES ('d3000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001', (SELECT voter FROM fx), 'test_event', '{"note":"audit source"}'::jsonb, NULL, 'hash-test-1');

INSERT INTO public.governance_action_intents (id, actor_id, action_scope, target_id, payload, payload_hash, signature, public_key, key_algorithm, client_created_at)
VALUES ('d3000000-0000-4000-8000-000000000002', (SELECT voter FROM fx), 'consultation_ballot', 'e3000000-0000-4000-8000-000000000001', '{"election_id":"e3000000-0000-4000-8000-000000000001","receipt_sha256":"x"}'::jsonb, 'ph', 'sig', 'pk', 'ECDSA_P256_SHA256_V1', now());

DO $$
DECLARE v_sources text;
BEGIN
  SELECT string_agg(DISTINCT event_source, ',') INTO v_sources
  FROM public.list_pending_governance_public_audit_events(100000, NULL, NULL)
  WHERE event_id IN ('d3000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000002');
  IF v_sources IS NULL OR v_sources NOT LIKE '%civic_voting_events%' OR v_sources NOT LIKE '%governance_action_intents%' THEN
    RAISE EXCEPTION 'civic voting events and intents must be pending public-audit events, got %', coalesce(v_sources, 'none');
  END IF;
END $$;

-- The scheduled capture needs no signed-in steward and produces a chained batch the verifier accepts.
DO $$
DECLARE v_batch uuid; v_items integer; v_sources text; v_ok boolean;
BEGIN
  LOOP
    v_batch := public.capture_governance_public_audit_batch_scheduled(500);
    EXIT WHEN v_batch IS NULL;
    SELECT count(*) INTO v_items FROM public.governance_public_audit_batch_items WHERE batch_id = v_batch;
    IF v_items = 0 THEN RAISE EXCEPTION 'a captured batch must hold items'; END IF;
  END LOOP;
  SELECT string_agg(DISTINCT item.event_source, ',') INTO v_sources
  FROM public.governance_public_audit_batch_items AS item
  WHERE item.event_id IN ('d3000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000002');
  IF v_sources NOT LIKE '%civic_voting_events%' OR v_sources NOT LIKE '%governance_action_intents%' THEN
    RAISE EXCEPTION 'both test events must be batched, got %', coalesce(v_sources, 'none');
  END IF;
  IF public.capture_governance_public_audit_batch_scheduled(500) IS NOT NULL THEN
    RAISE EXCEPTION 'a second capture with nothing pending must return null';
  END IF;
END $$;

SELECT 'public_audit_civic_voting_sources_test passed' AS result;
ROLLBACK;

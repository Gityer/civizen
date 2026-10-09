-- Signed governance events (Phase 10 step 10.2): a member stores only their own signed intents, every member can
-- read them, and nobody else can change a member's registered citizen key.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'intent-alice@test.local'),
  ('a1000000-0000-4000-8000-000000000002', 'intent-bob@test.local')
ON CONFLICT (id) DO NOTHING;
-- profiles are created by the auth trigger; make sure both exist either way
INSERT INTO public.profiles (user_id, username, full_name)
SELECT u.id, 'intent_' || split_part(u.email, '@', 1), 'Intent ' || split_part(u.email, '@', 1)
  FROM auth.users u
 WHERE u.id IN ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002')
   AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

CREATE TEMP TABLE intent_fixture AS
SELECT (SELECT id FROM public.profiles WHERE user_id = 'a1000000-0000-4000-8000-000000000001') AS alice,
       (SELECT id FROM public.profiles WHERE user_id = 'a1000000-0000-4000-8000-000000000002') AS bob;

GRANT SELECT ON intent_fixture TO authenticated;

-- Alice registers a key and stores a signed intent for a ballot.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a1000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);

UPDATE public.profiles
   SET citizen_signing_public_key = 'alice-public-key', citizen_signing_key_algorithm = 'ECDSA_P256_SHA256_V1', citizen_signing_key_registered_at = now()
 WHERE id = (SELECT alice FROM intent_fixture);

INSERT INTO public.governance_action_intents (actor_id, action_scope, target_id, payload, payload_hash, signature, public_key, key_algorithm, client_created_at)
VALUES ((SELECT alice FROM intent_fixture), 'consultation_ballot', 'c1000000-0000-4000-8000-000000000001',
        '{"election_id":"c1000000-0000-4000-8000-000000000001","receipt_sha256":"abc"}'::jsonb, 'hash-1', 'sig-1', 'alice-public-key', 'ECDSA_P256_SHA256_V1', now());

-- Alice cannot store an intent in Bob's name.
DO $$
BEGIN
  INSERT INTO public.governance_action_intents (actor_id, action_scope, target_id, payload, payload_hash, signature, public_key, key_algorithm, client_created_at)
  VALUES ((SELECT bob FROM intent_fixture), 'consultation_ballot', 'c1000000-0000-4000-8000-000000000001', '{}'::jsonb, 'hash-x', 'sig-x', 'alice-public-key', 'ECDSA_P256_SHA256_V1', now());
  RAISE EXCEPTION 'insert in another member''s name must be refused';
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN NULL;
END $$;

-- Bob reads Alice's intent (public verification material) but cannot change it.
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a1000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.governance_action_intents
   WHERE action_scope = 'consultation_ballot' AND target_id = 'c1000000-0000-4000-8000-000000000001' AND public_key = 'alice-public-key';
  IF v_count <> 1 THEN RAISE EXCEPTION 'members must be able to read signed intents, got %', v_count; END IF;
END $$;

UPDATE public.governance_action_intents SET signature = 'tampered' WHERE public_key = 'alice-public-key';
DO $$
DECLARE v_sig text;
BEGIN
  SELECT signature INTO v_sig FROM public.governance_action_intents WHERE public_key = 'alice-public-key';
  IF v_sig <> 'sig-1' THEN RAISE EXCEPTION 'another member must not be able to alter a stored signature'; END IF;
END $$;

-- Bob cannot register a key on Alice's profile.
UPDATE public.profiles SET citizen_signing_public_key = 'bob-wrote-this' WHERE id = (SELECT alice FROM intent_fixture);
RESET ROLE;
DO $$
DECLARE v_key text;
BEGIN
  SELECT citizen_signing_public_key INTO v_key FROM public.profiles WHERE id = (SELECT alice FROM intent_fixture);
  IF v_key <> 'alice-public-key' THEN RAISE EXCEPTION 'another member must not be able to change a registered key, got %', v_key; END IF;
END $$;

SELECT 'governance_action_intents_test passed' AS result;
ROLLBACK;

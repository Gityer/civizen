-- Regression checks for 20261006200000_profile_privacy_controls.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priv-a@example.test', '', now(), '{"full_name":"Privacy Alpha","username":"privacy_alpha"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000a8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priv-b@example.test', '', now(), '{"full_name":"Privacy Beta","username":"privacy_beta"}', now(), now());

CREATE TEMP TABLE priv_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000a7') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000a8') AS b;
GRANT SELECT ON priv_ids TO authenticated;

-- B hides from the directory and accepts messages only from endorsement ties.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a8","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.profile_privacy_settings (profile_id, hide_from_directory, message_permission)
SELECT b, true, 'endorsement_ties' FROM priv_ids;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.profile_privacy_settings (profile_id, hide_from_directory)
    SELECT a, true FROM priv_ids;
    RAISE EXCEPTION 'FAIL: member changed someone else''s privacy settings';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a7","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF jsonb_array_length(public.search_civizen_directory('privacy_', NULL, 30)->'people') <> 1 THEN
    RAISE EXCEPTION 'FAIL: hidden member still listed in the directory';
  END IF;
  BEGIN
    PERFORM public.private_get_or_create_direct_conversation((SELECT b FROM priv_ids));
    RAISE EXCEPTION 'FAIL: stranger started a conversation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- After an endorsement, A may start the conversation.
INSERT INTO public.endorsements (endorser_id, endorsed_id, pillar, stars) SELECT a, b, 'culture_ethics', 4 FROM priv_ids;
SET LOCAL ROLE authenticated;
SELECT public.private_get_or_create_direct_conversation((SELECT b FROM priv_ids)) IS NOT NULL AS started;
RESET ROLE;

ROLLBACK;

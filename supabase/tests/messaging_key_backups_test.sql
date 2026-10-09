-- Phase 7 step 7.1: a messaging key backup is readable and writable only by its owner.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('a4000000-0000-4000-8000-000000000001', 'backup-owner@test.local'),
  ('a4000000-0000-4000-8000-000000000002', 'backup-other@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, username, full_name)
SELECT u.id, 'bk_' || split_part(u.email, '@', 1), 'Backup ' || split_part(u.email, '@', 1) FROM auth.users u
 WHERE u.email LIKE 'backup-%@test.local' AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);
CREATE TEMP TABLE fx AS
SELECT (SELECT id FROM public.profiles WHERE user_id = 'a4000000-0000-4000-8000-000000000001') AS owner,
       (SELECT id FROM public.profiles WHERE user_id = 'a4000000-0000-4000-8000-000000000002') AS other;
GRANT SELECT ON fx TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a4000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
INSERT INTO public.messaging_key_backups (profile_id, blob, public_key)
VALUES ((SELECT owner FROM fx), '{"v":1,"salt":"s","iv":"i","ciphertext":"c","public_key":"pk-owner","created_at":"2026-10-09T00:00:00Z"}'::jsonb, 'pk-owner');

-- the owner cannot write a backup in someone else's name
DO $$
BEGIN
  INSERT INTO public.messaging_key_backups (profile_id, blob, public_key)
  VALUES ((SELECT other FROM fx), '{"v":1}'::jsonb, 'pk-x');
  RAISE EXCEPTION 'writing another member''s backup must be refused';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
END $$;

-- another member sees nothing and changes nothing
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a4000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.messaging_key_backups;
  IF v_count <> 0 THEN RAISE EXCEPTION 'another member must not see any backup, saw %', v_count; END IF;
END $$;
UPDATE public.messaging_key_backups SET public_key = 'tampered' WHERE profile_id = (SELECT owner FROM fx);
DELETE FROM public.messaging_key_backups WHERE profile_id = (SELECT owner FROM fx);
RESET ROLE;
DO $$
DECLARE v_key text;
BEGIN
  SELECT public_key INTO v_key FROM public.messaging_key_backups WHERE profile_id = (SELECT owner FROM fx);
  IF v_key IS DISTINCT FROM 'pk-owner' THEN RAISE EXCEPTION 'another member must not alter or delete a backup, got %', coalesce(v_key, 'none'); END IF;
END $$;

-- the owner reads and replaces their own backup
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a4000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
UPDATE public.messaging_key_backups SET public_key = 'pk-owner-2', blob = '{"v":1,"salt":"s2","iv":"i2","ciphertext":"c2","public_key":"pk-owner-2","created_at":"2026-10-09T00:00:00Z"}'::jsonb
 WHERE profile_id = (SELECT owner FROM fx);
DO $$
DECLARE v_key text;
BEGIN
  SELECT public_key INTO v_key FROM public.messaging_key_backups WHERE profile_id = (SELECT owner FROM fx);
  IF v_key <> 'pk-owner-2' THEN RAISE EXCEPTION 'owner must be able to replace the backup'; END IF;
END $$;
RESET ROLE;

SELECT 'messaging_key_backups_test passed' AS result;
ROLLBACK;

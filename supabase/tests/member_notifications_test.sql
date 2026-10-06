-- Regression checks for 20261006210000_member_notifications.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notif-a@example.test', '', now(), '{"full_name":"Notify Alpha","username":"notify_alpha"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notif-b@example.test', '', now(), '{"full_name":"Notify Beta","username":"notify_beta"}', now(), now());

CREATE TEMP TABLE notif_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000b1') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000b2') AS b;
GRANT SELECT ON notif_ids TO authenticated;

-- Endorsement and comment reach the member.
INSERT INTO public.endorsements (endorser_id, endorsed_id, pillar, stars) SELECT a, b, 'culture_ethics', 5 FROM notif_ids;
INSERT INTO public.posts (author_id, content) SELECT b, 'hello' FROM notif_ids;
INSERT INTO public.post_comments (post_id, author_id, content)
SELECT p.id, n.a, 'nice post' FROM public.posts p, notif_ids n WHERE p.author_id = n.b;

DO $$
DECLARE v_b uuid := (SELECT b FROM notif_ids);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = v_b AND notification_type = 'endorsement_received'
                 AND metadata->>'actor_name' = 'Notify Alpha') THEN
    RAISE EXCEPTION 'FAIL: endorsement did not notify';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = v_b AND notification_type = 'post_comment') THEN
    RAISE EXCEPTION 'FAIL: comment did not notify';
  END IF;
END $$;

-- Messages: one unread notification per conversation, and a muted kind writes nothing.
INSERT INTO public.private_conversations (id, kind) VALUES ('00000000-0000-4000-8000-0000000000c1', 'direct');
INSERT INTO public.private_conversation_members (conversation_id, profile_id)
SELECT '00000000-0000-4000-8000-0000000000c1'::uuid, a FROM notif_ids
UNION ALL SELECT '00000000-0000-4000-8000-0000000000c1'::uuid, b FROM notif_ids;
INSERT INTO public.private_messages (conversation_id, sender_id, content)
SELECT '00000000-0000-4000-8000-0000000000c1'::uuid, a, m FROM notif_ids, unnest(ARRAY['one', 'two', 'three']) AS m;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.user_notifications
      WHERE recipient_profile_id = (SELECT b FROM notif_ids) AND notification_type = 'private_message') <> 1 THEN
    RAISE EXCEPTION 'FAIL: messages were not collapsed into one notification';
  END IF;
END $$;

-- B mutes comments; registers a device; A cannot see or remove it.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.notification_preferences (profile_id, comments) SELECT b, false FROM notif_ids;
SELECT public.register_push_device('android', 'token-for-beta-device');
RESET ROLE;

INSERT INTO public.post_comments (post_id, author_id, content)
SELECT p.id, n.a, 'second' FROM public.posts p, notif_ids n WHERE p.author_id = n.b;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.notification_push_devices) THEN
    RAISE EXCEPTION 'FAIL: member can see another member''s devices';
  END IF;
  BEGIN
    PERFORM public.notify_member((SELECT b FROM notif_ids), NULL, 'messages', 'spoof', 'spoof', NULL, NULL, NULL);
    RAISE EXCEPTION 'FAIL: member called notify_member directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.user_notifications
      WHERE recipient_profile_id = (SELECT b FROM notif_ids) AND notification_type = 'post_comment') <> 1 THEN
    RAISE EXCEPTION 'FAIL: muted comment still notified';
  END IF;
END $$;

-- Deleting the account forgets its devices.
UPDATE public.profiles SET deleted_at = now() WHERE id = (SELECT b FROM notif_ids);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.notification_push_devices WHERE profile_id = (SELECT b FROM notif_ids)) THEN
    RAISE EXCEPTION 'FAIL: deleted account kept its push devices';
  END IF;
END $$;

ROLLBACK;

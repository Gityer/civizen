-- Call signalling inboxes: a member can signal only people they share a private conversation with, and
-- only the inbox owner can read their inbox. Exercises the realtime.messages policies the way Realtime
-- does (realtime.topic() from the session setting). Local database only; rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' LIMIT 1), true);
SELECT set_config('test.third_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' LIMIT 1), true);
SELECT set_config('test.third_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' LIMIT 1), true);

-- member and citizen share a direct conversation; verified_member talks to nobody here
INSERT INTO public.private_conversations (id, kind) VALUES ('11111111-1111-4111-8111-111111111111', 'direct');
INSERT INTO public.private_conversation_members (conversation_id, profile_id)
VALUES ('11111111-1111-4111-8111-111111111111', current_setting('test.member_pid')::uuid),
       ('11111111-1111-4111-8111-111111111111', current_setting('test.citizen_pid')::uuid);

-- ---- 1. topic parsing ------------------------------------------------------------------------
DO $$
BEGIN
  IF public.call_inbox_owner('call-inbox:' || current_setting('test.citizen_pid')) <> current_setting('test.citizen_pid')::uuid THEN
    RAISE EXCEPTION 'inbox owner not parsed';
  END IF;
  IF public.call_inbox_owner('messaging-calls') IS NOT NULL OR public.call_inbox_owner('call-inbox:not-a-uuid') IS NOT NULL THEN
    RAISE EXCEPTION 'non-inbox topics must have no owner';
  END IF;
  RAISE NOTICE 'ok: inbox topics parse, other topics do not';
END $$;

-- ---- 2. member signals the citizen (shared conversation) -------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);
SELECT set_config('realtime.topic', 'call-inbox:' || current_setting('test.citizen_pid'), true);
INSERT INTO realtime.messages (topic, extension, payload, event, private)
VALUES ('call-inbox:' || current_setting('test.citizen_pid'), 'broadcast', '{"type":"invite"}'::jsonb, 'signal', true);
DO $$ BEGIN RAISE NOTICE 'ok: member can signal a conversation partner'; END $$;

-- ---- 3. member cannot signal a stranger ------------------------------------------------------
SELECT set_config('realtime.topic', 'call-inbox:' || current_setting('test.third_pid'), true);
DO $$
BEGIN
  INSERT INTO realtime.messages (topic, extension, payload, event, private)
  VALUES ('call-inbox:' || current_setting('test.third_pid'), 'broadcast', '{"type":"invite"}'::jsonb, 'signal', true);
  RAISE EXCEPTION 'stranger inbox accepted a signal';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot signal a stranger';
END $$;

-- the old shared topic is not a valid destination either
SELECT set_config('realtime.topic', 'messaging-calls', true);
DO $$
BEGIN
  INSERT INTO realtime.messages (topic, extension, payload, event, private)
  VALUES ('messaging-calls', 'broadcast', '{"type":"invite"}'::jsonb, 'signal', true);
  RAISE EXCEPTION 'shared topic accepted a private signal';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: the shared topic is closed for private signals';
END $$;

-- ---- 4. only the inbox owner reads the inbox ------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'), 'role', 'authenticated')::text, true);
SELECT set_config('realtime.topic', 'call-inbox:' || current_setting('test.citizen_pid'), true);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM realtime.messages WHERE topic = 'call-inbox:' || current_setting('test.citizen_pid');
  IF n <> 1 THEN RAISE EXCEPTION 'owner sees % rows, expected 1', n; END IF;
  RAISE NOTICE 'ok: inbox owner reads their inbox';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.third_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM realtime.messages WHERE topic = 'call-inbox:' || current_setting('test.citizen_pid');
  IF n <> 0 THEN RAISE EXCEPTION 'stranger sees % rows of another inbox', n; END IF;
  RAISE NOTICE 'ok: a stranger reads nothing from that inbox';
END $$;

RESET ROLE;
ROLLBACK;

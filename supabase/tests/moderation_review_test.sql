-- Regression checks for 20261006220000_moderation_review.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod-reporter@example.test', '', now(), '{"full_name":"Mod Reporter","username":"mod_reporter"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod-author@example.test', '', now(), '{"full_name":"Mod Author","username":"mod_author"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod-reviewer@example.test', '', now(), '{"full_name":"Mod Reviewer","username":"mod_reviewer"}', now(), now());

CREATE TEMP TABLE mod_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d1') AS reporter,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d2') AS author,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d3') AS reviewer;
GRANT SELECT ON mod_ids TO authenticated;

UPDATE public.profiles SET role = 'moderator' WHERE id = (SELECT reviewer FROM mod_ids);
INSERT INTO public.posts (id, author_id, content) SELECT '00000000-0000-4000-8000-0000000000e1', author, 'bad post' FROM mod_ids;
INSERT INTO public.reports (id, reporter_id, reported_user_id, reason, status, report_context)
SELECT '00000000-0000-4000-8000-0000000000e2', reporter, author, 'spam', 'pending',
       jsonb_build_object('source', 'post', 'post_id', '00000000-0000-4000-8000-0000000000e1')
FROM mod_ids;
INSERT INTO public.reports (id, reporter_id, reported_user_id, reason, status, report_context)
SELECT '00000000-0000-4000-8000-0000000000e3', reporter, author, 'rude', 'pending', jsonb_build_object('source', 'profile')
FROM mod_ids;

-- The reporter cannot remove the post.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.moderation_remove_reported_post('00000000-0000-4000-8000-0000000000e2');
    RAISE EXCEPTION 'FAIL: reporter removed a post';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- The moderator removes the post and dismisses the other report.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d3","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.moderation_remove_reported_post('00000000-0000-4000-8000-0000000000e2', 'Spam link');
UPDATE public.reports SET status = 'dismissed' WHERE id = '00000000-0000-4000-8000-0000000000e3';
RESET ROLE;

DO $$
DECLARE
  v_reviewer uuid := (SELECT reviewer FROM mod_ids);
  v_reporter uuid := (SELECT reporter FROM mod_ids);
BEGIN
  IF EXISTS (SELECT 1 FROM public.posts WHERE id = '00000000-0000-4000-8000-0000000000e1') THEN
    RAISE EXCEPTION 'FAIL: post still exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reports WHERE id = '00000000-0000-4000-8000-0000000000e2'
                 AND status = 'resolved' AND reviewed_by = v_reviewer AND resolved_at IS NOT NULL
                 AND admin_notes LIKE 'Post removed.%Spam link') THEN
    RAISE EXCEPTION 'FAIL: report not closed with reviewer and note';
  END IF;
  IF (SELECT count(*) FROM public.user_notifications
      WHERE recipient_profile_id = v_reporter AND notification_type IN ('report_resolved', 'report_dismissed')) <> 2 THEN
    RAISE EXCEPTION 'FAIL: reporter was not told about both outcomes';
  END IF;
END $$;

ROLLBACK;

-- Identity verification, in-house and live (owner decisions 2026-10-30):
--   * no third-party provider: everything below runs on Civizen's own systems;
--   * verification stays optional at registration, but an unverified member who tries to post, comment, raise or join
--     a Matter, message a person, support a proposal, vote, sign an agreement, and so on, is stopped and taken through
--     verification first (decision D2's advisory ballots end: a ballot now needs a verified identity);
--   * real time: the member records a short live video while saying and doing a random challenge issued by the server,
--     photographs the identity document and enters its machine-readable zone (MRZ, the ICAO 9303 lines every passport
--     and most identity cards carry); the server checks the challenge, the MRZ check digits, the document's expiry, the
--     match with the profile, and that the document is not already used by another account; the case then reaches the
--     Identity Verification reviewers at once.
-- A business account counts as verified when its verified owner stands behind it. Service-role writes (AI agents,
-- scheduled jobs) are never stopped.

-- ---------------------------------------------------------------------------------------------
-- 1. The gate
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profile_identity_verified(p_profile uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT is_verified OR coalesce(is_system_agent, false) FROM public.profiles WHERE id = p_profile), false)
      OR EXISTS (SELECT 1 FROM public.linked_accounts la JOIN public.profiles o ON o.id = la.owner_profile_id
                  WHERE la.linked_profile_id = p_profile AND la.relationship_type = 'business' AND la.established_at IS NOT NULL
                    AND o.is_verified);
$$;
REVOKE ALL ON FUNCTION public.profile_identity_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_identity_verified(uuid) TO authenticated;

-- Raises SQLSTATE PT403 (HTTP 403) with DETAIL 'verification_required' and the action in HINT when the signed-in member
-- is not verified. Writes made without a member (service role, scheduled jobs) pass.
CREATE OR REPLACE FUNCTION public.require_verified_identity(p_action text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
BEGIN
  IF v_me IS NULL OR public.profile_identity_verified(v_me) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'verification_required' USING ERRCODE = 'PT403', DETAIL = 'verification_required', HINT = p_action;
END;
$$;
REVOKE ALL ON FUNCTION public.require_verified_identity(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verification_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- a conversation with Civi (a system agent) stays open, so an unverified member can still ask for help
  IF TG_TABLE_NAME = 'private_messages' THEN
    IF EXISTS (SELECT 1 FROM public.private_conversation_members m JOIN public.profiles p ON p.id = m.profile_id
                WHERE m.conversation_id = NEW.conversation_id AND coalesce(p.is_system_agent, false)) THEN
      RETURN NEW;
    END IF;
  END IF;
  PERFORM public.require_verified_identity(TG_ARGV[0]);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.verification_before_write() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('posts', 'post'), ('post_comments', 'comment'), ('post_reposts', 'post'),
    ('matters', 'matter'), ('matter_comments', 'comment'), ('matter_attachments', 'matter'),
    ('solution_problems', 'solution'), ('solution_comments', 'comment'), ('solution_proposal_endorsements', 'support'),
    ('community_challenges', 'challenge'), ('challenge_proposals', 'challenge'),
    ('knowledge_spaces', 'knowledge'), ('knowledge_resources', 'knowledge'), ('knowledge_gaps', 'knowledge'),
    ('private_messages', 'message'), ('endorsements', 'support'), ('market_job_interests', 'job'),
    ('civic_voting_proposals', 'proposal'), ('civic_voting_proposal_support', 'support'),
    ('civic_ballots', 'vote'), ('governance_proposal_votes', 'vote'),
    ('law_contributions', 'contribution'), ('agreements', 'agreement'), ('agreement_signatures', 'agreement')
  ) AS t(tbl, action)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS verification_required ON public.%I', r.tbl);
      EXECUTE format('CREATE TRIGGER verification_required BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.verification_before_write(%L)',
                     r.tbl, r.action);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------
-- 2. Machine-readable zone (ICAO 9303): check digits and fields, in-house
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mrz_check_digit(p_value text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_sum integer := 0;
  v_char text;
  v_value integer;
  v_weights integer[] := ARRAY[7, 3, 1];
BEGIN
  FOR i IN 1..length(p_value) LOOP
    v_char := substr(p_value, i, 1);
    v_value := CASE
      WHEN v_char ~ '[0-9]' THEN v_char::integer
      WHEN v_char ~ '[A-Z]' THEN ascii(v_char) - 55
      ELSE 0 END;
    v_sum := v_sum + v_value * v_weights[((i - 1) % 3) + 1];
  END LOOP;
  RETURN v_sum % 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.mrz_digit_ok(p_field text, p_digit text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p_digit = '<' THEN p_field ~ '^<*$' ELSE p_digit ~ '^[0-9]$' AND public.mrz_check_digit(p_field) = p_digit::integer END;
$$;

CREATE OR REPLACE FUNCTION public.mrz_date(p_yymmdd text, p_kind text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_year integer;
BEGIN
  IF p_yymmdd !~ '^[0-9]{6}$' THEN
    RETURN NULL;
  END IF;
  v_year := substr(p_yymmdd, 1, 2)::integer;
  -- birth dates in the future belong to the previous century; expiry dates are always this century
  v_year := CASE WHEN p_kind = 'birth' AND 2000 + v_year > extract(year FROM current_date)::integer THEN 1900 + v_year ELSE 2000 + v_year END;
  RETURN make_date(v_year, substr(p_yymmdd, 3, 2)::integer, substr(p_yymmdd, 5, 2)::integer);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Parses and checks an MRZ (TD3 passports: 2 x 44; TD2: 2 x 36; TD1 identity cards: 3 x 30).
CREATE OR REPLACE FUNCTION public.parse_mrz(p_mrz text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_lines text[];
  l1 text; l2 text; l3 text;
  v_format text;
  v_number text; v_number_cd text; v_birth text; v_birth_cd text; v_expiry text; v_expiry_cd text;
  v_nationality text; v_issuer text; v_sex text; v_names text; v_composite text; v_composite_cd text;
  v_optional text; v_optional_cd text;
  v_errors text[] := '{}';
BEGIN
  v_lines := ARRAY(SELECT x FROM unnest(regexp_split_to_array(upper(regexp_replace(coalesce(p_mrz, ''), '[ \t\r]', '', 'g')), '\n+')) x WHERE x <> '');
  IF cardinality(v_lines) = 2 AND length(v_lines[1]) = 44 AND length(v_lines[2]) = 44 THEN
    v_format := 'TD3';
  ELSIF cardinality(v_lines) = 2 AND length(v_lines[1]) = 36 AND length(v_lines[2]) = 36 THEN
    v_format := 'TD2';
  ELSIF cardinality(v_lines) = 3 AND length(v_lines[1]) = 30 AND length(v_lines[2]) = 30 AND length(v_lines[3]) = 30 THEN
    v_format := 'TD1';
  ELSE
    RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array('format'));
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_lines) x WHERE x !~ '^[A-Z0-9<]+$') THEN
    RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array('characters'));
  END IF;
  l1 := v_lines[1]; l2 := v_lines[2]; l3 := v_lines[3];
  IF v_format IN ('TD3', 'TD2') THEN
    v_issuer := substr(l1, 3, 3);
    v_names := substr(l1, 6);
    v_number := substr(l2, 1, 9); v_number_cd := substr(l2, 10, 1);
    v_nationality := substr(l2, 11, 3);
    v_birth := substr(l2, 14, 6); v_birth_cd := substr(l2, 20, 1);
    v_sex := substr(l2, 21, 1);
    v_expiry := substr(l2, 22, 6); v_expiry_cd := substr(l2, 28, 1);
    IF v_format = 'TD3' THEN
      v_optional := substr(l2, 29, 14); v_optional_cd := substr(l2, 43, 1);
      v_composite := substr(l2, 1, 10) || substr(l2, 14, 7) || substr(l2, 22, 22); v_composite_cd := substr(l2, 44, 1);
      IF NOT public.mrz_digit_ok(v_optional, v_optional_cd) THEN v_errors := v_errors || 'personal_number'::text; END IF;
    ELSE
      v_composite := substr(l2, 1, 10) || substr(l2, 14, 7) || substr(l2, 22, 14); v_composite_cd := substr(l2, 36, 1);
    END IF;
  ELSE
    v_issuer := substr(l1, 3, 3);
    v_number := substr(l1, 6, 9); v_number_cd := substr(l1, 15, 1);
    v_birth := substr(l2, 1, 6); v_birth_cd := substr(l2, 7, 1);
    v_sex := substr(l2, 8, 1);
    v_expiry := substr(l2, 9, 6); v_expiry_cd := substr(l2, 15, 1);
    v_nationality := substr(l2, 16, 3);
    v_composite := substr(l1, 6, 25) || substr(l2, 1, 7) || substr(l2, 9, 7) || substr(l2, 19, 11); v_composite_cd := substr(l2, 30, 1);
    v_names := l3;
  END IF;
  IF NOT public.mrz_digit_ok(v_number, v_number_cd) THEN v_errors := v_errors || 'document_number'::text; END IF;
  IF NOT public.mrz_digit_ok(v_birth, v_birth_cd) THEN v_errors := v_errors || 'birth_date'::text; END IF;
  IF NOT public.mrz_digit_ok(v_expiry, v_expiry_cd) THEN v_errors := v_errors || 'expiry_date'::text; END IF;
  IF NOT public.mrz_digit_ok(v_composite, v_composite_cd) THEN v_errors := v_errors || 'composite'::text; END IF;
  RETURN jsonb_build_object(
    'valid', cardinality(v_errors) = 0, 'errors', to_jsonb(v_errors), 'format', v_format,
    'document_code', rtrim(substr(l1, 1, 2), '<'), 'issuing_state', replace(v_issuer, '<', ''), 'nationality', replace(v_nationality, '<', ''),
    'document_number', rtrim(v_number, '<'), 'birth_date', public.mrz_date(v_birth, 'birth'), 'expiry_date', public.mrz_date(v_expiry, 'expiry'),
    'sex', replace(v_sex, '<', ''),
    'surname', btrim(replace(split_part(v_names, '<<', 1), '<', ' ')),
    'given_names', btrim(regexp_replace(replace(substr(v_names, length(split_part(v_names, '<<', 1)) + 3), '<', ' '), '\s+', ' ', 'g')));
END;
$$;
REVOKE ALL ON FUNCTION public.parse_mrz(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parse_mrz(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. One identity, one account: a keyed fingerprint of the document, not the number itself
-- ---------------------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS civizen_private;
REVOKE ALL ON SCHEMA civizen_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS civizen_private.identity_hash_key (id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), key bytea NOT NULL);
INSERT INTO civizen_private.identity_hash_key (id, key) VALUES (1, extensions.gen_random_bytes(32)) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.identity_document_fingerprint(p_issuing_state text, p_document_number text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.hmac(convert_to(upper(coalesce(p_issuing_state, '')) || ':' || upper(coalesce(p_document_number, '')), 'UTF8'),
                                (SELECT key FROM civizen_private.identity_hash_key WHERE id = 1), 'sha256'), 'hex');
$$;
REVOKE ALL ON FUNCTION public.identity_document_fingerprint(text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. The live flow
-- ---------------------------------------------------------------------------------------------
-- Opens (or reopens) the member's case and issues a fresh random challenge, valid 10 minutes. The challenge is kept on
-- the server, so the recording can be checked against what was actually asked.
CREATE OR REPLACE FUNCTION public.start_live_verification()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_case public.identity_verification_cases%ROWTYPE;
  v_code text := lpad((floor(random() * 1000))::integer::text, 3, '0') || '-' || lpad((floor(random() * 1000))::integer::text, 3, '0');
  v_moves text[] := ARRAY['left', 'right', 'up', 'down'];
  v_actions text[];
  v_challenge jsonb;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF public.profile_identity_verified(v_me) THEN
    RETURN jsonb_build_object('status', 'verified');
  END IF;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE profile_id = v_me;
  IF FOUND AND v_case.status IN ('submitted', 'in_review') THEN
    RETURN jsonb_build_object('status', v_case.status, 'case_id', v_case.id, 'submitted_at', v_case.submitted_at);
  END IF;
  v_actions := ARRAY[v_moves[1 + floor(random() * 4)::integer], v_moves[1 + floor(random() * 4)::integer]];
  v_challenge := jsonb_build_object('code', v_code, 'moves', to_jsonb(v_actions), 'issued_at', now(), 'expires_at', now() + interval '10 minutes');
  IF NOT FOUND THEN
    INSERT INTO public.identity_verification_cases (profile_id, status, verification_method, metadata)
    VALUES (v_me, 'draft', 'in_house_live', jsonb_build_object('challenge', v_challenge))
    RETURNING * INTO v_case;
  ELSE
    UPDATE public.identity_verification_cases
       SET status = 'draft', verification_method = 'in_house_live',
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('challenge', v_challenge), updated_at = now()
     WHERE id = v_case.id
    RETURNING * INTO v_case;
  END IF;
  RETURN jsonb_build_object('status', 'draft', 'case_id', v_case.id, 'challenge', v_challenge);
END;
$$;
REVOKE ALL ON FUNCTION public.start_live_verification() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_live_verification() TO authenticated;

-- Submits the live recording and document photo (already uploaded to the member's own folder in the private bucket),
-- with the MRZ and the member's explicit consent to the processing of their face and document images (decision L4).
DROP FUNCTION IF EXISTS public.submit_live_verification(text, text, text, text);
-- p_device_checks: what the member's own device measured (no images leave the device for analysis):
--   liveness: { passed, moves_requested, moves_seen, blinks, duration_ms }
--   face_match: { distance, passed }  (euclidean distance between face descriptors of the live frames and the document)
-- They are signals for the reviewer, never a decision on their own: a modified device could report anything.
CREATE OR REPLACE FUNCTION public.submit_live_verification(p_video_path text, p_document_path text, p_mrz text, p_consent_version text,
                                                           p_device_checks jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_profile public.profiles%ROWTYPE;
  v_case public.identity_verification_cases%ROWTYPE;
  v_mrz jsonb := public.parse_mrz(p_mrz);
  v_flags text[] := '{}';
  v_fingerprint text;
  v_duplicate uuid;
  v_prefix text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_me;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE profile_id = v_me FOR UPDATE;
  IF NOT FOUND OR v_case.status <> 'draft' OR v_case.metadata -> 'challenge' IS NULL THEN
    RAISE EXCEPTION 'start_first' USING ERRCODE = '22023';
  END IF;
  IF (v_case.metadata -> 'challenge' ->> 'expires_at')::timestamptz < now() THEN
    RAISE EXCEPTION 'challenge_expired' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(p_consent_version), '') IS NULL THEN
    RAISE EXCEPTION 'consent_required' USING ERRCODE = '22023';
  END IF;
  IF NOT (v_mrz ->> 'valid')::boolean THEN
    RAISE EXCEPTION 'mrz_invalid' USING ERRCODE = '22023', DETAIL = (v_mrz -> 'errors')::text;
  END IF;
  IF (v_mrz ->> 'expiry_date')::date < current_date THEN
    RAISE EXCEPTION 'document_expired' USING ERRCODE = '22023';
  END IF;
  -- both files must be the member's own uploads, in this case's folder
  v_prefix := v_me::text || '/' || v_case.id::text || '/';
  IF left(coalesce(p_video_path, ''), length(v_prefix)) <> v_prefix OR left(coalesce(p_document_path, ''), length(v_prefix)) <> v_prefix
     OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'identity-verification' AND name = p_video_path)
     OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'identity-verification' AND name = p_document_path) THEN
    RAISE EXCEPTION 'media_missing' USING ERRCODE = '22023';
  END IF;
  -- what the reviewer should look at: differences between the document and the profile
  IF v_profile.date_of_birth IS NOT NULL AND v_profile.date_of_birth <> (v_mrz ->> 'birth_date')::date THEN
    v_flags := v_flags || 'birth_date_differs'::text;
  END IF;
  IF (v_mrz ->> 'birth_date')::date > current_date - interval '16 years' THEN
    v_flags := v_flags || 'under_16'::text;
  END IF;
  IF coalesce(v_profile.full_name, '') <> '' AND NOT (
       position(lower(split_part(v_mrz ->> 'surname', ' ', 1)) IN lower(v_profile.full_name)) > 0) THEN
    v_flags := v_flags || 'name_differs'::text;
  END IF;
  IF NOT coalesce((p_device_checks -> 'liveness' ->> 'passed')::boolean, false) THEN
    v_flags := v_flags || 'liveness_not_passed'::text;
  END IF;
  IF NOT coalesce((p_device_checks -> 'face_match' ->> 'passed')::boolean, false) THEN
    v_flags := v_flags || 'face_match_not_passed'::text;
  END IF;
  -- the device must have tested the moves this server asked for, not others
  IF (p_device_checks -> 'liveness' -> 'moves_requested') IS DISTINCT FROM (v_case.metadata -> 'challenge' -> 'moves') THEN
    v_flags := v_flags || 'challenge_mismatch'::text;
  END IF;
  v_fingerprint := public.identity_document_fingerprint(v_mrz ->> 'issuing_state', v_mrz ->> 'document_number');
  SELECT c.profile_id INTO v_duplicate FROM public.identity_verification_artifacts a
    JOIN public.identity_verification_cases c ON c.id = a.case_id
   WHERE a.artifact_hash = v_fingerprint AND c.profile_id <> v_me AND c.status IN ('submitted', 'in_review', 'approved')
   LIMIT 1;
  IF v_duplicate IS NOT NULL THEN
    v_flags := v_flags || 'document_used_by_another_account'::text;
  END IF;
  DELETE FROM public.identity_verification_artifacts WHERE case_id = v_case.id AND artifact_kind IN ('live_presence', 'supporting_document', 'duplicate_check');
  INSERT INTO public.identity_verification_artifacts (case_id, artifact_kind, storage_path, artifact_hash, metadata, created_by) VALUES
    (v_case.id, 'live_presence', p_video_path, NULL, jsonb_build_object('challenge', v_case.metadata -> 'challenge', 'source', 'in_house_live',
                       'device_checks', coalesce(p_device_checks, '{}'::jsonb), 'flags', to_jsonb(v_flags)), v_me),
    (v_case.id, 'supporting_document', p_document_path, NULL, jsonb_build_object(
       'format', v_mrz ->> 'format', 'document_code', v_mrz ->> 'document_code', 'issuing_state', v_mrz ->> 'issuing_state',
       'expiry_date', v_mrz ->> 'expiry_date', 'birth_date', v_mrz ->> 'birth_date', 'surname', v_mrz ->> 'surname',
       'given_names', v_mrz ->> 'given_names', 'sex', v_mrz ->> 'sex', 'nationality', v_mrz ->> 'nationality'), v_me),
    (v_case.id, 'duplicate_check', 'fingerprint', v_fingerprint, jsonb_build_object('duplicate_of', v_duplicate), v_me);
  UPDATE public.identity_verification_cases
     SET status = 'submitted', submitted_at = now(), live_verification_completed = true, personal_info_completed = true,
         discrepancy_flags = v_flags,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'consent', jsonb_build_object('version', btrim(p_consent_version), 'given_at', now()),
           'device_checks', coalesce(p_device_checks, '{}'::jsonb),
           'live_submitted_at', now(), 'duplicate_of_profile_id', v_duplicate),
         updated_at = now()
   WHERE id = v_case.id;
  -- the reviewers see it at once: an item in the Identity Verification Lead's queue (and whoever answers for it)
  UPDATE public.org_position_items SET status = 'done', resolution = 'Resubmitted', resolved_at = now(), updated_at = now()
   WHERE source_type = 'identity_verification' AND source_ref = v_case.id::text AND status IN ('open', 'in_progress', 'waiting');
  WITH item AS (
    INSERT INTO public.org_position_items (position_key, kind, title, body, recommendation, priority, source_type, source_ref)
    VALUES ('verification_lead', 'review', 'Verify identity: ' || coalesce(nullif(v_profile.full_name, ''), v_profile.username, 'a member'),
            'Live recording and document submitted ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' UTC.'
              || CASE WHEN cardinality(v_flags) > 0 THEN E'\nTo check: ' || array_to_string(v_flags, ', ') ELSE '' END,
            'Open the Steward console, Verifications: watch the recording (the person says the code and turns as asked), compare the face with the document photo, then approve or reject with a reason.',
            CASE WHEN cardinality(v_flags) > 0 THEN 'high' ELSE 'normal' END, 'identity_verification', v_case.id::text)
    RETURNING id, title)
  INSERT INTO public.org_position_log (position_key, item_id, event, body) SELECT 'verification_lead', id, 'item_opened', title FROM item;
  PERFORM public.org_notify_position('verification_lead',
    (SELECT id FROM public.org_position_items WHERE source_type = 'identity_verification' AND source_ref = v_case.id::text ORDER BY created_at DESC LIMIT 1),
    'An identity verification is waiting');
  RETURN jsonb_build_object('status', 'submitted', 'case_id', v_case.id, 'flags', to_jsonb(v_flags));
END;
$$;
REVOKE ALL ON FUNCTION public.submit_live_verification(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_live_verification(text, text, text, text, jsonb) TO authenticated;

-- What the member needs to know about their verification.
CREATE OR REPLACE FUNCTION public.my_verification_state()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'verified', public.profile_identity_verified(public.current_profile_id()),
    'status', c.status, 'submitted_at', c.submitted_at,
    'last_decision', c.metadata -> 'last_decision', 'info_requests', c.metadata -> 'info_requests')
    FROM (SELECT 1) one
    LEFT JOIN public.identity_verification_cases c ON c.profile_id = public.current_profile_id();
$$;
REVOKE ALL ON FUNCTION public.my_verification_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_verification_state() TO authenticated;

-- When a reviewer decides, close the reviewers' position item for the member's case.
CREATE OR REPLACE FUNCTION public.identity_verification_close_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.org_position_items
       SET status = 'done', resolution = 'Decided: ' || NEW.status::text, resolved_at = now(), updated_at = now()
     WHERE source_type = 'identity_verification' AND source_ref = NEW.id::text AND status IN ('open', 'in_progress', 'waiting');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.identity_verification_close_items() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS identity_verification_close_items ON public.identity_verification_cases;
CREATE TRIGGER identity_verification_close_items AFTER UPDATE OF status ON public.identity_verification_cases
  FOR EACH ROW EXECUTE FUNCTION public.identity_verification_close_items();

-- ---------------------------------------------------------------------------------------------
-- 5. Evidence is frozen once submitted (trust and safety finding T10): artifacts are written only by the functions
--    above; members read their own, reviewers read what they review.
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'identity_verification_artifacts' AND cmd <> 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.identity_verification_artifacts', r.policyname);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.identity_verification_artifacts FROM authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Consultations: a ballot needs a verified identity (owner decision 2026-10-30, replacing the advisory ballots of
--    decision D2); eligibility says so before the member tries, so the ballot page can send them to verification.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consultation_eligibility_reason(p_election_id uuid, p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text := public.consultation_eligibility_reason_core(p_election_id, p_profile_id);
BEGIN
  IF v_reason IS NULL AND p_profile_id IS NOT NULL AND public.profile_is_business_account(p_profile_id) THEN
    RETURN 'business_account';
  END IF;
  IF v_reason IS NULL AND p_profile_id IS NOT NULL AND NOT public.profile_identity_verified(p_profile_id) THEN
    RETURN 'verification_required';
  END IF;
  RETURN v_reason;
END;
$$;
REVOKE ALL ON FUNCTION public.consultation_eligibility_reason(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 7. The identity bucket takes only what verification needs: photos, PDFs and the short live recording
-- ---------------------------------------------------------------------------------------------
UPDATE storage.buckets
   SET file_size_limit = 26214400,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/webm', 'video/mp4']
 WHERE id = 'identity-verification';

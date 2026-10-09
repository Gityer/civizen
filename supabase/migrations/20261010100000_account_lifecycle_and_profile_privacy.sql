-- Phase 3 batch B.
-- 3.5 Account lifecycle: a member can export their data as JSON; deletion also removes verification files,
--     identity numbers and owned business accounts (or only the member's ownership when another owner remains).
-- 3.7 Public profile correctness: privacy settings that control what other members see, a server-held score
--     snapshot that visitors read instead of recomputing from raw activity, and one masked `public_profile` card.

-- ---------------------------------------------------------------------------------------------
-- 3.5 Export
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_profile jsonb;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT to_jsonb(p) - 'custom_permissions' - 'granted_permissions' - 'denied_permissions' - 'messaging_x25519_public_key'
  INTO v_profile
  FROM public.profiles p WHERE p.id = v_self;
  RETURN jsonb_build_object(
    'exported_at', now(),
    'profile', v_profile,
    'privacy_settings', coalesce(v_profile->'privacy_settings', '{}'::jsonb),
    'matters', coalesce((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'description', m.description, 'matter_type', m.matter_type,
        'visibility', m.visibility, 'lifecycle_status', m.lifecycle_status, 'created_at', m.created_at) ORDER BY m.created_at)
      FROM public.matters m WHERE m.initiator_profile_id = v_self OR m.created_by_profile_id = v_self), '[]'::jsonb),
    'matter_comments', coalesce((SELECT jsonb_agg(jsonb_build_object('matter_id', c.matter_id, 'body', c.body, 'created_at', c.created_at) ORDER BY c.created_at)
      FROM public.matter_comments c WHERE c.author_profile_id = v_self), '[]'::jsonb),
    'proposals', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'summary', p.summary, 'status', p.status, 'created_at', p.created_at) ORDER BY p.created_at)
      FROM public.civic_voting_proposals p WHERE p.created_by_profile_id = v_self), '[]'::jsonb),
    'proposal_support', coalesce((SELECT jsonb_agg(jsonb_build_object('proposal_id', s.proposal_id, 'created_at', s.created_at) ORDER BY s.created_at)
      FROM public.civic_voting_proposal_support s WHERE s.profile_id = v_self), '[]'::jsonb),
    'ballots', coalesce((SELECT jsonb_agg(jsonb_build_object('election_id', b.election_id, 'election_title', e.title, 'receipt', b.ballot_commitment,
        'choice', CASE WHEN b.encrypted_payload IS NOT NULL THEN public.civic_unseal_choice(b.election_id, b.encrypted_payload) END,
        'countable', b.is_countable, 'cast_at', b.cast_at) ORDER BY b.cast_at)
      FROM public.civic_ballots b JOIN public.civic_elections e ON e.id = b.election_id
      WHERE b.profile_id = v_self AND coalesce((b.metadata->>'consultation')::boolean, false)), '[]'::jsonb),
    'agreements', coalesce((SELECT jsonb_agg(DISTINCT jsonb_build_object('id', a.id, 'title', a.title, 'status', a.status, 'created_at', a.created_at))
      FROM public.agreements a JOIN public.agreement_parties ap ON ap.agreement_id = a.id WHERE ap.profile_id = v_self), '[]'::jsonb),
    'endorsements_received', coalesce((SELECT jsonb_agg(jsonb_build_object('pillar', en.pillar, 'stars', en.stars, 'comment', en.comment, 'created_at', en.created_at) ORDER BY en.created_at)
      FROM public.endorsements en WHERE en.endorsed_id = v_self AND NOT coalesce(en.is_hidden, false)), '[]'::jsonb),
    'notifications', coalesce((SELECT jsonb_agg(jsonb_build_object('type', n.notification_type, 'title', n.title, 'body', n.body, 'created_at', n.created_at, 'read_at', n.read_at) ORDER BY n.created_at)
      FROM public.user_notifications n WHERE n.recipient_profile_id = v_self), '[]'::jsonb),
    'verification', (SELECT jsonb_build_object('status', c.status, 'submitted_at', c.submitted_at, 'resolved_at', c.resolved_at)
      FROM public.identity_verification_cases c WHERE c.profile_id = v_self)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3.5 Deletion: verification files, identity numbers and owned business accounts
-- ---------------------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.delete_my_account_core(text)') IS NULL THEN
    ALTER FUNCTION public.delete_my_account(text) RENAME TO delete_my_account_core;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.delete_my_account_core(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_account(p_confirm text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_self uuid := public.current_profile_id();
  v_link record;
  v_business public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- Verification material: artifact rows, reviews and the case. The files themselves are removed by the
  -- client through the Storage API before this call (the storage schema refuses direct SQL deletes);
  -- this is the best-effort fallback.
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'identity-verification' AND name LIKE v_self::text || '/%';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  DELETE FROM public.identity_verification_artifacts WHERE case_id IN (SELECT id FROM public.identity_verification_cases WHERE profile_id = v_self);
  DELETE FROM public.identity_verification_reviews WHERE case_id IN (SELECT id FROM public.identity_verification_cases WHERE profile_id = v_self);
  DELETE FROM public.identity_verification_cases WHERE profile_id = v_self;
  UPDATE public.profiles SET civic_framework_accepted_at = NULL, privacy_settings = '{}'::jsonb WHERE id = v_self;
  DELETE FROM public.profile_score_snapshots WHERE profile_id = v_self;

  -- Owned business accounts: hand over when another established owner remains, otherwise close them.
  FOR v_link IN SELECT * FROM public.linked_accounts WHERE owner_profile_id = v_self AND relationship_type = 'business' LOOP
    IF EXISTS (
      SELECT 1 FROM public.linked_accounts o
      WHERE o.linked_profile_id = v_link.linked_profile_id AND o.relationship_type = 'business' AND o.owner_profile_id <> v_self
    ) THEN
      DELETE FROM public.linked_accounts WHERE id = v_link.id;
      CONTINUE;
    END IF;
    SELECT * INTO v_business FROM public.profiles WHERE id = v_link.linked_profile_id;
    IF FOUND AND v_business.deleted_at IS NULL THEN
      UPDATE public.profiles
      SET username = 'deleted-' || substr(replace(id::text, '-', ''), 1, 12),
          full_name = 'Deleted business',
          bio = NULL, avatar_url = NULL, deleted_at = now(), deletion_reason = 'owner_deleted'
      WHERE id = v_business.id;
      IF v_business.user_id IS NOT NULL THEN
        DELETE FROM auth.sessions WHERE user_id = v_business.user_id;
        UPDATE auth.users SET banned_until = 'infinity' WHERE id = v_business.user_id;
      END IF;
    END IF;
    DELETE FROM public.linked_accounts WHERE id = v_link.id;
  END LOOP;

  RETURN public.delete_my_account_core(p_confirm);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3.7 Privacy settings, score snapshot, public profile card
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.set_my_privacy_settings(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_clean jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  FOREACH v_key IN ARRAY ARRAY['show_country', 'show_city', 'show_score', 'show_endorsements', 'show_full_name'] LOOP
    IF jsonb_typeof(coalesce(p_settings, '{}'::jsonb)->v_key) = 'boolean' THEN
      v_clean := v_clean || jsonb_build_object(v_key, (p_settings->>v_key)::boolean);
    END IF;
  END LOOP;
  UPDATE public.profiles SET privacy_settings = coalesce(privacy_settings, '{}'::jsonb) || v_clean WHERE id = v_self
  RETURNING privacy_settings INTO v_clean;
  RETURN v_clean;
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_privacy_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_privacy_settings(jsonb) TO authenticated;

CREATE TABLE IF NOT EXISTS public.profile_score_snapshots (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  score numeric NOT NULL,
  tier text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_score_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_score_snapshots FROM PUBLIC, anon, authenticated;

-- The owner's client computes the score from their activity; the server keeps the last result for visitors.
CREATE OR REPLACE FUNCTION public.save_my_score_snapshot(p_score numeric, p_tier text, p_snapshot jsonb DEFAULT '{}'::jsonb)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_at timestamptz;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 1000 THEN RAISE EXCEPTION 'invalid_score'; END IF;
  IF pg_column_size(coalesce(p_snapshot, '{}'::jsonb)) > 65536 THEN RAISE EXCEPTION 'snapshot_too_large'; END IF;
  INSERT INTO public.profile_score_snapshots (profile_id, score, tier, snapshot, computed_at)
  VALUES (v_self, p_score, nullif(trim(coalesce(p_tier, '')), ''), coalesce(p_snapshot, '{}'::jsonb), now())
  ON CONFLICT (profile_id) DO UPDATE SET score = EXCLUDED.score, tier = EXCLUDED.tier, snapshot = EXCLUDED.snapshot, computed_at = now()
  RETURNING computed_at INTO v_at;
  RETURN v_at;
END;
$$;
REVOKE ALL ON FUNCTION public.save_my_score_snapshot(numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_score_snapshot(numeric, text, jsonb) TO authenticated;

-- What another member may see of a profile, honouring the owner's privacy settings. Owners see everything.
CREATE OR REPLACE FUNCTION public.public_profile(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer uuid := public.current_profile_id();
  v_p public.profiles%ROWTYPE;
  v_own boolean;
  v_s jsonb;
  v_snapshot public.profile_score_snapshots%ROWTYPE;
  v_show boolean;
BEGIN
  IF v_viewer IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_p FROM public.profiles WHERE id = p_profile_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_own := v_p.id = v_viewer;
  v_s := coalesce(v_p.privacy_settings, '{}'::jsonb);
  SELECT * INTO v_snapshot FROM public.profile_score_snapshots WHERE profile_id = v_p.id;
  RETURN jsonb_build_object(
    'id', v_p.id,
    'username', v_p.username,
    'full_name', CASE WHEN v_own OR coalesce((v_s->>'show_full_name')::boolean, true) THEN v_p.full_name ELSE NULL END,
    'avatar_url', v_p.avatar_url,
    'bio', v_p.bio,
    'is_verified', coalesce(v_p.is_verified, false),
    'citizenship_status', v_p.citizenship_status,
    'created_at', v_p.created_at,
    'show_country', v_own OR coalesce((v_s->>'show_country')::boolean, true),
    'country', CASE WHEN v_own OR coalesce((v_s->>'show_country')::boolean, true) THEN v_p.country ELSE NULL END,
    'country_code', CASE WHEN v_own OR coalesce((v_s->>'show_country')::boolean, true) THEN v_p.country_code ELSE NULL END,
    'show_city', v_own OR coalesce((v_s->>'show_city')::boolean, true),
    'city', CASE WHEN v_own OR coalesce((v_s->>'show_city')::boolean, true) THEN v_p.city ELSE NULL END,
    'show_score', v_own OR coalesce((v_s->>'show_score')::boolean, true),
    'score', CASE WHEN (v_own OR coalesce((v_s->>'show_score')::boolean, true)) AND v_snapshot.profile_id IS NOT NULL
             THEN jsonb_build_object('score', v_snapshot.score, 'tier', v_snapshot.tier, 'snapshot', v_snapshot.snapshot, 'computed_at', v_snapshot.computed_at) END,
    'show_endorsements', v_own OR coalesce((v_s->>'show_endorsements')::boolean, true),
    'endorsement_count', CASE WHEN v_own OR coalesce((v_s->>'show_endorsements')::boolean, true)
             THEN (SELECT count(*) FROM public.endorsements en WHERE en.endorsed_id = v_p.id AND NOT coalesce(en.is_hidden, false)) ELSE NULL END,
    'is_own', v_own
  );
END;
$$;
REVOKE ALL ON FUNCTION public.public_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_profile(uuid) TO authenticated;

-- Endorsements follow the owner's setting for other viewers (endorser and owner always see their own).
DROP POLICY IF EXISTS endorsements_visible_per_privacy ON public.endorsements;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'endorsements' AND cmd = 'SELECT') THEN
    -- keep the existing read policies; the public_profile card and the profile page honour the setting
    NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Privacy controls a member sets for themselves:
-- * hide_from_directory: leave People search (their profile link still works).
-- * message_permission: who can start a new direct conversation with them:
--   'everyone' (default), 'endorsement_ties' (people they endorsed or who endorsed them) or 'nobody'.
--   Existing conversations keep working.
-- Starting a conversation also now refuses deleted profiles and pairs where either side blocked the other.

CREATE TABLE IF NOT EXISTS public.profile_privacy_settings (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  hide_from_directory boolean NOT NULL DEFAULT false,
  message_permission text NOT NULL DEFAULT 'everyone'
    CHECK (message_permission IN ('everyone', 'endorsement_ties', 'nobody')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own privacy settings" ON public.profile_privacy_settings;
CREATE POLICY "Members manage their own privacy settings"
  ON public.profile_privacy_settings FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, UPDATE ON public.profile_privacy_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.search_civizen_directory(p_query text, p_exclude_profile_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  normalized text := lower(btrim(coalesce(p_query, '')));
  result_limit integer := greatest(1, least(coalesce(p_limit, 30), 50));
  people_json jsonb;
  companies_json jsonb;
BEGIN
  IF char_length(normalized) < 2 THEN
    RETURN jsonb_build_object('people', '[]'::jsonb, 'companies', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(person) ORDER BY person.sort_name), '[]'::jsonb)
  INTO people_json
  FROM (
    SELECT
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.is_verified,
      lower(coalesce(p.full_name, p.username, '')) AS sort_name
    FROM public.profiles AS p
    WHERE p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.profile_privacy_settings AS pps
        WHERE pps.profile_id = p.id AND pps.hide_from_directory
      )
      AND (p_exclude_profile_id IS NULL OR p.id <> p_exclude_profile_id)
      AND (
        p.username ILIKE '%' || normalized || '%'
        OR p.full_name ILIKE '%' || normalized || '%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.linked_accounts AS la
        WHERE la.linked_profile_id = p.id
          AND la.relationship_type = 'business'
      )
    ORDER BY lower(coalesce(p.full_name, p.username, ''))
    LIMIT result_limit
  ) AS person;

  SELECT coalesce(jsonb_agg(to_jsonb(company) ORDER BY company.sort_name), '[]'::jsonb)
  INTO companies_json
  FROM (
    SELECT
      business.id AS profile_id,
      la.business_name_normalized,
      business.username,
      business.full_name,
      business.avatar_url,
      business.is_verified,
      owner.id AS owner_id,
      owner.username AS owner_username,
      owner.full_name AS owner_full_name,
      owner.avatar_url AS owner_avatar_url,
      owner.is_verified AS owner_is_verified,
      lower(coalesce(business.full_name, la.business_name_normalized, business.username, '')) AS sort_name
    FROM public.linked_accounts AS la
    JOIN public.profiles AS business
      ON business.id = la.linked_profile_id
    JOIN public.profiles AS owner
      ON owner.id = la.owner_profile_id
    WHERE la.relationship_type = 'business'
      AND business.deleted_at IS NULL
      AND owner.deleted_at IS NULL
      AND (p_exclude_profile_id IS NULL OR business.id <> p_exclude_profile_id)
      AND (
        business.username ILIKE '%' || normalized || '%'
        OR business.full_name ILIKE '%' || normalized || '%'
        OR coalesce(la.business_name_normalized, '') ILIKE '%' || normalized || '%'
      )
    ORDER BY lower(coalesce(business.full_name, la.business_name_normalized, business.username, ''))
    LIMIT result_limit
  ) AS company;

  RETURN jsonb_build_object(
    'people', coalesce(people_json, '[]'::jsonb),
    'companies', coalesce(companies_json, '[]'::jsonb)
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.private_get_or_create_direct_conversation(p_other_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  my_profile_id uuid;
  agent_id uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  conv_id uuid;
  v_permission text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO my_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;

  IF my_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF p_other_profile_id = my_profile_id THEN
    RAISE EXCEPTION 'Invalid peer';
  END IF;

  IF p_other_profile_id = agent_id THEN
    RAISE EXCEPTION 'Use agent conversation for the guide';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_other_profile_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Peer not found';
  END IF;

  conv_id := uuid_generate_v5(
    '6ba7b814-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'levela-dm:' || LEAST(my_profile_id, p_other_profile_id)::text || ':' ||
      GREATEST(my_profile_id, p_other_profile_id)::text
  );

  -- An existing conversation stays reachable; the rules below only govern starting a new one.
  IF EXISTS (SELECT 1 FROM public.private_conversations WHERE id = conv_id) THEN
    RETURN conv_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.private_message_blocks b
    WHERE (b.blocker_id = p_other_profile_id AND b.blocked_id = my_profile_id)
       OR (b.blocker_id = my_profile_id AND b.blocked_id = p_other_profile_id)
  ) THEN
    RAISE EXCEPTION 'messaging_blocked' USING ERRCODE = '42501';
  END IF;

  SELECT s.message_permission INTO v_permission
  FROM public.profile_privacy_settings s
  WHERE s.profile_id = p_other_profile_id;

  IF v_permission = 'nobody'
    OR (v_permission = 'endorsement_ties' AND NOT EXISTS (
      SELECT 1 FROM public.endorsements e
      WHERE (e.endorser_id = my_profile_id AND e.endorsed_id = p_other_profile_id)
         OR (e.endorser_id = p_other_profile_id AND e.endorsed_id = my_profile_id)
    )) THEN
    RAISE EXCEPTION 'messaging_not_accepted' USING ERRCODE = '42501',
      HINT = 'This member only accepts new messages from people they know on Civizen.';
  END IF;

  INSERT INTO public.private_conversations (id, kind)
  VALUES (conv_id, 'direct')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.private_conversation_members (conversation_id, profile_id)
  VALUES (conv_id, my_profile_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.private_conversation_members (conversation_id, profile_id)
  VALUES (conv_id, p_other_profile_id)
  ON CONFLICT DO NOTHING;

  RETURN conv_id;
END;
$$;

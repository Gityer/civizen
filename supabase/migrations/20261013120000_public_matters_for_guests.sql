-- v2 plan step B3: signed-out visitors can read public Matters (cards and one Matter with its public comments), so a
-- shared link or an Area page shows the discussion before asking anyone to join. Guest-safe shape only: no actions,
-- parties, tasks, evidence, participant lists or private comments. Comments hidden by moderation never appear.

CREATE OR REPLACE FUNCTION public.public_matter_card(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', m.id,
    'title', m.title,
    'description', left(coalesce(m.description, ''), 4000),
    'matter_type', m.matter_type,
    'lifecycle_status', m.lifecycle_status,
    'area_node_id', m.area_node_id,
    'scope_kind', m.scope_kind,
    'scope_country_code', m.scope_country_code,
    'scope_region_code', m.scope_region_code,
    'scope_locality_code', m.scope_locality_code,
    'created_at', m.created_at,
    'updated_at', m.updated_at,
    'initiator_display_name', public.matter_profile_display_name(m.initiator_profile_id),
    'addressee_display_name', public.matter_profile_display_name(m.addressee_profile_id),
    'comment_count', (
      SELECT count(*) FROM public.matter_comments c
       WHERE c.matter_id = m.id AND c.moderation_hidden_at IS NULL AND coalesce(c.visibility, 'public') = 'public'
    )
  )
  FROM public.matters m
  WHERE m.id = p_id AND m.visibility = 'public' AND m.lifecycle_status IN ('submitted', 'active', 'closed');
$$;
REVOKE ALL ON FUNCTION public.public_matter_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_matter_card(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_matter_cards(
  p_search text DEFAULT NULL,
  p_area_node_id text DEFAULT NULL,
  p_scope_country_code text DEFAULT NULL,
  p_matter_type text DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := left(nullif(trim(coalesce(p_search, '')), ''), 120);
  v_area text := nullif(trim(coalesce(p_area_node_id, '')), '');
  v_country text := nullif(upper(trim(coalesce(p_scope_country_code, ''))), '');
  v_type text := nullif(lower(trim(coalesce(p_matter_type, ''))), '');
BEGIN
  RETURN coalesce((
    SELECT jsonb_agg(public.public_matter_card(x.id) ORDER BY x.updated_at DESC)
      FROM (
        SELECT m.id, m.updated_at
          FROM public.matters m
         WHERE m.visibility = 'public'
           AND m.lifecycle_status IN ('submitted', 'active', 'closed')
           AND (v_search IS NULL OR m.title ILIKE '%' || v_search || '%' OR m.description ILIKE '%' || v_search || '%')
           AND (v_area IS NULL OR m.area_node_id = v_area)
           AND (v_country IS NULL OR upper(coalesce(m.scope_country_code, '')) = v_country)
           AND (v_type IS NULL OR m.matter_type = v_type)
         ORDER BY m.updated_at DESC
         LIMIT greatest(1, least(coalesce(p_limit, 30), 60))
        OFFSET greatest(0, coalesce(p_offset, 0))
      ) x
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.public_matter_cards(text, text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_matter_cards(text, text, text, text, integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_matter(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_card jsonb := public.public_matter_card(p_id);
BEGIN
  IF v_card IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN v_card || jsonb_build_object(
    'comments', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', c.id,
               'parent_id', c.parent_id,
               'body', c.body,
               'created_at', c.created_at,
               'author_display_name', CASE
                 WHEN c.is_ai_agent THEN public.matter_actor_display_name('ai_agent', NULL, c.agent_id)
                 ELSE public.matter_profile_display_name(c.author_profile_id)
               END
             ) ORDER BY c.created_at)
        FROM (
          SELECT * FROM public.matter_comments c0
           WHERE c0.matter_id = p_id AND c0.moderation_hidden_at IS NULL AND coalesce(c0.visibility, 'public') = 'public'
           ORDER BY c0.created_at
           LIMIT 200
        ) c
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.public_matter(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_matter(uuid) TO anon, authenticated;

-- Phase 4 step 4.4: Area pages list real activity. `area_activity(code)` returns the public, non-demo programs,
-- challenges and public Matters tagged with a foundational Area, with only the fields a visitor may see.

CREATE OR REPLACE FUNCTION public.area_activity(p_area_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node_id text;
BEGIN
  SELECT n.id INTO v_node_id
  FROM public.classification_nodes n
  WHERE n.node_type = 'area' AND n.status = 'current' AND n.code = lower(trim(coalesce(p_area_code, '')))
  ORDER BY n.sort_order
  LIMIT 1;
  IF v_node_id IS NULL THEN
    RETURN jsonb_build_object('programs', '[]'::jsonb, 'challenges', '[]'::jsonb, 'matters', '[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'programs', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'summary', p.summary, 'status', p.status) ORDER BY p.updated_at DESC)
      FROM public.contribution_programs p
      WHERE p.area_node_id = v_node_id AND NOT p.is_demo AND p.status = 'active'
    ), '[]'::jsonb),
    'challenges', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'problem_statement', left(c.problem_statement, 280), 'status', c.status) ORDER BY c.updated_at DESC)
      FROM public.community_challenges c
      WHERE c.area_node_id = v_node_id AND NOT c.is_demo AND c.status IN ('active', 'implementation', 'completed')
    ), '[]'::jsonb),
    'matters', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'matter_type', m.matter_type, 'lifecycle_status', m.lifecycle_status, 'updated_at', m.updated_at) ORDER BY m.updated_at DESC)
      FROM (
        SELECT m.* FROM public.matters m
        WHERE m.area_node_id = v_node_id AND m.visibility = 'public' AND m.lifecycle_status IN ('submitted', 'active', 'closed')
        ORDER BY m.updated_at DESC
        LIMIT 20
      ) m
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.area_activity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.area_activity(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Phase 2 step 2.1: public Matters are browsable and searchable by every signed-in member.
-- `list_public_matters` returns the same row bundles as `list_matters` (matter_row_json) for Matters
-- whose visibility is public and that are no longer drafts, filtered by free text, subject Area,
-- scope country and Matter type. Guests get an empty list (the Matters tables are member-only).

CREATE OR REPLACE FUNCTION public.list_public_matters(
  p_search text DEFAULT NULL,
  p_area_node_id text DEFAULT NULL,
  p_scope_country_code text DEFAULT NULL,
  p_matter_type text DEFAULT NULL,
  p_limit integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_area text := nullif(trim(coalesce(p_area_node_id, '')), '');
  v_country text := nullif(upper(trim(coalesce(p_scope_country_code, ''))), '');
  v_type text := nullif(lower(trim(coalesce(p_matter_type, ''))), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 60), 100));
  v_result jsonb;
BEGIN
  IF v_self IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF v_search IS NOT NULL AND char_length(v_search) > 120 THEN
    v_search := left(v_search, 120);
  END IF;

  SELECT coalesce(jsonb_agg(public.matter_row_json(x.id) ORDER BY x.updated_at DESC), '[]'::jsonb)
  INTO v_result
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
    LIMIT v_limit
  ) x;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.list_public_matters(text, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_matters(text, text, text, text, integer) TO authenticated;
COMMENT ON FUNCTION public.list_public_matters(text, text, text, text, integer) IS
  'Read-only browse of public, non-draft Matters with text / Area / scope-country / type filters (Phase 2 step 2.1).';

CREATE INDEX IF NOT EXISTS matters_public_browse_idx
  ON public.matters (updated_at DESC)
  WHERE visibility = 'public' AND lifecycle_status IN ('submitted', 'active', 'closed');

-- Tidy-up from 20261009120000: the publish wrapper is for signed-in members only.
REVOKE EXECUTE ON FUNCTION public.publish_voting_proposal(uuid) FROM anon;

NOTIFY pgrst, 'reload schema';

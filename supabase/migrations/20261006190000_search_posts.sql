-- Search across posts. Before, Search only covered people, companies, Market listings and the
-- built-in pages; posts could not be found at all.
-- Matches are case-insensitive substrings (trigram index), newest first. Posts by deleted
-- members, people the viewer blocked and posts the viewer hid are left out.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_posts_content_trgm
  ON public.posts USING gin (content extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_posts(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  author_id uuid,
  author_full_name text,
  author_username text,
  author_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH params AS (
    SELECT
      btrim(coalesce(p_query, '')) AS q,
      least(greatest(coalesce(p_limit, 20), 1), 50) AS lim,
      public.current_profile_id() AS viewer
  )
  SELECT p.id, p.content, p.created_at, a.id, a.full_name, a.username, a.avatar_url
  FROM params
  JOIN public.posts p
    ON length(params.q) >= 2
   AND p.content ILIKE '%' || replace(replace(replace(params.q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  JOIN public.profiles a ON a.id = p.author_id AND a.deleted_at IS NULL
  WHERE NOT EXISTS (
      SELECT 1 FROM public.private_message_blocks b
      WHERE b.blocker_id = params.viewer AND b.blocked_id = p.author_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.post_hides h
      WHERE h.profile_id = params.viewer AND h.post_id = p.id
    )
  ORDER BY p.created_at DESC
  LIMIT (SELECT lim FROM params);
$$;

REVOKE ALL ON FUNCTION public.search_posts(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_posts(text, integer) TO authenticated;

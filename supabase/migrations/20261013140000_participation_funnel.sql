-- v2 plan step B5 (decision E4): measure the participation funnel without tracking anyone. Page views are daily
-- counters per page pattern (ids folded to :id); no IP address, cookie, user id or device is stored. Everything
-- else is computed from records Civizen already keeps. Staff read the funnel with participation_funnel().

CREATE TABLE IF NOT EXISTS public.participation_page_views (
  day date NOT NULL,
  path_bucket text NOT NULL,
  views bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path_bucket)
);
ALTER TABLE public.participation_page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.participation_page_views FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.participation_path_bucket(p_path text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_path IS NULL OR left(p_path, 1) <> '/' THEN NULL
    ELSE left(
      regexp_replace(
        regexp_replace(lower(split_part(split_part(p_path, '?', 1), '#', 1)),
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'g'),
        '/[0-9]+(/|$)', '/:n\1', 'g'),
      80)
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_page_view(p_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_bucket text := public.participation_path_bucket(p_path);
BEGIN
  IF v_bucket IS NULL THEN
    RETURN;
  END IF;
  -- bounded table: at most 300 distinct page patterns a day
  IF NOT EXISTS (SELECT 1 FROM public.participation_page_views WHERE day = current_date AND path_bucket = v_bucket)
     AND (SELECT count(*) FROM public.participation_page_views WHERE day = current_date) >= 300 THEN
    RETURN;
  END IF;
  INSERT INTO public.participation_page_views (day, path_bucket, views)
  VALUES (current_date, v_bucket, 1)
  ON CONFLICT (day, path_bucket) DO UPDATE SET views = public.participation_page_views.views + 1;
END;
$$;
REVOKE ALL ON FUNCTION public.record_page_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_page_view(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.participation_funnel(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_days integer := greatest(7, least(coalesce(p_days, 30), 365));
  v_from date := current_date - (v_days - 1);
  v_people uuid[];
BEGIN
  IF NOT (public.has_permission('settings.manage'::public.app_permission)
          OR public.has_permission('role.assign'::public.app_permission)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  -- people: member accounts that are not system agents, not deleted, not organizations' business profiles
  SELECT array_agg(p.id) INTO v_people
    FROM public.profiles p
   WHERE p.deleted_at IS NULL AND NOT coalesce(p.is_system_agent, false)
     AND NOT EXISTS (SELECT 1 FROM public.linked_accounts la WHERE la.linked_profile_id = p.id AND la.relationship_type = 'business');

  RETURN jsonb_build_object(
    'days', v_days,
    'totals', jsonb_build_object(
      'members', coalesce(array_length(v_people, 1), 0),
      'countries', (SELECT count(DISTINCT upper(p.country_code)) FROM public.profiles p WHERE p.id = ANY (v_people) AND p.country_code IS NOT NULL),
      'signups', (SELECT count(*) FROM auth.users u WHERE u.created_at >= v_from),
      'confirmed', (SELECT count(*) FROM auth.users u WHERE u.created_at >= v_from AND u.email_confirmed_at IS NOT NULL),
      'active_7d', (SELECT count(*) FROM auth.users u WHERE u.last_sign_in_at >= now() - interval '7 days'),
      'active_30d', (SELECT count(*) FROM auth.users u WHERE u.last_sign_in_at >= now() - interval '30 days'),
      'returned_after_signup', (
        SELECT count(*) FROM auth.users u
         WHERE u.created_at >= v_from AND u.created_at < now() - interval '7 days'
           AND u.last_sign_in_at >= u.created_at + interval '1 day'
      ),
      'signed_up_over_7d_ago', (SELECT count(*) FROM auth.users u WHERE u.created_at >= v_from AND u.created_at < now() - interval '7 days'),
      'took_first_action', (
        SELECT count(*) FROM unnest(v_people) AS pid
         WHERE EXISTS (SELECT 1 FROM public.posts x WHERE x.author_id = pid)
            OR EXISTS (SELECT 1 FROM public.matters x WHERE x.created_by_profile_id = pid)
            OR EXISTS (SELECT 1 FROM public.matter_comments x WHERE x.author_profile_id = pid)
            OR EXISTS (SELECT 1 FROM public.civic_ballots x WHERE x.profile_id = pid)
      ),
      'verification_requested', (SELECT count(DISTINCT c.profile_id) FROM public.identity_verification_cases c WHERE c.status IN ('submitted', 'in_review', 'approved', 'rejected')),
      'verified', (SELECT count(*) FROM public.profiles p WHERE p.id = ANY (v_people) AND p.is_verified),
      'verification_median_hours', (
        SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (c.resolved_at - c.submitted_at)) / 3600))::numeric, 1)
          FROM public.identity_verification_cases c
         WHERE c.submitted_at IS NOT NULL AND c.resolved_at IS NOT NULL
      ),
      'ballots_advisory', (SELECT count(*) FROM public.civic_ballots b WHERE NOT b.is_countable),
      'ballots_countable', (SELECT count(*) FROM public.civic_ballots b WHERE b.is_countable),
      'public_matters_by_members', (
        SELECT count(*) FROM public.matters m
          JOIN public.profiles p ON p.id = m.created_by_profile_id
         WHERE m.visibility = 'public' AND p.role NOT IN ('founder', 'admin', 'system') AND NOT coalesce(p.is_system_agent, false)
      ),
      'open_reports', (SELECT count(*) FROM public.reports r WHERE r.status IN ('pending', 'reviewed')),
      'oldest_open_report_hours', (
        SELECT round((extract(epoch FROM (now() - min(r.created_at))) / 3600)::numeric, 1)
          FROM public.reports r WHERE r.status IN ('pending', 'reviewed')
      )
    ),
    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'day', d.day,
               'page_views', coalesce((SELECT sum(v.views) FROM public.participation_page_views v WHERE v.day = d.day), 0),
               'signups', (SELECT count(*) FROM auth.users u WHERE u.created_at::date = d.day),
               'ballots', (SELECT count(*) FROM public.civic_ballots b WHERE b.cast_at::date = d.day),
               'matters', (SELECT count(*) FROM public.matters m WHERE m.created_at::date = d.day AND m.visibility = 'public'),
               'posts', (SELECT count(*) FROM public.posts x WHERE x.created_at::date = d.day)
             ) ORDER BY d.day), '[]'::jsonb)
        FROM (SELECT generate_series(v_from, current_date, interval '1 day')::date AS day) d
    ),
    'top_pages', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('path', t.path_bucket, 'views', t.views) ORDER BY t.views DESC), '[]'::jsonb)
        FROM (
          SELECT v.path_bucket, sum(v.views) AS views FROM public.participation_page_views v
           WHERE v.day >= v_from GROUP BY v.path_bucket ORDER BY sum(v.views) DESC LIMIT 15
        ) t
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.participation_funnel(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.participation_funnel(integer) TO authenticated;

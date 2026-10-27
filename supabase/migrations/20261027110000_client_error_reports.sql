-- Error reports from members' browsers had nowhere to go: src/lib/error-reporting.ts posted only when
-- VITE_ERROR_REPORT_ENDPOINT was set, and no collector existed, so crashes on members' devices were invisible.
-- Reports are now kept like page views (20261013140000_participation_funnel.sql): one row per day, kind, message,
-- page pattern and release, with a count. No account, IP address, cookie or device is stored; ids in the route are
-- folded to :id by participation_path_bucket(). At most 1000 distinct rows a day; rows older than 30 days are
-- removed. Staff read them with client_error_summary().

CREATE TABLE IF NOT EXISTS public.client_error_reports (
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('render', 'window', 'promise')),
  message text NOT NULL,
  route text NOT NULL,
  release_id text NOT NULL,
  app_version text NOT NULL,
  stack text,
  occurrences bigint NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, kind, message, route, release_id)
);
ALTER TABLE public.client_error_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.client_error_reports FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_client_error(p_report jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text := p_report->>'kind';
  v_message text := left(trim(coalesce(p_report->>'message', '')), 500);
  v_route text := coalesce(public.participation_path_bucket(p_report->>'route'), '/');
  v_release text := left(coalesce(nullif(trim(p_report->>'releaseId'), ''), 'unknown'), 64);
  v_version text := left(coalesce(nullif(trim(p_report->>'appVersion'), ''), 'unknown'), 32);
  v_stack text := left(p_report->>'stack', 2000);
BEGIN
  IF v_kind IS NULL OR v_kind NOT IN ('render', 'window', 'promise') OR v_message = '' THEN
    RETURN;
  END IF;
  DELETE FROM public.client_error_reports WHERE day < current_date - 30;
  IF NOT EXISTS (SELECT 1 FROM public.client_error_reports
                  WHERE day = current_date AND kind = v_kind AND message = v_message AND route = v_route AND release_id = v_release)
     AND (SELECT count(*) FROM public.client_error_reports WHERE day = current_date) >= 1000 THEN
    RETURN;
  END IF;
  INSERT INTO public.client_error_reports (day, kind, message, route, release_id, app_version, stack)
  VALUES (current_date, v_kind, v_message, v_route, v_release, v_version, v_stack)
  ON CONFLICT (day, kind, message, route, release_id)
  DO UPDATE SET occurrences = public.client_error_reports.occurrences + 1, last_seen = now();
END;
$$;
REVOKE ALL ON FUNCTION public.record_client_error(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_client_error(jsonb) TO anon, authenticated;

-- The most frequent errors of the last p_days days (1–30), newest release first within a message.
CREATE OR REPLACE FUNCTION public.client_error_summary(p_days integer DEFAULT 7)
RETURNS TABLE (
  kind text,
  message text,
  route text,
  release_id text,
  app_version text,
  occurrences bigint,
  first_seen timestamptz,
  last_seen timestamptz,
  stack text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_permission('settings.manage'::public.app_permission)
          OR public.has_permission('role.assign'::public.app_permission)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT r.kind, r.message, r.route, r.release_id, max(r.app_version), sum(r.occurrences)::bigint,
           min(r.first_seen), max(r.last_seen), max(r.stack)
      FROM public.client_error_reports r
     WHERE r.day > current_date - least(greatest(coalesce(p_days, 7), 1), 30)
     GROUP BY r.kind, r.message, r.route, r.release_id
     ORDER BY sum(r.occurrences) DESC, max(r.last_seen) DESC
     LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.client_error_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_error_summary(integer) TO authenticated;

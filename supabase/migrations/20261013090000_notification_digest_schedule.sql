-- v2 plan step A3: the daily e-mail digest is scheduled inside the database (pg_cron + pg_net), not by a host
-- crontab. The function URL and the shared secret the edge function expects live in a server-only config row
-- (same pattern as push_dispatch_config); an operator fills it once. Every tick is logged so admins can see
-- when the digest last ran and what the function answered.

CREATE TABLE IF NOT EXISTS public.notification_digest_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  function_url text,
  cron_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_digest_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_digest_config FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.notification_digest_runs (
  id bigserial PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  request_id bigint,
  status text NOT NULL
);
ALTER TABLE public.notification_digest_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_digest_runs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notification_digest_tick()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_request bigint;
BEGIN
  SELECT function_url, cron_secret INTO v_url, v_secret FROM public.notification_digest_config WHERE id = true;
  IF v_url IS NULL OR v_secret IS NULL THEN
    INSERT INTO public.notification_digest_runs (status) VALUES ('not_configured');
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    INSERT INTO public.notification_digest_runs (status) VALUES ('pg_net_missing');
    RETURN NULL;
  END IF;
  BEGIN
    SELECT net.http_post(
      url := v_url,
      body := '{}'::jsonb,
      params := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', v_secret),
      timeout_milliseconds := 55000
    ) INTO v_request;
    INSERT INTO public.notification_digest_runs (request_id, status) VALUES (v_request, 'requested');
    RETURN v_request;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.notification_digest_runs (status) VALUES ('request_failed: ' || SQLERRM);
    RETURN NULL;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.notification_digest_tick() FROM PUBLIC, anon, authenticated;

-- Staff view: the last runs with the HTTP answer pg_net recorded (kept by pg_net for a few hours only).
CREATE OR REPLACE FUNCTION public.notification_digest_recent_runs(p_limit integer DEFAULT 7)
RETURNS TABLE (requested_at timestamptz, status text, http_status integer, response text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_permission('settings.manage'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN QUERY EXECUTE
      'SELECT r.requested_at, r.status, h.status_code, left(h.content::text, 300)
         FROM public.notification_digest_runs r
         LEFT JOIN net._http_response h ON h.id = r.request_id
        ORDER BY r.requested_at DESC
        LIMIT $1'
      USING greatest(1, least(coalesce(p_limit, 7), 50));
  ELSE
    RETURN QUERY
      SELECT r.requested_at, r.status, NULL::integer, NULL::text
        FROM public.notification_digest_runs r
       ORDER BY r.requested_at DESC
       LIMIT greatest(1, least(coalesce(p_limit, 7), 50));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.notification_digest_recent_runs(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notification_digest_recent_runs(integer) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('notification_digest_tick');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('notification_digest_tick', '0 6 * * *', $cron$SELECT public.notification_digest_tick();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

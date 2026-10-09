-- Phase 2 steps 2.5 and 2.7.
-- 2.5 Notifications for the loop: a consultation opening, closing in 7 days / 24 hours, a new comment on a
--     Matter you are part of, and an opt-in e-mail digest preference. Message text is rendered by the
--     client from i18n keys (notificationTypes.<type>); the stored title/body stay as the English fallback.
-- 2.7 Proposal hygiene: settings freeze once support exists, the threshold cannot be lowered after
--     opening, drafts can be withdrawn, and custom-option / approval / ranked outcomes set `passed`.

-- ---------------------------------------------------------------------------------------------
-- Followers of a consultation: proposal supporters and the people of the Matter it came from
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_consultation_followers(p_election_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT r.id), '{}'::uuid[])
  FROM (
    SELECT s.profile_id AS id
    FROM public.civic_voting_proposals p
    JOIN public.civic_voting_proposal_support s ON s.proposal_id = p.id
    WHERE p.election_id = p_election_id
    UNION
    SELECT p.created_by_profile_id FROM public.civic_voting_proposals p WHERE p.election_id = p_election_id
    UNION
    SELECT m.initiator_profile_id FROM public.civic_voting_proposals p JOIN public.matters m ON m.id = p.matter_id WHERE p.election_id = p_election_id
    UNION
    SELECT m.responsible_profile_id FROM public.civic_voting_proposals p JOIN public.matters m ON m.id = p.matter_id WHERE p.election_id = p_election_id
    UNION
    SELECT m.addressee_profile_id FROM public.civic_voting_proposals p JOIN public.matters m ON m.id = p.matter_id WHERE p.election_id = p_election_id
    UNION
    SELECT mp.actor_profile_id FROM public.civic_voting_proposals p JOIN public.matter_parties mp ON mp.matter_id = p.matter_id WHERE p.election_id = p_election_id
  ) r
  JOIN public.profiles pr ON pr.id = r.id AND pr.deleted_at IS NULL
  WHERE r.id IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.civic_consultation_followers(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Voting opened (scheduled -> open by the lifecycle tick)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_election_opened_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(NEW.metadata->>'sample_batch', '') <> '' OR coalesce(NEW.metadata->>'catalog', 'live') = 'demo' THEN
    RETURN NEW;
  END IF;
  PERFORM public.civic_notify_profiles(
    public.civic_consultation_followers(NEW.id),
    'civic_consultation_opened',
    NEW.title,
    'Voting is open on a consultation you follow.',
    'civic_election',
    NEW.id,
    jsonb_build_object('title', NEW.title)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS civic_election_opened_notify ON public.civic_elections;
CREATE TRIGGER civic_election_opened_notify
  AFTER UPDATE OF status ON public.civic_elections
  FOR EACH ROW
  WHEN (NEW.status = 'open' AND OLD.status = 'scheduled')
  EXECUTE FUNCTION public.civic_election_opened_notify();

-- ---------------------------------------------------------------------------------------------
-- Closing soon: 7 days and 24 hours before the window ends, to followers who have not voted
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_consultation_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_window record;
  v_recipients uuid[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('civic_consultation_reminders', 0));
  FOR v_window IN SELECT * FROM (VALUES ('reminder_7d_sent_at', interval '7 days', 168), ('reminder_24h_sent_at', interval '24 hours', 24)) AS w(flag, span, hours) LOOP
    FOR r IN
      SELECT e.id, e.title
      FROM public.civic_elections e
      WHERE e.status = 'open'
        AND e.security_class = 'ordinary'
        AND e.voting_closes_at > now()
        AND e.voting_closes_at <= now() + v_window.span
        AND coalesce(e.metadata->>'sample_batch', '') = ''
        AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
        AND NOT (coalesce(e.metadata, '{}'::jsonb) ? v_window.flag)
      FOR UPDATE SKIP LOCKED
    LOOP
      SELECT coalesce(array_agg(f), '{}'::uuid[]) INTO v_recipients
      FROM unnest(public.civic_consultation_followers(r.id)) AS f
      WHERE NOT EXISTS (
        SELECT 1 FROM public.civic_ballots b
        WHERE b.election_id = r.id AND b.profile_id = f
          AND b.encrypted_payload IS NOT NULL
          AND NOT coalesce((b.metadata->>'withdrawn')::boolean, false)
      );
      PERFORM public.civic_notify_profiles(
        v_recipients,
        'civic_consultation_closing_soon',
        r.title,
        format('Voting closes in %s hours on a consultation you follow.', v_window.hours),
        'civic_election',
        r.id,
        jsonb_build_object('title', r.title, 'hours', v_window.hours)
      );
      UPDATE public.civic_elections
      SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(v_window.flag, now())
      WHERE id = r.id;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.civic_consultation_reminders() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('civic_consultation_reminders_tick');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'civic_consultation_reminders_tick',
      '40 * * * *',
      $cron$SELECT public.civic_consultation_reminders();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ---------------------------------------------------------------------------------------------
-- New comment on a Matter you are part of (mentions already notify separately)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.matter_comment_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_recipients uuid[];
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = NEW.matter_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT coalesce(array_agg(DISTINCT r.id), '{}'::uuid[]) INTO v_recipients
  FROM (
    SELECT v_matter.initiator_profile_id AS id WHERE v_matter.initiator_kind = 'person'
    UNION SELECT v_matter.responsible_profile_id WHERE v_matter.responsible_kind = 'person'
    UNION SELECT v_matter.addressee_profile_id WHERE v_matter.addressee_kind = 'person'
    UNION SELECT mp.actor_profile_id FROM public.matter_parties mp WHERE mp.matter_id = NEW.matter_id
  ) r
  WHERE r.id IS NOT NULL
    AND r.id <> NEW.author_profile_id
    AND NOT (r.id = ANY (coalesce(NEW.mentioned_profile_ids, '{}'::uuid[])));
  PERFORM public.civic_notify_profiles(
    v_recipients,
    'matter_comment',
    v_matter.title,
    'New comment on a Matter you are part of.',
    'matter',
    NEW.matter_id,
    jsonb_build_object('title', v_matter.title)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matter_comment_notify ON public.matter_comments;
CREATE TRIGGER matter_comment_notify
  AFTER INSERT ON public.matter_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.matter_comment_notify();

-- ---------------------------------------------------------------------------------------------
-- E-mail digest: opt-in preference and the candidate list the digest sender reads
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_email_digest boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_notification_email_digest(p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.profiles SET notification_email_digest = coalesce(p_enabled, false) WHERE id = v_self;
  RETURN coalesce(p_enabled, false);
END;
$$;
REVOKE ALL ON FUNCTION public.set_notification_email_digest(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_notification_email_digest(boolean) TO authenticated;

CREATE TABLE IF NOT EXISTS public.notification_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  item_count integer NOT NULL,
  through timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS notification_digests_profile_idx ON public.notification_digests (profile_id, sent_at DESC);
ALTER TABLE public.notification_digests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_digests FROM PUBLIC, anon, authenticated;

-- Members who opted in, have unread notifications since their last digest, and were not mailed in the last 20 hours.
CREATE OR REPLACE FUNCTION public.notification_digest_candidates()
RETURNS TABLE (profile_id uuid, email text, language_code text, display_name text, items jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    u.email,
    coalesce(p.language_code, 'en'),
    coalesce(nullif(p.full_name, ''), p.username),
    (
      SELECT jsonb_agg(jsonb_build_object(
        'type', n.notification_type, 'title', n.title, 'body', n.body,
        'entity_type', n.entity_type, 'entity_id', n.entity_id, 'metadata', n.metadata, 'created_at', n.created_at
      ) ORDER BY n.created_at DESC)
      FROM public.user_notifications n
      WHERE n.recipient_profile_id = p.id
        AND n.read_at IS NULL
        AND n.created_at > coalesce((SELECT max(d.through) FROM public.notification_digests d WHERE d.profile_id = p.id), now() - interval '7 days')
    )
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.notification_email_digest
    AND p.deleted_at IS NULL
    AND u.email IS NOT NULL
    AND u.email NOT LIKE '%@phone.civizen.local'
    AND NOT EXISTS (SELECT 1 FROM public.notification_digests d WHERE d.profile_id = p.id AND d.sent_at > now() - interval '20 hours')
    AND EXISTS (
      SELECT 1 FROM public.user_notifications n
      WHERE n.recipient_profile_id = p.id AND n.read_at IS NULL
        AND n.created_at > coalesce((SELECT max(d.through) FROM public.notification_digests d WHERE d.profile_id = p.id), now() - interval '7 days')
    );
$$;
REVOKE ALL ON FUNCTION public.notification_digest_candidates() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_notification_digest(p_profile_id uuid, p_item_count integer, p_through timestamptz)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notification_digests (profile_id, item_count, through) VALUES (p_profile_id, p_item_count, p_through);
$$;
REVOKE ALL ON FUNCTION public.record_notification_digest(uuid, integer, timestamptz) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.notification_digest_candidates() TO service_role;
    GRANT EXECUTE ON FUNCTION public.record_notification_digest(uuid, integer, timestamptz) TO service_role;
  END IF;
END $$;

-- ---------------------------------------------------------------------------------------------
-- 2.7 Proposal hygiene
-- ---------------------------------------------------------------------------------------------
-- Settings freeze once anyone (other than the author) has supported the draft.
DO $$
BEGIN
  IF to_regprocedure('public.update_voting_proposal_settings_core(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric, text, integer)') IS NULL THEN
    ALTER FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric, text, integer)
      RENAME TO update_voting_proposal_settings_core;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.update_voting_proposal_settings_core(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric, text, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_voting_proposal_settings(
  p_proposal_id uuid,
  p_scope_kind text DEFAULT NULL,
  p_scope_country_code text DEFAULT NULL,
  p_voting_opens_at timestamptz DEFAULT NULL,
  p_voting_closes_at timestamptz DEFAULT NULL,
  p_options jsonb DEFAULT NULL,
  p_quorum integer DEFAULT NULL,
  p_pass_threshold numeric DEFAULT NULL,
  p_ballot_method text DEFAULT NULL,
  p_max_selections integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop public.civic_voting_proposals%ROWTYPE;
BEGIN
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id;
  IF FOUND AND EXISTS (
    SELECT 1 FROM public.civic_voting_proposal_support s
    WHERE s.proposal_id = p_proposal_id AND s.profile_id IS DISTINCT FROM v_prop.created_by_profile_id
  ) AND NOT public.civic_can_manage_voting_proposals(public.current_profile_id()) THEN
    RAISE EXCEPTION 'proposal_frozen';
  END IF;
  RETURN public.update_voting_proposal_settings_core(
    p_proposal_id, p_scope_kind, p_scope_country_code, p_voting_opens_at, p_voting_closes_at,
    p_options, p_quorum, p_pass_threshold, p_ballot_method, p_max_selections
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric, text, integer) TO authenticated;

-- The threshold cannot be lowered once the draft is open for support.
CREATE OR REPLACE FUNCTION public.open_voting_proposal_for_support(p_proposal_id uuid, p_threshold integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_threshold integer;
  v_current integer;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found'; END IF;
  IF v_prop.status <> 'draft' THEN RAISE EXCEPTION 'proposal_not_draft'; END IF;
  IF v_prop.created_by_profile_id <> v_self AND NOT public.civic_can_manage_voting_proposals(v_self) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_current := nullif(v_prop.metadata->>'support_threshold', '')::integer;
  v_threshold := greatest(1, least(1000, coalesce(p_threshold, v_current, 10)));
  IF coalesce((v_prop.metadata->>'open_for_support')::boolean, false) AND v_current IS NOT NULL AND v_threshold < v_current
     AND NOT public.civic_can_manage_voting_proposals(v_self) THEN
    RAISE EXCEPTION 'threshold_cannot_be_lowered';
  END IF;

  UPDATE public.civic_voting_proposals
  SET metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('open_for_support', true, 'support_threshold', v_threshold)
        || CASE WHEN coalesce((metadata->>'open_for_support')::boolean, false) THEN '{}'::jsonb
                ELSE jsonb_build_object('opened_for_support_at', now()) END,
      updated_at = now()
  WHERE id = p_proposal_id;

  RETURN public.voting_proposal_support_summary(p_proposal_id);
END;
$$;

-- Authors (and managers) can withdraw a draft; supporters are told.
CREATE OR REPLACE FUNCTION public.withdraw_voting_proposal(p_proposal_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_recipients uuid[];
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found'; END IF;
  IF v_prop.status <> 'draft' THEN RAISE EXCEPTION 'proposal_not_draft'; END IF;
  IF v_prop.created_by_profile_id <> v_self AND NOT public.civic_can_manage_voting_proposals(v_self) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.civic_voting_proposals
  SET status = 'withdrawn',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('withdrawn_at', now(), 'withdrawn_by', v_self),
      updated_at = now()
  WHERE id = p_proposal_id;
  SELECT coalesce(array_agg(s.profile_id), '{}'::uuid[]) INTO v_recipients
  FROM public.civic_voting_proposal_support s WHERE s.proposal_id = p_proposal_id AND s.profile_id <> v_self;
  PERFORM public.civic_notify_profiles(
    v_recipients, 'civic_proposal_withdrawn', v_prop.title,
    'A proposal you supported was withdrawn by its author.', 'civic_voting_proposal', p_proposal_id,
    jsonb_build_object('title', v_prop.title)
  );
  RETURN 'withdrawn';
END;
$$;
REVOKE ALL ON FUNCTION public.withdraw_voting_proposal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_voting_proposal(uuid) TO authenticated;

-- Outcomes with custom options, approval or ranked ballots: a reached decision counts as passed.
CREATE OR REPLACE FUNCTION public.civic_election_outcome(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta jsonb;
  v_method text;
  v_total bigint := 0;
  v_approvals bigint := 0;
  v_support bigint;
  v_oppose bigint;
  v_leading text;
  v_quorum integer;
  v_threshold numeric;
  v_share numeric;
  v_quorum_met boolean;
  v_passed boolean;
  v_ranked jsonb;
BEGIN
  SELECT metadata INTO v_meta FROM public.civic_elections WHERE id = p_election_id;
  IF v_meta IS NULL THEN RETURN NULL; END IF;
  v_method := CASE WHEN v_meta->>'ballot_method' IN ('approval', 'ranked') THEN v_meta->>'ballot_method' ELSE 'single' END;

  SELECT count(*) INTO v_total
  FROM public.civic_ballots b
  WHERE b.election_id = p_election_id
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
    AND coalesce(v_meta->>'sample_batch', '') = ''
    AND coalesce(v_meta->>'catalog', 'live') <> 'demo';
  SELECT coalesce(sum(t.vote_count), 0) INTO v_approvals FROM public.civic_election_public_tallies(p_election_id) t;
  SELECT t.option_key INTO v_leading
  FROM public.civic_election_public_tallies(p_election_id) t
  WHERE t.vote_count > 0
  ORDER BY t.vote_count DESC, t.option_key ASC
  LIMIT 1;

  v_quorum := nullif(v_meta->>'quorum', '')::integer;
  v_threshold := coalesce(nullif(v_meta->>'pass_threshold_percent', '')::numeric, 50);
  v_quorum_met := v_quorum IS NULL OR v_total >= v_quorum;

  IF v_method = 'single' THEN
    SELECT t.vote_count INTO v_support FROM public.civic_election_public_tallies(p_election_id) t WHERE t.option_key = 'support';
    SELECT t.vote_count INTO v_oppose FROM public.civic_election_public_tallies(p_election_id) t WHERE t.option_key = 'oppose';
    IF v_support IS NOT NULL AND v_oppose IS NOT NULL THEN
      IF v_support + v_oppose > 0 THEN
        v_share := round(v_support * 100.0 / (v_support + v_oppose), 1);
      END IF;
      v_passed := v_quorum_met AND v_share IS NOT NULL AND v_share > v_threshold;
    END IF;
  ELSIF v_method = 'ranked' AND v_total > 0 THEN
    v_ranked := public.civic_election_ranked_result(p_election_id);
    v_leading := v_ranked->>'winner_option_key';
  END IF;
  -- Custom options, approval and ranked ballots: the consultation passed when a decision was reached.
  IF v_passed IS NULL AND v_total > 0 THEN
    v_passed := v_quorum_met AND v_leading IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'total_countable', v_total,
    'quorum', v_quorum,
    'quorum_met', v_quorum_met,
    'pass_threshold_percent', v_threshold,
    'support_share_percent', v_share,
    'passed', v_passed,
    'leading_option_key', v_leading,
    'ballot_method', v_method,
    'approvals_total', CASE WHEN v_method = 'approval' THEN v_approvals ELSE NULL END,
    'ranked_rounds', CASE WHEN v_method = 'ranked' THEN coalesce(v_ranked->'rounds', '[]'::jsonb) ELSE NULL END
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

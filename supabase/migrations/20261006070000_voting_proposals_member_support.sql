-- Member-initiated consultations and notifications (audit plan Phase 2).
--
-- 1. Members can support a draft voting proposal once its author opens it for support. When the
--    support count reaches the proposal's threshold the author may publish it; founders/admins
--    may publish at any time (unchanged).
-- 2. The author (or a manager) can set the scope (global / one country), the opening time and the
--    closing time while the proposal is a draft. Publishing honours them: a future opening time
--    creates a `scheduled` election that the lifecycle tick opens.
-- 3. Notifications in public.user_notifications: proposal published (author, supporters, Matter
--    parties) and consultation closed (everyone whose ballot counted).
-- 4. Legacy governance_proposal_votes: the client could send any weight; clamp it to 0..1.

-- ---------------------------------------------------------------------------------------------
-- Support rows
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.civic_voting_proposal_support (
  proposal_id uuid NOT NULL REFERENCES public.civic_voting_proposals(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, profile_id)
);
ALTER TABLE public.civic_voting_proposal_support ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Voting proposal support readable" ON public.civic_voting_proposal_support;
CREATE POLICY "Voting proposal support readable"
  ON public.civic_voting_proposal_support FOR SELECT TO authenticated
  USING (true);
GRANT SELECT ON public.civic_voting_proposal_support TO authenticated;

-- Drafts that are open for support are visible to every signed-in member.
DROP POLICY IF EXISTS "Civic voting proposals public read published" ON public.civic_voting_proposals;
CREATE POLICY "Civic voting proposals public read published"
  ON public.civic_voting_proposals FOR SELECT TO anon, authenticated
  USING (
    status IN ('published', 'closed')
    OR (
      status = 'draft'
      AND auth.uid() IS NOT NULL
      AND coalesce((metadata->>'open_for_support')::boolean, false)
    )
    OR created_by_profile_id = public.current_profile_id()
    OR public.civic_can_manage_voting_proposals(public.current_profile_id())
    OR EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND (
          m.initiator_profile_id = public.current_profile_id()
          OR m.responsible_profile_id = public.current_profile_id()
          OR m.addressee_profile_id = public.current_profile_id()
        )
    )
  );

CREATE OR REPLACE FUNCTION public.voting_proposal_support_threshold(p_proposal_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT greatest(1, least(1000, coalesce(nullif(p.metadata->>'support_threshold', '')::integer, 10)))
  FROM public.civic_voting_proposals p
  WHERE p.id = p_proposal_id;
$$;

CREATE OR REPLACE FUNCTION public.voting_proposal_support_summary(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM public.civic_voting_proposal_support s WHERE s.proposal_id = p_proposal_id),
    'threshold', public.voting_proposal_support_threshold(p_proposal_id),
    'open_for_support', coalesce((p.metadata->>'open_for_support')::boolean, false),
    'supported', EXISTS (
      SELECT 1 FROM public.civic_voting_proposal_support s
      WHERE s.proposal_id = p_proposal_id AND s.profile_id = public.current_profile_id()
    ),
    'ready', (SELECT count(*) FROM public.civic_voting_proposal_support s WHERE s.proposal_id = p_proposal_id)
             >= public.voting_proposal_support_threshold(p_proposal_id)
  )
  FROM public.civic_voting_proposals p
  WHERE p.id = p_proposal_id;
$$;

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
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found'; END IF;
  IF v_prop.status <> 'draft' THEN RAISE EXCEPTION 'proposal_not_draft'; END IF;
  IF v_prop.created_by_profile_id <> v_self AND NOT public.civic_can_manage_voting_proposals(v_self) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_threshold := greatest(1, least(1000, coalesce(p_threshold, nullif(v_prop.metadata->>'support_threshold', '')::integer, 10)));

  UPDATE public.civic_voting_proposals
  SET metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('open_for_support', true, 'support_threshold', v_threshold, 'opened_for_support_at', now()),
      updated_at = now()
  WHERE id = p_proposal_id;

  RETURN public.voting_proposal_support_summary(p_proposal_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_voting_proposal_support(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_self AND p.deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'profile_unavailable';
  END IF;
  IF public.profile_has_governance_block(v_self, 'proposal_create'::public.governance_block_scope) THEN
    RAISE EXCEPTION 'voter_blocked';
  END IF;
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found'; END IF;
  IF v_prop.status <> 'draft' THEN RAISE EXCEPTION 'proposal_not_draft'; END IF;
  IF NOT coalesce((v_prop.metadata->>'open_for_support')::boolean, false) THEN
    RAISE EXCEPTION 'proposal_not_open_for_support';
  END IF;

  IF EXISTS (SELECT 1 FROM public.civic_voting_proposal_support WHERE proposal_id = p_proposal_id AND profile_id = v_self) THEN
    DELETE FROM public.civic_voting_proposal_support WHERE proposal_id = p_proposal_id AND profile_id = v_self;
  ELSE
    INSERT INTO public.civic_voting_proposal_support (proposal_id, profile_id) VALUES (p_proposal_id, v_self);
  END IF;

  RETURN public.voting_proposal_support_summary(p_proposal_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_voting_proposal_settings(
  p_proposal_id uuid,
  p_scope_kind text DEFAULT NULL,
  p_scope_country_code text DEFAULT NULL,
  p_voting_opens_at timestamptz DEFAULT NULL,
  p_voting_closes_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_scope text := lower(trim(coalesce(p_scope_kind, '')));
  v_country text := upper(trim(coalesce(p_scope_country_code, '')));
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found'; END IF;
  IF v_prop.status <> 'draft' THEN RAISE EXCEPTION 'proposal_not_draft'; END IF;
  IF v_prop.created_by_profile_id <> v_self AND NOT public.civic_can_manage_voting_proposals(v_self) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_scope = '' THEN v_scope := v_prop.scope_kind; END IF;
  IF v_scope NOT IN ('global', 'country') THEN RAISE EXCEPTION 'invalid_scope'; END IF;
  IF v_scope = 'country' THEN
    IF v_country !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'country_required'; END IF;
  ELSE
    v_country := NULL;
  END IF;
  IF p_voting_opens_at IS NOT NULL AND p_voting_closes_at IS NOT NULL AND p_voting_closes_at <= p_voting_opens_at THEN
    RAISE EXCEPTION 'invalid_voting_window';
  END IF;

  UPDATE public.civic_voting_proposals
  SET scope_kind = v_scope,
      scope_country_code = v_country,
      voting_opens_at = p_voting_opens_at,
      voting_closes_at = p_voting_closes_at,
      updated_at = now()
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'scope_kind', v_scope, 'scope_country_code', v_country,
    'voting_opens_at', p_voting_opens_at, 'voting_closes_at', p_voting_closes_at
  );
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_notify_profiles(
  p_recipients uuid[],
  p_type text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
  SELECT DISTINCT r.id, p_type, p_title, p_body, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb)
  FROM unnest(coalesce(p_recipients, '{}'::uuid[])) AS r(id)
  JOIN public.profiles p ON p.id = r.id AND p.deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.civic_notify_profiles(uuid[], text, text, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Publish: managers any time, authors once the support threshold is met; honours scope + times
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_voting_proposal(p_proposal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_matter public.matters%ROWTYPE;
  v_election_id uuid;
  v_contest_id uuid;
  v_opens timestamptz;
  v_closes timestamptz;
  v_tier text;
  v_country text;
  v_ready boolean;
  v_recipients uuid[];
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;
  IF v_prop.status <> 'draft' THEN
    RAISE EXCEPTION 'proposal_not_draft';
  END IF;
  IF v_prop.election_id IS NOT NULL THEN
    RAISE EXCEPTION 'proposal_already_published';
  END IF;

  v_ready := (SELECT count(*) FROM public.civic_voting_proposal_support s WHERE s.proposal_id = p_proposal_id)
             >= public.voting_proposal_support_threshold(p_proposal_id);
  IF NOT public.civic_can_manage_voting_proposals(v_self)
     AND NOT (v_prop.created_by_profile_id = v_self AND v_ready) THEN
    RAISE EXCEPTION 'not_authorized_to_publish';
  END IF;

  v_opens := coalesce(v_prop.voting_opens_at, now());
  IF v_opens < now() THEN v_opens := now(); END IF;
  v_closes := coalesce(v_prop.voting_closes_at, v_opens + interval '365 days');
  IF v_closes <= v_opens THEN
    RAISE EXCEPTION 'invalid_voting_window';
  END IF;

  v_tier := CASE v_prop.scope_kind
    WHEN 'country' THEN 'national'
    WHEN 'region' THEN 'regional'
    WHEN 'locality' THEN 'local'
    ELSE 'supranational'
  END;
  v_country := CASE WHEN v_prop.scope_kind = 'global' THEN 'GLOBAL' ELSE upper(v_prop.scope_country_code) END;

  INSERT INTO public.civic_elections (
    title, summary, body, tier, security_class, status,
    scope_country_code, scope_region_code, scope_locality_code,
    voting_opens_at, voting_closes_at,
    primary_window_seconds, max_attempts, retry_spacing_hours,
    require_home_presence, require_solitude, require_face_liveness,
    metadata
  ) VALUES (
    v_prop.title,
    v_prop.summary,
    v_prop.body,
    v_tier::public.civic_election_tier,
    'ordinary',
    (CASE WHEN v_opens > now() + interval '1 minute' THEN 'scheduled' ELSE 'open' END)::public.civic_election_status,
    v_country,
    v_prop.scope_region_code,
    v_prop.scope_locality_code,
    v_opens,
    v_closes,
    900, 5, 24,
    false, false, false,
    jsonb_build_object(
      'proposal_id', v_prop.id::text,
      'matter_id', v_prop.matter_id::text,
      'consultation_kind', 'nonbinding',
      'catalog', 'live',
      'published_by_author', (v_prop.created_by_profile_id = v_self AND NOT public.civic_can_manage_voting_proposals(v_self)),
      'support_count_at_publish', (SELECT count(*) FROM public.civic_voting_proposal_support s WHERE s.proposal_id = p_proposal_id)
    )
  )
  RETURNING id INTO v_election_id;

  INSERT INTO public.civic_contests (
    election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata
  ) VALUES (
    v_election_id, v_prop.title, v_prop.summary, 'measure', 'consultation_measure', 1, true, 0,
    jsonb_build_object('proposal_id', v_prop.id::text)
  )
  RETURNING id INTO v_contest_id;

  INSERT INTO public.civic_candidates (contest_id, display_name, statement, option_key, sort_order, metadata)
  VALUES
    (v_contest_id, 'Support', 'Support this consultation.', 'support', 0, '{}'::jsonb),
    (v_contest_id, 'Oppose', 'Oppose this consultation.', 'oppose', 1, '{}'::jsonb),
    (v_contest_id, 'Abstain', 'Abstain from this consultation.', 'abstain', 2, '{}'::jsonb);

  UPDATE public.civic_voting_proposals
  SET status = 'published',
      election_id = v_election_id,
      voting_opens_at = v_opens,
      voting_closes_at = v_closes,
      published_by_profile_id = v_self,
      published_at = now(),
      updated_at = now()
  WHERE id = p_proposal_id;

  PERFORM public.civic_append_election_event(
    v_election_id, 'election_published',
    jsonb_build_object('proposal_id', v_prop.id::text, 'opens_at', v_opens, 'closes_at', v_closes)
  );

  SELECT * INTO v_matter FROM public.matters WHERE id = v_prop.matter_id;
  SELECT array_agg(DISTINCT r.id) INTO v_recipients
  FROM (
    SELECT v_prop.created_by_profile_id AS id
    UNION SELECT s.profile_id FROM public.civic_voting_proposal_support s WHERE s.proposal_id = p_proposal_id
    UNION SELECT v_matter.initiator_profile_id
    UNION SELECT v_matter.responsible_profile_id
    UNION SELECT v_matter.addressee_profile_id
  ) r
  WHERE r.id IS NOT NULL AND r.id <> v_self;

  PERFORM public.civic_notify_profiles(
    v_recipients,
    'civic_consultation_published',
    v_prop.title,
    CASE WHEN v_opens > now() + interval '1 minute'
      THEN 'A consultation you follow is scheduled. Voting opens ' || to_char(v_opens AT TIME ZONE 'UTC', 'YYYY-MM-DD') || '.'
      ELSE 'A consultation you follow is open for voting.'
    END,
    'civic_election',
    v_election_id,
    jsonb_build_object('proposal_id', v_prop.id::text)
  );

  RETURN v_election_id;
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- Lifecycle tick: open scheduled elections, close due ones, notify voters of the result
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_close_due_elections()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_tally jsonb;
  v_voters uuid[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('civic_close_due_elections', 0));

  FOR r IN
    SELECT id FROM public.civic_elections
    WHERE status = 'scheduled'
      AND voting_opens_at <= now()
      AND voting_closes_at > now()
      AND coalesce(metadata->>'sample_batch', '') = ''
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.civic_elections SET status = 'open', updated_at = now() WHERE id = r.id;
    PERFORM public.civic_append_election_event(r.id, 'election_opened', '{}'::jsonb);
    v_count := v_count + 1;
  END LOOP;

  FOR r IN
    SELECT id, title FROM public.civic_elections
    WHERE status IN ('open', 'scheduled')
      AND voting_closes_at <= now()
      AND coalesce(metadata->>'sample_batch', '') = ''
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT coalesce(
      jsonb_agg(jsonb_build_object('option_key', t.option_key, 'display_name', t.display_name, 'vote_count', t.vote_count)
        ORDER BY t.option_key),
      '[]'::jsonb
    ) INTO v_tally
    FROM public.civic_election_public_tallies(r.id) t;

    UPDATE public.civic_elections
    SET status = 'closed',
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object('closed_at', now(), 'final_tally', v_tally),
        updated_at = now()
    WHERE id = r.id;

    UPDATE public.civic_voting_proposals
    SET status = 'closed', updated_at = now()
    WHERE election_id = r.id AND status = 'published';

    PERFORM public.civic_append_election_event(
      r.id, 'election_closed', jsonb_build_object('final_tally', v_tally)
    );

    SELECT array_agg(b.profile_id) INTO v_voters
    FROM public.civic_ballots b
    WHERE b.election_id = r.id AND b.is_countable AND NOT coalesce(b.is_duress, false);

    PERFORM public.civic_notify_profiles(
      v_voters,
      'civic_consultation_closed',
      r.title,
      'Voting has closed. The final count is published.',
      'civic_election',
      r.id,
      '{}'::jsonb
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- Legacy proposal votes: the weight is client-supplied; clamp it so one vote never counts more.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.governance_proposal_votes_clamp_weight()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.weight := least(greatest(coalesce(NEW.weight, 1), 0), 1);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS governance_proposal_votes_clamp_weight ON public.governance_proposal_votes;
CREATE TRIGGER governance_proposal_votes_clamp_weight
  BEFORE INSERT OR UPDATE ON public.governance_proposal_votes
  FOR EACH ROW EXECUTE FUNCTION public.governance_proposal_votes_clamp_weight();
UPDATE public.governance_proposal_votes SET weight = 1 WHERE weight > 1;

-- ---------------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.voting_proposal_support_threshold(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.voting_proposal_support_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_voting_proposal_for_support(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_voting_proposal_support(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.voting_proposal_support_threshold(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.voting_proposal_support_summary(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_voting_proposal_for_support(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_voting_proposal_support(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz) TO authenticated;

NOTIFY pgrst, 'reload schema';

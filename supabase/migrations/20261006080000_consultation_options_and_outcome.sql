-- Multi-option consultations, quorum, pass threshold, and a published outcome (audit plan Phase 3).
--
-- * A proposal may define 2–12 ballot options of its own (metadata.options); the default stays
--   Support / Oppose / Abstain. Publishing creates one candidate per option.
-- * cast_consultation_ballot accepts any option the election defines.
-- * A proposal may declare a quorum (minimum countable ballots) and a pass threshold (% support
--   among Support/Oppose ballots, default 50). The lifecycle tick stores metadata.final_outcome
--   next to final_tally and includes it in the election_closed event.

CREATE OR REPLACE FUNCTION public.civic_normalize_options(p_options jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item jsonb;
  v_key text;
  v_label text;
  v_out jsonb := '[]'::jsonb;
  v_keys text[] := '{}';
BEGIN
  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'invalid_options';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_options) LOOP
    IF jsonb_typeof(item) = 'string' THEN
      v_label := trim(item #>> '{}');
      v_key := NULL;
    ELSE
      v_label := trim(coalesce(item->>'label', ''));
      v_key := nullif(trim(coalesce(item->>'key', '')), '');
    END IF;
    IF v_label = '' OR char_length(v_label) > 80 THEN
      RAISE EXCEPTION 'invalid_options';
    END IF;
    v_key := lower(coalesce(v_key, v_label));
    v_key := regexp_replace(v_key, '[^a-z0-9]+', '_', 'g');
    v_key := trim(both '_' from v_key);
    IF v_key = '' THEN
      v_key := 'option_' || (jsonb_array_length(v_out) + 1)::text;
    END IF;
    v_key := left(v_key, 40);
    IF v_key = ANY (v_keys) THEN
      RAISE EXCEPTION 'invalid_options';
    END IF;
    v_keys := v_keys || v_key;
    v_out := v_out || jsonb_build_object('key', v_key, 'label', v_label);
  END LOOP;
  IF jsonb_array_length(v_out) < 2 OR jsonb_array_length(v_out) > 12 THEN
    RAISE EXCEPTION 'invalid_options';
  END IF;
  RETURN v_out;
END;
$$;

DROP FUNCTION IF EXISTS public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.update_voting_proposal_settings(
  p_proposal_id uuid,
  p_scope_kind text DEFAULT NULL,
  p_scope_country_code text DEFAULT NULL,
  p_voting_opens_at timestamptz DEFAULT NULL,
  p_voting_closes_at timestamptz DEFAULT NULL,
  p_options jsonb DEFAULT NULL,
  p_quorum integer DEFAULT NULL,
  p_pass_threshold numeric DEFAULT NULL
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
  v_meta jsonb;
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
  IF p_quorum IS NOT NULL AND p_quorum < 0 THEN RAISE EXCEPTION 'invalid_quorum'; END IF;
  IF p_pass_threshold IS NOT NULL AND (p_pass_threshold < 0 OR p_pass_threshold > 100) THEN
    RAISE EXCEPTION 'invalid_threshold';
  END IF;

  v_meta := coalesce(v_prop.metadata, '{}'::jsonb) - 'options' - 'quorum' - 'pass_threshold_percent';
  IF p_options IS NOT NULL AND jsonb_typeof(p_options) = 'array' AND jsonb_array_length(p_options) > 0 THEN
    v_meta := v_meta || jsonb_build_object('options', public.civic_normalize_options(p_options));
  END IF;
  IF p_quorum IS NOT NULL AND p_quorum > 0 THEN
    v_meta := v_meta || jsonb_build_object('quorum', p_quorum);
  END IF;
  IF p_pass_threshold IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object('pass_threshold_percent', round(p_pass_threshold, 1));
  END IF;

  UPDATE public.civic_voting_proposals
  SET scope_kind = v_scope,
      scope_country_code = v_country,
      voting_opens_at = p_voting_opens_at,
      voting_closes_at = p_voting_closes_at,
      metadata = v_meta,
      updated_at = now()
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'scope_kind', v_scope, 'scope_country_code', v_country,
    'voting_opens_at', p_voting_opens_at, 'voting_closes_at', p_voting_closes_at,
    'options', v_meta->'options', 'quorum', v_meta->'quorum', 'pass_threshold_percent', v_meta->'pass_threshold_percent'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Publish with the proposal's options and decision rules
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
  v_options jsonb;
  v_option jsonb;
  v_sort integer := 0;
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

  v_options := CASE
    WHEN jsonb_typeof(v_prop.metadata->'options') = 'array' AND jsonb_array_length(v_prop.metadata->'options') >= 2
      THEN v_prop.metadata->'options'
    ELSE '[{"key":"support","label":"Support"},{"key":"oppose","label":"Oppose"},{"key":"abstain","label":"Abstain"}]'::jsonb
  END;

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
      'support_count_at_publish', (SELECT count(*) FROM public.civic_voting_proposal_support s WHERE s.proposal_id = p_proposal_id),
      'custom_options', (v_prop.metadata ? 'options')
    )
    || CASE WHEN v_prop.metadata ? 'quorum' THEN jsonb_build_object('quorum', v_prop.metadata->'quorum') ELSE '{}'::jsonb END
    || CASE WHEN v_prop.metadata ? 'pass_threshold_percent' THEN jsonb_build_object('pass_threshold_percent', v_prop.metadata->'pass_threshold_percent') ELSE '{}'::jsonb END
  )
  RETURNING id INTO v_election_id;

  INSERT INTO public.civic_contests (
    election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata
  ) VALUES (
    v_election_id, v_prop.title, v_prop.summary, 'measure', 'consultation_measure', 1,
    (SELECT bool_or(o->>'key' = 'abstain') FROM jsonb_array_elements(v_options) o), 0,
    jsonb_build_object('proposal_id', v_prop.id::text)
  )
  RETURNING id INTO v_contest_id;

  FOR v_option IN SELECT value FROM jsonb_array_elements(v_options) LOOP
    INSERT INTO public.civic_candidates (contest_id, display_name, statement, option_key, sort_order, metadata)
    VALUES (v_contest_id, v_option->>'label', v_option->>'label', v_option->>'key', v_sort, '{}'::jsonb);
    v_sort := v_sort + 1;
  END LOOP;

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
    jsonb_build_object('proposal_id', v_prop.id::text, 'opens_at', v_opens, 'closes_at', v_closes, 'options', v_options)
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
-- Cast: any option the election defines
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_consultation_ballot(
  p_election_id uuid,
  p_option_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_election public.civic_elections%ROWTYPE;
  v_ballot public.civic_ballots%ROWTYPE;
  v_reason text;
  v_candidate_id uuid;
  v_session_id uuid;
  v_ballot_id uuid;
  v_option text := lower(trim(coalesce(p_option_key, '')));
  v_sealed text;
  v_receipt text;
  v_was_countable boolean := false;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_option = '' OR char_length(v_option) > 40 THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;

  SELECT * INTO v_election FROM public.civic_elections WHERE id = p_election_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'election_not_found';
  END IF;

  v_reason := public.consultation_eligibility_reason(p_election_id, v_self);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION '%', v_reason;
  END IF;

  SELECT c.id INTO v_candidate_id
  FROM public.civic_candidates c
  JOIN public.civic_contests ct ON ct.id = c.contest_id
  WHERE ct.election_id = p_election_id
    AND lower(c.option_key) = v_option
  LIMIT 1;
  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'option_not_found';
  END IF;

  v_sealed := public.civic_seal_choice(p_election_id, v_option);
  v_receipt := encode(extensions.gen_random_bytes(12), 'hex');

  SELECT * INTO v_ballot
  FROM public.civic_ballots
  WHERE election_id = p_election_id AND profile_id = v_self
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.civic_vote_sessions (
      election_id, profile_id, status, scheduled_for, started_at, completed_at, attempt_number, metadata
    ) VALUES (
      p_election_id, v_self, 'cast', now(), now(), now(), 1,
      jsonb_build_object('consultation', true)
    )
    RETURNING id INTO v_session_id;

    INSERT INTO public.civic_ballots (
      election_id, session_id, profile_id, ballot_commitment, encrypted_payload,
      is_countable, is_duress, cast_at, metadata
    ) VALUES (
      p_election_id, v_session_id, v_self, v_receipt, v_sealed,
      true, false, now(), jsonb_build_object('consultation', true, 'sealed', true)
    )
    RETURNING id INTO v_ballot_id;

    PERFORM public.civic_append_election_event(
      p_election_id, 'consultation_cast', jsonb_build_object('receipt', v_receipt)
    );
  ELSE
    v_ballot_id := v_ballot.id;
    v_was_countable := v_ballot.is_countable AND NOT coalesce(v_ballot.is_duress, false);
    IF v_was_countable THEN
      v_receipt := v_ballot.ballot_commitment;
    END IF;

    UPDATE public.civic_ballots
    SET
      cast_at = now(),
      is_countable = true,
      is_duress = false,
      ballot_commitment = v_receipt,
      encrypted_payload = v_sealed,
      metadata = jsonb_build_object('consultation', true, 'sealed', true, 'changed', v_was_countable)
    WHERE id = v_ballot_id;

    UPDATE public.civic_vote_sessions
    SET status = 'cast', completed_at = now(), metadata = jsonb_build_object('consultation', true)
    WHERE id = v_ballot.session_id;

    DELETE FROM public.civic_ballot_selections WHERE ballot_id = v_ballot_id;

    PERFORM public.civic_append_election_event(
      p_election_id,
      CASE WHEN v_was_countable THEN 'consultation_changed' ELSE 'consultation_cast' END,
      jsonb_build_object('receipt', v_receipt)
    );
  END IF;

  RETURN jsonb_build_object('ballot_id', v_ballot_id, 'receipt', v_receipt);
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- Outcome: quorum and pass threshold evaluated at close
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_election_outcome(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta jsonb;
  v_total bigint := 0;
  v_support bigint;
  v_oppose bigint;
  v_leading text;
  v_quorum integer;
  v_threshold numeric;
  v_share numeric;
  v_quorum_met boolean;
  v_passed boolean;
BEGIN
  SELECT metadata INTO v_meta FROM public.civic_elections WHERE id = p_election_id;
  IF v_meta IS NULL THEN RETURN NULL; END IF;

  SELECT coalesce(sum(t.vote_count), 0) INTO v_total FROM public.civic_election_public_tallies(p_election_id) t;
  SELECT t.vote_count INTO v_support FROM public.civic_election_public_tallies(p_election_id) t WHERE t.option_key = 'support';
  SELECT t.vote_count INTO v_oppose FROM public.civic_election_public_tallies(p_election_id) t WHERE t.option_key = 'oppose';
  SELECT t.option_key INTO v_leading
  FROM public.civic_election_public_tallies(p_election_id) t
  WHERE t.vote_count > 0
  ORDER BY t.vote_count DESC, t.option_key ASC
  LIMIT 1;

  v_quorum := nullif(v_meta->>'quorum', '')::integer;
  v_threshold := coalesce(nullif(v_meta->>'pass_threshold_percent', '')::numeric, 50);
  v_quorum_met := v_quorum IS NULL OR v_total >= v_quorum;

  IF v_support IS NOT NULL AND v_oppose IS NOT NULL THEN
    IF v_support + v_oppose > 0 THEN
      v_share := round(v_support * 100.0 / (v_support + v_oppose), 1);
    END IF;
    v_passed := v_quorum_met AND v_share IS NOT NULL AND v_share > v_threshold;
  END IF;

  RETURN jsonb_build_object(
    'total_countable', v_total,
    'quorum', v_quorum,
    'quorum_met', v_quorum_met,
    'pass_threshold_percent', v_threshold,
    'support_share_percent', v_share,
    'passed', v_passed,
    'leading_option_key', v_leading
  );
END;
$$;
REVOKE ALL ON FUNCTION public.civic_election_outcome(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_election_outcome(uuid) TO anon, authenticated;

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
  v_outcome jsonb;
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
    v_outcome := public.civic_election_outcome(r.id);

    UPDATE public.civic_elections
    SET status = 'closed',
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object('closed_at', now(), 'final_tally', v_tally, 'final_outcome', v_outcome),
        updated_at = now()
    WHERE id = r.id;

    UPDATE public.civic_voting_proposals
    SET status = 'closed', updated_at = now()
    WHERE election_id = r.id AND status = 'published';

    PERFORM public.civic_append_election_event(
      r.id, 'election_closed', jsonb_build_object('final_tally', v_tally, 'final_outcome', v_outcome)
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

NOTIFY pgrst, 'reload schema';

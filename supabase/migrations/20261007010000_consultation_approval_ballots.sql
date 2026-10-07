-- Approval ballots for ordinary consultations (audit plan Phase 3, design doc §15).
--
-- * A draft with its own options may choose ballot_method = 'approval' and a maximum number of
--   picks per ballot (metadata.max_selections, 2 … number of options; default all).
-- * Publishing copies both to the election; the contest's seat_count mirrors the maximum.
-- * cast_consultation_ballot(election, option_keys text[]) accepts 1 … max picks; the picks are
--   sealed together as one JSON array under the election secret, so nothing changes for the
--   receipt, the audit log or the withdraw path. The one-key form stays as a wrapper.
-- * Public tallies count every pick; the outcome counts ballots once, reports approvals_total and
--   the most approved option, and gives no pass verdict (the Support / Oppose rule does not apply).

-- ---------------------------------------------------------------------------------------------
-- Settings: ballot method and maximum picks
-- ---------------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric);

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
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_scope text := lower(trim(coalesce(p_scope_kind, '')));
  v_country text := upper(trim(coalesce(p_scope_country_code, '')));
  v_method text := lower(trim(coalesce(p_ballot_method, 'single')));
  v_meta jsonb;
  v_option_count integer;
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
  IF v_method = '' THEN v_method := 'single'; END IF;
  IF v_method NOT IN ('single', 'approval') THEN RAISE EXCEPTION 'invalid_ballot_method'; END IF;

  v_meta := coalesce(v_prop.metadata, '{}'::jsonb)
    - 'options' - 'quorum' - 'pass_threshold_percent' - 'ballot_method' - 'max_selections';
  IF p_options IS NOT NULL AND jsonb_typeof(p_options) = 'array' AND jsonb_array_length(p_options) > 0 THEN
    v_meta := v_meta || jsonb_build_object('options', public.civic_normalize_options(p_options));
  END IF;
  v_option_count := coalesce(jsonb_array_length(v_meta->'options'), 3);
  IF p_quorum IS NOT NULL AND p_quorum > 0 THEN
    v_meta := v_meta || jsonb_build_object('quorum', p_quorum);
  END IF;
  IF p_pass_threshold IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object('pass_threshold_percent', round(p_pass_threshold, 1));
  END IF;
  IF v_method = 'approval' THEN
    IF NOT (v_meta ? 'options') THEN RAISE EXCEPTION 'approval_needs_options'; END IF;
    IF p_max_selections IS NOT NULL AND (p_max_selections < 2 OR p_max_selections > v_option_count) THEN
      RAISE EXCEPTION 'invalid_max_selections';
    END IF;
    v_meta := v_meta || jsonb_build_object('ballot_method', 'approval');
    IF p_max_selections IS NOT NULL THEN
      v_meta := v_meta || jsonb_build_object('max_selections', p_max_selections);
    END IF;
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
    'options', v_meta->'options', 'quorum', v_meta->'quorum', 'pass_threshold_percent', v_meta->'pass_threshold_percent',
    'ballot_method', coalesce(v_meta->>'ballot_method', 'single'), 'max_selections', v_meta->'max_selections'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_voting_proposal_settings(uuid, text, text, timestamptz, timestamptz, jsonb, integer, numeric, text, integer) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Publish: copy the ballot method to the election
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
  v_method text;
  v_max integer;
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
  v_method := CASE WHEN v_prop.metadata->>'ballot_method' = 'approval' AND (v_prop.metadata ? 'options') THEN 'approval' ELSE 'single' END;
  v_max := CASE
    WHEN v_method = 'approval' THEN least(
      greatest(coalesce(nullif(v_prop.metadata->>'max_selections', '')::integer, jsonb_array_length(v_options)), 2),
      jsonb_array_length(v_options))
    ELSE 1
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
      'custom_options', (v_prop.metadata ? 'options'),
      'ballot_method', v_method
    )
    || CASE WHEN v_method = 'approval' THEN jsonb_build_object('max_selections', v_max) ELSE '{}'::jsonb END
    || CASE WHEN v_prop.metadata ? 'quorum' THEN jsonb_build_object('quorum', v_prop.metadata->'quorum') ELSE '{}'::jsonb END
    || CASE WHEN v_prop.metadata ? 'pass_threshold_percent' THEN jsonb_build_object('pass_threshold_percent', v_prop.metadata->'pass_threshold_percent') ELSE '{}'::jsonb END
  )
  RETURNING id INTO v_election_id;

  INSERT INTO public.civic_contests (
    election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata
  ) VALUES (
    v_election_id, v_prop.title, v_prop.summary, 'measure', 'consultation_measure', v_max,
    (SELECT bool_or(o->>'key' = 'abstain') FROM jsonb_array_elements(v_options) o), 0,
    jsonb_build_object('proposal_id', v_prop.id::text, 'ballot_method', v_method)
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
    jsonb_build_object('proposal_id', v_prop.id::text, 'opens_at', v_opens, 'closes_at', v_closes, 'options', v_options,
                       'ballot_method', v_method, 'max_selections', v_max)
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
-- Cast: one or several picks, sealed together
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_consultation_ballot(
  p_election_id uuid,
  p_option_keys text[]
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
  v_session_id uuid;
  v_ballot_id uuid;
  v_keys text[];
  v_key text;
  v_defined integer;
  v_max integer;
  v_payload text;
  v_sealed text;
  v_receipt text;
  v_was_countable boolean := false;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT array_agg(DISTINCT k ORDER BY k) INTO v_keys
  FROM (SELECT lower(trim(x)) AS k FROM unnest(coalesce(p_option_keys, '{}'::text[])) x) s
  WHERE k <> '';
  IF v_keys IS NULL OR cardinality(v_keys) = 0 THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;
  FOREACH v_key IN ARRAY v_keys LOOP
    IF char_length(v_key) > 40 THEN RAISE EXCEPTION 'invalid_option'; END IF;
  END LOOP;

  SELECT * INTO v_election FROM public.civic_elections WHERE id = p_election_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'election_not_found';
  END IF;

  v_reason := public.consultation_eligibility_reason(p_election_id, v_self);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION '%', v_reason;
  END IF;

  v_max := CASE
    WHEN v_election.metadata->>'ballot_method' = 'approval'
      THEN coalesce(nullif(v_election.metadata->>'max_selections', '')::integer, 12)
    ELSE 1
  END;
  IF cardinality(v_keys) > v_max THEN
    RAISE EXCEPTION 'too_many_selections';
  END IF;

  SELECT count(DISTINCT lower(c.option_key)) INTO v_defined
  FROM public.civic_candidates c
  JOIN public.civic_contests ct ON ct.id = c.contest_id
  WHERE ct.election_id = p_election_id
    AND lower(c.option_key) = ANY (v_keys);
  IF v_defined <> cardinality(v_keys) THEN
    RAISE EXCEPTION 'option_not_found';
  END IF;

  -- Single picks keep the plain key so older sealed ballots and these stay tallied the same way.
  v_payload := CASE WHEN cardinality(v_keys) = 1 THEN v_keys[1] ELSE to_jsonb(v_keys)::text END;
  v_sealed := public.civic_seal_choice(p_election_id, v_payload);
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
REVOKE ALL ON FUNCTION public.cast_consultation_ballot(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_consultation_ballot(uuid, text[]) TO authenticated;

-- The one-key form stays for older clients and scripts.
CREATE OR REPLACE FUNCTION public.cast_consultation_ballot(
  p_election_id uuid,
  p_option_key text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.cast_consultation_ballot(p_election_id, ARRAY[p_option_key]);
$$;
REVOKE ALL ON FUNCTION public.cast_consultation_ballot(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_consultation_ballot(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Sealed payloads: a plain key or a JSON array of keys
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_choice_keys(p_payload text)
RETURNS SETOF text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(k)
  FROM (
    SELECT jsonb_array_elements_text(p_payload::jsonb) AS k
    WHERE left(trim(coalesce(p_payload, '')), 1) = '['
    UNION ALL
    SELECT p_payload WHERE left(trim(coalesce(p_payload, '')), 1) <> '' AND left(trim(coalesce(p_payload, '')), 1) <> '['
  ) s
  WHERE k IS NOT NULL AND k <> '';
$$;

CREATE OR REPLACE FUNCTION public.civic_election_public_tallies(p_election_id uuid)
RETURNS TABLE (
  candidate_id uuid,
  option_key text,
  display_name text,
  vote_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sealed AS (
    SELECT k.choice
    FROM public.civic_ballots b
    JOIN public.civic_elections e ON e.id = b.election_id
    CROSS JOIN LATERAL public.civic_choice_keys(public.civic_unseal_choice(b.election_id, b.encrypted_payload)) AS k(choice)
    WHERE b.election_id = p_election_id
      AND b.is_countable
      AND NOT coalesce(b.is_duress, false)
      AND b.encrypted_payload IS NOT NULL
      AND coalesce(e.metadata->>'sample_batch', '') = ''
      AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
  ),
  clear AS (
    SELECT bs.candidate_id, count(*)::bigint AS n
    FROM public.civic_ballot_selections bs
    JOIN public.civic_ballots b ON b.id = bs.ballot_id
    JOIN public.civic_elections e ON e.id = b.election_id
    WHERE b.election_id = p_election_id
      AND b.is_countable
      AND NOT coalesce(b.is_duress, false)
      AND b.encrypted_payload IS NULL
      AND bs.candidate_id IS NOT NULL
      AND coalesce(e.metadata->>'sample_batch', '') = ''
      AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    GROUP BY bs.candidate_id
  )
  SELECT
    c.id AS candidate_id,
    c.option_key,
    c.display_name,
    (
      coalesce((SELECT count(*) FROM sealed s WHERE s.choice = lower(c.option_key)), 0)
      + coalesce((SELECT n FROM clear WHERE clear.candidate_id = c.id), 0)
    )::bigint AS vote_count
  FROM public.civic_candidates c
  JOIN public.civic_contests ct ON ct.id = c.contest_id
  WHERE ct.election_id = p_election_id
  ORDER BY c.sort_order ASC, c.display_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.my_consultation_ballot(p_election_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'option_key', (SELECT k FROM public.civic_choice_keys(public.civic_unseal_choice(b.election_id, b.encrypted_payload)) k LIMIT 1),
    'option_keys', coalesce((SELECT jsonb_agg(k) FROM public.civic_choice_keys(public.civic_unseal_choice(b.election_id, b.encrypted_payload)) k), '[]'::jsonb),
    'receipt', b.ballot_commitment,
    'cast_at', b.cast_at
  )
  FROM public.civic_ballots b
  WHERE b.election_id = p_election_id
    AND b.profile_id = public.current_profile_id()
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
  ORDER BY b.cast_at DESC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------------------------
-- Outcome: ballots counted once; approval ballots report total approvals and no pass verdict
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
BEGIN
  SELECT metadata INTO v_meta FROM public.civic_elections WHERE id = p_election_id;
  IF v_meta IS NULL THEN RETURN NULL; END IF;
  v_method := CASE WHEN v_meta->>'ballot_method' = 'approval' THEN 'approval' ELSE 'single' END;

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
    'approvals_total', CASE WHEN v_method = 'approval' THEN v_approvals ELSE NULL END
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

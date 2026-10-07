-- Ranked ballots for ordinary consultations, counted by instant run-off (design doc §15).
--
-- * A draft with its own options may choose ballot_method = 'ranked'. Members tap options in order
--   of preference; partial rankings are allowed.
-- * The picks are sealed as one JSON array in the voter's order (approval ballots now keep the
--   voter's order too; order carries no meaning there).
-- * Public tallies show first preferences only, so each ballot is counted once.
-- * civic_election_ranked_result runs instant run-off: a majority of the ballots still active wins;
--   otherwise the option with the fewest first preferences is eliminated (ties: alphabetical key)
--   and its ballots move to their next remaining preference. Exhausted ballots drop out.
-- * The outcome stores the winner and the rounds; there is no Support / Oppose pass verdict.

-- ---------------------------------------------------------------------------------------------
-- Payload helpers
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_choice_keys(p_payload text)
RETURNS SETOF text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(k)
  FROM (
    SELECT k, ord
    FROM jsonb_array_elements_text(CASE WHEN left(trim(coalesce(p_payload, '')), 1) = '[' THEN p_payload::jsonb ELSE '[]'::jsonb END) WITH ORDINALITY AS a(k, ord)
    UNION ALL
    SELECT p_payload, 0 WHERE left(trim(coalesce(p_payload, '')), 1) <> '' AND left(trim(coalesce(p_payload, '')), 1) <> '['
  ) s
  WHERE k IS NOT NULL AND k <> ''
  ORDER BY ord;
$$;

-- Keys that count in the public tally: every pick on approval ballots, the first preference on ranked ones.
CREATE OR REPLACE FUNCTION public.civic_tally_keys(p_payload text, p_method text)
RETURNS SETOF text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT k FROM public.civic_choice_keys(p_payload) WITH ORDINALITY AS c(k, ord)
  WHERE p_method <> 'ranked' OR ord = 1;
$$;

-- ---------------------------------------------------------------------------------------------
-- Settings and publish accept 'ranked'
-- ---------------------------------------------------------------------------------------------
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
  IF v_method NOT IN ('single', 'approval', 'ranked') THEN RAISE EXCEPTION 'invalid_ballot_method'; END IF;

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
  IF v_method IN ('approval', 'ranked') THEN
    IF NOT (v_meta ? 'options') THEN RAISE EXCEPTION 'approval_needs_options'; END IF;
    v_meta := v_meta || jsonb_build_object('ballot_method', v_method);
  END IF;
  IF v_method = 'approval' THEN
    IF p_max_selections IS NOT NULL AND (p_max_selections < 2 OR p_max_selections > v_option_count) THEN
      RAISE EXCEPTION 'invalid_max_selections';
    END IF;
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

-- publish_voting_proposal: only the method/max expressions change, so rewrite them in place.
DO $$
DECLARE
  v_src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_src
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'publish_voting_proposal';
  IF v_src IS NULL THEN RAISE EXCEPTION 'publish_voting_proposal missing'; END IF;
  v_src := replace(v_src,
    $q$v_method := CASE WHEN v_prop.metadata->>'ballot_method' = 'approval' AND (v_prop.metadata ? 'options') THEN 'approval' ELSE 'single' END;$q$,
    $q$v_method := CASE WHEN v_prop.metadata->>'ballot_method' IN ('approval', 'ranked') AND (v_prop.metadata ? 'options') THEN v_prop.metadata->>'ballot_method' ELSE 'single' END;$q$);
  v_src := replace(v_src,
    $q$    WHEN v_method = 'approval' THEN least($q$,
    $q$    WHEN v_method = 'ranked' THEN jsonb_array_length(v_options)
    WHEN v_method = 'approval' THEN least($q$);
  IF position('ranked' in v_src) = 0 THEN RAISE EXCEPTION 'publish_voting_proposal rewrite did not apply'; END IF;
  EXECUTE v_src;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Cast: keep the voter's order; ranked accepts any number of distinct defined options
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
  v_keys text[] := '{}';
  v_key text;
  v_method text;
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

  FOREACH v_key IN ARRAY coalesce(p_option_keys, '{}'::text[]) LOOP
    v_key := lower(trim(coalesce(v_key, '')));
    IF v_key = '' THEN CONTINUE; END IF;
    IF char_length(v_key) > 40 THEN RAISE EXCEPTION 'invalid_option'; END IF;
    IF NOT (v_key = ANY (v_keys)) THEN v_keys := v_keys || v_key; END IF;
  END LOOP;
  IF cardinality(v_keys) = 0 THEN
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

  v_method := coalesce(v_election.metadata->>'ballot_method', 'single');
  v_max := CASE
    WHEN v_method = 'approval' THEN coalesce(nullif(v_election.metadata->>'max_selections', '')::integer, 12)
    WHEN v_method = 'ranked' THEN 12
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
  v_payload := CASE WHEN cardinality(v_keys) = 1 AND v_method <> 'ranked' THEN v_keys[1] ELSE to_jsonb(v_keys)::text END;
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

-- ---------------------------------------------------------------------------------------------
-- Tallies: first preferences only on ranked ballots
-- ---------------------------------------------------------------------------------------------
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
    CROSS JOIN LATERAL public.civic_tally_keys(
      public.civic_unseal_choice(b.election_id, b.encrypted_payload),
      coalesce(e.metadata->>'ballot_method', 'single')
    ) AS k(choice)
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

-- ---------------------------------------------------------------------------------------------
-- Instant run-off
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_election_ranked_result(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ballots jsonb;          -- array of arrays of option keys, each in the voter's order
  v_remaining text[];
  v_counts jsonb;
  v_rounds jsonb := '[]'::jsonb;
  v_round integer := 0;
  v_active integer;
  v_top text;
  v_top_n bigint;
  v_low text;
  v_winner text;
BEGIN
  SELECT array_agg(lower(c.option_key) ORDER BY c.sort_order) INTO v_remaining
  FROM public.civic_candidates c JOIN public.civic_contests ct ON ct.id = c.contest_id
  WHERE ct.election_id = p_election_id;
  IF v_remaining IS NULL THEN RETURN jsonb_build_object('winner_option_key', NULL, 'rounds', '[]'::jsonb); END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(s.prefs)), '[]'::jsonb) INTO v_ballots
  FROM (
    SELECT (
      SELECT array_agg(k ORDER BY ord)
      FROM public.civic_choice_keys(public.civic_unseal_choice(b.election_id, b.encrypted_payload)) WITH ORDINALITY AS c(k, ord)
    ) AS prefs
    FROM public.civic_ballots b
    JOIN public.civic_elections e ON e.id = b.election_id
    WHERE b.election_id = p_election_id
      AND b.is_countable AND NOT coalesce(b.is_duress, false) AND b.encrypted_payload IS NOT NULL
      AND coalesce(e.metadata->>'sample_batch', '') = ''
      AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
  ) s
  WHERE s.prefs IS NOT NULL;

  LOOP
    v_round := v_round + 1;
    -- first remaining preference of each ballot
    SELECT jsonb_object_agg(t.rem, t.n) INTO v_counts
    FROM (
      SELECT rem, (
        SELECT count(*)
        FROM jsonb_array_elements(v_ballots) bl
        WHERE (
          SELECT u.p FROM jsonb_array_elements_text(bl) WITH ORDINALITY AS u(p, o)
          WHERE u.p = ANY (v_remaining) ORDER BY u.o LIMIT 1
        ) = rem
      ) AS n
      FROM unnest(v_remaining) rem
    ) t;
    SELECT count(*) INTO v_active
    FROM jsonb_array_elements(v_ballots) bl
    WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(bl) p WHERE p = ANY (v_remaining));

    SELECT key, (value)::bigint INTO v_top, v_top_n FROM jsonb_each_text(v_counts) ORDER BY (value)::bigint DESC, key ASC LIMIT 1;
    SELECT key INTO v_low FROM jsonb_each_text(v_counts) ORDER BY (value)::bigint ASC, key DESC LIMIT 1;

    IF v_active = 0 THEN
      v_rounds := v_rounds || jsonb_build_object('round', v_round, 'counts', v_counts, 'active', 0);
      EXIT;
    END IF;
    IF v_top_n * 2 > v_active OR cardinality(v_remaining) = 1 THEN
      v_winner := v_top;
      v_rounds := v_rounds || jsonb_build_object('round', v_round, 'counts', v_counts, 'active', v_active, 'winner', v_top);
      EXIT;
    END IF;
    v_rounds := v_rounds || jsonb_build_object('round', v_round, 'counts', v_counts, 'active', v_active, 'eliminated', v_low);
    v_remaining := array_remove(v_remaining, v_low);
    IF v_round > 50 THEN EXIT; END IF;
  END LOOP;

  RETURN jsonb_build_object('winner_option_key', v_winner, 'rounds', v_rounds);
END;
$$;
REVOKE ALL ON FUNCTION public.civic_election_ranked_result(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_election_ranked_result(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Outcome: ranked reports the run-off winner and rounds
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

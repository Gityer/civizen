-- Consultation ballot integrity (design doc §6, Phase A).
--
-- 1. Eligibility is enforced on the server: deleted profiles, governance vote sanctions, and the
--    election's own declared rules (metadata.requires_verified, metadata.min_age, country scope).
-- 2. Ballot secrecy: the choice is stored only as pgp ciphertext under a per-election secret that
--    no API role can read. Ballot/session metadata and civic_ballot_selections no longer carry it.
-- 3. Append-only, hash-chained civic_voting_events per election. Events never carry a voter id.
-- 4. Voter receipt: a random commitment is returned on cast and can be checked against the public
--    list of counted receipts. Choices are never listed.
-- 5. Lifecycle: civic_close_due_elections() closes elections past voting_closes_at, records the
--    final tally as an event and in election metadata, closes their proposals; pg_cron runs it hourly.
--
-- Limitation (documented): the database owner / service role can still decrypt. Phase B/C of the
-- design (external verifiers, mix-net tallying) is out of scope here.

-- ---------------------------------------------------------------------------------------------
-- Per-election secrets (never readable through the API)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.civic_election_secrets (
  election_id uuid PRIMARY KEY REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.civic_election_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.civic_election_secrets FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.civic_election_secret_ensure(p_election_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT secret INTO v_secret FROM public.civic_election_secrets WHERE election_id = p_election_id;
  IF v_secret IS NULL THEN
    INSERT INTO public.civic_election_secrets (election_id, secret)
    VALUES (p_election_id, encode(extensions.gen_random_bytes(32), 'hex'))
    ON CONFLICT (election_id) DO NOTHING;
    SELECT secret INTO v_secret FROM public.civic_election_secrets WHERE election_id = p_election_id;
  END IF;
  RETURN v_secret;
END;
$$;

CREATE OR REPLACE FUNCTION public.civic_election_secret_lookup(p_election_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT secret FROM public.civic_election_secrets WHERE election_id = p_election_id;
$$;

CREATE OR REPLACE FUNCTION public.civic_seal_choice(p_election_id uuid, p_option text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(
    extensions.pgp_sym_encrypt(lower(trim(p_option)), public.civic_election_secret_ensure(p_election_id)),
    'base64'
  );
$$;

CREATE OR REPLACE FUNCTION public.civic_unseal_choice(p_election_id uuid, p_payload text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  IF p_payload IS NULL OR p_payload = '' THEN
    RETURN NULL;
  END IF;
  v_secret := public.civic_election_secret_lookup(p_election_id);
  IF v_secret IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN extensions.pgp_sym_decrypt(decode(p_payload, 'base64'), v_secret);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.civic_election_secret_ensure(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.civic_election_secret_lookup(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.civic_seal_choice(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.civic_unseal_choice(uuid, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Hash-chained events (no voter identity; public read already granted by an earlier migration)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_append_election_event(
  p_election_id uuid,
  p_event_type text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
  v_hash text;
  v_now timestamptz := clock_timestamp();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('civic_voting_events:' || p_election_id::text, 0));
  SELECT event_hash INTO v_prev
  FROM public.civic_voting_events
  WHERE election_id = p_election_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  v_hash := encode(
    sha256(convert_to(
      coalesce(v_prev, '') || '|' || p_election_id::text || '|' || p_event_type || '|'
        || v_payload::text || '|' || to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'UTF8'
    )),
    'hex'
  );

  INSERT INTO public.civic_voting_events (
    election_id, session_id, actor_id, event_type, payload, prev_event_hash, event_hash, created_at
  ) VALUES (
    p_election_id, NULL, NULL, p_event_type, v_payload, v_prev, v_hash, v_now
  );
  RETURN v_hash;
END;
$$;
REVOKE ALL ON FUNCTION public.civic_append_election_event(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.civic_append_election_event(uuid, text, jsonb) IS
  'Appends one event to the per-election hash chain: event_hash = sha256(prev_hash|election_id|event_type|payload::text|created_at UTC µs). Never stores actor or session ids.';

-- ---------------------------------------------------------------------------------------------
-- Eligibility (server side)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consultation_eligibility_reason(p_election_id uuid, p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_e public.civic_elections%ROWTYPE;
  v_p public.profiles%ROWTYPE;
  v_min_age integer;
  v_scope text;
BEGIN
  SELECT * INTO v_e FROM public.civic_elections WHERE id = p_election_id;
  IF NOT FOUND THEN RETURN 'election_not_found'; END IF;
  IF coalesce(v_e.metadata->>'sample_batch', '') <> '' THEN RETURN 'demo_not_votable'; END IF;
  IF v_e.security_class <> 'ordinary' THEN RETURN 'consultation_cast_ordinary_only'; END IF;
  IF v_e.status <> 'open' OR now() < v_e.voting_opens_at OR now() > v_e.voting_closes_at THEN
    RETURN 'election_not_open';
  END IF;
  IF p_profile_id IS NULL THEN RETURN 'not_authenticated'; END IF;

  SELECT * INTO v_p FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND OR v_p.deleted_at IS NOT NULL THEN RETURN 'profile_unavailable'; END IF;
  IF public.profile_has_governance_block(p_profile_id, 'vote'::public.governance_block_scope) THEN
    RETURN 'voter_blocked';
  END IF;
  IF coalesce((v_e.metadata->>'requires_verified')::boolean, false) AND NOT coalesce(v_p.is_verified, false) THEN
    RETURN 'verification_required';
  END IF;

  v_min_age := nullif(trim(coalesce(v_e.metadata->>'min_age', '')), '')::integer;
  IF v_min_age IS NOT NULL AND v_min_age > 0 THEN
    IF v_p.date_of_birth IS NULL THEN RETURN 'age_unknown'; END IF;
    IF v_p.date_of_birth > (current_date - make_interval(years => v_min_age)) THEN RETURN 'under_age'; END IF;
  END IF;

  v_scope := upper(trim(coalesce(v_e.scope_country_code, '')));
  IF v_scope <> '' AND v_scope NOT IN ('GLOBAL', 'WW', 'XZ', 'UN')
     AND upper(trim(coalesce(v_p.country_code, ''))) <> v_scope THEN
    RETURN 'outside_scope';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_consultation_eligibility(p_election_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'eligible', r.reason IS NULL,
    'reason', r.reason
  )
  FROM (SELECT public.consultation_eligibility_reason(p_election_id, public.current_profile_id()) AS reason) r;
$$;

REVOKE ALL ON FUNCTION public.consultation_eligibility_reason(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_consultation_eligibility(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_consultation_eligibility(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Cast / withdraw / read own ballot
-- ---------------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cast_consultation_ballot(uuid, text);

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
  IF v_option NOT IN ('support', 'oppose', 'abstain') THEN
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
    -- Changing a counted choice keeps the receipt; re-casting after a withdrawal gets a fresh one.
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

CREATE OR REPLACE FUNCTION public.withdraw_consultation_ballot(p_election_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_election public.civic_elections%ROWTYPE;
  v_ballot public.civic_ballots%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_election_id IS NULL THEN
    RAISE EXCEPTION 'election_required';
  END IF;

  SELECT * INTO v_election FROM public.civic_elections WHERE id = p_election_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'election_not_found';
  END IF;
  IF coalesce(v_election.metadata->>'sample_batch', '') <> '' THEN
    RAISE EXCEPTION 'demo_not_votable';
  END IF;
  IF v_election.status <> 'open' OR now() < v_election.voting_opens_at OR now() > v_election.voting_closes_at THEN
    RAISE EXCEPTION 'election_not_open';
  END IF;
  IF v_election.security_class <> 'ordinary' THEN
    RAISE EXCEPTION 'consultation_withdraw_ordinary_only';
  END IF;

  SELECT * INTO v_ballot
  FROM public.civic_ballots
  WHERE election_id = p_election_id AND profile_id = v_self
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ballot_not_found';
  END IF;

  IF NOT v_ballot.is_countable OR coalesce(v_ballot.is_duress, false) THEN
    UPDATE public.civic_consultation_public_presence
    SET visible = false, withdrawn_at = coalesce(withdrawn_at, now()), updated_at = now()
    WHERE election_id = p_election_id AND profile_id = v_self AND visible = true;
    RETURN false;
  END IF;

  UPDATE public.civic_ballots
  SET
    is_countable = false,
    cast_at = now(),
    encrypted_payload = NULL,
    metadata = jsonb_build_object('consultation', true, 'withdrawn', true, 'withdrawn_at', now())
  WHERE id = v_ballot.id;

  DELETE FROM public.civic_ballot_selections WHERE ballot_id = v_ballot.id;

  UPDATE public.civic_vote_sessions
  SET status = 'voided', metadata = jsonb_build_object('consultation', true, 'withdrawn', true, 'withdrawn_at', now())
  WHERE id = v_ballot.session_id;

  UPDATE public.civic_consultation_public_presence
  SET visible = false, withdrawn_at = now(), updated_at = now()
  WHERE election_id = p_election_id AND profile_id = v_self AND visible = true;

  PERFORM public.civic_append_election_event(
    p_election_id, 'consultation_withdrawn', jsonb_build_object('receipt', v_ballot.ballot_commitment)
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_consultation_ballot(p_election_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'option_key', public.civic_unseal_choice(b.election_id, b.encrypted_payload),
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

CREATE OR REPLACE FUNCTION public.my_consultation_ballot_option(p_election_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.my_consultation_ballot(p_election_id)->>'option_key';
$$;

CREATE OR REPLACE FUNCTION public.civic_election_receipt_included(p_election_id uuid, p_receipt text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.civic_ballots b
    JOIN public.civic_elections e ON e.id = b.election_id
    WHERE b.election_id = p_election_id
      AND b.ballot_commitment = trim(coalesce(p_receipt, ''))
      AND b.is_countable
      AND NOT coalesce(b.is_duress, false)
      AND coalesce(e.metadata->>'sample_batch', '') = ''
  );
$$;

CREATE OR REPLACE FUNCTION public.civic_election_receipts(p_election_id uuid)
RETURNS TABLE (receipt text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.ballot_commitment
  FROM public.civic_ballots b
  JOIN public.civic_elections e ON e.id = b.election_id
  WHERE b.election_id = p_election_id
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
    AND coalesce(e.metadata->>'sample_batch', '') = ''
  ORDER BY b.ballot_commitment;
$$;

REVOKE ALL ON FUNCTION public.cast_consultation_ballot(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_consultation_ballot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_consultation_ballot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_consultation_ballot_option(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_election_receipt_included(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_election_receipts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_consultation_ballot(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_consultation_ballot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_consultation_ballot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_consultation_ballot_option(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.civic_election_receipt_included(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.civic_election_receipts(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Public tallies: sealed consultation ballots plus legacy clear selections (non-consultation)
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
    SELECT lower(public.civic_unseal_choice(b.election_id, b.encrypted_payload)) AS choice
    FROM public.civic_ballots b
    JOIN public.civic_elections e ON e.id = b.election_id
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
-- Seal existing consultation ballots and drop their clear-text traces
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_opt text;
BEGIN
  FOR r IN
    SELECT b.id, b.election_id, b.metadata, b.is_countable, b.is_duress
    FROM public.civic_ballots b
    WHERE coalesce(b.metadata->>'consultation', 'false') = 'true'
  LOOP
    v_opt := lower(nullif(trim(coalesce(r.metadata->>'option_key', '')), ''));
    IF v_opt IS NULL THEN
      SELECT lower(c.option_key) INTO v_opt
      FROM public.civic_ballot_selections s
      JOIN public.civic_candidates c ON c.id = s.candidate_id
      WHERE s.ballot_id = r.id
      LIMIT 1;
    END IF;

    UPDATE public.civic_ballots
    SET
      encrypted_payload = CASE
        WHEN r.is_countable AND NOT coalesce(r.is_duress, false) AND v_opt IS NOT NULL
          THEN public.civic_seal_choice(r.election_id, v_opt)
        ELSE NULL
      END,
      metadata = (coalesce(metadata, '{}'::jsonb) - 'option_key' - 'prior_choice_hash')
        || jsonb_build_object('sealed', true)
    WHERE id = r.id;

    DELETE FROM public.civic_ballot_selections WHERE ballot_id = r.id;
  END LOOP;

  UPDATE public.civic_vote_sessions
  SET metadata = metadata - 'option_key'
  WHERE metadata ? 'option_key';

  -- Genesis event per live consultation so the chain starts from a known state.
  FOR r IN
    SELECT e.id,
      (SELECT count(*) FROM public.civic_ballots b WHERE b.election_id = e.id AND b.is_countable) AS countable,
      (SELECT count(*) FROM public.civic_ballots b WHERE b.election_id = e.id AND NOT b.is_countable) AS withdrawn
    FROM public.civic_elections e
    WHERE coalesce(e.metadata->>'consultation_kind', '') = 'nonbinding'
      AND coalesce(e.metadata->>'sample_batch', '') = ''
      AND NOT EXISTS (SELECT 1 FROM public.civic_voting_events ev WHERE ev.election_id = e.id)
  LOOP
    PERFORM public.civic_append_election_event(
      r.id, 'ledger_started',
      jsonb_build_object('countable_ballots', r.countable, 'withdrawn_ballots', r.withdrawn)
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Lifecycle: close elections whose window has passed and publish the final tally
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
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('civic_close_due_elections', 0));

  FOR r IN
    SELECT id FROM public.civic_elections
    WHERE status = 'open'
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
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.civic_close_due_elections() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.civic_close_due_elections() IS
  'Closes open civic elections past voting_closes_at: status closed, final tally stored in metadata.final_tally and appended as an election_closed event, published proposals closed.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('civic_elections_close_tick');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'civic_elections_close_tick',
      '20 * * * *',
      $cron$SELECT public.civic_close_due_elections();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

NOTIFY pgrst, 'reload schema';

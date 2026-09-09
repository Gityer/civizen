-- Civic voting proposals: Matter → draft → authorized publish → consultation ballot.
-- Infrastructure only. Does NOT seed or auto-publish United World.

CREATE TABLE IF NOT EXISTS public.civic_voting_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE RESTRICT,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'withdrawn')),
  consultation_kind text NOT NULL DEFAULT 'nonbinding'
    CHECK (consultation_kind = 'nonbinding'),
  scope_kind text NOT NULL DEFAULT 'global'
    CHECK (scope_kind IN ('global', 'country', 'region', 'locality')),
  scope_country_code text,
  scope_region_code text,
  scope_locality_code text,
  election_id uuid REFERENCES public.civic_elections(id) ON DELETE SET NULL,
  voting_opens_at timestamptz,
  voting_closes_at timestamptz,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  published_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT civic_voting_proposals_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT civic_voting_proposals_global_scope CHECK (
    scope_kind <> 'global' OR scope_country_code IS NULL OR upper(scope_country_code) = 'GLOBAL'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS civic_voting_proposals_one_open_draft_per_matter
  ON public.civic_voting_proposals (matter_id)
  WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS civic_voting_proposals_status_idx
  ON public.civic_voting_proposals (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS civic_voting_proposals_matter_idx
  ON public.civic_voting_proposals (matter_id);

DO $$
BEGIN
  CREATE TRIGGER update_civic_voting_proposals_updated_at
    BEFORE UPDATE ON public.civic_voting_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.civic_voting_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Civic voting proposals public read published" ON public.civic_voting_proposals;
CREATE POLICY "Civic voting proposals public read published"
  ON public.civic_voting_proposals FOR SELECT TO anon, authenticated
  USING (
    status IN ('published', 'closed')
    OR created_by_profile_id = public.current_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.current_profile_id()
        AND p.deleted_at IS NULL
        AND p.role IN ('founder', 'admin', 'system')
    )
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

GRANT SELECT ON public.civic_voting_proposals TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.civic_can_manage_voting_proposals(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.deleted_at IS NULL
      AND p.role IN ('founder', 'admin', 'system')
  );
$$;

CREATE OR REPLACE FUNCTION public.civic_can_draft_voting_proposal_for_matter(p_matter_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.civic_can_manage_voting_proposals(p_profile_id)
    OR EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = p_matter_id
        AND (
          m.initiator_profile_id = p_profile_id
          OR m.responsible_profile_id = p_profile_id
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.create_voting_proposal_from_matter(
  p_matter_id uuid,
  p_title text,
  p_summary text,
  p_body text,
  p_voting_closes_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_summary text := trim(coalesce(p_summary, ''));
  v_body text := trim(coalesce(p_body, ''));
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.civic_can_draft_voting_proposal_for_matter(p_matter_id, v_self) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF char_length(v_title) < 3 THEN
    RAISE EXCEPTION 'title_required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.civic_voting_proposals
    WHERE matter_id = p_matter_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'draft_already_exists';
  END IF;

  INSERT INTO public.civic_voting_proposals (
    matter_id, title, summary, body, status, consultation_kind, scope_kind,
    scope_country_code, voting_closes_at, created_by_profile_id
  ) VALUES (
    p_matter_id,
    v_title,
    COALESCE(NULLIF(v_summary, ''), v_title),
    COALESCE(NULLIF(v_body, ''), v_title),
    'draft',
    'nonbinding',
    'global',
    NULL,
    p_voting_closes_at,
    v_self
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_voting_proposal(p_proposal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_election_id uuid;
  v_contest_id uuid;
  v_opens timestamptz;
  v_closes timestamptz;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.civic_can_manage_voting_proposals(v_self) THEN
    RAISE EXCEPTION 'not_authorized_to_publish';
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

  v_opens := coalesce(v_prop.voting_opens_at, now());
  v_closes := coalesce(v_prop.voting_closes_at, now() + interval '365 days');
  IF v_closes <= v_opens THEN
    RAISE EXCEPTION 'invalid_voting_window';
  END IF;

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
    'supranational',
    'ordinary',
    'open',
    CASE WHEN v_prop.scope_kind = 'global' THEN 'GLOBAL' ELSE v_prop.scope_country_code END,
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
      'catalog', 'live'
    )
  )
  RETURNING id INTO v_election_id;

  INSERT INTO public.civic_contests (
    election_id, title, summary, contest_kind, office_key, seat_count, allow_abstain, sort_order, metadata
  ) VALUES (
    v_election_id,
    v_prop.title,
    v_prop.summary,
    'measure',
    'consultation_measure',
    1,
    true,
    0,
    jsonb_build_object('proposal_id', v_prop.id::text)
  )
  RETURNING id INTO v_contest_id;

  INSERT INTO public.civic_candidates (contest_id, display_name, statement, option_key, sort_order, metadata)
  VALUES
    (v_contest_id, 'Support', 'Support this consultation.', 'support', 0, '{}'::jsonb),
    (v_contest_id, 'Oppose', 'Oppose this consultation.', 'oppose', 1, '{}'::jsonb),
    (v_contest_id, 'Abstain', 'Abstain from this consultation.', 'abstain', 2, '{}'::jsonb);

  UPDATE public.civic_voting_proposals
  SET
    status = 'published',
    election_id = v_election_id,
    voting_opens_at = v_opens,
    voting_closes_at = v_closes,
    published_by_profile_id = v_self,
    published_at = now(),
    updated_at = now()
  WHERE id = p_proposal_id;

  RETURN v_election_id;
END;
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
  SELECT
    c.id AS candidate_id,
    c.option_key,
    c.display_name,
    COUNT(bs.id) FILTER (
      WHERE b.is_countable
        AND NOT coalesce(b.is_duress, false)
        AND bs.candidate_id IS NOT NULL
        AND coalesce(e.metadata->>'sample_batch', '') = ''
        AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    )::bigint AS vote_count
  FROM public.civic_candidates c
  JOIN public.civic_contests ct ON ct.id = c.contest_id
  JOIN public.civic_elections e ON e.id = ct.election_id
  LEFT JOIN public.civic_ballot_selections bs ON bs.candidate_id = c.id
  LEFT JOIN public.civic_ballots b ON b.id = bs.ballot_id
  WHERE ct.election_id = p_election_id
  GROUP BY c.id, c.option_key, c.display_name, c.sort_order
  ORDER BY c.sort_order ASC, c.display_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.cast_consultation_ballot(
  p_election_id uuid,
  p_option_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_election public.civic_elections%ROWTYPE;
  v_candidate_id uuid;
  v_contest_id uuid;
  v_session_id uuid;
  v_ballot_id uuid;
  v_option text := lower(trim(coalesce(p_option_key, '')));
  v_is_abstain boolean;
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
  IF coalesce(v_election.metadata->>'sample_batch', '') <> '' THEN
    RAISE EXCEPTION 'demo_not_votable';
  END IF;
  IF v_election.status <> 'open' OR now() < v_election.voting_opens_at OR now() > v_election.voting_closes_at THEN
    RAISE EXCEPTION 'election_not_open';
  END IF;
  IF v_election.security_class <> 'ordinary' THEN
    RAISE EXCEPTION 'consultation_cast_ordinary_only';
  END IF;

  SELECT c.id, c.contest_id INTO v_candidate_id, v_contest_id
  FROM public.civic_candidates c
  JOIN public.civic_contests ct ON ct.id = c.contest_id
  WHERE ct.election_id = p_election_id
    AND lower(c.option_key) = v_option
  LIMIT 1;

  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'option_not_found';
  END IF;

  v_is_abstain := (v_option = 'abstain');

  SELECT id INTO v_ballot_id
  FROM public.civic_ballots
  WHERE election_id = p_election_id AND profile_id = v_self
  LIMIT 1;

  IF v_ballot_id IS NULL THEN
    INSERT INTO public.civic_vote_sessions (
      election_id, profile_id, status, scheduled_for, opened_at, completed_at, attempt_number, metadata
    ) VALUES (
      p_election_id, v_self, 'cast', now(), now(), now(), 1,
      jsonb_build_object('consultation', true, 'option_key', v_option)
    )
    RETURNING id INTO v_session_id;

    INSERT INTO public.civic_ballots (
      election_id, session_id, profile_id, ballot_commitment, is_countable, is_duress, cast_at, metadata
    ) VALUES (
      p_election_id,
      v_session_id,
      v_self,
      encode(sha256(convert_to(v_self::text || p_election_id::text || v_option || clock_timestamp()::text, 'UTF8')), 'hex'),
      true,
      false,
      now(),
      jsonb_build_object('consultation', true, 'option_key', v_option)
    )
    RETURNING id INTO v_ballot_id;

    INSERT INTO public.civic_ballot_selections (
      ballot_id, contest_id, candidate_id, is_abstain, rank
    ) VALUES (
      v_ballot_id, v_contest_id, v_candidate_id, v_is_abstain, 1
    );
  ELSE
    UPDATE public.civic_ballots
    SET
      cast_at = now(),
      is_countable = true,
      is_duress = false,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('consultation', true, 'option_key', v_option, 'changed', true)
    WHERE id = v_ballot_id;

    UPDATE public.civic_ballot_selections
    SET candidate_id = v_candidate_id, is_abstain = v_is_abstain, rank = 1
    WHERE ballot_id = v_ballot_id AND contest_id = v_contest_id;

    IF NOT FOUND THEN
      INSERT INTO public.civic_ballot_selections (
        ballot_id, contest_id, candidate_id, is_abstain, rank
      ) VALUES (
        v_ballot_id, v_contest_id, v_candidate_id, v_is_abstain, 1
      );
    END IF;
  END IF;

  RETURN v_ballot_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_consultation_ballot_option(p_election_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(c.option_key)
  FROM public.civic_ballots b
  JOIN public.civic_ballot_selections bs ON bs.ballot_id = b.id
  JOIN public.civic_candidates c ON c.id = bs.candidate_id
  WHERE b.election_id = p_election_id
    AND b.profile_id = public.current_profile_id()
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
  ORDER BY b.cast_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.create_voting_proposal_from_matter(uuid, text, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_voting_proposal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_consultation_ballot(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_election_public_tallies(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_consultation_ballot_option(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_can_manage_voting_proposals(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_can_draft_voting_proposal_for_matter(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_voting_proposal_from_matter(uuid, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_voting_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_consultation_ballot(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.civic_election_public_tallies(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_consultation_ballot_option(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.civic_can_manage_voting_proposals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.civic_can_draft_voting_proposal_for_matter(uuid, uuid) TO authenticated;

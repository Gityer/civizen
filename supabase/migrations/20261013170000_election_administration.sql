-- v2 plan step C2: election administration.
-- Consultations are still created and scheduled from a voting proposal (Matter -> proposal -> publish).
-- Election administrators (founder/admin/system roles, or members of the Civic Operations domain) can
-- now reschedule before opening, extend while open, cancel with a reason, and certify a closed result
-- with two different people (one requests, another certifies). Every action is appended to the
-- hash-chained public election event log with the administrator's username and the reason.

CREATE OR REPLACE FUNCTION public.civic_can_administer_elections(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_profile_id IS NOT NULL
    AND NOT public.profile_has_governance_block(p_profile_id, 'execution'::public.governance_block_scope)
    AND (
      public.civic_can_manage_voting_proposals(p_profile_id)
      OR public.profile_has_governance_domain_role(p_profile_id, ARRAY['civic_operations'], NULL)
    );
$$;
REVOKE ALL ON FUNCTION public.civic_can_administer_elections(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.civic_can_administer_elections(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_can_administer_elections()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.civic_can_administer_elections(public.current_profile_id());
$$;
REVOKE ALL ON FUNCTION public.my_can_administer_elections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_can_administer_elections() TO authenticated;

-- Locks a live (non-sample) election for an administrator; checks the reason.
CREATE OR REPLACE FUNCTION public.civic_election_admin_lock(p_election_id uuid, p_reason text)
RETURNS public.civic_elections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.civic_elections%ROWTYPE;
BEGIN
  IF NOT public.civic_can_administer_elections(public.current_profile_id()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NOT NULL AND char_length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO v_election FROM public.civic_elections WHERE id = p_election_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'election_not_found'; END IF;
  IF coalesce(v_election.metadata ->> 'sample_batch', '') <> '' OR coalesce(v_election.metadata ->> 'catalog', 'live') = 'demo' THEN
    RAISE EXCEPTION 'election_is_sample';
  END IF;
  RETURN v_election;
END;
$$;
REVOKE ALL ON FUNCTION public.civic_election_admin_lock(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.civic_election_admin_event(p_election_id uuid, p_type text, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.civic_append_election_event(
    p_election_id, p_type,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'actor_username', (SELECT username FROM public.profiles WHERE id = public.current_profile_id())
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.civic_election_admin_event(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Before opening: move the voting window.
CREATE OR REPLACE FUNCTION public.admin_reschedule_election(
  p_election_id uuid, p_opens_at timestamptz, p_closes_at timestamptz, p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.civic_elections%ROWTYPE;
BEGIN
  v_election := public.civic_election_admin_lock(p_election_id, coalesce(p_reason, ''));
  IF v_election.status <> 'scheduled' THEN RAISE EXCEPTION 'election_not_scheduled'; END IF;
  IF p_opens_at IS NULL OR p_closes_at IS NULL OR p_opens_at < now() + interval '5 minutes' THEN RAISE EXCEPTION 'opens_in_past'; END IF;
  IF p_closes_at < p_opens_at + interval '1 hour' THEN RAISE EXCEPTION 'window_too_short'; END IF;
  IF p_closes_at > p_opens_at + interval '90 days' THEN RAISE EXCEPTION 'window_too_long'; END IF;
  UPDATE public.civic_elections SET voting_opens_at = p_opens_at, voting_closes_at = p_closes_at WHERE id = p_election_id;
  UPDATE public.civic_voting_proposals SET voting_opens_at = p_opens_at, voting_closes_at = p_closes_at, updated_at = now()
  WHERE election_id = p_election_id;
  PERFORM public.civic_election_admin_event(p_election_id, 'election_rescheduled', jsonb_build_object(
    'from_opens_at', v_election.voting_opens_at, 'from_closes_at', v_election.voting_closes_at,
    'opens_at', p_opens_at, 'closes_at', p_closes_at, 'reason', trim(p_reason)));
  RETURN jsonb_build_object('election_id', p_election_id, 'opens_at', p_opens_at, 'closes_at', p_closes_at);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_reschedule_election(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reschedule_election(uuid, timestamptz, timestamptz, text) TO authenticated;

-- While scheduled or open: give voters more time (never less, at most 14 days more at once).
CREATE OR REPLACE FUNCTION public.admin_extend_election(p_election_id uuid, p_closes_at timestamptz, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.civic_elections%ROWTYPE;
BEGIN
  v_election := public.civic_election_admin_lock(p_election_id, coalesce(p_reason, ''));
  IF v_election.status NOT IN ('scheduled', 'open') THEN RAISE EXCEPTION 'election_not_open'; END IF;
  IF v_election.voting_closes_at <= now() THEN RAISE EXCEPTION 'election_already_closed'; END IF;
  IF p_closes_at IS NULL OR p_closes_at <= v_election.voting_closes_at THEN RAISE EXCEPTION 'extension_must_be_later'; END IF;
  IF p_closes_at > v_election.voting_closes_at + interval '14 days' THEN RAISE EXCEPTION 'extension_too_long'; END IF;
  UPDATE public.civic_elections SET voting_closes_at = p_closes_at WHERE id = p_election_id;
  UPDATE public.civic_voting_proposals SET voting_closes_at = p_closes_at, updated_at = now() WHERE election_id = p_election_id;
  PERFORM public.civic_election_admin_event(p_election_id, 'election_extended', jsonb_build_object(
    'from_closes_at', v_election.voting_closes_at, 'closes_at', p_closes_at, 'reason', trim(p_reason)));
  PERFORM public.civic_notify_profiles(
    public.civic_consultation_followers(p_election_id), 'civic_consultation_extended', v_election.title,
    'Voting on a consultation you follow was extended.', 'civic_election', p_election_id,
    jsonb_build_object('title', v_election.title, 'closes_at', p_closes_at)
  );
  RETURN jsonb_build_object('election_id', p_election_id, 'closes_at', p_closes_at);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_extend_election(uuid, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_election(uuid, timestamptz, text) TO authenticated;

-- Before closing: stop the consultation. Counts stay sealed; no outcome is written to the Matter.
CREATE OR REPLACE FUNCTION public.admin_cancel_election(p_election_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.civic_elections%ROWTYPE;
  v_voters uuid[];
BEGIN
  IF char_length(trim(coalesce(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'reason_required'; END IF;
  v_election := public.civic_election_admin_lock(p_election_id, p_reason);
  IF v_election.status NOT IN ('scheduled', 'open') THEN RAISE EXCEPTION 'election_not_open'; END IF;
  UPDATE public.civic_elections
  SET status = 'cancelled',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('cancelled_at', now(), 'cancel_reason', trim(p_reason))
  WHERE id = p_election_id;
  UPDATE public.civic_voting_proposals
  SET status = 'withdrawn',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('withdrawn_at', now(), 'election_cancelled', true),
      updated_at = now()
  WHERE election_id = p_election_id AND status = 'published';
  PERFORM public.civic_election_admin_event(p_election_id, 'election_cancelled', jsonb_build_object('reason', trim(p_reason)));
  SELECT array_agg(DISTINCT b.profile_id) INTO v_voters FROM public.civic_ballots b WHERE b.election_id = p_election_id;
  PERFORM public.civic_notify_profiles(
    ARRAY(SELECT DISTINCT unnest(public.civic_consultation_followers(p_election_id) || coalesce(v_voters, '{}'::uuid[]))),
    'civic_consultation_cancelled', v_election.title,
    'A consultation you follow or voted in was cancelled. The reason is on the consultation page.',
    'civic_election', p_election_id, jsonb_build_object('title', v_election.title)
  );
  RETURN jsonb_build_object('election_id', p_election_id, 'status', 'cancelled');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_cancel_election(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_election(uuid, text) TO authenticated;

-- Results stay sealed for a cancelled consultation.
CREATE OR REPLACE FUNCTION public.civic_election_results_published(p_election_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT e.status <> 'cancelled' AND (e.status IN ('closed', 'certified') OR now() > e.voting_closes_at)
    FROM public.civic_elections e WHERE e.id = p_election_id
  ), false);
$$;

-- Certification by two different people: one requests, another certifies.
CREATE OR REPLACE FUNCTION public.request_election_certification(p_election_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.civic_elections%ROWTYPE;
BEGIN
  v_election := public.civic_election_admin_lock(p_election_id, NULL);
  IF v_election.status <> 'closed' THEN RAISE EXCEPTION 'election_not_closed'; END IF;
  IF v_election.metadata -> 'certification' ->> 'requested_by' IS NOT NULL THEN RAISE EXCEPTION 'certification_already_requested'; END IF;
  UPDATE public.civic_elections
  SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('certification', jsonb_build_object(
    'requested_by', public.current_profile_id(), 'requested_at', now(), 'note', nullif(trim(coalesce(p_note, '')), '')))
  WHERE id = p_election_id;
  PERFORM public.civic_election_admin_event(p_election_id, 'certification_requested',
    jsonb_build_object('note', nullif(trim(coalesce(p_note, '')), '')));
  RETURN jsonb_build_object('election_id', p_election_id, 'certification', 'requested');
END;
$$;
REVOKE ALL ON FUNCTION public.request_election_certification(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_election_certification(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.certify_election(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.civic_elections%ROWTYPE;
  v_requester uuid;
BEGIN
  v_election := public.civic_election_admin_lock(p_election_id, NULL);
  IF v_election.status <> 'closed' THEN RAISE EXCEPTION 'election_not_closed'; END IF;
  v_requester := (v_election.metadata -> 'certification' ->> 'requested_by')::uuid;
  IF v_requester IS NULL THEN RAISE EXCEPTION 'certification_not_requested'; END IF;
  IF v_requester = public.current_profile_id() OR public.profiles_are_linked(v_requester, public.current_profile_id()) THEN
    RAISE EXCEPTION 'second_person_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.civic_elections
  SET status = 'certified',
      metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{certification}',
        coalesce(metadata -> 'certification', '{}'::jsonb) || jsonb_build_object('certified_by', public.current_profile_id(), 'certified_at', now()))
  WHERE id = p_election_id;
  PERFORM public.civic_election_admin_event(p_election_id, 'election_certified', '{}'::jsonb);
  PERFORM public.civic_notify_profiles(
    public.civic_consultation_followers(p_election_id), 'civic_consultation_certified', v_election.title,
    'The result of a consultation you follow was certified.', 'civic_election', p_election_id,
    jsonb_build_object('title', v_election.title)
  );
  RETURN jsonb_build_object('election_id', p_election_id, 'status', 'certified');
END;
$$;
REVOKE ALL ON FUNCTION public.certify_election(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.certify_election(uuid) TO authenticated;

-- Administrator list: live consultations that are scheduled, open, awaiting certification, or changed in 30 days.
CREATE OR REPLACE FUNCTION public.election_admin_list()
RETURNS TABLE (
  election_id uuid,
  title text,
  status text,
  voting_opens_at timestamptz,
  voting_closes_at timestamptz,
  proposal_id uuid,
  countable_ballots bigint,
  certification_requested_by text,
  certification_requested_at timestamptz,
  certification_requested_by_me boolean,
  cancel_reason text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.civic_can_administer_elections(public.current_profile_id()) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT
    e.id, e.title, e.status::text, e.voting_opens_at, e.voting_closes_at,
    (SELECT vp.id FROM public.civic_voting_proposals vp WHERE vp.election_id = e.id ORDER BY vp.created_at LIMIT 1),
    (SELECT count(*) FROM public.civic_ballots b WHERE b.election_id = e.id AND b.is_countable AND NOT coalesce(b.is_duress, false)),
    rp.username::text,
    (e.metadata -> 'certification' ->> 'requested_at')::timestamptz,
    (e.metadata -> 'certification' ->> 'requested_by')::uuid = public.current_profile_id(),
    e.metadata ->> 'cancel_reason',
    e.updated_at
  FROM public.civic_elections e
  LEFT JOIN public.profiles rp ON rp.id = (e.metadata -> 'certification' ->> 'requested_by')::uuid
  WHERE coalesce(e.metadata ->> 'sample_batch', '') = ''
    AND coalesce(e.metadata ->> 'catalog', 'live') <> 'demo'
    AND (e.status IN ('scheduled', 'open', 'closed') OR e.updated_at > now() - interval '30 days')
  ORDER BY CASE e.status WHEN 'open' THEN 0 WHEN 'closed' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END, e.voting_closes_at;
END;
$$;
REVOKE ALL ON FUNCTION public.election_admin_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.election_admin_list() TO authenticated;

-- Administrative history of one election (from the public event log).
CREATE OR REPLACE FUNCTION public.election_admin_history(p_election_id uuid)
RETURNS TABLE (event_type text, actor_username text, payload jsonb, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ev.event_type, ev.payload ->> 'actor_username', ev.payload, ev.created_at
  FROM public.civic_voting_events ev
  WHERE ev.election_id = p_election_id
    AND ev.event_type IN ('election_rescheduled', 'election_extended', 'election_cancelled', 'certification_requested',
                          'election_certified', 'election_opened', 'election_closed')
  ORDER BY ev.created_at;
$$;
REVOKE ALL ON FUNCTION public.election_admin_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.election_admin_history(uuid) TO authenticated;

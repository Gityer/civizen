-- Phase 4 batch 2.
-- 4.3 Knowledge: any member may propose a resource or report a gap in a space they can read; coordinators
--     review; "Reviewed" means someone other than the proposer reviewed; proposers see their own drafts.
-- 4.1 One way to raise a problem: a Solutions problem is linked to its public Matter, a community challenge can
--     record the Matter it grew out of, and the Matter page can show both ("AI council", "community project").

-- ---------------------------------------------------------------------------------------------
-- 4.3 Knowledge proposals
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.knowledge_resources ADD COLUMN IF NOT EXISTS proposed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_gaps ADD COLUMN IF NOT EXISTS proposed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Publisher plus the people who run a business publisher.
CREATE OR REPLACE FUNCTION public.publisher_notification_recipients(p_publisher_profile_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT r.id), '{}'::uuid[])
  FROM (
    SELECT p_publisher_profile_id AS id
    UNION
    SELECT la.owner_profile_id FROM public.linked_accounts la
    WHERE la.linked_profile_id = p_publisher_profile_id AND la.relationship_type = 'business'
  ) r
  WHERE r.id IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.publisher_notification_recipients(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.propose_knowledge_resource(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_space public.knowledge_spaces%ROWTYPE;
  v_type text := coalesce(nullif(trim(payload->>'resource_type'), ''), 'other');
  v_id uuid;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_space FROM public.knowledge_spaces WHERE id = (payload->>'space_id')::uuid;
  IF NOT FOUND OR NOT public.current_profile_can_read_knowledge_space(v_space.id) THEN RAISE EXCEPTION 'space_not_found'; END IF;
  IF char_length(trim(coalesce(payload->>'title', ''))) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(coalesce(payload->>'summary', ''))) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;
  IF v_type NOT IN ('guide','research','course','case_study','framework','dataset','tool','solution_record','other') THEN
    RAISE EXCEPTION 'invalid_resource_type';
  END IF;
  INSERT INTO public.knowledge_resources (
    space_id, publisher_profile_id, program_id, title, summary, resource_type, external_url, body_text, source_evidence, status, proposed_by_profile_id
  ) VALUES (
    v_space.id, v_space.publisher_profile_id, v_space.program_id, left(trim(payload->>'title'), 160), left(trim(payload->>'summary'), 400), v_type,
    nullif(trim(coalesce(payload->>'external_url', '')), ''), nullif(trim(coalesce(payload->>'body_text', '')), ''),
    nullif(trim(coalesce(payload->>'source_evidence', '')), ''), 'draft', v_self
  )
  RETURNING id INTO v_id;
  PERFORM public.civic_notify_profiles(
    (SELECT array_agg(r) FROM unnest(public.publisher_notification_recipients(v_space.publisher_profile_id)) r WHERE r <> v_self),
    'knowledge_resource_proposed', v_space.title, 'A member proposed a resource for review.',
    'knowledge_space', v_space.id, jsonb_build_object('title', v_space.title, 'resource_id', v_id)
  );
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.propose_knowledge_resource(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_knowledge_resource(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.propose_knowledge_gap(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_space public.knowledge_spaces%ROWTYPE;
  v_kind text := coalesce(nullif(trim(payload->>'gap_kind'), ''), 'missing');
  v_id uuid;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_space FROM public.knowledge_spaces WHERE id = (payload->>'space_id')::uuid;
  IF NOT FOUND OR NOT public.current_profile_can_read_knowledge_space(v_space.id) THEN RAISE EXCEPTION 'space_not_found'; END IF;
  IF char_length(trim(coalesce(payload->>'title', ''))) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(coalesce(payload->>'description', ''))) < 3 THEN RAISE EXCEPTION 'description_required'; END IF;
  IF v_kind NOT IN ('missing','weak','outdated','unresolved','contradictory','needs_development') THEN RAISE EXCEPTION 'invalid_gap_kind'; END IF;
  INSERT INTO public.knowledge_gaps (space_id, publisher_profile_id, program_id, title, description, gap_kind, status, proposed_by_profile_id)
  VALUES (v_space.id, v_space.publisher_profile_id, v_space.program_id, left(trim(payload->>'title'), 160), left(trim(payload->>'description'), 2000), v_kind, 'open', v_self)
  RETURNING id INTO v_id;
  PERFORM public.civic_notify_profiles(
    (SELECT array_agg(r) FROM unnest(public.publisher_notification_recipients(v_space.publisher_profile_id)) r WHERE r <> v_self),
    'knowledge_gap_reported', v_space.title, 'A member reported a knowledge gap.',
    'knowledge_space', v_space.id, jsonb_build_object('title', v_space.title, 'gap_id', v_id)
  );
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.propose_knowledge_gap(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_knowledge_gap(jsonb) TO authenticated;

-- Proposers may read their own drafts; everyone else keeps the existing rule.
CREATE OR REPLACE FUNCTION public.current_profile_can_read_knowledge_resource(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.knowledge_resources r
    WHERE r.id = p_resource_id
      AND public.current_profile_can_read_knowledge_space(r.space_id)
      AND (
        r.status IN ('shared', 'reviewed')
        OR public.current_profile_manages_publisher(r.publisher_profile_id)
        OR r.proposed_by_profile_id = public.current_profile_id()
      )
  );
$$;

-- "Reviewed" means someone other than the proposer reviewed; the proposer is told when their resource goes live.
CREATE OR REPLACE FUNCTION public.set_knowledge_resource_status(p_resource_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_res public.knowledge_resources%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_status NOT IN ('draft', 'shared', 'reviewed') THEN RAISE EXCEPTION 'invalid_resource_status'; END IF;
  SELECT * INTO v_res FROM public.knowledge_resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'resource_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_res.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_status = 'reviewed' AND v_res.proposed_by_profile_id IS NOT NULL AND v_res.proposed_by_profile_id = v_self THEN
    RAISE EXCEPTION 'review_needs_another_person';
  END IF;
  UPDATE public.knowledge_resources SET status = p_status, updated_at = now() WHERE id = p_resource_id;
  IF p_status IN ('shared', 'reviewed') AND v_res.status = 'draft' AND v_res.proposed_by_profile_id IS NOT NULL AND v_res.proposed_by_profile_id <> v_self THEN
    PERFORM public.civic_notify_profiles(
      ARRAY[v_res.proposed_by_profile_id], 'knowledge_resource_published', v_res.title,
      'Your proposed resource is now shared in its knowledge space.', 'knowledge_resource', v_res.id, jsonb_build_object('title', v_res.title)
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- 4.1 Links between a Matter, its AI-council problem and the community challenges it grew into
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.solution_problems ADD COLUMN IF NOT EXISTS matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS solution_problems_matter_idx ON public.solution_problems (matter_id);
ALTER TABLE public.community_challenges ADD COLUMN IF NOT EXISTS source_matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS community_challenges_source_matter_idx ON public.community_challenges (source_matter_id);

CREATE OR REPLACE FUNCTION public.link_solution_problem_matter(p_problem_id uuid, p_matter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.solution_problems p WHERE p.id = p_problem_id AND p.author_id = v_self) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF NOT public.can_access_matter(p_matter_id) THEN RAISE EXCEPTION 'matter_not_found'; END IF;
  UPDATE public.solution_problems SET matter_id = p_matter_id, updated_at = now() WHERE id = p_problem_id;
END;
$$;
REVOKE ALL ON FUNCTION public.link_solution_problem_matter(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_solution_problem_matter(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_challenge_source_matter(p_challenge_id uuid, p_matter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_challenge public.community_challenges%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_challenge FROM public.community_challenges WHERE id = p_challenge_id;
  IF NOT FOUND OR NOT public.current_profile_manages_publisher(v_challenge.publisher_profile_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF NOT public.can_access_matter(p_matter_id) THEN RAISE EXCEPTION 'matter_not_found'; END IF;
  UPDATE public.community_challenges SET source_matter_id = p_matter_id, updated_at = now() WHERE id = p_challenge_id;
  PERFORM public.matter_log_event(
    p_matter_id, 'community_challenge_started', 'A community challenge was started from this Matter: ' || v_challenge.title || '.',
    'person', v_self, false, jsonb_build_object('challenge_id', p_challenge_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.link_challenge_source_matter(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_challenge_source_matter(uuid, uuid) TO authenticated;

-- What the Matter page shows as its AI-council discussion and community projects.
CREATE OR REPLACE FUNCTION public.matter_links(p_matter_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.can_access_matter(p_matter_id) THEN jsonb_build_object(
    'solution_problem', (SELECT jsonb_build_object('id', p.id, 'title', p.title, 'status', p.status)
                         FROM public.solution_problems p WHERE p.matter_id = p_matter_id ORDER BY p.created_at DESC LIMIT 1),
    'challenges', coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'status', c.status) ORDER BY c.created_at DESC)
                            FROM public.community_challenges c WHERE c.source_matter_id = p_matter_id AND NOT c.is_demo), '[]'::jsonb)
  ) ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.matter_links(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matter_links(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

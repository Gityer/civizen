-- Matter geographic scope (subject Area stays separate).
-- Reuses civic_voting_proposals scope_kind model so proposals inherit Matter scope.

ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS scope_kind text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS scope_country_code text,
  ADD COLUMN IF NOT EXISTS scope_region_code text,
  ADD COLUMN IF NOT EXISTS scope_locality_code text;

DO $$
BEGIN
  ALTER TABLE public.matters
    DROP CONSTRAINT IF EXISTS matters_scope_kind_check;
  ALTER TABLE public.matters
    ADD CONSTRAINT matters_scope_kind_check
    CHECK (scope_kind IN ('global', 'country', 'region', 'locality'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.matters
    DROP CONSTRAINT IF EXISTS matters_global_scope_check;
  ALTER TABLE public.matters
    ADD CONSTRAINT matters_global_scope_check
    CHECK (
      scope_kind <> 'global'
      OR scope_country_code IS NULL
      OR upper(scope_country_code) = 'GLOBAL'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.matters.scope_kind IS
  'Geographic scope for the Matter (global/country/region/locality). Distinct from area_node_id subject taxonomy.';
COMMENT ON COLUMN public.matters.area_node_id IS
  'Optional subject/domain Area (classification). Not geographic.';

CREATE OR REPLACE FUNCTION public.create_matter(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_id uuid;
  v_type text := coalesce(payload->>'matter_type', 'other');
  v_submit boolean := coalesce((payload->>'submit')::boolean, true);
  v_init_kind text := coalesce(payload->>'initiator_kind', 'person');
  v_init_id uuid := coalesce((payload->>'initiator_profile_id')::uuid, v_self);
  v_addr_kind text := coalesce(payload->>'addressee_kind', 'person');
  v_addr_id uuid := (payload->>'addressee_profile_id')::uuid;
  v_defaults public.matter_type_defaults%ROWTYPE;
  v_scope_kind text := lower(trim(coalesce(nullif(payload->>'scope_kind', ''), 'global')));
  v_scope_country text := nullif(upper(trim(coalesce(payload->>'scope_country_code', ''))), '');
  v_scope_region text := nullif(trim(coalesce(payload->>'scope_region_code', '')), '');
  v_scope_locality text := nullif(trim(coalesce(payload->>'scope_locality_code', '')), '');
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a Matter.';
  END IF;
  IF char_length(trim(coalesce(payload->>'title', ''))) < 3 THEN
    RAISE EXCEPTION 'Add a short title.';
  END IF;
  IF char_length(trim(coalesce(payload->>'description', ''))) < 3 THEN
    RAISE EXCEPTION 'Describe the Matter.';
  END IF;
  IF v_addr_id IS NULL OR v_addr_id = v_init_id THEN
    RAISE EXCEPTION 'Choose who this Matter is for.';
  END IF;
  IF v_type NOT IN ('question', 'issue', 'suggestion', 'request', 'discussion', 'other') THEN
    RAISE EXCEPTION 'Choose a Matter type.';
  END IF;
  IF v_init_kind = 'person' AND v_init_id <> v_self THEN
    RAISE EXCEPTION 'You can only create a Matter as yourself or an organization you represent.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_init_kind, v_init_id) THEN
    RAISE EXCEPTION 'You can only create a Matter as yourself or an organization you represent.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_addr_id) THEN
    RAISE EXCEPTION 'Choose who this Matter is for.';
  END IF;
  IF v_scope_kind NOT IN ('global', 'country', 'region', 'locality') THEN
    RAISE EXCEPTION 'Choose a geographic scope.';
  END IF;
  IF v_scope_kind = 'global' THEN
    v_scope_country := NULL;
    v_scope_region := NULL;
    v_scope_locality := NULL;
  ELSIF v_scope_country IS NULL OR v_scope_country = 'GLOBAL' THEN
    RAISE EXCEPTION 'Choose a country for this geographic scope.';
  END IF;
  IF v_scope_kind IN ('region', 'locality') AND v_scope_region IS NULL THEN
    RAISE EXCEPTION 'Choose a region for this geographic scope.';
  END IF;
  IF v_scope_kind = 'locality' AND v_scope_locality IS NULL THEN
    RAISE EXCEPTION 'Choose a city for this geographic scope.';
  END IF;
  IF v_scope_kind = 'country' THEN
    v_scope_region := NULL;
    v_scope_locality := NULL;
  ELSIF v_scope_kind = 'region' THEN
    v_scope_locality := NULL;
  END IF;

  INSERT INTO public.matters (
    title, description, matter_type, lifecycle_status, visibility, area_node_id,
    scope_kind, scope_country_code, scope_region_code, scope_locality_code,
    initiator_kind, initiator_profile_id, initiator_unit_label,
    addressee_kind, addressee_profile_id, addressee_unit_label,
    responsible_kind, responsible_profile_id, responsible_unit_label,
    created_by_profile_id, submitted_at
  ) VALUES (
    trim(payload->>'title'),
    trim(payload->>'description'),
    v_type,
    CASE WHEN v_submit THEN 'submitted' ELSE 'draft' END,
    coalesce(nullif(payload->>'visibility', ''), 'participants'),
    nullif(payload->>'area_node_id', ''),
    v_scope_kind, v_scope_country, v_scope_region, v_scope_locality,
    v_init_kind, v_init_id, nullif(trim(coalesce(payload->>'initiator_unit_label', '')), ''),
    v_addr_kind, v_addr_id, nullif(trim(coalesce(payload->>'addressee_unit_label', '')), ''),
    v_addr_kind, v_addr_id, nullif(trim(coalesce(payload->>'addressee_unit_label', '')), ''),
    v_self,
    CASE WHEN v_submit THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  PERFORM public.matter_add_party(v_id, 'initiator', v_init_kind, v_init_id, payload->>'initiator_unit_label');
  PERFORM public.matter_add_party(v_id, 'addressee', v_addr_kind, v_addr_id, payload->>'addressee_unit_label');
  PERFORM public.matter_add_party(v_id, 'responsible', v_addr_kind, v_addr_id, payload->>'addressee_unit_label');
  PERFORM public.matter_log_event(v_id, 'matter_created', 'Matter created.', v_init_kind, v_init_id, false);

  IF nullif(trim(coalesce(payload->>'evidence_url', '')), '') IS NOT NULL THEN
    INSERT INTO public.matter_attachments (
      matter_id, kind, url, label, uploaded_by_profile_id
    ) VALUES (
      v_id, 'url', trim(payload->>'evidence_url'),
      nullif(trim(coalesce(payload->>'evidence_label', '')), ''),
      v_self
    );
  END IF;

  IF v_submit THEN
    PERFORM public.matter_log_event(v_id, 'matter_submitted', 'Matter submitted.', v_init_kind, v_init_id, false);
    PERFORM public.matter_log_event(
      v_id, 'recipient_assigned',
      'Addressed to ' || public.matter_profile_display_name(v_addr_id) || '.',
      v_init_kind, v_init_id, false
    );
    SELECT * INTO v_defaults FROM public.matter_type_defaults WHERE matter_type = v_type;
    PERFORM public.matter_assign_action(
      v_id, v_defaults.initial_action_type, v_addr_kind, v_addr_id,
      payload->>'addressee_unit_label', v_defaults.timing_policy_id, v_defaults.timeout_behavior
    );
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_matter_follow_up(
  p_source_matter_id uuid,
  p_resolution_id uuid,
  p_title text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_source public.matters%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a follow-up Matter.';
  END IF;
  SELECT * INTO v_source FROM public.matters WHERE id = p_source_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source Matter not found.';
  END IF;
  v_new_id := public.create_matter(jsonb_build_object(
    'title', trim(p_title),
    'description', trim(p_description),
    'matter_type', v_source.matter_type,
    'visibility', v_source.visibility,
    'area_node_id', v_source.area_node_id,
    'scope_kind', v_source.scope_kind,
    'scope_country_code', v_source.scope_country_code,
    'scope_region_code', v_source.scope_region_code,
    'scope_locality_code', v_source.scope_locality_code,
    'initiator_kind', v_source.initiator_kind,
    'initiator_profile_id', v_source.initiator_profile_id,
    'initiator_unit_label', v_source.initiator_unit_label,
    'addressee_kind', v_source.addressee_kind,
    'addressee_profile_id', v_source.addressee_profile_id,
    'addressee_unit_label', v_source.addressee_unit_label,
    'responsible_kind', v_source.responsible_kind,
    'responsible_profile_id', v_source.responsible_profile_id,
    'responsible_unit_label', v_source.responsible_unit_label
  ));
  INSERT INTO public.matter_relationships (from_matter_id, to_matter_id, relationship_kind, created_by_profile_id)
  VALUES (v_new_id, p_source_matter_id, 'follow_up_to', v_self);
  PERFORM public.matter_log_event(
    p_source_matter_id, 'follow_up_matter_created',
    'Follow-up Matter created for unresolved portions.',
    'person', v_self, false,
    jsonb_build_object('followUpMatterId', v_new_id, 'resolutionId', p_resolution_id)
  );
  PERFORM public.matter_log_event(
    v_new_id, 'follow_up_from_matter',
    'This Matter follows up on a partially resolved Matter.',
    'system', NULL, true,
    jsonb_build_object('sourceMatterId', p_source_matter_id, 'resolutionId', p_resolution_id)
  );
  RETURN v_new_id;
END;
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
  v_matter public.matters%ROWTYPE;
  v_scope_kind text;
  v_scope_country text;
  v_scope_region text;
  v_scope_locality text;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.civic_can_draft_voting_proposal_for_matter(p_matter_id, v_self) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'matter_not_found';
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

  v_scope_kind := coalesce(nullif(v_matter.scope_kind, ''), 'global');
  v_scope_country := v_matter.scope_country_code;
  v_scope_region := v_matter.scope_region_code;
  v_scope_locality := v_matter.scope_locality_code;
  IF v_scope_kind = 'global' THEN
    v_scope_country := NULL;
    v_scope_region := NULL;
    v_scope_locality := NULL;
  END IF;

  INSERT INTO public.civic_voting_proposals (
    matter_id, title, summary, body, status, consultation_kind, scope_kind,
    scope_country_code, scope_region_code, scope_locality_code,
    voting_closes_at, created_by_profile_id
  ) VALUES (
    p_matter_id,
    v_title,
    COALESCE(NULLIF(v_summary, ''), v_title),
    COALESCE(NULLIF(v_body, ''), v_title),
    'draft',
    'nonbinding',
    v_scope_kind,
    v_scope_country,
    v_scope_region,
    v_scope_locality,
    p_voting_closes_at,
    v_self
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- One planet-wide model of public functions, with the existing public bodies of any place mapped onto it
-- (owner direction 2026-10-29: no country first; integrate existing structures efficiently, improving them).
--
-- Functions: the authority catalogue (`solution_authorities`, already used by Solutions) is the list of public
-- functions every place performs in some form: roads, health, schools, policing, elections, and so on. Each function
-- belongs to a group, and each group has a Civizen liaison position (Public Liaison unit) that answers for it wherever
-- no body is mapped yet.
-- Bodies: `public_bodies` are real public bodies anywhere on the planet (international, national, regional, local),
-- placed with the same scope codes Matters use. `public_body_functions` says which functions a body performs there.
-- Nothing is seeded: a member or position proposes a body with an official source; the liaison for its functions
-- verifies it; only verified bodies are public and used for routing.
-- Routing: a function and a place resolve to the most local verified body that performs the function (locality, then
-- region, then country, then global); otherwise to the function's liaison position.
-- Matters: a Matter for "a public authority" records the function and the body, and the liaison receives an item to
-- deliver it through the body's official channel (or to find the right office).

-- ---------------------------------------------------------------------------------------------
-- 1. Function groups and the liaison positions that answer for them
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.solution_authorities ADD COLUMN IF NOT EXISTS function_group text;
ALTER TABLE public.solution_authorities ADD COLUMN IF NOT EXISTS liaison_position_key text;

INSERT INTO public.governance_execution_units (unit_key, name, description, domain_key, is_system_unit) VALUES
  ('public_liaison', 'Public Liaison Unit', 'Brings members'' Matters to the public bodies responsible for them anywhere on the planet, and maps those bodies onto Civizen''s model of public functions', 'civic_operations', true)
ON CONFLICT (unit_key) DO NOTHING;

WITH seed (position_key, title, parent, sort_order, mandate, duties) AS (VALUES
  ('public_liaison_lead', 'Public Liaison Lead', 'civic_operations_lead', 10,
   'Leads the integration of existing public structures into Civizen: every public function has a body that answers for it in every place, or a liaison who finds one.',
   ARRAY['Keep the model of public functions complete and clear', 'Review and verify proposed public bodies with their official sources',
         'Track that Matters delivered to public bodies are answered within their legal deadlines', 'Propose improvements where responsibility is unclear, duplicated or missing']),
  ('liaison_governance_rights', 'Liaison: Government, Justice and Rights', 'public_liaison_lead', 20,
   'Answers for Matters about government itself, justice, courts, elections, oversight and foreign affairs until the responsible body is reached.',
   ARRAY['Deliver Matters to the responsible body through its official channel', 'Follow up until the body answers', 'Map and verify bodies for these functions']),
  ('liaison_safety', 'Liaison: Safety and Security', 'public_liaison_lead', 30,
   'Answers for Matters about public order, policing, emergencies, civil protection, migration and defence until the responsible body is reached.',
   ARRAY['Deliver Matters to the responsible body through its official channel', 'Point anyone in immediate danger to local emergency numbers', 'Map and verify bodies for these functions']),
  ('liaison_economy', 'Liaison: Economy, Work and Money', 'public_liaison_lead', 40,
   'Answers for Matters about public finance, taxes, business, work, consumer protection and tourism until the responsible body is reached.',
   ARRAY['Deliver Matters to the responsible body through its official channel', 'Follow up until the body answers', 'Map and verify bodies for these functions']),
  ('liaison_health_social', 'Liaison: Health and Social Care', 'public_liaison_lead', 50,
   'Answers for Matters about health, social support, families, youth and veterans until the responsible body is reached.',
   ARRAY['Deliver Matters to the responsible body through its official channel', 'Follow up until the body answers', 'Map and verify bodies for these functions']),
  ('liaison_learning_culture', 'Liaison: Learning and Culture', 'public_liaison_lead', 60,
   'Answers for Matters about schools, higher education, research and culture until the responsible body is reached.',
   ARRAY['Deliver Matters to the responsible body through its official channel', 'Follow up until the body answers', 'Map and verify bodies for these functions']),
  ('liaison_places', 'Liaison: Places and Infrastructure', 'public_liaison_lead', 70,
   'Answers for Matters about roads, transport, housing, planning, local services, utilities and communications until the responsible body is reached.',
   ARRAY['Deliver Matters to the responsible body through its official channel, including city service-request systems', 'Follow up until the body answers', 'Map and verify bodies for these functions']),
  ('liaison_planet', 'Liaison: Planet and Resources', 'public_liaison_lead', 80,
   'Answers for Matters about the environment, climate, energy, water, food and natural resources until the responsible body is reached.',
   ARRAY['Deliver Matters to the responsible body through its official channel', 'Follow up until the body answers', 'Map and verify bodies for these functions'])
)
INSERT INTO public.org_positions (position_key, unit_id, title, domain_role_key, parent_position_key, sort_order, mandate, duties)
SELECT s.position_key, u.id, s.title, CASE WHEN s.position_key = 'public_liaison_lead' THEN 'steward' ELSE 'reviewer' END,
       s.parent, s.sort_order, s.mandate, s.duties
  FROM seed s JOIN public.governance_execution_units u ON u.unit_key = 'public_liaison'
ON CONFLICT (position_key) DO NOTHING;

UPDATE public.solution_authorities a SET function_group = g.grp, liaison_position_key = g.pos
  FROM (VALUES
    ('executive_office', 'governance_rights', 'liaison_governance_rights'), ('elections', 'governance_rights', 'liaison_governance_rights'),
    ('ombudsman', 'governance_rights', 'liaison_governance_rights'), ('justice', 'governance_rights', 'liaison_governance_rights'),
    ('judiciary', 'governance_rights', 'liaison_governance_rights'), ('foreign_affairs', 'governance_rights', 'liaison_governance_rights'),
    ('interior', 'safety', 'liaison_safety'), ('police', 'safety', 'liaison_safety'), ('defense', 'safety', 'liaison_safety'),
    ('emergency', 'safety', 'liaison_safety'), ('immigration', 'safety', 'liaison_safety'),
    ('finance', 'economy', 'liaison_economy'), ('taxation', 'economy', 'liaison_economy'), ('economy', 'economy', 'liaison_economy'),
    ('labor', 'economy', 'liaison_economy'), ('consumer', 'economy', 'liaison_economy'), ('tourism_sport', 'economy', 'liaison_economy'),
    ('health', 'health_social', 'liaison_health_social'), ('social_welfare', 'health_social', 'liaison_health_social'),
    ('family_youth', 'health_social', 'liaison_health_social'), ('veterans', 'health_social', 'liaison_health_social'),
    ('education', 'learning_culture', 'liaison_learning_culture'), ('higher_education', 'learning_culture', 'liaison_learning_culture'),
    ('culture', 'learning_culture', 'liaison_learning_culture'),
    ('transport', 'places', 'liaison_places'), ('infrastructure', 'places', 'liaison_places'), ('housing', 'places', 'liaison_places'),
    ('planning', 'places', 'liaison_places'), ('municipal', 'places', 'liaison_places'), ('utilities', 'places', 'liaison_places'),
    ('communications', 'places', 'liaison_places'),
    ('environment', 'planet', 'liaison_planet'), ('energy', 'planet', 'liaison_planet'), ('agriculture', 'planet', 'liaison_planet'),
    ('water', 'planet', 'liaison_planet'), ('natural_resources', 'planet', 'liaison_planet'),
    ('civizen_network', 'civizen', 'member_support')
  ) AS g(id, grp, pos)
 WHERE a.id = g.id;

-- ---------------------------------------------------------------------------------------------
-- 2. Public bodies anywhere, and the functions they perform there
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_bodies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 200),
  kind text NOT NULL CHECK (kind IN ('international', 'legislature', 'executive', 'ministry', 'agency', 'court', 'independent',
                                     'regional_government', 'local_government', 'service_provider', 'other')),
  scope_kind text NOT NULL CHECK (scope_kind IN ('global', 'country', 'region', 'locality')),
  scope_country_code text,
  scope_region_code text,
  scope_locality_code text,
  parent_body_id uuid REFERENCES public.public_bodies(id) ON DELETE SET NULL,
  website text CHECK (website IS NULL OR website ~ '^https?://'),
  channel_kind text NOT NULL DEFAULT 'web_form' CHECK (channel_kind IN ('service_request_api', 'email', 'web_form', 'postal', 'phone')),
  channel_address text NOT NULL CHECK (length(btrim(channel_address)) BETWEEN 3 AND 500),
  answer_deadline_days integer CHECK (answer_deadline_days IS NULL OR answer_deadline_days BETWEEN 1 AND 365),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'verified', 'rejected', 'retired')),
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  proposed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope_kind = 'global' AND scope_country_code IS NULL)
         OR (scope_kind = 'country' AND scope_country_code IS NOT NULL)
         OR (scope_kind = 'region' AND scope_country_code IS NOT NULL AND scope_region_code IS NOT NULL)
         OR (scope_kind = 'locality' AND scope_country_code IS NOT NULL AND scope_locality_code IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS public_bodies_place_idx ON public.public_bodies (scope_country_code, scope_region_code, scope_locality_code) WHERE status = 'verified';

CREATE TABLE IF NOT EXISTS public.public_body_functions (
  body_id uuid NOT NULL REFERENCES public.public_bodies(id) ON DELETE CASCADE,
  authority_id text NOT NULL REFERENCES public.solution_authorities(id),
  coverage_note text CHECK (coverage_note IS NULL OR length(coverage_note) <= 300),
  PRIMARY KEY (body_id, authority_id)
);
CREATE INDEX IF NOT EXISTS public_body_functions_authority_idx ON public.public_body_functions (authority_id);

ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS public_authority_id text REFERENCES public.solution_authorities(id);
ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS public_body_id uuid REFERENCES public.public_bodies(id) ON DELETE SET NULL;

ALTER TABLE public.public_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_body_functions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_bodies, public.public_body_functions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_bodies, public.public_body_functions TO anon, authenticated;
DROP POLICY IF EXISTS public_bodies_read ON public.public_bodies;
CREATE POLICY public_bodies_read ON public.public_bodies FOR SELECT
  USING (status = 'verified' OR (proposed_by IS NOT NULL AND proposed_by = public.current_profile_id()));
DROP POLICY IF EXISTS public_body_functions_read ON public.public_body_functions;
CREATE POLICY public_body_functions_read ON public.public_body_functions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.public_bodies b WHERE b.id = body_id
                   AND (b.status = 'verified' OR (b.proposed_by IS NOT NULL AND b.proposed_by = public.current_profile_id()))));

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public_bodies', 'public_body_functions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforcement_suspension_guard ON public.%I', t);
    EXECUTE format('CREATE TRIGGER enforcement_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
                   'FOR EACH STATEMENT EXECUTE FUNCTION public.enforcement_suspension_guard()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------
-- 3. Routing
-- ---------------------------------------------------------------------------------------------
-- The most local verified body that performs the function in the place, else the function's liaison position.
CREATE OR REPLACE FUNCTION public.route_public_function(
  p_authority_id text, p_scope_kind text DEFAULT 'global', p_country text DEFAULT NULL, p_region text DEFAULT NULL, p_locality text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authority public.solution_authorities%ROWTYPE;
  v_body public.public_bodies%ROWTYPE;
  v_country text := nullif(upper(btrim(coalesce(p_country, ''))), 'GLOBAL');
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_locality text := nullif(btrim(coalesce(p_locality, '')), '');
BEGIN
  SELECT * INTO v_authority FROM public.solution_authorities WHERE id = p_authority_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_function' USING ERRCODE = '22023';
  END IF;
  v_country := nullif(v_country, '');
  SELECT b.* INTO v_body
    FROM public.public_bodies b JOIN public.public_body_functions f ON f.body_id = b.id
   WHERE f.authority_id = p_authority_id AND b.status = 'verified'
     AND (
       (b.scope_kind = 'locality' AND b.scope_country_code = v_country AND b.scope_locality_code = v_locality
          AND (b.scope_region_code IS NULL OR b.scope_region_code = v_region))
       OR (b.scope_kind = 'region' AND b.scope_country_code = v_country AND b.scope_region_code = v_region)
       OR (b.scope_kind = 'country' AND b.scope_country_code = v_country)
       OR b.scope_kind = 'global')
   ORDER BY CASE b.scope_kind WHEN 'locality' THEN 0 WHEN 'region' THEN 1 WHEN 'country' THEN 2 ELSE 3 END, b.created_at
   LIMIT 1;
  RETURN jsonb_build_object(
    'authority_id', v_authority.id, 'authority_name', v_authority.name, 'function_group', v_authority.function_group,
    'liaison_position_key', v_authority.liaison_position_key,
    'liaison_title', (SELECT title FROM public.org_positions WHERE position_key = v_authority.liaison_position_key),
    'body', CASE WHEN v_body.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_body.id, 'name', v_body.name, 'kind', v_body.kind, 'scope_kind', v_body.scope_kind,
      'scope_country_code', v_body.scope_country_code, 'scope_region_code', v_body.scope_region_code,
      'scope_locality_code', v_body.scope_locality_code, 'website', v_body.website, 'channel_kind', v_body.channel_kind,
      'channel_address', v_body.channel_address, 'answer_deadline_days', v_body.answer_deadline_days, 'source_url', v_body.source_url) END);
END;
$$;
REVOKE ALL ON FUNCTION public.route_public_function(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.route_public_function(text, text, text, text, text) TO anon, authenticated;

-- The planet-wide model: functions by group, with their liaison and how many verified bodies perform each.
CREATE OR REPLACE FUNCTION public.public_function_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'authority_id', a.id, 'name', a.name, 'responsibilities', a.responsibilities, 'function_group', a.function_group,
           'liaison_position_key', a.liaison_position_key,
           'verified_bodies', (SELECT count(*) FROM public.public_body_functions f JOIN public.public_bodies b ON b.id = f.body_id
                                WHERE f.authority_id = a.id AND b.status = 'verified'))
         ORDER BY a.sort_order), '[]'::jsonb)
    FROM public.solution_authorities a
   WHERE a.function_group IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.public_function_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_function_catalog() TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Proposing and verifying bodies
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.propose_public_body(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_id uuid;
  v_functions text[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(coalesce(payload -> 'functions', '[]'::jsonb)));
  v_scope text := lower(btrim(coalesce(payload ->> 'scope_kind', '')));
  v_liaison text;
  v_name text := btrim(coalesce(payload ->> 'name', ''));
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF cardinality(v_functions) = 0 OR EXISTS (SELECT 1 FROM unnest(v_functions) f WHERE f NOT IN (SELECT id FROM public.solution_authorities)) THEN
    RAISE EXCEPTION 'functions_required' USING ERRCODE = '22023';
  END IF;
  IF coalesce(payload ->> 'source_url', '') !~ '^https://' THEN
    RAISE EXCEPTION 'source_required' USING ERRCODE = '22023';
  END IF;
  -- at most 10 proposals a day per member
  IF (SELECT count(*) FROM public.public_bodies WHERE proposed_by = v_me AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'PT429', DETAIL = 'public_body', HINT = (now() + interval '1 day')::text;
  END IF;
  INSERT INTO public.public_bodies (name, kind, scope_kind, scope_country_code, scope_region_code, scope_locality_code, website,
                                    channel_kind, channel_address, answer_deadline_days, source_url, notes, proposed_by)
  VALUES (v_name, coalesce(nullif(payload ->> 'kind', ''), 'other'), v_scope,
          CASE WHEN v_scope = 'global' THEN NULL ELSE nullif(upper(btrim(coalesce(payload ->> 'scope_country_code', ''))), '') END,
          nullif(btrim(coalesce(payload ->> 'scope_region_code', '')), ''),
          nullif(btrim(coalesce(payload ->> 'scope_locality_code', '')), ''),
          nullif(btrim(coalesce(payload ->> 'website', '')), ''),
          coalesce(nullif(payload ->> 'channel_kind', ''), 'web_form'), btrim(coalesce(payload ->> 'channel_address', '')),
          nullif(payload ->> 'answer_deadline_days', '')::integer, btrim(payload ->> 'source_url'),
          nullif(btrim(coalesce(payload ->> 'notes', '')), ''), v_me)
  RETURNING id INTO v_id;
  INSERT INTO public.public_body_functions (body_id, authority_id) SELECT v_id, f FROM unnest(v_functions) f;
  SELECT liaison_position_key INTO v_liaison FROM public.solution_authorities WHERE id = v_functions[1];
  INSERT INTO public.org_position_items (position_key, kind, title, body, recommendation, source_type, source_ref, created_by)
  VALUES (coalesce(v_liaison, 'public_liaison_lead'), 'review', 'Verify public body: ' || left(v_name, 150),
          'Proposed ' || to_char(now(), 'YYYY-MM-DD') || '. Place: ' || v_scope
            || coalesce(' ' || nullif(upper(btrim(coalesce(payload ->> 'scope_country_code', ''))), ''), '')
            || coalesce(' / ' || nullif(btrim(coalesce(payload ->> 'scope_region_code', '')), ''), '')
            || coalesce(' / ' || nullif(btrim(coalesce(payload ->> 'scope_locality_code', '')), ''), '')
            || E'\nFunctions: ' || array_to_string(v_functions, ', ')
            || E'\nChannel: ' || coalesce(payload ->> 'channel_kind', 'web_form') || ' ' || btrim(coalesce(payload ->> 'channel_address', ''))
            || E'\nSource: ' || btrim(payload ->> 'source_url'),
          'Open the source, confirm the body exists, performs these functions in this place, and that the channel is its official one; then verify or reject with a note.',
          'public_body', v_id::text, v_me);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.propose_public_body(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_public_body(jsonb) TO authenticated;

-- The liaison for any of the body's functions verifies or rejects it; the review item closes with the decision.
CREATE OR REPLACE FUNCTION public.review_public_body(p_body_id uuid, p_decision text, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
BEGIN
  IF p_decision NOT IN ('verified', 'rejected', 'retired') THEN
    RAISE EXCEPTION 'unknown_decision' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'note_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.public_body_functions f JOIN public.solution_authorities a ON a.id = f.authority_id
     WHERE f.body_id = p_body_id AND public.org_can_work_position(coalesce(a.liaison_position_key, 'public_liaison_lead'), v_me)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.public_bodies SET status = p_decision, reviewed_by = v_me, reviewed_at = now(), review_note = btrim(p_note), updated_at = now()
   WHERE id = p_body_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'body_not_found' USING ERRCODE = '22023';
  END IF;
  WITH closed AS (
    UPDATE public.org_position_items
       SET status = CASE WHEN p_decision = 'rejected' THEN 'declined' ELSE 'done' END, resolution = initcap(p_decision) || ': ' || btrim(p_note),
           resolved_by = v_me, resolved_at = now(), updated_at = now()
     WHERE source_type = 'public_body' AND source_ref = p_body_id::text AND status IN ('open', 'in_progress', 'waiting')
    RETURNING id, position_key)
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  SELECT position_key, id, 'item_resolved', v_me, initcap(p_decision) || ': ' || btrim(p_note) FROM closed;
END;
$$;
REVOKE ALL ON FUNCTION public.review_public_body(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_public_body(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. A Matter for a public authority
-- ---------------------------------------------------------------------------------------------
-- The initiator records which public function the Matter is about; the route picks the body for the Matter's place.
-- The Matter moves from Member Support's triage to the function's liaison, with what to deliver and where.
CREATE OR REPLACE FUNCTION public.set_matter_public_route(p_matter_id uuid, p_authority_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_route jsonb;
  v_body jsonb;
  v_liaison text;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'matter_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  v_route := public.route_public_function(p_authority_id, v_matter.scope_kind, v_matter.scope_country_code,
                                          v_matter.scope_region_code, v_matter.scope_locality_code);
  v_body := v_route -> 'body';
  v_liaison := coalesce(v_route ->> 'liaison_position_key', 'public_liaison_lead');
  UPDATE public.matters SET public_authority_id = p_authority_id, public_body_id = (v_body ->> 'id')::uuid WHERE id = p_matter_id;
  -- triage is no longer needed: the liaison for the function has it
  WITH closed AS (
    UPDATE public.org_position_items
       SET status = 'done', resolution = 'Routed to ' || coalesce(v_route ->> 'liaison_title', v_liaison) || ' (public function: '
                                         || (v_route ->> 'authority_name') || ').', resolved_at = now(), updated_at = now()
     WHERE position_key = 'member_support' AND source_type = 'matter' AND source_ref = p_matter_id::text
       AND status IN ('open', 'in_progress', 'waiting')
    RETURNING id)
  INSERT INTO public.org_position_log (position_key, item_id, event, body)
  SELECT 'member_support', id, 'item_resolved', 'Routed to ' || coalesce(v_route ->> 'liaison_title', v_liaison) FROM closed;
  PERFORM public.org_open_matter_item(
    v_liaison, 'task',
    CASE WHEN v_body IS NULL THEN 'Find the responsible office: ' ELSE 'Deliver to ' || (v_body ->> 'name') || ': ' END || v_matter.title,
    'Public function: ' || (v_route ->> 'authority_name') || E'\nPlace: ' || v_matter.scope_kind
      || coalesce(' ' || v_matter.scope_country_code, '') || coalesce(' / ' || v_matter.scope_region_code, '')
      || coalesce(' / ' || v_matter.scope_locality_code, '')
      || CASE WHEN v_body IS NULL THEN E'\nNo verified body performs this function here yet.'
         ELSE E'\nChannel: ' || (v_body ->> 'channel_kind') || ' ' || (v_body ->> 'channel_address')
              || coalesce(E'\nAnswer due within ' || (v_body ->> 'answer_deadline_days') || ' days by law or policy.', '')
              || E'\nSource: ' || (v_body ->> 'source_url') END,
    CASE WHEN v_body IS NULL
      THEN 'Find the office that performs this function in this place from an official source, propose it as a public body, then deliver the Matter and record the reference here.'
      ELSE 'Deliver the Matter through the official channel, record the reference and the date here, and follow up until the body answers.' END,
    'normal', p_matter_id);
  PERFORM public.matter_log_event(p_matter_id, 'public_route_set',
    'Addressed to the public function "' || (v_route ->> 'authority_name') || '"'
      || CASE WHEN v_body IS NULL THEN '; a Civizen liaison will find the responsible office.' ELSE '; delivered through ' || (v_body ->> 'name') || '.' END,
    'system', NULL, true, jsonb_build_object('authorityId', p_authority_id, 'bodyId', v_body ->> 'id', 'liaison', v_liaison));
  RETURN v_route;
END;
$$;
REVOKE ALL ON FUNCTION public.set_matter_public_route(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_matter_public_route(uuid, text) TO authenticated;

-- Liaison positions act for Civizen on the Matters they carry, like Member Support
UPDATE public.org_positions SET acts_for_civizen = true
 WHERE position_key IN ('public_liaison_lead', 'liaison_governance_rights', 'liaison_safety', 'liaison_economy',
                        'liaison_health_social', 'liaison_learning_culture', 'liaison_places', 'liaison_planet');

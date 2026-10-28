-- Organisation positions: responsibility belongs to a position inside a unit, not to a person.
--
-- Civizen already has governance domains, execution units (one per domain) and one constitutional office (founder).
-- Domain roles and unit memberships are rows per person, so when a person leaves, nothing tells their successor what
-- was decided, what is pending, or who to ask. This adds the missing layer:
--   org_positions       a seat in a unit: mandate, duties, how many holders, parent position for escalation, and the
--                       contact topic it answers on /contact
--   org_position_terms  who holds (or acts in) a position and when; ended terms stay, with the reason and a handover note
--   org_position_items  the position's queue (decisions, tasks, reviews, inquiries). Items belong to the position, so a
--                       new holder inherits them; a decision item carries a recommended option and why
--   org_position_log    append-only journal of everything that happened in the position
-- A vacant position's work goes to its parent position's holders, and from a top-level position to the founder
-- office (the TD1 fallback). Holding a position also gives the matching domain role, so domain-gated access (identity
-- review, election administration, ...) follows the seat. Writes go through the functions below.

-- ---------------------------------------------------------------------------------------------
-- 1. Domains and units every position needs
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.governance_domains (domain_key, name, description) VALUES
  ('languages', 'Languages and Translation', 'Hand-written translations, terminology, and native-speaker review of texts')
ON CONFLICT (domain_key) DO NOTHING;

INSERT INTO public.governance_domain_roles (domain_key, role_key, name, description, is_system_role)
SELECT 'languages', r.role_key, r.name, r.description, true
  FROM public.governance_domain_roles r WHERE r.domain_key = 'civic_operations'
ON CONFLICT (domain_key, role_key) DO NOTHING;

INSERT INTO public.governance_execution_units (unit_key, name, description, domain_key, is_system_unit) VALUES
  ('moderation_conduct', 'Moderation and Conduct Unit', 'Reports, moderation decisions, member enforcement and appeals', 'moderation_conduct', true),
  ('languages', 'Languages and Translation Unit', 'Hand-written translations and native-speaker review', 'languages', true),
  ('dispute_resolution', 'Dispute Resolution Unit', 'Disputes between members, organisations and agreements', 'dispute_resolution', true),
  ('civic_education', 'Civic Education Unit', 'Learning paths, certification quality and civic literacy', 'civic_education', true),
  ('market_oversight', 'Market Oversight Unit', 'Jobs, opportunities and marketplace integrity', 'market_oversight', true),
  ('activation_review', 'Activation Review Unit', 'Country and world activation review', 'activation_review', true)
ON CONFLICT (unit_key) DO NOTHING;

ALTER TABLE public.profile_governance_roles DROP CONSTRAINT IF EXISTS profile_governance_roles_assignment_source_check;
ALTER TABLE public.profile_governance_roles ADD CONSTRAINT profile_governance_roles_assignment_source_check
  CHECK (assignment_source = ANY (ARRAY['manual', 'unit_membership_sync', 'bootstrap_migration', 'position']));

-- ---------------------------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_positions (
  position_key text PRIMARY KEY CHECK (position_key ~ '^[a-z][a-z0-9_]{2,62}$'),
  unit_id uuid NOT NULL REFERENCES public.governance_execution_units(id),
  title text NOT NULL,
  mandate text NOT NULL,
  duties text[] NOT NULL DEFAULT '{}',
  domain_role_key text NOT NULL DEFAULT 'steward' CHECK (domain_role_key IN ('domain_lead', 'steward', 'reviewer')),
  parent_position_key text REFERENCES public.org_positions(position_key),
  seats integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 50),
  contact_topic text UNIQUE CHECK (contact_topic IS NULL OR contact_topic ~ '^[a-z]{3,20}$'),
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_position_key IS DISTINCT FROM position_key)
);

CREATE TABLE IF NOT EXISTS public.org_position_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_key text NOT NULL REFERENCES public.org_positions(position_key),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  kind text NOT NULL DEFAULT 'holder' CHECK (kind IN ('holder', 'acting')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  appointed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  end_reason text,
  handover_note text,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS org_position_terms_one_open_per_person
  ON public.org_position_terms (position_key, profile_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS org_position_terms_profile_idx ON public.org_position_terms (profile_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS public.org_position_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_key text NOT NULL REFERENCES public.org_positions(position_key),
  kind text NOT NULL CHECK (kind IN ('decision', 'task', 'review', 'inquiry')),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 200),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 8000),
  recommendation text CHECK (recommendation IS NULL OR length(recommendation) <= 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'done', 'declined')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  claimed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution text CHECK (resolution IS NULL OR length(resolution) <= 4000),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  source_type text,
  source_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_position_items_open_idx
  ON public.org_position_items (position_key, created_at) WHERE status IN ('open', 'in_progress', 'waiting');

CREATE TABLE IF NOT EXISTS public.org_position_log (
  id bigserial PRIMARY KEY,
  position_key text NOT NULL REFERENCES public.org_positions(position_key),
  item_id uuid REFERENCES public.org_position_items(id) ON DELETE SET NULL,
  event text NOT NULL CHECK (event IN ('item_opened', 'item_claimed', 'item_released', 'item_status', 'item_resolved',
                                       'holder_started', 'holder_ended', 'handover_note', 'note')),
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_position_log_position_idx ON public.org_position_log (position_key, created_at DESC);

-- a suspended member may read and appeal only (PM decision TD2): the statement guard covers these tables too
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['org_positions', 'org_position_terms', 'org_position_items', 'org_position_log'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforcement_suspension_guard ON public.%I', t);
    EXECUTE format('CREATE TRIGGER enforcement_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
                   'FOR EACH STATEMENT EXECUTE FUNCTION public.enforcement_suspension_guard()', t);
  END LOOP;
END $$;

ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_position_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_position_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_position_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.org_positions, public.org_position_terms, public.org_position_items, public.org_position_log FROM PUBLIC, anon, authenticated;
-- who holds which public position is public; the queue and the journal are read through the functions below
GRANT SELECT ON public.org_positions, public.org_position_terms TO anon, authenticated;
DROP POLICY IF EXISTS org_positions_read ON public.org_positions;
CREATE POLICY org_positions_read ON public.org_positions FOR SELECT USING (true);
DROP POLICY IF EXISTS org_position_terms_read ON public.org_position_terms;
CREATE POLICY org_position_terms_read ON public.org_position_terms FOR SELECT USING (true);

-- ---------------------------------------------------------------------------------------------
-- 3. Who answers for a position
-- ---------------------------------------------------------------------------------------------
-- The profiles who currently answer for a position: its holders and acting holders; when it has none, the answerers
-- of its parent; at the top, the founder office holder.
CREATE OR REPLACE FUNCTION public.org_position_answerers(p_position_key text)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := p_position_key;
  v_depth integer := 0;
BEGIN
  WHILE v_key IS NOT NULL AND v_depth < 20 LOOP
    IF EXISTS (SELECT 1 FROM public.org_position_terms t WHERE t.position_key = v_key AND t.ended_at IS NULL) THEN
      RETURN QUERY SELECT t.profile_id FROM public.org_position_terms t WHERE t.position_key = v_key AND t.ended_at IS NULL;
      RETURN;
    END IF;
    SELECT p.parent_position_key INTO v_key FROM public.org_positions p WHERE p.position_key = v_key;
    v_depth := v_depth + 1;
  END LOOP;
  RETURN QUERY SELECT o.profile_id FROM public.constitutional_offices o WHERE o.office_key = 'founder' AND o.is_active;
END;
$$;
REVOKE ALL ON FUNCTION public.org_position_answerers(text) FROM PUBLIC, anon, authenticated;

-- A profile may work a position's queue when it answers for the position, holds a position above it, has founder
-- authority, or manages settings.
CREATE OR REPLACE FUNCTION public.org_can_work_position(p_position_key text, p_profile uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_depth integer := 0;
BEGIN
  IF p_profile IS NULL THEN
    RETURN false;
  END IF;
  IF p_profile IN (SELECT public.org_position_answerers(p_position_key)) OR public.profile_has_founder_authority(p_profile) THEN
    RETURN true;
  END IF;
  SELECT parent_position_key INTO v_key FROM public.org_positions WHERE position_key = p_position_key;
  WHILE v_key IS NOT NULL AND v_depth < 20 LOOP
    IF EXISTS (SELECT 1 FROM public.org_position_terms t WHERE t.position_key = v_key AND t.profile_id = p_profile AND t.ended_at IS NULL) THEN
      RETURN true;
    END IF;
    SELECT parent_position_key INTO v_key FROM public.org_positions WHERE position_key = v_key;
    v_depth := v_depth + 1;
  END LOOP;
  RETURN p_profile = public.current_profile_id() AND public.has_permission('settings.manage'::public.app_permission);
END;
$$;
REVOKE ALL ON FUNCTION public.org_can_work_position(text, uuid) FROM PUBLIC, anon, authenticated;

-- Appointing: settings or role managers, founder authority, or a holder of a position above the one being filled.
CREATE OR REPLACE FUNCTION public.org_can_appoint_position(p_position_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_key text;
  v_depth integer := 0;
BEGIN
  IF v_me IS NULL THEN
    RETURN false;
  END IF;
  IF public.has_permission('role.assign'::public.app_permission) OR public.has_permission('settings.manage'::public.app_permission)
     OR public.profile_has_founder_authority(v_me) THEN
    RETURN true;
  END IF;
  SELECT parent_position_key INTO v_key FROM public.org_positions WHERE position_key = p_position_key;
  WHILE v_key IS NOT NULL AND v_depth < 20 LOOP
    IF EXISTS (SELECT 1 FROM public.org_position_terms t WHERE t.position_key = v_key AND t.profile_id = v_me AND t.ended_at IS NULL) THEN
      RETURN true;
    END IF;
    SELECT parent_position_key INTO v_key FROM public.org_positions WHERE position_key = v_key;
    v_depth := v_depth + 1;
  END LOOP;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.org_can_appoint_position(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_can_appoint_position(text) TO authenticated;

-- Notifies whoever answers for the position about a new item.
CREATE OR REPLACE FUNCTION public.org_notify_position(p_position_key text, p_item_id uuid, p_title text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
  SELECT a, 'position_item', 'New item for ' || p.title, p_title, 'org_position_item', p_item_id,
         jsonb_build_object('position_key', p_position_key)
    FROM public.org_position_answerers(p_position_key) a
    JOIN public.org_positions p ON p.position_key = p_position_key;
$$;
REVOKE ALL ON FUNCTION public.org_notify_position(text, uuid, text) FROM PUBLIC, anon, authenticated;

-- Keeps the domain role in step with the seat: an open term gives the position's domain role; when the last term
-- that gave it ends, the role ends too (roles given another way are left alone).
CREATE OR REPLACE FUNCTION public.org_sync_domain_role(p_position_key text, p_profile uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_role text;
BEGIN
  SELECT u.domain_key, p.domain_role_key INTO v_domain, v_role
    FROM public.org_positions p JOIN public.governance_execution_units u ON u.id = p.unit_id
   WHERE p.position_key = p_position_key;
  IF v_domain IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_position_terms t JOIN public.org_positions p ON p.position_key = t.position_key
               JOIN public.governance_execution_units u ON u.id = p.unit_id
              WHERE t.profile_id = p_profile AND t.ended_at IS NULL AND u.domain_key = v_domain AND p.domain_role_key = v_role) THEN
    INSERT INTO public.profile_governance_roles (profile_id, domain_key, role_key, assigned_by, is_active, assignment_source)
    VALUES (p_profile, v_domain, v_role, public.current_profile_id(), true, 'position')
    ON CONFLICT (profile_id, domain_key, role_key) DO UPDATE
      SET is_active = true, ended_at = NULL, updated_at = now()
      WHERE public.profile_governance_roles.assignment_source = 'position' OR NOT public.profile_governance_roles.is_active;
  ELSE
    UPDATE public.profile_governance_roles
       SET is_active = false, ended_at = greatest(clock_timestamp(), assigned_at + interval '1 millisecond'), updated_at = now()
     WHERE profile_id = p_profile AND domain_key = v_domain AND role_key = v_role
       AND assignment_source = 'position' AND is_active;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.org_sync_domain_role(text, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Holders
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.org_appoint_position_holder(p_position_key text, p_profile uuid, p_kind text DEFAULT 'holder', p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_pos public.org_positions%ROWTYPE;
  v_id uuid;
  v_name text;
BEGIN
  SELECT * INTO v_pos FROM public.org_positions WHERE position_key = p_position_key AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'position_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT public.org_can_appoint_position(p_position_key) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_kind NOT IN ('holder', 'acting') THEN
    RAISE EXCEPTION 'unknown_kind' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_position_terms WHERE position_key = p_position_key AND profile_id = p_profile AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'already_holds_position' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.org_position_terms WHERE position_key = p_position_key AND ended_at IS NULL) >= v_pos.seats THEN
    RAISE EXCEPTION 'position_full' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.org_position_terms (position_key, profile_id, kind, appointed_by)
  VALUES (p_position_key, p_profile, p_kind, v_me)
  RETURNING id INTO v_id;
  PERFORM public.org_sync_domain_role(p_position_key, p_profile);
  SELECT coalesce(nullif(full_name, ''), username, 'a member') INTO v_name FROM public.profiles WHERE id = p_profile;
  INSERT INTO public.org_position_log (position_key, event, actor_profile_id, body)
  VALUES (p_position_key, 'holder_started', v_me,
          v_name || CASE WHEN p_kind = 'acting' THEN ' started as acting holder' ELSE ' started as holder' END
          || CASE WHEN nullif(btrim(p_note), '') IS NOT NULL THEN ': ' || btrim(p_note) ELSE '' END);
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, metadata)
  VALUES (p_profile, 'position_started', 'You now hold ' || v_pos.title,
          'Open the position to read its mandate, the handover notes and the open items.', 'org_position',
          jsonb_build_object('position_key', p_position_key));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.org_appoint_position_holder(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_appoint_position_holder(text, uuid, text, text) TO authenticated;

-- Ends a term. The holder (stepping down) or an appointer may end it; with open items a handover note is required, so
-- the next holder knows where each one stands.
CREATE OR REPLACE FUNCTION public.org_end_position_term(p_term_id uuid, p_reason text, p_handover_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_term public.org_position_terms%ROWTYPE;
  v_name text;
BEGIN
  SELECT * INTO v_term FROM public.org_position_terms WHERE id = p_term_id FOR UPDATE;
  IF NOT FOUND OR v_term.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'term_not_open' USING ERRCODE = '22023';
  END IF;
  IF v_term.profile_id IS DISTINCT FROM v_me AND NOT public.org_can_appoint_position(v_term.position_key) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(p_handover_note), '') IS NULL AND EXISTS (
       SELECT 1 FROM public.org_position_items WHERE position_key = v_term.position_key AND status IN ('open', 'in_progress', 'waiting')) THEN
    RAISE EXCEPTION 'handover_note_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.org_position_terms
     SET ended_at = now(), ended_by = v_me, end_reason = btrim(p_reason), handover_note = nullif(btrim(p_handover_note), '')
   WHERE id = p_term_id;
  -- items the leaving holder had claimed stay with the position, unclaimed
  WITH released AS (
    UPDATE public.org_position_items SET claimed_by = NULL, status = CASE WHEN status = 'in_progress' THEN 'open' ELSE status END, updated_at = now()
     WHERE position_key = v_term.position_key AND claimed_by = v_term.profile_id AND status IN ('open', 'in_progress', 'waiting')
    RETURNING id)
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  SELECT v_term.position_key, id, 'item_released', v_me, 'Released when the holder''s term ended' FROM released;
  PERFORM public.org_sync_domain_role(v_term.position_key, v_term.profile_id);
  SELECT coalesce(nullif(full_name, ''), username, 'a member') INTO v_name FROM public.profiles WHERE id = v_term.profile_id;
  INSERT INTO public.org_position_log (position_key, event, actor_profile_id, body)
  VALUES (v_term.position_key, 'holder_ended', v_me, v_name || '''s term ended: ' || btrim(p_reason));
  IF nullif(btrim(p_handover_note), '') IS NOT NULL THEN
    INSERT INTO public.org_position_log (position_key, event, actor_profile_id, body)
    VALUES (v_term.position_key, 'handover_note', v_me, btrim(p_handover_note));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.org_end_position_term(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_end_position_term(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. The queue and the journal
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.org_open_position_item(
  p_position_key text, p_kind text, p_title text, p_body text DEFAULT '', p_recommendation text DEFAULT NULL,
  p_priority text DEFAULT 'normal', p_due_at timestamptz DEFAULT NULL, p_source_type text DEFAULT NULL, p_source_ref text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.org_positions WHERE position_key = p_position_key AND is_active) THEN
    RAISE EXCEPTION 'position_not_found' USING ERRCODE = '22023';
  END IF;
  -- any position holder may hand work to any position (that is how work moves between units); staff too
  IF v_me IS NULL OR NOT (
       EXISTS (SELECT 1 FROM public.org_position_terms WHERE profile_id = v_me AND ended_at IS NULL)
       OR public.org_can_work_position(p_position_key, v_me)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_kind NOT IN ('decision', 'task', 'review') THEN
    RAISE EXCEPTION 'unknown_kind' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.org_position_items (position_key, kind, title, body, recommendation, priority, due_at, source_type, source_ref, created_by)
  VALUES (p_position_key, p_kind, btrim(p_title), coalesce(p_body, ''), nullif(btrim(p_recommendation), ''), coalesce(p_priority, 'normal'),
          p_due_at, p_source_type, p_source_ref, v_me)
  RETURNING id INTO v_id;
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  VALUES (p_position_key, v_id, 'item_opened', v_me, btrim(p_title));
  PERFORM public.org_notify_position(p_position_key, v_id, btrim(p_title));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.org_open_position_item(text, text, text, text, text, text, timestamptz, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_open_position_item(text, text, text, text, text, text, timestamptz, text, text) TO authenticated;

-- Claim, release, wait, or resolve an item. Resolving needs a written resolution (the decision taken, or what was done).
CREATE OR REPLACE FUNCTION public.org_update_position_item(p_item_id uuid, p_action text, p_text text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_item public.org_position_items%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM public.org_position_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT public.org_can_work_position(v_item.position_key, v_me) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF v_item.status IN ('done', 'declined') THEN
    RAISE EXCEPTION 'item_closed' USING ERRCODE = '22023';
  END IF;
  CASE p_action
    WHEN 'claim' THEN
      UPDATE public.org_position_items SET claimed_by = v_me, status = 'in_progress', updated_at = now() WHERE id = p_item_id;
      INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
      VALUES (v_item.position_key, p_item_id, 'item_claimed', v_me, coalesce(nullif(btrim(p_text), ''), 'Taken on'));
    WHEN 'release' THEN
      UPDATE public.org_position_items SET claimed_by = NULL, status = 'open', updated_at = now() WHERE id = p_item_id;
      INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
      VALUES (v_item.position_key, p_item_id, 'item_released', v_me, coalesce(nullif(btrim(p_text), ''), 'Released'));
    WHEN 'wait' THEN
      IF nullif(btrim(p_text), '') IS NULL THEN
        RAISE EXCEPTION 'text_required' USING ERRCODE = '22023';
      END IF;
      UPDATE public.org_position_items SET status = 'waiting', updated_at = now() WHERE id = p_item_id;
      INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
      VALUES (v_item.position_key, p_item_id, 'item_status', v_me, 'Waiting: ' || btrim(p_text));
    WHEN 'note' THEN
      IF nullif(btrim(p_text), '') IS NULL THEN
        RAISE EXCEPTION 'text_required' USING ERRCODE = '22023';
      END IF;
      UPDATE public.org_position_items SET updated_at = now() WHERE id = p_item_id;
      INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
      VALUES (v_item.position_key, p_item_id, 'note', v_me, btrim(p_text));
    WHEN 'done', 'declined' THEN
      IF nullif(btrim(p_text), '') IS NULL THEN
        RAISE EXCEPTION 'resolution_required' USING ERRCODE = '22023';
      END IF;
      UPDATE public.org_position_items
         SET status = p_action, resolution = btrim(p_text), resolved_by = v_me, resolved_at = now(), updated_at = now()
       WHERE id = p_item_id;
      INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
      VALUES (v_item.position_key, p_item_id, 'item_resolved', v_me, initcap(p_action) || ': ' || btrim(p_text));
    ELSE
      RAISE EXCEPTION 'unknown_action' USING ERRCODE = '22023';
  END CASE;
END;
$$;
REVOKE ALL ON FUNCTION public.org_update_position_item(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_update_position_item(uuid, text, text) TO authenticated;

-- A note in the position's journal (not tied to an item): context the next holder should know.
CREATE OR REPLACE FUNCTION public.org_add_position_note(p_position_key text, p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.org_can_work_position(p_position_key, public.current_profile_id()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(p_text), '') IS NULL THEN
    RAISE EXCEPTION 'text_required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.org_position_log (position_key, event, actor_profile_id, body)
  VALUES (p_position_key, 'note', public.current_profile_id(), btrim(p_text));
END;
$$;
REVOKE ALL ON FUNCTION public.org_add_position_note(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_add_position_note(text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Reading
-- ---------------------------------------------------------------------------------------------
-- The organisation chart, public: units, their positions, current holders (or vacancy and who answers instead), and
-- how many items are open in each position.
CREATE OR REPLACE FUNCTION public.org_chart()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(unit ORDER BY unit ->> 'name'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'unit_key', u.unit_key, 'name', u.name, 'description', u.description, 'domain_key', u.domain_key,
      'positions', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'position_key', p.position_key, 'title', p.title, 'mandate', p.mandate, 'parent_position_key', p.parent_position_key,
          'seats', p.seats, 'contact_topic', p.contact_topic,
          'holders', coalesce((
            SELECT jsonb_agg(jsonb_build_object('profile_id', pr.id, 'username', pr.username, 'full_name', pr.full_name,
                                                'kind', t.kind, 'since', t.started_at) ORDER BY t.started_at)
              FROM public.org_position_terms t JOIN public.profiles pr ON pr.id = t.profile_id
             WHERE t.position_key = p.position_key AND t.ended_at IS NULL), '[]'::jsonb),
          'open_items', (SELECT count(*) FROM public.org_position_items i
                          WHERE i.position_key = p.position_key AND i.status IN ('open', 'in_progress', 'waiting'))
        ) ORDER BY p.sort_order, p.title)
          FROM public.org_positions p WHERE p.unit_id = u.id AND p.is_active), '[]'::jsonb)
    ) AS unit
    FROM public.governance_execution_units u
    WHERE u.is_active AND EXISTS (SELECT 1 FROM public.org_positions p WHERE p.unit_id = u.id AND p.is_active)
  ) units;
$$;
REVOKE ALL ON FUNCTION public.org_chart() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_chart() TO anon, authenticated;

-- One position: mandate, duties, holders past and present with their handover notes (public); and, for those who
-- may work it, the queue and the journal.
CREATE OR REPLACE FUNCTION public.org_position_detail(p_position_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_pos public.org_positions%ROWTYPE;
  v_can_work boolean;
  v_result jsonb;
BEGIN
  SELECT * INTO v_pos FROM public.org_positions WHERE position_key = p_position_key;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_can_work := public.org_can_work_position(p_position_key, v_me);
  v_result := jsonb_build_object(
    'position_key', v_pos.position_key, 'title', v_pos.title, 'mandate', v_pos.mandate, 'duties', to_jsonb(v_pos.duties),
    'seats', v_pos.seats, 'contact_topic', v_pos.contact_topic, 'parent_position_key', v_pos.parent_position_key,
    'parent_title', (SELECT title FROM public.org_positions WHERE position_key = v_pos.parent_position_key),
    'unit', (SELECT jsonb_build_object('unit_key', u.unit_key, 'name', u.name, 'domain_key', u.domain_key)
               FROM public.governance_execution_units u WHERE u.id = v_pos.unit_id),
    'terms', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'profile_id', pr.id, 'username', pr.username, 'full_name', pr.full_name,
                                          'kind', t.kind, 'started_at', t.started_at, 'ended_at', t.ended_at,
                                          'end_reason', t.end_reason, 'handover_note', CASE WHEN v_can_work THEN t.handover_note END)
                       ORDER BY t.ended_at IS NULL DESC, t.started_at DESC)
        FROM public.org_position_terms t JOIN public.profiles pr ON pr.id = t.profile_id
       WHERE t.position_key = p_position_key), '[]'::jsonb),
    'vacant', NOT EXISTS (SELECT 1 FROM public.org_position_terms WHERE position_key = p_position_key AND ended_at IS NULL),
    'answered_by', coalesce((
      SELECT jsonb_agg(jsonb_build_object('profile_id', pr.id, 'username', pr.username, 'full_name', pr.full_name))
        FROM public.org_position_answerers(p_position_key) a JOIN public.profiles pr ON pr.id = a), '[]'::jsonb),
    'open_items', (SELECT count(*) FROM public.org_position_items
                    WHERE position_key = p_position_key AND status IN ('open', 'in_progress', 'waiting')),
    'can_work', v_can_work,
    'can_appoint', public.org_can_appoint_position(p_position_key),
    'is_holder', EXISTS (SELECT 1 FROM public.org_position_terms WHERE position_key = p_position_key AND profile_id = v_me AND ended_at IS NULL)
  );
  IF v_can_work THEN
    v_result := v_result || jsonb_build_object(
      'items', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', i.id, 'kind', i.kind, 'title', i.title, 'body', i.body, 'recommendation', i.recommendation,
                 'status', i.status, 'priority', i.priority, 'due_at', i.due_at, 'resolution', i.resolution,
                 'resolved_at', i.resolved_at, 'created_at', i.created_at, 'metadata', i.metadata,
                 'claimed_by', (SELECT jsonb_build_object('profile_id', pr.id, 'username', pr.username) FROM public.profiles pr WHERE pr.id = i.claimed_by))
               ORDER BY (i.status IN ('done', 'declined')), CASE i.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                        i.due_at NULLS LAST, i.created_at)
          FROM public.org_position_items i WHERE i.position_key = p_position_key), '[]'::jsonb),
      'log', coalesce((
        SELECT jsonb_agg(entry ORDER BY (entry ->> 'created_at') DESC)
          FROM (SELECT jsonb_build_object('id', l.id, 'event', l.event, 'item_id', l.item_id, 'body', l.body, 'created_at', l.created_at,
                                          'actor', (SELECT pr.username FROM public.profiles pr WHERE pr.id = l.actor_profile_id)) AS entry
                  FROM public.org_position_log l WHERE l.position_key = p_position_key
                 ORDER BY l.created_at DESC LIMIT 200) recent), '[]'::jsonb));
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.org_position_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_position_detail(text) TO anon, authenticated;

-- The positions the signed-in member answers for (as holder, acting holder, or because a position below theirs is
-- vacant), with open item counts.
CREATE OR REPLACE FUNCTION public.org_my_positions()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'position_key', p.position_key, 'title', p.title,
           'held', EXISTS (SELECT 1 FROM public.org_position_terms t WHERE t.position_key = p.position_key
                            AND t.profile_id = public.current_profile_id() AND t.ended_at IS NULL),
           'open_items', (SELECT count(*) FROM public.org_position_items i
                           WHERE i.position_key = p.position_key AND i.status IN ('open', 'in_progress', 'waiting')))
         ORDER BY p.sort_order, p.title), '[]'::jsonb)
    FROM public.org_positions p
   WHERE p.is_active AND public.current_profile_id() IN (SELECT public.org_position_answerers(p.position_key));
$$;
REVOKE ALL ON FUNCTION public.org_my_positions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_my_positions() TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 7. Contact: messages go to the position that answers the topic, not to a personal address
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_contact_message(p_topic text, p_name text, p_email text, p_message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
  v_me uuid := public.current_profile_id();
BEGIN
  SELECT position_key INTO v_position FROM public.org_positions WHERE contact_topic = p_topic AND is_active;
  IF v_position IS NULL THEN
    RAISE EXCEPTION 'unknown_topic' USING ERRCODE = '22023';
  END IF;
  IF v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'email_invalid' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(coalesce(p_message, ''))) < 10 OR length(p_message) > 4000 THEN
    RAISE EXCEPTION 'message_length' USING ERRCODE = '22023';
  END IF;
  -- at most 3 messages an hour from one address, and 100 an hour in all
  IF (SELECT count(*) FROM public.org_position_items WHERE kind = 'inquiry' AND metadata ->> 'email' = v_email
        AND created_at > now() - interval '1 hour') >= 3
     OR (SELECT count(*) FROM public.org_position_items WHERE kind = 'inquiry' AND created_at > now() - interval '1 hour') >= 100 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'PT429', DETAIL = 'contact', HINT = (now() + interval '1 hour')::text;
  END IF;
  INSERT INTO public.org_position_items (position_key, kind, title, body, source_type, metadata, created_by)
  VALUES (v_position, 'inquiry', 'Contact: ' || left(regexp_replace(btrim(p_message), '\s+', ' ', 'g'), 80), btrim(p_message), 'contact_form',
          jsonb_build_object('topic', p_topic, 'name', left(btrim(coalesce(p_name, '')), 120), 'email', v_email,
                             'signed_in_profile_id', v_me),
          v_me)
  RETURNING id INTO v_id;
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  VALUES (v_position, v_id, 'item_opened', v_me, 'Contact message received (' || p_topic || ')');
  PERFORM public.org_notify_position(v_position, v_id, 'A contact message arrived (' || p_topic || ')');
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_contact_message(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(text, text, text, text) TO anon, authenticated;

-- The Contribute hub's "Waiting for you" also counts open items in the positions the member answers for.
CREATE OR REPLACE FUNCTION public.contribute_waiting_for_me()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'actions_due', (
      SELECT count(*) FROM public.matter_action_requirements a
        JOIN public.matters m ON m.id = a.matter_id
       WHERE a.status IN ('pending', 'overdue')
         AND m.lifecycle_status IN ('submitted', 'active')
         AND a.assigned_kind <> 'ai_agent'
         AND public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)),
    'proposals_to_support', (
      SELECT count(*) FROM public.civic_voting_proposals p
       WHERE p.status = 'draft'
         AND coalesce((p.metadata ->> 'open_for_support')::boolean, false)
         AND p.created_by_profile_id IS DISTINCT FROM v_me
         AND NOT EXISTS (SELECT 1 FROM public.civic_voting_proposal_support s
                          WHERE s.proposal_id = p.id AND s.profile_id = v_me)),
    'ballots_open', (
      SELECT count(*) FROM public.civic_elections e
       WHERE e.status = 'open'
         AND now() BETWEEN e.voting_opens_at AND e.voting_closes_at
         AND e.metadata ->> 'sample_batch' IS NULL
         AND coalesce(e.metadata ->> 'catalog', '') <> 'demo'
         AND NOT EXISTS (SELECT 1 FROM public.civic_ballots b
                          WHERE b.election_id = e.id AND b.profile_id = v_me
                            AND NOT coalesce((b.metadata ->> 'withdrawn')::boolean, false))
         AND public.consultation_eligibility_reason(e.id, v_me) IS NULL),
    'challenges', (
      SELECT count(*) FROM public.community_challenges c
       WHERE c.status = 'active' AND NOT c.is_demo),
    'knowledge', (
      SELECT count(*) FROM public.knowledge_spaces k
       WHERE k.status = 'shared' AND NOT k.is_demo),
    'position_items', (
      SELECT count(*) FROM public.org_position_items i
       WHERE i.status IN ('open', 'in_progress', 'waiting')
         AND v_me IN (SELECT public.org_position_answerers(i.position_key)))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.contribute_waiting_for_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contribute_waiting_for_me() TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 8. Positions
-- ---------------------------------------------------------------------------------------------
WITH seed (position_key, unit_key, title, domain_role_key, parent, contact_topic, sort_order, mandate, duties) AS (VALUES
  ('civic_operations_lead', 'civic_operations', 'Civic Operations Lead', 'domain_lead', NULL, NULL, 10,
   'Keeps Civizen running day to day and makes sure every member question and every cross-unit task has an owner.',
   ARRAY['Assign incoming work that fits no other position', 'Fill vacant positions in the unit or answer for them',
         'Review the unit''s open items every week', 'Administer elections and consultations']),
  ('member_support', 'civic_operations', 'Member Support Coordinator', 'steward', 'civic_operations_lead', 'general', 20,
   'Answers members and visitors who write in, and routes what is not theirs to the right position.',
   ARRAY['Answer contact messages on the "general" topic within 5 working days', 'Pass privacy, safety, security and press messages to their positions',
         'Keep the public contact page accurate']),
  ('communications', 'civic_operations', 'Communications Officer', 'steward', 'civic_operations_lead', 'press', 30,
   'Speaks for Civizen in public: press, partners and announcements.',
   ARRAY['Answer press and partner messages', 'Publish release notes and announcements', 'Keep public pages consistent with decisions']),
  ('policy_legal_lead', 'policy_legal', 'Policy and Legal Lead', 'domain_lead', NULL, NULL, 10,
   'Owns Civizen''s policies and their legal footing, and decides the questions that need a policy answer.',
   ARRAY['Decide or route every policy question', 'Keep the Terms, Privacy Notice and Guidelines current and versioned',
         'Name the law each policy relies on']),
  ('data_protection_officer', 'policy_legal', 'Data Protection Officer', 'steward', 'policy_legal_lead', 'privacy', 20,
   'Answers for personal data: requests from members, the Privacy Notice, and how long data is kept.',
   ARRAY['Answer access, correction and deletion requests within 30 days', 'Keep the Privacy Notice and retention periods accurate',
         'Review new features that collect personal data', 'Record data incidents and notify when required']),
  ('policy_counsel', 'policy_legal', 'Policy Counsel', 'steward', 'policy_legal_lead', NULL, 30,
   'Prepares policy decisions with the options, the recommended one and why, and the legal basis.',
   ARRAY['Draft policy decisions with options and a recommendation', 'Check new rules against applicable law', 'Record each decision and where it is applied']),
  ('technical_lead', 'technical_stewardship', 'Technical Steward', 'domain_lead', NULL, NULL, 10,
   'Owns the platform''s technical health: code quality, releases, infrastructure and their risks.',
   ARRAY['Approve releases and migrations', 'Keep the engineering standards and CI healthy', 'Fill the release and operations positions']),
  ('release_manager', 'technical_stewardship', 'Release Manager', 'steward', 'technical_lead', NULL, 20,
   'Merges reviewed changes and releases them, Test channel first, then Live.',
   ARRAY['Merge reviewed pull requests in order', 'Back up, apply migrations, deploy edge functions and the web app',
         'Promote Test to Live after checks', 'Report each release in its tracker']),
  ('platform_operations', 'technical_stewardship', 'Platform Operations', 'steward', 'technical_lead', NULL, 30,
   'Keeps the servers, database and backups running and recoverable.',
   ARRAY['Run scheduled, off-site, tested backups', 'Watch uptime, errors and capacity', 'Keep a recovery plan and test it']),
  ('moderation_lead', 'moderation_conduct', 'Moderation Lead', 'domain_lead', NULL, 'safety', 10,
   'Leads moderation: the report queue, decisions about members, appeals, and the moderators themselves.',
   ARRAY['Keep the report queue moving and fair', 'Recruit and support moderators so appeals have a second moderator',
         'Answer safety messages from the contact page', 'Propose changes to the Community Guidelines']),
  ('languages_lead', 'languages', 'Languages Lead', 'domain_lead', NULL, NULL, 10,
   'Owns the hand-written languages: who reviews what, terminology, and when a language is ready.',
   ARRAY['Keep a review queue per language', 'Recruit native-speaker reviewers', 'Keep a shared glossary of civic terms']),
  ('language_reviewer_hy', 'languages', 'Armenian Language Reviewer', 'reviewer', 'languages_lead', NULL, 20,
   'Reviews Armenian texts written or translated for Civizen as a native speaker.',
   ARRAY['Review new and changed Armenian texts before Live', 'Correct terminology against the glossary', 'Flag texts that need a rewrite, not a translation']),
  ('language_reviewer_ru', 'languages', 'Russian Language Reviewer', 'reviewer', 'languages_lead', NULL, 30,
   'Reviews Russian texts written or translated for Civizen as a native speaker.',
   ARRAY['Review new and changed Russian texts before Live', 'Correct terminology against the glossary', 'Flag texts that need a rewrite, not a translation']),
  ('security_officer', 'security_response', 'Security Officer', 'domain_lead', NULL, 'security', 10,
   'Answers for security: vulnerability reports, incidents and emergency access.',
   ARRAY['Answer security reports from the contact page', 'Lead incident response and write the review', 'Approve emergency access']),
  ('verification_lead', 'identity_verification', 'Identity Verification Lead', 'domain_lead', NULL, NULL, 10,
   'Leads identity verification: reviewers, the case queue, and the verification rules.',
   ARRAY['Keep the verification queue moving', 'Recruit and train reviewers', 'Keep the verification manual current']),
  ('treasurer', 'treasury_finance', 'Treasurer', 'domain_lead', NULL, NULL, 10,
   'Answers for Civizen''s money: funds received, spending, and public financial reports.',
   ARRAY['Record funds and spending', 'Publish financial transparency reports', 'Approve payments within the budget']),
  ('disputes_lead', 'dispute_resolution', 'Dispute Resolution Lead', 'domain_lead', NULL, NULL, 10,
   'Leads the resolution of disputes between members, organisations and agreement parties.',
   ARRAY['Design and run the dispute process', 'Assign neutral reviewers', 'Report outcomes without personal details']),
  ('constitutional_council_chair', 'constitutional_council', 'Constitutional Council Chair', 'domain_lead', NULL, NULL, 10,
   'Chairs the review of Civizen''s founding documents and their interpretation.',
   ARRAY['Convene reviews of charter and governance changes', 'Record interpretations', 'Oversee role and office assignments']),
  ('civic_education_lead', 'civic_education', 'Civic Education Lead', 'domain_lead', NULL, NULL, 10,
   'Owns learning paths and the quality of civic education on Civizen.',
   ARRAY['Keep learning paths accurate', 'Review certification quality', 'Plan new lessons with the areas of life']),
  ('market_oversight_lead', 'market_oversight', 'Market Oversight Lead', 'domain_lead', NULL, NULL, 10,
   'Keeps jobs and opportunities honest: postings, compensation claims and misuse.',
   ARRAY['Review job and opportunity postings', 'Act on marketplace reports', 'Keep honest labels on compensation']),
  ('activation_review_lead', 'activation_review', 'Activation Review Lead', 'domain_lead', NULL, NULL, 10,
   'Reviews country and world activation declarations.',
   ARRAY['Review activation requests', 'Keep activation criteria public'])
)
INSERT INTO public.org_positions (position_key, unit_id, title, domain_role_key, parent_position_key, contact_topic, sort_order, mandate, duties)
SELECT s.position_key, u.id, s.title, s.domain_role_key, s.parent, s.contact_topic, s.sort_order, s.mandate, s.duties
  FROM seed s JOIN public.governance_execution_units u ON u.unit_key = s.unit_key
ON CONFLICT (position_key) DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- 9. The work that is pending today, placed with the positions that own it
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.org_position_items (position_key, kind, title, body, recommendation, priority, source_type, source_ref)
SELECT v.position_key, v.kind, v.title, v.body, v.recommendation, v.priority, 'readiness_review', 'jafe649b7'
  FROM (VALUES
  ('data_protection_officer', 'decision', 'Choose the address for privacy requests',
   'The Privacy Notice names the Contact page. The /contact form already delivers privacy messages to this position''s queue, so no personal address is needed for members to reach Civizen. An e-mail address is still expected for people who cannot use the form.',
   'A role mailbox on the project''s own domain (for example privacy@), read by whoever holds this position, set as VITE_CONTACT_EMAIL at the web build. Why: it survives a change of holder, keeps personal addresses private, and requests never wait on one person.',
   'high'),
  ('member_support', 'decision', 'Choose the general contact address',
   'The /contact page shows one e-mail address next to the form, from VITE_CONTACT_EMAIL. Until it is set, the page says the address is being set up.',
   'A role mailbox (for example contact@) on the project''s own domain, read by whoever holds this position. Why: same as for privacy: the address belongs to the position, not to a person.',
   'normal'),
  ('policy_counsel', 'decision', 'Set the minimum age to create an account',
   'Full sign-up asks for a date of birth but enforces no minimum and asks no parental consent; quick sign-up from a ballot asks no date. Ballots keep their own minimum age.',
   'Recommended: 16. Why: 16 is the default age of digital consent under the EU GDPR (Art. 8) and works without a parental-consent flow, which Civizen does not have. A lower age would need verified parental consent first. Confirm against the law of each country Civizen serves (Armenia first) before enforcing; then apply it to both sign-up paths.',
   'high'),
  ('language_reviewer_hy', 'review', 'Review the Armenian moderation and enforcement texts',
   'Written in a cloud session, not by a native speaker: memberEnforcement.* and moderation.* in src/lib/i18n/curated/moderation.hy.ts, the Community Guidelines 0.2 (docs/02-policies/institutional/community-guidelines.hy.md), the contact page (contact.hy.ts), the Organisation pages (organisation.hy.ts) and the Reading settings texts.',
   'Review before the next Live release; record corrections as a change to the same files.', 'high'),
  ('language_reviewer_ru', 'review', 'Review the Russian moderation and enforcement texts',
   'Written in a cloud session, not by a native speaker: memberEnforcement.* and moderation.* in src/lib/i18n/curated/moderation.ru.ts, the Community Guidelines 0.2 (docs/02-policies/institutional/community-guidelines.ru.md), the contact page (contact.ru.ts), the Organisation pages (organisation.ru.ts) and the Reading settings texts.',
   'Review before the next Live release; record corrections as a change to the same files.', 'high'),
  ('release_manager', 'task', 'Release the reviewed changes',
   'Pull requests on maturehumanity/civizen, merge in order: #1, #2, #4, #5, #6, #7, #8, #9, then the organisation-positions pull request; #3 independently. Each pull request''s Handoff section lists migrations, edge functions and checks.',
   'Back up first, apply each migration in its own transaction, deploy the changed edge functions, release a patch to Test, then Live after checks.', 'high'),
  ('platform_operations', 'task', 'Schedule off-site, tested backups',
   'Database dumps are taken by hand before migrations and kept on the same host. scripts/db/backup-restore-drill.sh (pull request #4) proves a dump restores.',
   'Daily dump with 30 days kept, copied to a second provider, and a monthly restore drill recorded here.', 'high'),
  ('platform_operations', 'decision', 'Separate staging and a second host',
   'The web app, database and functions run on one server and one Supabase project; there is no failover and no staging.',
   'First a staging project for the Test channel, then a standby for the database. Why: staging removes the riskiest step (testing on Live data) at low cost; failover can follow usage.', 'normal'),
  ('moderation_lead', 'task', 'Have at least two moderators',
   'Appeals and removals need a moderator other than the one who decided; with fewer than two, the founder confirms alone (TD1 fallback).',
   'Recruit a second and third moderator from active, verified members and record them here.', 'normal'),
  ('civic_operations_lead', 'task', 'Fill the vacant positions',
   'Every position starts vacant; its work goes to the position above it and, at the top, to the founder office.',
   'Appoint holders for Member Support, Data Protection, Release Manager, Moderation Lead and the two language reviewers first: they have open items.', 'high'),
  ('civic_operations_lead', 'task', 'Launch gap 1: route Matters for "the Civizen community" to positions',
   'Every Matter addressed to the Civizen community goes to one business account owned by the founder; no unit or position receives or triages it.',
   'Send them to Member Support for triage, which forwards each to the responsible position; show the position (not a person) as the addressee. Effort: about a week.', 'urgent'),
  ('civic_operations_lead', 'task', 'Launch gap 2: escalation must leave an unresponsive addressee',
   'When the addressee does not answer, the timeout job escalates back to the same addressee (responsible_lead and manual_queue both resolve to the responsible profile); the initiator cannot redirect; there is no staff queue and no test of the timeout job.',
   'Escalate stalled Matters to the Civic Operations queue after the last step, let the initiator redirect after a timeout, and add SQL tests for the timeout job. Effort: about a week.', 'urgent'),
  ('civic_operations_lead', 'decision', 'Launch gap 3: Matters for people and bodies not on Civizen',
   'A Matter can only be addressed to an existing Civizen profile. Public bodies, companies and officials who are not members cannot be addressed, so most real-world issues have nowhere to go.',
   'Allow an external addressee (name, public contact), deliver the Matter to them by e-mail with a link to answer, and have Member Support follow up when they do not. Why: without it the flow only works between members. Effort: two to three weeks.', 'high'),
  ('policy_legal_lead', 'decision', 'Launch gap 4: Matters for the community are hidden by default',
   'The Matter form defaults to participants-only, so a Matter for the community cannot be found or discussed by the community unless the author chooses Public; guests do not see the solution chain (matter_links is not readable by guests).',
   'Default to Public when the addressee is the community or a public body, say plainly who will see it, and show the proposal, vote and challenge links on public Matter pages. Effort: a few days.', 'high'),
  ('civic_operations_lead', 'task', 'Launch gap 5: "affects me too", follow and duplicate check (plan D2)',
   'Members cannot show that an issue affects them, follow it, or find an existing Matter before raising a duplicate; lists cannot be sorted by support.',
   'Build D2 (support count and follow with notifications) plus a similar-Matter check on the form. Effort: one to two weeks.', 'high'),
  ('civic_operations_lead', 'decision', 'Launch gap 6: one path from a Matter to an implemented solution',
   'Solutions "solve" mode is a dead end (no notification to the professional, no in-progress or resolved step); endorsed Solutions proposals lead nowhere; challenges do not link back to or update their Matter; only the initiator or responsible party can start a proposal or challenge; the coordinator alone picks the winning proposal (plan D3).',
   'Define one path: Matter, then proposal, then vote or challenge, then implementation, with the outcome written back to the Matter at each step; open "start a proposal" to any participant with support thresholds; build D3. Effort: three to four weeks.', 'high'),
  ('moderation_lead', 'task', 'Launch gap 7: abuse controls on raising and solving',
   'No rate limits on creating Matters, challenges, Solutions problems or proposals; attachments, challenges, challenge proposals, Solutions problems and voting proposals cannot be reported; Matter attachments have no size or type limit; Matters and comments cannot be edited or withdrawn.',
   'Add rate limits and Report on those items, limit attachment size and type, and allow edit within a short window and withdraw. Effort: about a week.', 'high'),
  ('policy_counsel', 'decision', 'Launch gap 8: consent records and image deletion before public launch',
   'Besides the minimum age (separate item), consent records (L4) and 30-day deletion of identity images (L6/TD5) are adopted but not built.',
   'Build consent records and the deletion job before public launch. Why: they are legal commitments already made in the Privacy Notice and decisions. Effort: about a week after the age decision.', 'high'),
  ('languages_lead', 'task', 'Launch gap 9: notifications and languages along the flow',
   'E-mail is only an opt-in daily digest, so an addressee is not told promptly; Matter action notifications have no translation keys (HY/RU readers get English); Solutions, Challenges and the Contribute hub have no hand-written HY/RU (plan E-1); comment notifications may not reach an organisations owners.',
   'Immediate e-mail for being addressed and for escalations, translation keys for every Matter notification, E-1 for the flows pages first, and fan-out of comment notifications to organisation owners. Effort: two weeks plus translation review.', 'normal'),
  ('technical_lead', 'task', 'Launch gap 10: test coverage and AI providers along the flow',
   'End-to-end tests cover only one path (proposal to vote to outcome). Commenting, responding, timeouts and escalation, resolution and auto-close, Solutions and Challenges are untested. Matter agents return a fixed fallback text without a GEMINI_API_KEY, and the Solutions council needs provider keys.',
   'Add e2e specs for each step of the flow, and decide which AI provider keys production holds, with budgets and stop rules per agent. Effort: about a week.', 'normal')
  ) AS v(position_key, kind, title, body, recommendation, priority)
 WHERE NOT EXISTS (SELECT 1 FROM public.org_position_items i WHERE i.position_key = v.position_key AND i.title = v.title);

INSERT INTO public.org_position_log (position_key, item_id, event, body)
SELECT i.position_key, i.id, 'item_opened', i.title FROM public.org_position_items i
 WHERE i.source_type = 'readiness_review'
   AND NOT EXISTS (SELECT 1 FROM public.org_position_log l WHERE l.item_id = i.id);

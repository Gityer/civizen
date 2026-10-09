-- Phase 10 step 10.4: founder powers reduced by domain maturity; emergency approvals threshold-gated; founder role
-- assignment guarded.
--
-- Principle (docs/01-governance/roles-and-permissions/role-domains-and-maturity-thresholds-v0.1.md): founder
-- stewardship ends by domain, not all at once. Nothing changes while a domain is immature (bootstrap access stays,
-- per the 2026-05-01 bootstrap rule); once a domain's maturity snapshot says mature, the founder's operational
-- permissions in that domain are withdrawn unless the founder holds an ordinary active assignment there.

-- 1. Which operational permissions belong to which governance domain.
CREATE TABLE IF NOT EXISTS public.governance_domain_permission_scopes (
  domain_key text NOT NULL REFERENCES public.governance_domains(domain_key) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (domain_key, permission)
);

ALTER TABLE public.governance_domain_permission_scopes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Domain permission scopes are readable by authenticated users" ON public.governance_domain_permission_scopes;
CREATE POLICY "Domain permission scopes are readable by authenticated users" ON public.governance_domain_permission_scopes
  FOR SELECT USING (auth.role() = 'authenticated');
GRANT SELECT ON public.governance_domain_permission_scopes TO authenticated;

INSERT INTO public.governance_domain_permission_scopes (domain_key, permission) VALUES
  ('identity_verification', 'profession.verify'),
  ('identity_verification', 'profile.update_any'),
  ('moderation_conduct', 'post.moderate'),
  ('moderation_conduct', 'comment.moderate'),
  ('moderation_conduct', 'message.moderate'),
  ('moderation_conduct', 'endorsement.moderate'),
  ('moderation_conduct', 'endorsement.review'),
  ('moderation_conduct', 'report.review'),
  ('moderation_conduct', 'content.moderate'),
  ('moderation_conduct', 'content.review'),
  ('constitutional_review', 'role.assign'),
  ('technical_stewardship', 'build.use'),
  ('technical_stewardship', 'updates.test'),
  ('technical_stewardship', 'settings.manage'),
  ('civic_education', 'law.review'),
  ('treasury_finance', 'finance.admin'),
  ('treasury_finance', 'finance.approve'),
  ('treasury_finance', 'finance.publish'),
  ('treasury_finance', 'finance.edit'),
  ('market_oversight', 'market.manage')
ON CONFLICT DO NOTHING;

-- 2. The permissions a founder has lost to mature domains (none while every domain is immature).
CREATE OR REPLACE FUNCTION public.founder_withdrawn_permissions(target_profile_id uuid)
RETURNS public.app_permission[] AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(DISTINCT scope.permission)
      FROM public.governance_domain_permission_scopes AS scope
      WHERE public.governance_domain_is_mature(scope.domain_key)
        AND NOT EXISTS (
          SELECT 1
          FROM public.profile_governance_roles AS assignment
          WHERE assignment.profile_id = target_profile_id
            AND assignment.domain_key = scope.domain_key
            AND assignment.is_active = true
            AND (assignment.ended_at IS NULL OR assignment.ended_at > now())
        )
    ),
    '{}'::public.app_permission[]
  )
  FROM public.profiles AS founder
  WHERE founder.id = target_profile_id
    AND founder.role = 'founder'::public.app_role;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.founder_withdrawn_permissions(uuid) TO authenticated;

-- 3. The permission resolver subtracts them for founders; everyone else is unchanged.
CREATE OR REPLACE FUNCTION public.current_app_permissions()
RETURNS public.app_permission[] AS $$
  SELECT COALESCE(
    (
      SELECT ARRAY(
        SELECT DISTINCT permission
        FROM unnest(
          public.app_role_permissions(profile.role)
          || COALESCE(profile.granted_permissions, '{}'::public.app_permission[])
          || COALESCE(profile.custom_permissions, '{}'::public.app_permission[])
        ) AS permission
        WHERE permission <> ALL(COALESCE(profile.denied_permissions, '{}'::public.app_permission[]))
          AND (
            profile.role <> 'founder'::public.app_role
            OR permission <> ALL(COALESCE(public.founder_withdrawn_permissions(profile.id), '{}'::public.app_permission[]))
          )
      )
      FROM public.profiles AS profile
      WHERE profile.user_id = auth.uid()
      LIMIT 1
    ),
    public.app_role_permissions('guest'::public.app_role)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- 4. A per-domain summary for the steward console: maturity and whether founder operational access is still active.
CREATE OR REPLACE FUNCTION public.founder_domain_access_summary()
RETURNS jsonb AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'domain_key', domain.domain_key,
    'name', domain.name,
    'is_mature', public.governance_domain_is_mature(domain.domain_key),
    'founder_access', CASE WHEN public.governance_domain_is_mature(domain.domain_key) THEN 'withdrawn' ELSE 'active' END,
    'permissions', COALESCE((
      SELECT jsonb_agg(scope.permission::text ORDER BY scope.permission::text)
      FROM public.governance_domain_permission_scopes AS scope
      WHERE scope.domain_key = domain.domain_key
    ), '[]'::jsonb)
  ) ORDER BY domain.domain_key), '[]'::jsonb)
  FROM public.governance_domains AS domain
  WHERE domain.is_active = true;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.founder_domain_access_summary() TO authenticated;

-- 5. Only a founder (constitutional office holder or founder role) may give or take the founder role; the service role is exempt.
CREATE OR REPLACE FUNCTION public.guard_founder_role_assignment()
RETURNS trigger AS $$
DECLARE
  actor_id uuid := public.current_profile_id();
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;
  IF NEW.role <> 'founder'::public.app_role AND OLD.role <> 'founder'::public.app_role THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- migrations and service-role operations
  END IF;
  IF actor_id IS NULL OR NOT (
    public.profile_has_constitutional_office(actor_id, 'founder'::public.constitutional_office_key)
    OR EXISTS (SELECT 1 FROM public.profiles AS actor WHERE actor.id = actor_id AND actor.role = 'founder'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Only a founder may assign or remove the founder role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_founder_role_assignment ON public.profiles;
CREATE TRIGGER guard_founder_role_assignment
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_founder_role_assignment();

-- 6. Emergency access approvals are threshold-gated: once Security and Incident Response is mature, two distinct
--    reviewers must approve; a single reviewer still suffices while the domain is immature. Nobody reviews their own request.
CREATE TABLE IF NOT EXISTS public.governance_emergency_access_request_approvals (
  request_id uuid NOT NULL REFERENCES public.governance_emergency_access_requests(id) ON DELETE CASCADE,
  reviewer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, reviewer_profile_id)
);

ALTER TABLE public.governance_emergency_access_request_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Emergency approvals are readable by settings managers" ON public.governance_emergency_access_request_approvals;
CREATE POLICY "Emergency approvals are readable by settings managers" ON public.governance_emergency_access_request_approvals
  FOR SELECT USING (public.has_permission('settings.manage'::public.app_permission));
GRANT SELECT ON public.governance_emergency_access_request_approvals TO authenticated;

CREATE OR REPLACE FUNCTION public.emergency_access_approvals_required()
RETURNS integer AS $$
  SELECT CASE WHEN public.governance_domain_is_mature('security_incident_response') THEN 2 ELSE 1 END;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.emergency_access_approvals_required() TO authenticated;

CREATE OR REPLACE FUNCTION public.review_governance_emergency_access_request(
  target_request_id uuid,
  next_status text,
  review_notes text DEFAULT NULL,
  approved_ttl_minutes integer DEFAULT 30
)
RETURNS uuid AS $$
DECLARE
  normalized_status text := lower(btrim(coalesce(next_status, '')));
  normalized_notes text := nullif(btrim(coalesce(review_notes, '')), '');
  request_record public.governance_emergency_access_requests%ROWTYPE;
  safe_ttl_minutes integer := greatest(1, coalesce(approved_ttl_minutes, 30));
  reviewer_id uuid := public.current_profile_id();
  approvals_so_far integer;
  approvals_needed integer := public.emergency_access_approvals_required();
BEGIN
  IF NOT public.has_permission('settings.manage'::public.app_permission) THEN
    RAISE EXCEPTION 'Current profile is not authorized to review emergency access requests';
  END IF;
  IF target_request_id IS NULL THEN
    RAISE EXCEPTION 'Target request id is required';
  END IF;
  IF normalized_status NOT IN ('approved', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Emergency access review status must be approved, rejected, or expired';
  END IF;
  IF normalized_status = 'rejected' AND normalized_notes IS NULL THEN
    RAISE EXCEPTION 'Review notes are required when rejecting emergency access requests';
  END IF;

  SELECT * INTO request_record
  FROM public.governance_emergency_access_requests AS request
  WHERE request.id = target_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency access request does not exist';
  END IF;
  IF request_record.request_status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending emergency access requests can be reviewed';
  END IF;
  IF request_record.requested_by = reviewer_id THEN
    RAISE EXCEPTION 'A reviewer cannot review their own emergency access request';
  END IF;

  IF normalized_status = 'approved' THEN
    INSERT INTO public.governance_emergency_access_request_approvals (request_id, reviewer_profile_id, review_notes)
    VALUES (request_record.id, reviewer_id, normalized_notes)
    ON CONFLICT (request_id, reviewer_profile_id) DO UPDATE SET review_notes = EXCLUDED.review_notes, created_at = now();
    SELECT count(DISTINCT approval.reviewer_profile_id) INTO approvals_so_far
    FROM public.governance_emergency_access_request_approvals AS approval
    WHERE approval.request_id = request_record.id;
    IF approvals_so_far < approvals_needed THEN
      -- threshold not reached: the request stays pending and records who has approved so far
      UPDATE public.governance_emergency_access_requests AS request
      SET updated_by = reviewer_id,
          review_notes = coalesce(normalized_notes, request.review_notes)
      WHERE request.id = request_record.id;
      RETURN request_record.id;
    END IF;
  END IF;

  UPDATE public.governance_emergency_access_requests AS request
  SET
    request_status = normalized_status,
    reviewed_by = reviewer_id,
    reviewed_at = now(),
    updated_by = reviewer_id,
    review_notes = coalesce(normalized_notes, request.review_notes),
    approved_expires_at = CASE WHEN normalized_status = 'approved' THEN now() + make_interval(mins => safe_ttl_minutes) ELSE NULL END,
    consumed_at = NULL,
    consumed_by = NULL
  WHERE request.id = request_record.id;

  RETURN request_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.review_governance_emergency_access_request(uuid, text, text, integer) TO authenticated;

/** How many distinct approvals a pending request has (for the review board). */
CREATE OR REPLACE FUNCTION public.emergency_access_request_approval_count(target_request_id uuid)
RETURNS integer AS $$
  SELECT count(DISTINCT approval.reviewer_profile_id)::integer
  FROM public.governance_emergency_access_request_approvals AS approval
  WHERE approval.request_id = target_request_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.emergency_access_request_approval_count(uuid) TO authenticated;

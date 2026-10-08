-- Linked (business) accounts: proof of control.
--
-- Before this migration any signed-in member could INSERT a linked_accounts row that named any
-- profile as their business account (the INSERT policy only checked owner_profile_id), and the
-- linked-account-switch function then minted a sign-in token for that profile: full takeover of
-- any member, admin or founder. The same row also granted publisher rights through
-- current_profile_manages_publisher.
--
-- After this migration rows exist only through two SECURITY DEFINER paths, and each row records
-- how it was established:
--   session_handshake  the owner session begins a link (short-lived token), the business session
--                      completes it, so both sides proved control;
--   owner_approval     an established owner of the business approved an access request;
--   legacy_backfill    rows that existed before the fix (audited 2026-10-07: two rows, both
--                      created by the founder through the original Register flow).
-- Switching, publisher rights, the Connect lookup and access-request review only honour
-- established rows.

-- ---------------------------------------------------------------------------
-- Columns, backfill, guard trigger
-- ---------------------------------------------------------------------------

ALTER TABLE public.linked_accounts
  ADD COLUMN IF NOT EXISTS established_at timestamptz,
  ADD COLUMN IF NOT EXISTS established_via text,
  ADD COLUMN IF NOT EXISTS established_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.linked_accounts DROP CONSTRAINT IF EXISTS linked_accounts_established_via_check;
ALTER TABLE public.linked_accounts ADD CONSTRAINT linked_accounts_established_via_check
  CHECK (established_via IS NULL OR established_via IN ('session_handshake', 'owner_approval', 'legacy_backfill'));

-- Rows created before the audit date are the audited legitimate links. Anything inserted after
-- that date through the old client path stays unestablished until the owner re-connects the
-- business account with its password (the handshake upgrades the row in place).
UPDATE public.linked_accounts
SET established_at = created_at,
    established_via = 'legacy_backfill'
WHERE established_at IS NULL
  AND created_at < timestamptz '2026-10-07 00:00:00+00';

-- One business name maps to one business profile, but a business profile may have several owners
-- (owner_approval). The old index on business_name_normalized alone forbade the second owner.
DROP INDEX IF EXISTS public.idx_linked_accounts_business_name_unique;

CREATE OR REPLACE FUNCTION public.guard_linked_account_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.relationship_type <> 'business' THEN
    RAISE EXCEPTION 'unsupported_relationship_type';
  END IF;
  IF NEW.owner_profile_id = NEW.linked_profile_id THEN
    RAISE EXCEPTION 'cannot_link_self';
  END IF;
  IF TG_OP = 'INSERT' AND (NEW.established_at IS NULL OR NEW.established_via IS NULL) THEN
    RAISE EXCEPTION 'linked_account_requires_proof_of_control';
  END IF;
  IF TG_OP = 'UPDATE'
     AND (NEW.owner_profile_id <> OLD.owner_profile_id OR NEW.linked_profile_id <> OLD.linked_profile_id) THEN
    RAISE EXCEPTION 'linked_account_parties_are_immutable';
  END IF;
  IF NEW.business_name_normalized IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('linked_accounts.business_name:' || NEW.business_name_normalized));
    IF EXISTS (
      SELECT 1
      FROM public.linked_accounts la
      WHERE la.relationship_type = 'business'
        AND la.business_name_normalized = NEW.business_name_normalized
        AND la.linked_profile_id <> NEW.linked_profile_id
        AND la.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'business_name_taken';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_linked_account_row ON public.linked_accounts;
CREATE TRIGGER guard_linked_account_row
  BEFORE INSERT OR UPDATE ON public.linked_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_linked_account_row();

-- ---------------------------------------------------------------------------
-- No client writes: drop the INSERT policy and the broad table grants
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owners can insert linked accounts" ON public.linked_accounts;
REVOKE ALL ON public.linked_accounts FROM anon;
REVOKE ALL ON public.linked_accounts FROM authenticated;
GRANT SELECT, DELETE ON public.linked_accounts TO authenticated;

REVOKE ALL ON public.business_account_access_requests FROM anon;
REVOKE ALL ON public.business_account_access_requests FROM authenticated;
GRANT SELECT, INSERT ON public.business_account_access_requests TO authenticated;
DROP POLICY IF EXISTS "Business owners can update business access requests" ON public.business_account_access_requests;

-- Access requests target established business accounts only, and only their established owners
-- (or settings managers) read them. The requester cannot see the business's linked_accounts row
-- under its own RLS, so the target check runs through a definer helper.
CREATE OR REPLACE FUNCTION public.is_established_business_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.linked_accounts la
    WHERE la.relationship_type = 'business'
      AND la.established_at IS NOT NULL
      AND la.linked_profile_id = p_profile_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_established_business_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_established_business_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_established_business_profile(uuid) TO service_role;

DROP POLICY IF EXISTS "Requesters can create business access requests" ON public.business_account_access_requests;
CREATE POLICY "Requesters can create business access requests"
  ON public.business_account_access_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles requester_profile
      WHERE requester_profile.id = business_account_access_requests.requester_profile_id
        AND requester_profile.user_id = auth.uid()
    )
    AND business_account_access_requests.target_profile_id <> business_account_access_requests.requester_profile_id
    AND public.is_established_business_profile(business_account_access_requests.target_profile_id)
  );

DROP POLICY IF EXISTS "Business owners can read business access requests" ON public.business_account_access_requests;
CREATE POLICY "Business owners can read business access requests"
  ON public.business_account_access_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.linked_accounts la
      JOIN public.profiles owner_profile ON owner_profile.id = la.owner_profile_id
      WHERE la.relationship_type = 'business'
        AND la.established_at IS NOT NULL
        AND la.linked_profile_id = business_account_access_requests.target_profile_id
        AND owner_profile.user_id = auth.uid()
    )
    OR public.has_permission('settings.manage'::public.app_permission)
  );

-- ---------------------------------------------------------------------------
-- Handshake grants: owner session mints a token, business session redeems it
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_account_link_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name_normalized text,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_account_link_grants_owner
  ON public.business_account_link_grants (owner_profile_id, expires_at DESC);

ALTER TABLE public.business_account_link_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_account_link_grants FROM anon;
REVOKE ALL ON public.business_account_link_grants FROM authenticated;

CREATE OR REPLACE FUNCTION public.business_account_link_token_hash(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex');
$$;

REVOKE ALL ON FUNCTION public.business_account_link_token_hash(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.begin_business_account_link(
  p_business_name text DEFAULT NULL,
  p_linked_profile_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_name text;
  v_token text;
BEGIN
  SELECT id INTO v_owner
  FROM public.profiles
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_name := nullif(lower(regexp_replace(btrim(coalesce(p_business_name, '')), '\s+', ' ', 'g')), '');
  IF v_name IS NOT NULL AND char_length(v_name) < 2 THEN
    v_name := NULL;
  END IF;
  IF v_name IS NULL AND p_linked_profile_id IS NULL THEN
    RAISE EXCEPTION 'business_name_required';
  END IF;
  IF p_linked_profile_id IS NOT NULL AND p_linked_profile_id = v_owner THEN
    RAISE EXCEPTION 'cannot_link_self';
  END IF;
  IF v_name IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.linked_accounts la
    WHERE la.relationship_type = 'business'
      AND la.business_name_normalized = v_name
      AND (p_linked_profile_id IS NULL OR la.linked_profile_id <> p_linked_profile_id)
  ) THEN
    RAISE EXCEPTION 'business_name_taken';
  END IF;

  DELETE FROM public.business_account_link_grants
  WHERE owner_profile_id = v_owner
    AND (consumed_at IS NOT NULL OR expires_at < now());

  IF (SELECT count(*) FROM public.business_account_link_grants WHERE owner_profile_id = v_owner) >= 5 THEN
    RAISE EXCEPTION 'too_many_pending_links';
  END IF;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO public.business_account_link_grants (
    owner_profile_id, linked_profile_id, business_name_normalized, token_hash, expires_at
  ) VALUES (
    v_owner, p_linked_profile_id, v_name, public.business_account_link_token_hash(v_token), now() + interval '10 minutes'
  );

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_business_account_link(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_business_account_link(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_business_account_link(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_business_account_link(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked uuid;
  v_grant public.business_account_link_grants%ROWTYPE;
  v_existing public.linked_accounts%ROWTYPE;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO v_linked
  FROM public.profiles
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
  IF v_linked IS NULL THEN
    RAISE EXCEPTION 'profile_not_ready';
  END IF;

  SELECT * INTO v_grant
  FROM public.business_account_link_grants
  WHERE token_hash = public.business_account_link_token_hash(p_token)
  FOR UPDATE;
  IF v_grant.id IS NULL OR v_grant.consumed_at IS NOT NULL OR v_grant.expires_at < now() THEN
    RAISE EXCEPTION 'invalid_or_expired_link_token';
  END IF;
  IF v_grant.owner_profile_id = v_linked THEN
    RAISE EXCEPTION 'cannot_link_self';
  END IF;
  IF v_grant.linked_profile_id IS NOT NULL AND v_grant.linked_profile_id <> v_linked THEN
    RAISE EXCEPTION 'link_target_mismatch';
  END IF;

  -- An existing business keeps its name; a new business takes the name the owner typed.
  SELECT la.business_name_normalized INTO v_name
  FROM public.linked_accounts la
  WHERE la.linked_profile_id = v_linked
    AND la.relationship_type = 'business'
  ORDER BY la.created_at
  LIMIT 1;
  v_name := coalesce(v_name, v_grant.business_name_normalized);
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'business_name_required';
  END IF;

  SELECT * INTO v_existing
  FROM public.linked_accounts
  WHERE owner_profile_id = v_grant.owner_profile_id
    AND linked_profile_id = v_linked;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.established_at IS NOT NULL THEN
      RAISE EXCEPTION 'already_linked';
    END IF;
    UPDATE public.linked_accounts
    SET established_at = now(),
        established_via = 'session_handshake',
        established_by_profile_id = v_linked,
        business_name_normalized = v_name
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.linked_accounts (
      owner_profile_id, linked_profile_id, relationship_type, business_name_normalized,
      established_at, established_via, established_by_profile_id
    ) VALUES (
      v_grant.owner_profile_id, v_linked, 'business', v_name,
      now(), 'session_handshake', v_linked
    );
  END IF;

  UPDATE public.business_account_link_grants
  SET consumed_at = now()
  WHERE id = v_grant.id;

  RETURN v_linked;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_business_account_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_business_account_link(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_business_account_link(text) TO service_role;

-- ---------------------------------------------------------------------------
-- Access requests: an established owner approves or declines
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_business_account_access_request(
  p_request_id uuid,
  p_decision text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer uuid;
  v_req public.business_account_access_requests%ROWTYPE;
  v_name text;
BEGIN
  SELECT id INTO v_reviewer
  FROM public.profiles
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
  IF v_reviewer IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  SELECT * INTO v_req
  FROM public.business_account_access_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'request_already_reviewed';
  END IF;

  SELECT la.business_name_normalized INTO v_name
  FROM public.linked_accounts la
  WHERE la.relationship_type = 'business'
    AND la.established_at IS NOT NULL
    AND la.linked_profile_id = v_req.target_profile_id
    AND la.owner_profile_id = v_reviewer
  LIMIT 1;

  IF v_name IS NULL AND NOT public.has_permission('settings.manage'::public.app_permission) THEN
    RAISE EXCEPTION 'not_business_owner';
  END IF;

  IF v_name IS NULL THEN
    SELECT la.business_name_normalized INTO v_name
    FROM public.linked_accounts la
    WHERE la.relationship_type = 'business'
      AND la.established_at IS NOT NULL
      AND la.linked_profile_id = v_req.target_profile_id
    ORDER BY la.created_at
    LIMIT 1;
  END IF;

  IF p_decision = 'approved' THEN
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'target_not_business_account';
    END IF;
    IF v_req.requester_profile_id = v_req.target_profile_id THEN
      RAISE EXCEPTION 'cannot_link_self';
    END IF;
    INSERT INTO public.linked_accounts (
      owner_profile_id, linked_profile_id, relationship_type, business_name_normalized,
      established_at, established_via, established_by_profile_id
    ) VALUES (
      v_req.requester_profile_id, v_req.target_profile_id, 'business', v_name,
      now(), 'owner_approval', v_reviewer
    )
    ON CONFLICT (owner_profile_id, linked_profile_id) DO UPDATE
      SET established_at = coalesce(public.linked_accounts.established_at, now()),
          established_via = coalesce(public.linked_accounts.established_via, 'owner_approval'),
          established_by_profile_id = coalesce(public.linked_accounts.established_by_profile_id, EXCLUDED.established_by_profile_id);
  END IF;

  UPDATE public.business_account_access_requests
  SET status = p_decision,
      reviewed_by = v_reviewer,
      reviewed_at = now()
  WHERE id = v_req.id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_business_account_access_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_business_account_access_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_business_account_access_request(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Only established rows carry rights
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_profile_manages_publisher(p_publisher_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_profile_id() IS NOT NULL
    AND p_publisher_profile_id IS NOT NULL
    AND (
      public.current_profile_id() = p_publisher_profile_id
      OR EXISTS (
        SELECT 1
        FROM public.linked_accounts la
        WHERE la.owner_profile_id = public.current_profile_id()
          AND la.linked_profile_id = p_publisher_profile_id
          AND la.relationship_type = 'business'
          AND la.established_at IS NOT NULL
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.linked_account_owner_ids_for_viewer()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT la.owner_profile_id), '{}'::uuid[])
  FROM public.linked_accounts AS la
  JOIN public.profiles AS viewer
    ON viewer.id IN (la.owner_profile_id, la.linked_profile_id)
  WHERE viewer.user_id = auth.uid()
    AND viewer.deleted_at IS NULL
    AND la.relationship_type = 'business'
    AND la.established_at IS NOT NULL;
$$;

-- Connect lookup: business profiles only (an established business link or a biz_ handle). An
-- exact e-mail match no longer reveals which profile belongs to a personal e-mail address.
CREATE OR REPLACE FUNCTION public.lookup_business_accounts_for_connect(
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_id uuid;
  name_q text := lower(btrim(coalesce(p_name, '')));
  email_q text := lower(btrim(coalesce(p_email, '')));
  name_escaped text;
  name_key text := regexp_replace(name_q, '[^a-z0-9]', '', 'g');
  result_limit integer := greatest(1, least(coalesce(p_limit, 5), 8));
  matches jsonb;
BEGIN
  SELECT id
  INTO requester_id
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;

  IF requester_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF char_length(name_q) < 2 AND position('@' in email_q) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  name_escaped := replace(replace(replace(name_q, '\', '\\'), '%', '\%'), '_', '\_');

  WITH business_profiles AS (
    SELECT
      p.id AS profile_id,
      p.full_name,
      p.username,
      p.avatar_url,
      u.email,
      first_link.business_name_normalized,
      first_link.owner_profile_id,
      first_link.owner_full_name,
      EXISTS (
        SELECT 1
        FROM public.linked_accounts mine
        WHERE mine.relationship_type = 'business'
          AND mine.established_at IS NOT NULL
          AND mine.linked_profile_id = p.id
          AND mine.owner_profile_id = requester_id
      ) AS already_linked_to_requester
    FROM public.profiles AS p
    JOIN auth.users AS u ON u.id = p.user_id
    LEFT JOIN LATERAL (
      SELECT la.business_name_normalized, la.owner_profile_id, owner.full_name AS owner_full_name
      FROM public.linked_accounts la
      LEFT JOIN public.profiles owner ON owner.id = la.owner_profile_id
      WHERE la.linked_profile_id = p.id
        AND la.relationship_type = 'business'
        AND la.established_at IS NOT NULL
      ORDER BY la.created_at
      LIMIT 1
    ) AS first_link ON true
    WHERE p.deleted_at IS NULL
      AND p.id <> requester_id
      AND (
        first_link.business_name_normalized IS NOT NULL
        OR coalesce(p.username, '') ILIKE 'biz\_%' ESCAPE '\'
      )
  ),
  candidates AS (
    SELECT
      bp.profile_id,
      bp.full_name,
      bp.username,
      bp.avatar_url,
      bp.business_name_normalized,
      bp.owner_profile_id,
      bp.owner_full_name,
      bp.already_linked_to_requester,
      CASE
        WHEN email_q <> '' AND lower(bp.email) = email_q THEN 'email'
        WHEN bp.username IS NOT NULL AND lower(bp.username) = name_q THEN 'username'
        WHEN char_length(name_key) >= 8
          AND char_length(regexp_replace(split_part(split_part(coalesce(bp.email, ''), '@', 2), '.', 1), '[^a-z0-9]', '', 'g')) >= 8
          AND (
            name_key LIKE '%' || regexp_replace(split_part(split_part(bp.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') || '%'
            OR regexp_replace(split_part(split_part(bp.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') LIKE '%' || name_key || '%'
          )
          THEN 'email_domain'
        ELSE 'name'
      END AS match_reason,
      CASE
        WHEN email_q <> '' AND lower(bp.email) = email_q THEN 1
        WHEN bp.username IS NOT NULL AND lower(bp.username) = name_q THEN 2
        WHEN char_length(name_key) >= 8
          AND char_length(regexp_replace(split_part(split_part(coalesce(bp.email, ''), '@', 2), '.', 1), '[^a-z0-9]', '', 'g')) >= 8
          AND name_key LIKE '%' || regexp_replace(split_part(split_part(bp.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') || '%'
          THEN 3
        ELSE 4
      END AS rank_n
    FROM business_profiles bp
    WHERE
      (email_q <> '' AND lower(bp.email) = email_q)
      OR (
        char_length(name_q) >= 2
        AND (
          bp.full_name ILIKE '%' || name_escaped || '%' ESCAPE '\'
          OR coalesce(bp.username, '') ILIKE '%' || name_escaped || '%' ESCAPE '\'
          OR coalesce(bp.business_name_normalized, '') ILIKE '%' || name_escaped || '%' ESCAPE '\'
        )
      )
      OR (
        char_length(name_key) >= 8
        AND char_length(regexp_replace(split_part(split_part(coalesce(bp.email, ''), '@', 2), '.', 1), '[^a-z0-9]', '', 'g')) >= 8
        AND (
          name_key LIKE '%' || regexp_replace(split_part(split_part(bp.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') || '%'
          OR regexp_replace(split_part(split_part(bp.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') LIKE '%' || name_key || '%'
        )
      )
  )
  SELECT coalesce(jsonb_agg(to_jsonb(match) ORDER BY match.rank_n, match.sort_name), '[]'::jsonb)
  INTO matches
  FROM (
    SELECT
      c.profile_id,
      c.full_name,
      c.username,
      c.avatar_url,
      c.business_name_normalized,
      c.owner_profile_id,
      c.owner_full_name,
      c.match_reason,
      c.already_linked_to_requester,
      c.rank_n,
      lower(coalesce(c.full_name, c.username, '')) AS sort_name
    FROM candidates AS c
    ORDER BY c.rank_n, lower(coalesce(c.full_name, c.username, ''))
    LIMIT result_limit
  ) AS match;

  RETURN coalesce(matches, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_business_accounts_for_connect(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_business_accounts_for_connect(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_business_accounts_for_connect(text, text, integer) TO service_role;

COMMENT ON COLUMN public.linked_accounts.established_at IS
  'When control of both accounts was proven. Null rows carry no switching or publisher rights.';
COMMENT ON COLUMN public.linked_accounts.established_via IS
  'session_handshake (owner + business sessions), owner_approval (access request), legacy_backfill (pre-fix rows audited 2026-10-07).';
COMMENT ON FUNCTION public.begin_business_account_link(text, uuid) IS
  'Owner session: mint a 10-minute token for linking a business account. Returned once; only the hash is stored.';
COMMENT ON FUNCTION public.complete_business_account_link(text) IS
  'Business session: redeem the owner token and establish the link to the signed-in business profile.';
COMMENT ON FUNCTION public.review_business_account_access_request(uuid, text) IS
  'Established owner (or settings manager) approves or rejects an access request; approval establishes the link.';

-- Phase 6 batch 1: agreements list carries each party's profile and role (Earnings knows who provides);
-- Jobs posters can edit and withdraw their own posting and market managers can review; a new Fund inquiry
-- notifies founders and admins.

-- ---------------------------------------------------------------------------------------------------------------
-- 6.1 list_accessible_agreements: parties now include profileId and roleInAgreement
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_accessible_agreements()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.current_profile_id();
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      a.id,
      a.reference_code,
      a.party_reference,
      coalesce(a.title, a.listing_title_snapshot, 'Agreement') AS title,
      a.agreement_type,
      a.status,
      a.summary,
      a.market_listing_id,
      a.created_at,
      a.effective_at,
      a.end_at,
      a.execution_method,
      (
        a.status IN ('draft') AND (a.owner_profile_id = v_actor OR a.initiator_profile_id = v_actor)
      ) OR (
        a.status IN ('in_review') AND public.can_access_agreement(a.id)
      ) OR (
        a.status IN ('proposed', 'partially_signed', 'pending_counterparty')
        AND (
          EXISTS (
            SELECT 1 FROM public.agreement_signatories s
            WHERE s.agreement_id = a.id AND s.kind = 'required' AND s.profile_id = v_actor
              AND NOT EXISTS (
                SELECT 1 FROM public.agreement_signatures sig
                WHERE sig.signatory_id = s.id AND sig.version_id = a.current_version_id AND sig.status = 'signed'
              )
          )
          OR (a.buyer_profile_id = v_actor AND a.buyer_signed_at IS NULL)
          OR (a.seller_profile_id = v_actor AND a.seller_signed_at IS NULL)
        )
      ) AS needs_action,
      (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id,
          'displayName', p.display_name,
          'profileId', p.profile_id,
          'roleInAgreement', p.role_in_agreement
        ) ORDER BY p.sort_order), '[]'::jsonb)
        FROM public.agreement_parties p WHERE p.agreement_id = a.id
      ) AS parties
    FROM public.agreements a
    WHERE public.can_access_agreement(a.id)
  ) x;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- 6.2 Jobs: posters edit and withdraw their own posting; market managers review
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_market_job_interest(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  UPDATE public.market_job_interests
  SET status = 'closed', updated_at = now()
  WHERE id = p_id AND user_id = auth.uid() AND status IN ('new', 'reviewing', 'contacted');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.withdraw_market_job_interest(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_market_job_interest(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_market_job_interest(p_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_text_keys text[] := ARRAY['pay_amount', 'pay_period', 'city', 'region_code', 'country_code', 'notes', 'hours_from', 'hours_to'];
  v_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;
  FOREACH v_key IN ARRAY ARRAY(SELECT jsonb_object_keys(payload)) LOOP
    IF NOT (v_key = ANY (v_text_keys) OR v_key IN ('job_types', 'days', 'terms')) THEN
      RAISE EXCEPTION 'field_not_editable: %', v_key;
    END IF;
  END LOOP;

  UPDATE public.market_job_interests
  SET
    pay_amount   = CASE WHEN payload ? 'pay_amount'   THEN left(nullif(btrim(payload->>'pay_amount'), ''), 40)    ELSE pay_amount END,
    pay_period   = CASE WHEN payload ? 'pay_period'   THEN left(nullif(btrim(payload->>'pay_period'), ''), 40)    ELSE pay_period END,
    city         = CASE WHEN payload ? 'city'         THEN left(nullif(btrim(payload->>'city'), ''), 120)         ELSE city END,
    region_code  = CASE WHEN payload ? 'region_code'  THEN left(nullif(btrim(payload->>'region_code'), ''), 16)   ELSE region_code END,
    country_code = CASE WHEN payload ? 'country_code' THEN upper(left(nullif(btrim(payload->>'country_code'), ''), 2)) ELSE country_code END,
    notes        = CASE WHEN payload ? 'notes'        THEN left(nullif(btrim(payload->>'notes'), ''), 1000)       ELSE notes END,
    hours_from   = CASE WHEN payload ? 'hours_from'   THEN left(nullif(btrim(payload->>'hours_from'), ''), 16)    ELSE hours_from END,
    hours_to     = CASE WHEN payload ? 'hours_to'     THEN left(nullif(btrim(payload->>'hours_to'), ''), 16)      ELSE hours_to END,
    job_types    = CASE WHEN payload ? 'job_types' THEN coalesce((SELECT array_agg(left(btrim(x), 80)) FROM jsonb_array_elements_text(payload->'job_types') x WHERE btrim(x) <> ''), '{}'::text[]) ELSE job_types END,
    days         = CASE WHEN payload ? 'days'      THEN coalesce((SELECT array_agg(left(btrim(x), 24)) FROM jsonb_array_elements_text(payload->'days') x WHERE btrim(x) <> ''), '{}'::text[]) ELSE days END,
    terms        = CASE WHEN payload ? 'terms'     THEN coalesce((SELECT array_agg(left(btrim(x), 40)) FROM jsonb_array_elements_text(payload->'terms') x WHERE btrim(x) <> ''), '{}'::text[]) ELSE terms END,
    updated_at = now()
  WHERE id = p_id AND user_id = auth.uid() AND status IN ('new', 'reviewing', 'contacted');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_market_job_interest(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_market_job_interest(uuid, jsonb) TO authenticated;

-- Market managers review postings alongside settings/role admins.
DROP POLICY IF EXISTS "Admins can read market job interests" ON public.market_job_interests;
CREATE POLICY "Admins can read market job interests"
  ON public.market_job_interests
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('market.manage'::public.app_permission)
  );

DROP POLICY IF EXISTS "Admins can update market job interests" ON public.market_job_interests;
CREATE POLICY "Admins can update market job interests"
  ON public.market_job_interests
  FOR UPDATE
  TO authenticated
  USING (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('market.manage'::public.app_permission)
  )
  WITH CHECK (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('market.manage'::public.app_permission)
  );

-- ---------------------------------------------------------------------------------------------------------------
-- 6.4 Fund: a new inquiry notifies founders and admins
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.funding_interest_inquiry_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipients uuid[];
BEGIN
  SELECT coalesce(array_agg(p.id), '{}'::uuid[]) INTO v_recipients
  FROM public.profiles p
  WHERE p.role::text IN ('founder', 'admin') AND p.deleted_at IS NULL;
  IF cardinality(v_recipients) > 0 THEN
    PERFORM public.civic_notify_profiles(
      v_recipients,
      'fund_inquiry_received',
      'New Fund inquiry: ' || coalesce(NEW.lane, 'inquiry'),
      left(coalesce(NEW.full_name, '') || CASE WHEN coalesce(NEW.organization, '') <> '' THEN ' · ' || NEW.organization ELSE '' END, 200),
      'funding_interest_inquiry',
      NEW.id,
      jsonb_build_object('lane', coalesce(NEW.lane, ''), 'title', coalesce(NEW.lane, 'inquiry'))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS funding_interest_inquiry_notify ON public.funding_interest_inquiries;
CREATE TRIGGER funding_interest_inquiry_notify
  AFTER INSERT ON public.funding_interest_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.funding_interest_inquiry_notify();

NOTIFY pgrst, 'reload schema';

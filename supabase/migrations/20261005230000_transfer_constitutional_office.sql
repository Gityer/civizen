-- Atomic hand-over of a constitutional office.
--
-- Ending the current holder and appointing the next used to be two separate writes from the client,
-- which could leave an office vacant if the second one failed. This function does both in one
-- transaction. It runs as the caller (SECURITY INVOKER), so the existing row-level policy on
-- constitutional_offices still applies; the explicit permission check only gives a clear error.

CREATE OR REPLACE FUNCTION public.transfer_constitutional_office(
  p_office_key public.constitutional_office_key,
  p_new_holder uuid,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_current public.constitutional_offices%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF NOT (
    public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission)
  ) THEN
    RAISE EXCEPTION 'Not permitted to change constitutional offices' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_holder) THEN
    RAISE EXCEPTION 'New office holder does not exist' USING ERRCODE = '23503';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid();

  -- Lock the active assignment so two concurrent transfers cannot both end it.
  SELECT * INTO v_current
  FROM public.constitutional_offices
  WHERE office_key = p_office_key AND is_active = true
  FOR UPDATE;

  IF FOUND THEN
    IF v_current.profile_id = p_new_holder THEN
      RAISE EXCEPTION 'This member already holds this office (idx_constitutional_offices_active_profile_office)'
        USING ERRCODE = '23505';
    END IF;

    UPDATE public.constitutional_offices
    SET is_active = false,
        ended_at = GREATEST(now(), assigned_at + interval '1 microsecond'),
        metadata = metadata || jsonb_strip_nulls(jsonb_build_object(
          'ended_by', v_actor,
          'end_reason', NULLIF(btrim(p_reason), ''),
          'transferred_to', p_new_holder
        ))
    WHERE id = v_current.id;
  END IF;

  INSERT INTO public.constitutional_offices (office_key, profile_id, assigned_by, notes, is_active, metadata)
  VALUES (
    p_office_key,
    p_new_holder,
    v_actor,
    NULLIF(btrim(p_notes), ''),
    true,
    jsonb_strip_nulls(jsonb_build_object('transferred_from', v_current.profile_id))
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_constitutional_office(public.constitutional_office_key, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_constitutional_office(public.constitutional_office_key, uuid, text, text) TO authenticated;

-- Supabase grants execute to anon by default; this function is for signed-in members only.
REVOKE EXECUTE ON FUNCTION public.transfer_constitutional_office(public.constitutional_office_key, uuid, text, text) FROM anon;

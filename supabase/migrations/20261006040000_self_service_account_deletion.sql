-- Self-service account removal.
--
-- A member can remove their own account. Profiles are referenced by 27 tables with RESTRICT
-- (matters, ledger entries, assisted ballots, ...), so a hard delete would either fail or erase
-- civic records. Instead the account is closed: open-consultation ballots are withdrawn, the
-- public listing is removed, personal details on the profile are cleared, the profile is marked
-- deleted (the app already hides deleted profiles) and the sign-in identity is disabled and
-- freed so the same email or phone can register again later.
-- Staff, system agents and current constitutional office holders cannot remove themselves.

CREATE OR REPLACE FUNCTION public.delete_my_account(p_confirm text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_election uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF lower(btrim(coalesce(p_confirm, ''))) <> 'delete' THEN
    RAISE EXCEPTION 'confirmation_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = v_uid AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_profile.is_system_agent
     OR v_profile.role IN ('founder', 'admin', 'system', 'moderator', 'market_manager') THEN
    RAISE EXCEPTION 'account_not_deletable_staff' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.constitutional_offices
    WHERE profile_id = v_profile.id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'account_not_deletable_office_holder' USING ERRCODE = '42501';
  END IF;

  -- Withdraw effective ballots in consultations that are still open (closed ones stay as records).
  FOR v_election IN
    SELECT b.election_id
    FROM public.civic_ballots b
    JOIN public.civic_elections e ON e.id = b.election_id
    WHERE b.profile_id = v_profile.id
      AND b.is_countable
      AND e.status = 'open'
      AND e.security_class = 'ordinary'
      AND now() BETWEEN e.voting_opens_at AND e.voting_closes_at
      AND coalesce(e.metadata->>'sample_batch', '') = ''
  LOOP
    PERFORM public.withdraw_consultation_ballot(v_election);
  END LOOP;

  UPDATE public.civic_consultation_public_presence
  SET visible = false, withdrawn_at = coalesce(withdrawn_at, now()), updated_at = now()
  WHERE profile_id = v_profile.id AND visible;

  UPDATE public.profiles
  SET username = 'deleted-' || substr(replace(id::text, '-', ''), 1, 12),
      full_name = 'Deleted member',
      bio = NULL,
      avatar_url = NULL,
      country = NULL,
      country_code = NULL,
      city = NULL,
      region_code = NULL,
      phone_country_code = NULL,
      phone_number = NULL,
      phone_e164 = NULL,
      date_of_birth = NULL,
      place_of_birth = NULL,
      sex = NULL,
      messaging_x25519_public_key = NULL,
      messaging_backup_provider = NULL,
      messaging_backup_note = NULL,
      deleted_at = now(),
      deletion_reason = 'self_service'
  WHERE id = v_profile.id;

  -- Disable and free the sign-in identity, and end every session.
  DELETE FROM auth.identities WHERE user_id = v_uid;
  DELETE FROM auth.sessions WHERE user_id = v_uid;
  UPDATE auth.users
  SET email = 'deleted-' || replace(v_uid::text, '-', '') || '@deleted.civizen.invalid',
      phone = NULL,
      encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb,
      banned_until = 'infinity'
  WHERE id = v_uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;

COMMENT ON FUNCTION public.delete_my_account(text) IS
  'Self-service account removal: withdraws open-consultation ballots, clears personal details, marks the profile deleted and disables the sign-in identity. Staff and office holders are refused.';

NOTIFY pgrst, 'reload schema';

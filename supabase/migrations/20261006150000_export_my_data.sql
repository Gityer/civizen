-- "Download my data": one call returns everything a member wrote or that is kept about them,
-- as JSON grouped by table. Only rows keyed to the caller's own profile are read.
-- Ballots, vote sessions, device attestations, duress settings, OAuth states and identity
-- artifacts are left out on purpose: exporting them would let someone prove how they voted
-- or leak secrets that are not the member's own content.

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_profile_created
  ON public.data_export_requests (profile_id, created_at DESC);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own export requests" ON public.data_export_requests;
CREATE POLICY "Members read their own export requests"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (profile_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_rows jsonb;
  v_source record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.deleted_at IS NULL
  ORDER BY p.created_at
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF (
    SELECT count(*) FROM public.data_export_requests r
    WHERE r.profile_id = v_profile_id AND r.created_at > now() - interval '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many exports, try again later' USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.data_export_requests (profile_id) VALUES (v_profile_id);

  FOR v_source IN
    SELECT * FROM (VALUES
      ('profiles', 'id'),
      ('profile_declared_context', 'profile_id'),
      ('profile_education_entries', 'profile_id'),
      ('profile_experience_entries', 'profile_id'),
      ('profile_skills_entries', 'profile_id'),
      ('profile_training_entries', 'profile_id'),
      ('profile_professions', 'profile_id'),
      ('profile_governance_roles', 'profile_id'),
      ('profile_contribution_events', 'profile_id'),
      ('profile_score_history', 'profile_id'),
      ('posts', 'author_id'),
      ('post_comments', 'author_id'),
      ('post_likes', 'user_id'),
      ('post_hides', 'profile_id'),
      ('endorsements', 'endorser_id'),
      ('endorsements', 'endorsed_id'),
      ('private_messages', 'sender_id'),
      ('messages', 'sender_id'),
      ('user_notifications', 'recipient_profile_id'),
      ('reports', 'reporter_id'),
      ('governance_proposal_votes', 'voter_id'),
      ('governance_eligibility_snapshots', 'profile_id'),
      ('governance_sanctions', 'profile_id'),
      ('governance_sanction_appeals', 'profile_id'),
      ('agreement_parties', 'profile_id'),
      ('agreement_signatories', 'profile_id'),
      ('identity_verification_cases', 'profile_id'),
      ('content_items', 'author_id'),
      ('development_stories', 'author_id'),
      ('law_contributions', 'author_id'),
      ('solution_problems', 'author_id'),
      ('solution_comments', 'author_id'),
      ('solution_proposal_endorsements', 'profile_id'),
      ('market_job_interests', 'profile_id'),
      ('luma_wallet_balances', 'profile_id'),
      ('study_bookmarks', 'profile_id'),
      ('study_certifications', 'profile_id'),
      ('study_progress', 'profile_id'),
      ('specialist_discussion_sessions', 'profile_id'),
      ('specialist_discussion_turns', 'profile_id'),
      ('happiness_privacy_settings', 'profile_id'),
      ('happiness_checkins', 'profile_id'),
      ('happiness_weekly_pulses', 'profile_id'),
      ('happiness_monthly_reviews', 'profile_id'),
      ('happiness_assessment_responses', 'profile_id'),
      ('happiness_state_snapshots', 'profile_id'),
      ('happiness_causes', 'profile_id'),
      ('happiness_actions', 'profile_id'),
      ('happiness_action_outcomes', 'profile_id'),
      ('happiness_improvement_selections', 'profile_id'),
      ('work_assessments', 'profile_id'),
      ('work_contexts', 'profile_id'),
      ('work_explorations', 'profile_id'),
      ('work_fulfillment_profiles', 'profile_id'),
      ('work_interventions', 'profile_id'),
      ('work_joy_entries', 'profile_id'),
      ('work_recommendation_feedback', 'profile_id'),
      ('work_shareable_preferences', 'profile_id'),
      ('work_transition_paths', 'profile_id'),
      ('work_transition_followups', 'profile_id'),
      ('work_trial_links', 'profile_id'),
      ('fulfillment_plans', 'profile_id'),
      ('fulfillment_plan_factors', 'profile_id'),
      ('fulfillment_plan_interventions', 'profile_id'),
      ('fulfillment_plan_outcomes', 'profile_id'),
      ('fulfillment_plan_support', 'profile_id'),
      ('fulfillment_recommendation_feedback', 'profile_id')
    ) AS s(table_name, key_column)
  LOOP
    -- Skip sources a deployment does not have, so one missing table never breaks the export.
    CONTINUE WHEN to_regclass('public.' || quote_ident(v_source.table_name)) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_source.table_name
        AND c.column_name = v_source.key_column
    );

    EXECUTE format(
      'SELECT coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t WHERE t.%I = $1',
      v_source.table_name,
      v_source.key_column
    )
    INTO v_rows
    USING v_profile_id;

    v_result := v_result || jsonb_build_object(
      CASE WHEN v_source.table_name = 'endorsements'
        THEN 'endorsements_' || CASE WHEN v_source.key_column = 'endorser_id' THEN 'given' ELSE 'received' END
        ELSE v_source.table_name
      END,
      v_rows
    );
  END LOOP;

  RETURN jsonb_build_object(
    'format', 'civizen-data-export',
    'version', 1,
    'exported_at', now(),
    'profile_id', v_profile_id,
    'data', v_result
  );
END;
$$;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_my_data() FROM anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

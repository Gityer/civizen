-- Account deletion now removes the member's own content and private records.
--
-- delete_my_account() cleared the profile's personal fields and disabled sign-in, but posts,
-- comments, likes, Happiness and Work entries, notifications, social tokens and account links
-- stayed in the database. When a profile is closed by its owner, this trigger deletes them.
-- Shared civic records (agreements, matters, ledger entries, governance votes, closed ballots)
-- and messages already delivered to other people stay, as the deletion notice in the app says.

CREATE OR REPLACE FUNCTION public.purge_self_deleted_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source record;
BEGIN
  IF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS NULL
    OR coalesce(NEW.deletion_reason, '') <> 'self_service' THEN
    RETURN NEW;
  END IF;

  FOR v_source IN
    SELECT * FROM (VALUES
      ('posts', 'author_id'),
      ('post_comments', 'author_id'),
      ('post_likes', 'user_id'),
      ('post_hides', 'profile_id'),
      ('user_notifications', 'recipient_profile_id'),
      ('linked_accounts', 'owner_profile_id'),
      ('linked_accounts', 'linked_profile_id'),
      ('linked_account_invites', 'owner_profile_id'),
      ('social_account_connections', 'org_profile_id'),
      ('social_oauth_states', 'profile_id'),
      ('data_export_requests', 'profile_id'),
      ('ai_usage_events', 'profile_id'),
      ('profile_declared_context', 'profile_id'),
      ('profile_education_entries', 'profile_id'),
      ('profile_experience_entries', 'profile_id'),
      ('profile_skills_entries', 'profile_id'),
      ('profile_training_entries', 'profile_id'),
      ('profile_professions', 'profile_id'),
      ('study_bookmarks', 'profile_id'),
      ('study_progress', 'profile_id'),
      ('specialist_discussion_turns', 'profile_id'),
      ('specialist_discussion_sessions', 'profile_id'),
      ('happiness_action_outcomes', 'profile_id'),
      ('happiness_actions', 'profile_id'),
      ('happiness_improvement_selections', 'profile_id'),
      ('happiness_causes', 'profile_id'),
      ('happiness_assessment_responses', 'profile_id'),
      ('happiness_state_snapshots', 'profile_id'),
      ('happiness_weekly_pulses', 'profile_id'),
      ('happiness_monthly_reviews', 'profile_id'),
      ('happiness_checkins', 'profile_id'),
      ('happiness_privacy_settings', 'profile_id'),
      ('work_transition_followups', 'profile_id'),
      ('work_transition_paths', 'profile_id'),
      ('work_trial_links', 'profile_id'),
      ('work_recommendation_feedback', 'profile_id'),
      ('work_shareable_preferences', 'profile_id'),
      ('work_joy_entries', 'profile_id'),
      ('work_interventions', 'profile_id'),
      ('work_explorations', 'profile_id'),
      ('work_contexts', 'profile_id'),
      ('work_assessments', 'profile_id'),
      ('work_fulfillment_profiles', 'profile_id'),
      ('fulfillment_recommendation_feedback', 'profile_id'),
      ('fulfillment_plan_support', 'profile_id'),
      ('fulfillment_plan_outcomes', 'profile_id'),
      ('fulfillment_plan_interventions', 'profile_id'),
      ('fulfillment_plan_factors', 'profile_id'),
      ('fulfillment_plans', 'profile_id')
    ) AS s(table_name, key_column)
  LOOP
    CONTINUE WHEN to_regclass('public.' || quote_ident(v_source.table_name)) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_source.table_name
        AND c.column_name = v_source.key_column
    );
    -- A row another record still depends on is kept rather than blocking the whole deletion.
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_source.table_name, v_source.key_column)
      USING NEW.id;
    EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN
      RAISE WARNING 'account purge kept rows in % for profile %', v_source.table_name, NEW.id;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purge_self_deleted_profile ON public.profiles;
CREATE TRIGGER purge_self_deleted_profile
  AFTER UPDATE OF deleted_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.purge_self_deleted_profile();

REVOKE ALL ON FUNCTION public.purge_self_deleted_profile() FROM PUBLIC, anon, authenticated;

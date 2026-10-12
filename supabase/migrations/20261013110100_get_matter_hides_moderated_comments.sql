-- v2 step A6: get_matter (SECURITY DEFINER) bypasses row-level security, so it filters comments hidden by moderation
-- itself: their authors and moderators still receive them (with the reason); everyone else does not.

CREATE OR REPLACE FUNCTION public.get_matter(p_matter_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base jsonb;
BEGIN
  IF NOT public.can_access_matter(p_matter_id) THEN
    RETURN NULL;
  END IF;
  v_base := public.matter_row_json(p_matter_id);
  IF v_base IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN v_base || jsonb_build_object(
    'comments', coalesce((
      SELECT jsonb_agg(to_jsonb(c) || jsonb_build_object(
        'author_display_name', CASE
          WHEN c.is_ai_agent THEN public.matter_actor_display_name('ai_agent', NULL, c.agent_id)
          ELSE public.matter_profile_display_name(c.author_profile_id)
        END
      ) ORDER BY c.created_at)
      FROM public.matter_comments c WHERE c.matter_id = p_matter_id
        AND (c.moderation_hidden_at IS NULL OR c.author_profile_id = public.current_profile_id()
             OR public.has_permission('content.moderate'::public.app_permission))
    ), '[]'::jsonb),
    'events', coalesce((
      SELECT jsonb_agg(to_jsonb(e) || jsonb_build_object(
        'actor_display_name', CASE
          WHEN e.is_system OR e.actor_kind = 'system' THEN 'Civizen'
          WHEN e.actor_kind = 'ai_agent' THEN public.matter_actor_display_name('ai_agent', NULL, e.actor_agent_id)
          ELSE public.matter_profile_display_name(e.actor_profile_id)
        END
      ) ORDER BY e.created_at)
      FROM public.matter_events e WHERE e.matter_id = p_matter_id
    ), '[]'::jsonb),
    'parties', coalesce((
      SELECT jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'actor_display_name', public.matter_actor_display_name(
          p.actor_kind, p.actor_profile_id, p.actor_agent_id
        )
      ) ORDER BY p.added_at)
      FROM public.matter_parties p WHERE p.matter_id = p_matter_id
    ), '[]'::jsonb),
    'attachments', coalesce((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at)
      FROM public.matter_attachments a WHERE a.matter_id = p_matter_id
    ), '[]'::jsonb),
    'responsibilities', coalesce((
      SELECT jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'actor_display_name', public.matter_profile_display_name(r.actor_profile_id)
      ) ORDER BY r.assigned_at)
      FROM public.matter_responsibilities r WHERE r.matter_id = p_matter_id
    ), '[]'::jsonb),
    'tasks', coalesce((
      SELECT jsonb_agg(to_jsonb(t) || jsonb_build_object(
        'lead_display_name', public.matter_actor_display_name(
          t.lead_kind, t.lead_profile_id,
          (SELECT ta.actor_agent_id FROM public.task_assignments ta
           WHERE ta.task_id = t.id AND ta.role = 'lead' AND ta.actor_kind = 'ai_agent'
           ORDER BY ta.assigned_at DESC LIMIT 1)
        ),
        'created_by_display_name', public.matter_profile_display_name(t.created_by_profile_id),
        'is_blocked', public.matter_task_is_blocked(t.id),
        'assignments', coalesce((
          SELECT jsonb_agg(to_jsonb(asg) || jsonb_build_object(
            'actor_display_name', public.matter_actor_display_name(
              asg.actor_kind, asg.actor_profile_id, asg.actor_agent_id
            )
          ) ORDER BY asg.assigned_at)
          FROM public.task_assignments asg WHERE asg.task_id = t.id
        ), '[]'::jsonb),
        'dependencies', coalesce((
          SELECT jsonb_agg(jsonb_build_object(
            'id', d.id, 'depends_on_task_id', d.depends_on_task_id, 'kind', d.kind,
            'depends_on_title', dep.title, 'depends_on_status', dep.status
          ))
          FROM public.task_dependencies d
          JOIN public.collaboration_tasks dep ON dep.id = d.depends_on_task_id
          WHERE d.task_id = t.id
        ), '[]'::jsonb)
      ) ORDER BY t.created_at)
      FROM public.collaboration_tasks t WHERE t.matter_id = p_matter_id
    ), '[]'::jsonb),
    'decisions', coalesce((
      SELECT jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'proposed_by_display_name', public.matter_profile_display_name(d.proposed_by_profile_id),
        'decided_by_display_name', public.matter_profile_display_name(d.decided_by_profile_id),
        'task_ids', coalesce((
          SELECT jsonb_agg(dt.task_id) FROM public.matter_decision_tasks dt WHERE dt.decision_id = d.id
        ), '[]'::jsonb)
      ) ORDER BY d.created_at)
      FROM public.matter_decisions d WHERE d.matter_id = p_matter_id
    ), '[]'::jsonb),
    'resolutions', coalesce((
      SELECT jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'proposed_by_display_name', public.matter_profile_display_name(r.proposed_by_profile_id)
      ) ORDER BY r.attempt_number)
      FROM public.matter_resolutions r WHERE r.matter_id = p_matter_id
    ), '[]'::jsonb),
    'evaluations', coalesce((
      SELECT jsonb_agg(to_jsonb(ev) || jsonb_build_object(
        'evaluator_display_name', public.matter_profile_display_name(ev.evaluator_profile_id)
      ) ORDER BY ev.created_at)
      FROM public.matter_evaluations ev WHERE ev.matter_id = p_matter_id
    ), '[]'::jsonb),
    'outcome_followups', coalesce((
      SELECT jsonb_agg(to_jsonb(ofu) || jsonb_build_object(
        'reviewer_display_name', public.matter_profile_display_name(ofu.reviewer_profile_id)
      ) ORDER BY ofu.created_at)
      FROM public.matter_outcome_followups ofu WHERE ofu.matter_id = p_matter_id
    ), '[]'::jsonb),
    'relationships', coalesce((
      SELECT jsonb_agg(to_jsonb(rel) ORDER BY rel.created_at)
      FROM public.matter_relationships rel
      WHERE rel.from_matter_id = p_matter_id OR rel.to_matter_id = p_matter_id
    ), '[]'::jsonb),
    'pattern_counts', public.matter_pattern_counts(p_matter_id),
    'agent_assignments', coalesce((
      SELECT jsonb_agg(to_jsonb(ma) || jsonb_build_object(
        'agent_display_name', public.matter_actor_display_name('ai_agent', NULL, ma.agent_id),
        'agent_role_type', (SELECT a.role_type FROM public.ai_agents a WHERE a.id = ma.agent_id),
        'supervising_display_name', public.matter_profile_display_name(ma.supervising_profile_id),
        'assigned_by_display_name', public.matter_profile_display_name(ma.assigned_by_profile_id)
      ) ORDER BY ma.assigned_at)
      FROM public.matter_agent_assignments ma WHERE ma.matter_id = p_matter_id
    ), '[]'::jsonb),
    'agent_runs', coalesce((
      SELECT jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'agent_display_name', public.matter_actor_display_name(
          'ai_agent', NULL,
          (SELECT ma.agent_id FROM public.matter_agent_assignments ma WHERE ma.id = r.assignment_id)
        )
      ) ORDER BY r.created_at)
      FROM public.ai_agent_runs r
      JOIN public.matter_agent_assignments ma ON ma.id = r.assignment_id
      WHERE ma.matter_id = p_matter_id
    ), '[]'::jsonb),
    'agent_artifacts', coalesce((
      SELECT jsonb_agg(to_jsonb(art) || jsonb_build_object(
        'agent_display_name', public.matter_actor_display_name('ai_agent', NULL, art.generated_by_agent_id),
        'run_revision_number', (SELECT rr.revision_number FROM public.ai_agent_runs rr WHERE rr.id = art.run_id)
      ) ORDER BY art.created_at)
      FROM public.matter_agent_artifacts art
      WHERE art.matter_id = p_matter_id
    ), '[]'::jsonb)
  );
END;
$function$;

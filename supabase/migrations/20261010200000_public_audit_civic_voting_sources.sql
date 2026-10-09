-- Phase 10 step 10.3: civic voting events and signed governance intents flow into the public-audit batches, and
-- batches are captured on a schedule so anchoring and the verifier mirrors see civic voting without a steward's click.

-- 1. Two more event sources for the hash-chained public-audit batches.
ALTER TABLE public.governance_public_audit_batch_items DROP CONSTRAINT IF EXISTS governance_public_audit_batch_items_source_check;
ALTER TABLE public.governance_public_audit_batch_items ADD CONSTRAINT governance_public_audit_batch_items_source_check CHECK (
  event_source = ANY (ARRAY[
    'governance_proposal_events', 'governance_implementation_logs', 'governance_proposal_guardian_approvals',
    'governance_proposal_guardian_external_signatures', 'governance_proposal_guardian_relay_attestations',
    'governance_public_audit_immutable_anchors', 'civic_voting_events', 'governance_action_intents'
  ]::text[])
);

CREATE OR REPLACE FUNCTION public.list_pending_governance_public_audit_events(
  max_events integer DEFAULT 500,
  requested_from timestamptz DEFAULT NULL,
  requested_to timestamptz DEFAULT NULL
)
RETURNS TABLE(event_position integer, event_source text, event_id uuid, event_created_at timestamptz, event_actor_id uuid, event_payload jsonb, event_digest text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
WITH candidate_events AS (
  SELECT 'governance_proposal_events'::text AS event_source, event.id AS event_id, event.created_at AS event_created_at, event.actor_id AS event_actor_id,
         coalesce(event.payload, '{}'::jsonb) AS event_payload
  FROM public.governance_proposal_events AS event
  WHERE (requested_from IS NULL OR event.created_at >= requested_from) AND (requested_to IS NULL OR event.created_at <= requested_to)
  UNION ALL
  SELECT 'governance_implementation_logs'::text, log.id, log.created_at, log.actor_id,
         jsonb_build_object('execution_status', log.execution_status, 'execution_summary', log.execution_summary, 'details', coalesce(log.details, '{}'::jsonb), 'proposal_id', log.proposal_id, 'implementation_id', log.implementation_id)
  FROM public.governance_implementation_logs AS log
  WHERE (requested_from IS NULL OR log.created_at >= requested_from) AND (requested_to IS NULL OR log.created_at <= requested_to)
  UNION ALL
  SELECT 'governance_proposal_guardian_approvals'::text, approval.id, approval.signed_at, approval.signer_profile_id,
         jsonb_build_object('proposal_id', approval.proposal_id, 'decision', approval.decision, 'rationale', approval.rationale, 'snapshot', coalesce(approval.snapshot, '{}'::jsonb), 'signed_at', approval.signed_at)
  FROM public.governance_proposal_guardian_approvals AS approval
  WHERE (requested_from IS NULL OR approval.signed_at >= requested_from) AND (requested_to IS NULL OR approval.signed_at <= requested_to)
  UNION ALL
  SELECT 'governance_proposal_guardian_external_signatures'::text, signature.id, signature.signed_at, signature.verified_by,
         jsonb_build_object('proposal_id', signature.proposal_id, 'external_signer_id', signature.external_signer_id, 'decision', signature.decision, 'payload_hash', signature.payload_hash, 'signature_reference', signature.signature_reference, 'verification_method', signature.verification_method, 'snapshot', coalesce(signature.snapshot, '{}'::jsonb), 'signed_at', signature.signed_at, 'verified_at', signature.verified_at)
  FROM public.governance_proposal_guardian_external_signatures AS signature
  WHERE (requested_from IS NULL OR signature.signed_at >= requested_from) AND (requested_to IS NULL OR signature.signed_at <= requested_to)
  UNION ALL
  SELECT 'governance_proposal_guardian_relay_attestations'::text, attestation.id, attestation.verified_at, attestation.verified_by,
         jsonb_build_object('proposal_id', attestation.proposal_id, 'external_signer_id', attestation.external_signer_id, 'relay_id', attestation.relay_id, 'decision', attestation.decision, 'status', attestation.status, 'payload_hash', attestation.payload_hash, 'relay_reference', attestation.relay_reference, 'chain_network', attestation.chain_network, 'chain_reference', attestation.chain_reference, 'verified_at', attestation.verified_at)
  FROM public.governance_proposal_guardian_relay_attestations AS attestation
  WHERE (requested_from IS NULL OR attestation.verified_at >= requested_from) AND (requested_to IS NULL OR attestation.verified_at <= requested_to)
  UNION ALL
  SELECT 'governance_public_audit_immutable_anchors'::text, anchor.id, anchor.anchored_at, anchor.anchored_by,
         jsonb_build_object('batch_id', anchor.batch_id, 'adapter_id', anchor.adapter_id, 'network', anchor.network, 'immutable_reference', anchor.immutable_reference, 'block_height', anchor.block_height, 'anchored_at', anchor.anchored_at, 'proof_payload', coalesce(anchor.proof_payload, '{}'::jsonb))
  FROM public.governance_public_audit_immutable_anchors AS anchor
  WHERE (requested_from IS NULL OR anchor.anchored_at >= requested_from) AND (requested_to IS NULL OR anchor.anchored_at <= requested_to)
  UNION ALL
  -- 10.3: the civic voting event chain (elections opened, ballots counted, boxes committed) ...
  SELECT 'civic_voting_events'::text, vote_event.id, vote_event.created_at, vote_event.actor_id,
         jsonb_build_object('election_id', vote_event.election_id, 'session_id', vote_event.session_id, 'event_type', vote_event.event_type, 'payload', coalesce(vote_event.payload, '{}'::jsonb), 'prev_event_hash', vote_event.prev_event_hash, 'event_hash', vote_event.event_hash)
  FROM public.civic_voting_events AS vote_event
  WHERE (requested_from IS NULL OR vote_event.created_at >= requested_from) AND (requested_to IS NULL OR vote_event.created_at <= requested_to)
  UNION ALL
  -- ... and the members' own signatures over their ballots and proposals (10.2).
  SELECT 'governance_action_intents'::text, intent.id, intent.created_at, intent.actor_id,
         jsonb_build_object('action_scope', intent.action_scope, 'target_id', intent.target_id, 'payload', coalesce(intent.payload, '{}'::jsonb), 'payload_hash', intent.payload_hash, 'signature', intent.signature, 'public_key', intent.public_key, 'key_algorithm', intent.key_algorithm, 'client_created_at', intent.client_created_at)
  FROM public.governance_action_intents AS intent
  WHERE (requested_from IS NULL OR intent.created_at >= requested_from) AND (requested_to IS NULL OR intent.created_at <= requested_to)
),
unbatched_events AS (
  SELECT candidate.*
  FROM candidate_events AS candidate
  LEFT JOIN public.governance_public_audit_batch_items AS item
    ON item.event_source = candidate.event_source AND item.event_id = candidate.event_id
  WHERE item.id IS NULL
),
selected_events AS (
  SELECT * FROM unbatched_events
  ORDER BY event_created_at ASC, event_source ASC, event_id ASC
  LIMIT greatest(1, coalesce(max_events, 500))
),
ordered_events AS (
  SELECT row_number() OVER (ORDER BY event_created_at ASC, event_source ASC, event_id ASC)::integer AS event_position,
         event_source, event_id, event_created_at, event_actor_id, event_payload
  FROM selected_events
)
SELECT
  ordered_events.event_position, ordered_events.event_source, ordered_events.event_id, ordered_events.event_created_at,
  ordered_events.event_actor_id, ordered_events.event_payload,
  encode(extensions.digest(concat_ws('|', ordered_events.event_source, ordered_events.event_id::text, coalesce(ordered_events.event_actor_id::text, ''), coalesce(ordered_events.event_created_at::text, ''), coalesce(ordered_events.event_payload::text, '{}'))::bytea, 'sha256'), 'hex') AS event_digest
FROM ordered_events
ORDER BY ordered_events.event_position ASC;
$function$;

-- 2. Scheduled capture: the same batch logic, run by the system without a signed-in steward.
CREATE OR REPLACE FUNCTION public.capture_governance_public_audit_batch_scheduled(max_events integer DEFAULT 500)
RETURNS uuid AS $$
DECLARE
  summary record;
  previous_batch record;
  inserted_id uuid;
  system_actor uuid := (SELECT id FROM public.profiles WHERE role = 'system'::public.app_role ORDER BY created_at ASC LIMIT 1);
BEGIN
  SELECT min(pending.event_created_at) AS from_created_at, max(pending.event_created_at) AS to_created_at,
         count(*)::integer AS event_count, coalesce(string_agg(pending.event_digest, '|' ORDER BY pending.event_position), '') AS digest_chain
  INTO summary
  FROM public.list_pending_governance_public_audit_events(max_events, NULL, NULL) AS pending;
  IF coalesce(summary.event_count, 0) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT batch.id, batch.batch_hash INTO previous_batch
  FROM public.governance_public_audit_batches AS batch
  ORDER BY batch.batch_index DESC LIMIT 1;

  INSERT INTO public.governance_public_audit_batches (batch_scope, batch_source, from_created_at, to_created_at, event_count, previous_batch_id, previous_batch_hash, batch_hash, created_by, metadata)
  VALUES ('governance_events', 'scheduled', summary.from_created_at, summary.to_created_at, summary.event_count, previous_batch.id, previous_batch.batch_hash,
          encode(extensions.digest(concat_ws('|', coalesce(previous_batch.batch_hash, ''), summary.digest_chain), 'sha256'), 'hex'),
          system_actor, jsonb_build_object('captured_by', 'scheduled', 'max_events', max_events))
  RETURNING id INTO inserted_id;

  INSERT INTO public.governance_public_audit_batch_items (batch_id, event_source, event_id, event_position, event_created_at, event_actor_id, event_payload, event_digest)
  SELECT inserted_id, pending.event_source, pending.event_id, pending.event_position, pending.event_created_at, pending.event_actor_id, pending.event_payload, pending.event_digest
  FROM public.list_pending_governance_public_audit_events(max_events, NULL, NULL) AS pending
  ORDER BY pending.event_position ASC;

  RETURN inserted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.capture_governance_public_audit_batch_scheduled(integer) FROM PUBLIC, anon, authenticated;

/** Hourly tick: capture one batch of up to 500 pending events; a quiet hour captures nothing. */
CREATE OR REPLACE FUNCTION public.gpav_public_audit_capture_tick()
RETURNS void AS $$
BEGIN
  PERFORM public.capture_governance_public_audit_batch_scheduled(500);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.gpav_public_audit_capture_tick() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'public_audit_batch_capture_tick';
    PERFORM cron.schedule('public_audit_batch_capture_tick', '50 * * * *', $cron$SELECT public.gpav_public_audit_capture_tick();$cron$);
  END IF;
END $$;

-- 3. Civic voting events are readable by everyone, so observers and verifier mirrors can re-derive the chain.
GRANT SELECT ON public.civic_voting_events TO anon, authenticated;

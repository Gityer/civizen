-- v2 plan step C4: a public "verify this election" page.
-- Receipts, the Merkle root and receipt proofs were already public. Audit batches are readable only by
-- signed-in members, so signed-out readers get this one function: where the ballot-box commitment of an
-- election sits in the public audit log (event hash, batch, batch hash, anchor), nothing else.

CREATE OR REPLACE FUNCTION public.civic_election_audit_anchor(p_election_id uuid)
RETURNS TABLE (
  event_hash text,
  event_created_at timestamptz,
  committed_root text,
  committed_count integer,
  batch_id uuid,
  batch_index bigint,
  batch_hash text,
  anchor_network text,
  anchor_reference text,
  anchored_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ev.event_hash,
    ev.created_at,
    ev.payload ->> 'merkle_root',
    nullif(ev.payload ->> 'count', '')::integer,
    b.id,
    b.batch_index::bigint,
    b.batch_hash,
    coalesce(a.network, b.anchor_network),
    coalesce(a.immutable_reference, b.anchor_reference),
    coalesce(a.anchored_at, b.anchored_at)
  FROM public.civic_voting_events ev
  LEFT JOIN public.governance_public_audit_batch_items item
    ON item.event_source = 'civic_voting_events' AND item.event_id = ev.id
  LEFT JOIN public.governance_public_audit_batches b ON b.id = item.batch_id
  LEFT JOIN LATERAL (
    SELECT anchor.network, anchor.immutable_reference, anchor.anchored_at
    FROM public.governance_public_audit_immutable_anchors anchor
    WHERE anchor.batch_id = b.id
    ORDER BY anchor.anchored_at DESC
    LIMIT 1
  ) a ON true
  WHERE ev.election_id = p_election_id
    AND ev.event_type = 'ballot_box_committed'
  ORDER BY ev.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.civic_election_audit_anchor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_election_audit_anchor(uuid) TO anon, authenticated;

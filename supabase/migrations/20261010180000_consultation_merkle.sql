-- Phase 10 step 10.1: per-consultation Merkle commitment over the counted receipts, a public inclusion proof any
-- browser can verify locally, and the commitment stored on the election (ballot_box_commitment) and in the audit
-- chain when voting closes. Leaf = sha256(receipt); node = sha256(left_hex || right_hex); an odd last node pairs with itself.

CREATE OR REPLACE FUNCTION public.civic_merkle_root_for(p_receipts text[])
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_level text[];
  v_next text[];
  v_n integer;
  v_i integer;
  v_left text;
  v_right text;
BEGIN
  SELECT coalesce(array_agg(encode(extensions.digest(r, 'sha256'), 'hex') ORDER BY r), '{}'::text[]) INTO v_level
  FROM unnest(coalesce(p_receipts, '{}'::text[])) AS r;
  IF cardinality(v_level) = 0 THEN
    RETURN encode(extensions.digest('', 'sha256'), 'hex');
  END IF;
  WHILE cardinality(v_level) > 1 LOOP
    v_next := '{}'::text[];
    v_n := cardinality(v_level);
    v_i := 1;
    WHILE v_i <= v_n LOOP
      v_left := v_level[v_i];
      v_right := CASE WHEN v_i + 1 <= v_n THEN v_level[v_i + 1] ELSE v_level[v_i] END;
      v_next := array_append(v_next, encode(extensions.digest(v_left || v_right, 'sha256'), 'hex'));
      v_i := v_i + 2;
    END LOOP;
    v_level := v_next;
  END LOOP;
  RETURN v_level[1];
END;
$$;

-- {included, root, leaf, index (0-based among sorted receipts), count, path: [{hash, side}]}; side says where the
-- sibling sits relative to the running hash: 'right' means hash(running || sibling), 'left' means hash(sibling || running).
CREATE OR REPLACE FUNCTION public.civic_merkle_proof_for(p_receipts text[], p_receipt text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_level text[];
  v_next text[];
  v_leaf text := encode(extensions.digest(trim(coalesce(p_receipt, '')), 'sha256'), 'hex');
  v_idx integer;
  v_pos integer;
  v_n integer;
  v_i integer;
  v_left text;
  v_right text;
  v_path jsonb := '[]'::jsonb;
  v_sibling text;
  v_side text;
  v_root text;
BEGIN
  SELECT coalesce(array_agg(encode(extensions.digest(r, 'sha256'), 'hex') ORDER BY r), '{}'::text[]) INTO v_level
  FROM unnest(coalesce(p_receipts, '{}'::text[])) AS r;
  v_root := public.civic_merkle_root_for(p_receipts);
  SELECT i - 1 INTO v_idx FROM generate_subscripts(v_level, 1) AS i WHERE v_level[i] = v_leaf LIMIT 1;
  IF v_idx IS NULL THEN
    RETURN jsonb_build_object('included', false, 'root', v_root, 'leaf', v_leaf, 'count', cardinality(v_level));
  END IF;
  v_pos := v_idx;
  WHILE cardinality(v_level) > 1 LOOP
    v_n := cardinality(v_level);
    IF v_pos % 2 = 0 THEN
      v_sibling := CASE WHEN v_pos + 2 <= v_n THEN v_level[v_pos + 2] ELSE v_level[v_pos + 1] END;
      v_side := 'right';
    ELSE
      v_sibling := v_level[v_pos];
      v_side := 'left';
    END IF;
    v_path := v_path || jsonb_build_object('hash', v_sibling, 'side', v_side);
    v_next := '{}'::text[];
    v_i := 1;
    WHILE v_i <= v_n LOOP
      v_left := v_level[v_i];
      v_right := CASE WHEN v_i + 1 <= v_n THEN v_level[v_i + 1] ELSE v_level[v_i] END;
      v_next := array_append(v_next, encode(extensions.digest(v_left || v_right, 'sha256'), 'hex'));
      v_i := v_i + 2;
    END LOOP;
    v_level := v_next;
    v_pos := v_pos / 2;
  END LOOP;
  RETURN jsonb_build_object('included', true, 'root', v_root, 'leaf', v_leaf, 'index', v_idx, 'count', (SELECT cardinality(public.civic_election_merkle_leaves_count_helper(p_receipts))), 'path', v_path);
END;
$$;

-- Tiny helper so the proof can report the leaf count without re-sorting twice.
CREATE OR REPLACE FUNCTION public.civic_election_merkle_leaves_count_helper(p_receipts text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_receipts, '{}'::text[]);
$$;

CREATE OR REPLACE FUNCTION public.civic_election_merkle_root(p_election_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.civic_merkle_root_for((SELECT coalesce(array_agg(receipt), '{}'::text[]) FROM public.civic_election_receipts(p_election_id)));
$$;

CREATE OR REPLACE FUNCTION public.civic_election_receipt_proof(p_election_id uuid, p_receipt text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.civic_merkle_proof_for((SELECT coalesce(array_agg(receipt), '{}'::text[]) FROM public.civic_election_receipts(p_election_id)), p_receipt);
$$;

REVOKE ALL ON FUNCTION public.civic_merkle_root_for(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_merkle_proof_for(text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_election_merkle_leaves_count_helper(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_election_merkle_root(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_election_receipt_proof(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_election_merkle_root(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.civic_election_receipt_proof(uuid, text) TO anon, authenticated;

-- When voting closes, the commitment is fixed on the election and appended to the public audit chain.
CREATE OR REPLACE FUNCTION public.civic_election_commit_ballot_box()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root text;
  v_count integer;
BEGIN
  IF NEW.status <> 'closed' OR OLD.status = 'closed' THEN
    RETURN NEW;
  END IF;
  v_root := public.civic_election_merkle_root(NEW.id);
  SELECT count(*) INTO v_count FROM public.civic_election_receipts(NEW.id);
  UPDATE public.civic_elections SET ballot_box_commitment = v_root WHERE id = NEW.id;
  PERFORM public.civic_append_election_event(NEW.id, 'ballot_box_committed', jsonb_build_object(
    'merkle_root', v_root, 'count', v_count,
    'leaf', 'sha256(receipt)', 'node', 'sha256(left_hex || right_hex)', 'odd_last', 'pairs with itself'
  ));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS civic_election_commit_ballot_box ON public.civic_elections;
CREATE TRIGGER civic_election_commit_ballot_box
  AFTER UPDATE OF status ON public.civic_elections
  FOR EACH ROW EXECUTE FUNCTION public.civic_election_commit_ballot_box();

NOTIFY pgrst, 'reload schema';

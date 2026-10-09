-- Phase 10.1: the Merkle root over receipts is deterministic, a proof recombines to the root, a foreign receipt is
-- reported as not included, and the election-level functions are callable anonymously.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

DO $$
DECLARE
  v_receipts text[] := ARRAY['r-charlie', 'r-alpha', 'r-bravo', 'r-delta', 'r-echo'];
  v_root text;
  v_proof jsonb;
  v_running text;
  v_step jsonb;
  v_leaf_a text := encode(digest('r-alpha', 'sha256'), 'hex');
  v_leaf_b text := encode(digest('r-bravo', 'sha256'), 'hex');
BEGIN
  v_root := public.civic_merkle_root_for(v_receipts);
  IF length(v_root) <> 64 THEN RAISE EXCEPTION 'root is not a sha256 hex: %', v_root; END IF;
  IF v_root <> public.civic_merkle_root_for(ARRAY['r-echo', 'r-delta', 'r-charlie', 'r-bravo', 'r-alpha']) THEN
    RAISE EXCEPTION 'root depends on input order';
  END IF;
  -- one leaf: the root is the leaf hash; no leaves: sha256 of the empty string
  IF public.civic_merkle_root_for(ARRAY['only']) <> encode(digest('only', 'sha256'), 'hex') THEN RAISE EXCEPTION 'single-leaf root wrong'; END IF;
  IF public.civic_merkle_root_for('{}'::text[]) <> encode(digest('', 'sha256'), 'hex') THEN RAISE EXCEPTION 'empty root wrong'; END IF;
  -- two leaves: root = sha256(leaf_alpha || leaf_bravo) with sorted receipts
  IF public.civic_merkle_root_for(ARRAY['r-bravo', 'r-alpha']) <> encode(digest(v_leaf_a || v_leaf_b, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'two-leaf root wrong';
  END IF;

  v_proof := public.civic_merkle_proof_for(v_receipts, 'r-charlie');
  IF NOT (v_proof->>'included')::boolean THEN RAISE EXCEPTION 'receipt reported as missing'; END IF;
  IF (v_proof->>'index')::int <> 2 OR (v_proof->>'count')::int <> 5 THEN RAISE EXCEPTION 'index/count wrong: %', v_proof; END IF;
  -- recombine the path exactly as a browser would
  v_running := v_proof->>'leaf';
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_proof->'path') LOOP
    IF v_step->>'side' = 'right' THEN
      v_running := encode(digest(v_running || (v_step->>'hash'), 'sha256'), 'hex');
    ELSE
      v_running := encode(digest((v_step->>'hash') || v_running, 'sha256'), 'hex');
    END IF;
  END LOOP;
  IF v_running <> v_root THEN RAISE EXCEPTION 'proof does not recombine to the root (% vs %)', v_running, v_root; END IF;
  -- the odd last leaf (echo) pairs with itself and still proves
  v_proof := public.civic_merkle_proof_for(v_receipts, 'r-echo');
  v_running := v_proof->>'leaf';
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_proof->'path') LOOP
    v_running := CASE WHEN v_step->>'side' = 'right' THEN encode(digest(v_running || (v_step->>'hash'), 'sha256'), 'hex') ELSE encode(digest((v_step->>'hash') || v_running, 'sha256'), 'hex') END;
  END LOOP;
  IF v_running <> v_root THEN RAISE EXCEPTION 'odd-leaf proof does not recombine'; END IF;

  v_proof := public.civic_merkle_proof_for(v_receipts, 'r-zulu');
  IF (v_proof->>'included')::boolean THEN RAISE EXCEPTION 'foreign receipt reported as included'; END IF;
  RAISE NOTICE 'ok: merkle root, proofs and non-inclusion behave';
END $$;

-- election-level functions answer anonymously (the fixture consultation may have zero receipts; the root is still defined)
SET LOCAL ROLE anon;
DO $$
DECLARE v_root text; v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'skip: fixture consultation absent'; RETURN; END IF;
  v_root := public.civic_election_merkle_root(v_id);
  IF length(v_root) <> 64 THEN RAISE EXCEPTION 'election root missing'; END IF;
  IF (public.civic_election_receipt_proof(v_id, 'not-a-receipt')->>'included')::boolean THEN RAISE EXCEPTION 'bogus receipt included'; END IF;
  RAISE NOTICE 'ok: anonymous root and proof calls work';
END $$;
RESET ROLE;

ROLLBACK;

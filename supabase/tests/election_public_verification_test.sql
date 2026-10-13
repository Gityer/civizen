-- v2 step C4: signed-out readers can locate an election's sealed ballot box in the public audit log.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

INSERT INTO public.civic_elections (id, title, summary, body, tier, security_class, status, voting_opens_at, voting_closes_at, metadata)
SELECT '7f000000-0000-4000-8000-000000000001', 'Verification test', 'test', 'test', e.tier, e.security_class, 'open',
       now() - interval '2 days', now() + interval '1 day', '{}'::jsonb
FROM (SELECT tier, security_class FROM public.civic_elections LIMIT 1) e;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.civic_election_audit_anchor('7f000000-0000-4000-8000-000000000001')) THEN
    RAISE EXCEPTION 'an open election reported a sealed ballot box';
  END IF;
  RAISE NOTICE 'ok: nothing sealed while voting is open';
END $$;

RESET ROLE;
UPDATE public.civic_elections SET status = 'closed', voting_closes_at = now() - interval '1 minute'
WHERE id = '7f000000-0000-4000-8000-000000000001';

SET LOCAL ROLE anon;
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.civic_election_audit_anchor('7f000000-0000-4000-8000-000000000001');
  IF NOT FOUND THEN RAISE EXCEPTION 'closing did not seal the ballot box'; END IF;
  IF r.committed_root IS DISTINCT FROM public.civic_election_merkle_root('7f000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'sealed root % differs from the live root', r.committed_root;
  END IF;
  IF r.committed_count <> 0 THEN RAISE EXCEPTION 'empty ballot box reported % receipts', r.committed_count; END IF;
  RAISE NOTICE 'ok: signed-out readers see the sealing event and its root';
END $$;

ROLLBACK;

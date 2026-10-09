-- Seeded demonstration programs are flagged as demo and their children inherit the flag (decision D5).
-- Local database only; rolls back.

BEGIN;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.contribution_programs WHERE seed_key IS NOT NULL AND NOT is_demo;
  IF n <> 0 THEN RAISE EXCEPTION '% seeded programs are not flagged as demo', n; END IF;
  SELECT count(*) INTO n FROM public.contribution_programs WHERE seed_key IS NULL AND is_demo;
  IF n <> 0 THEN RAISE EXCEPTION '% real programs are flagged as demo', n; END IF;
  RAISE NOTICE 'ok: seeded programs are demo, real programs are not';
END $$;

DO $$
DECLARE v_program uuid; v_owner uuid; v_demo boolean;
BEGIN
  SELECT id, publisher_profile_id INTO v_program, v_owner FROM public.contribution_programs WHERE is_demo LIMIT 1;
  IF v_program IS NULL THEN RAISE NOTICE 'skip: no demo program seeded locally'; RETURN; END IF;
  INSERT INTO public.community_challenges (program_id, publisher_profile_id, title, problem_statement, why_it_matters, success_criteria, status)
  VALUES (v_program, v_owner, 'Demo flag inheritance check', 'A challenge created under a demo program.', 'Must inherit the demo flag.', 'The flag is true.', 'draft')
  RETURNING is_demo INTO v_demo;
  IF NOT v_demo THEN RAISE EXCEPTION 'challenge under a demo program did not inherit is_demo'; END IF;
  RAISE NOTICE 'ok: children inherit the demo flag on insert';
END $$;

ROLLBACK;

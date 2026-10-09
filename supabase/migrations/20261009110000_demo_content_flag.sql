-- Decision D5 (2026-10-08): the seeded demonstration programs stay in production but are marked as
-- demo and left out of the default browse lists, so founder-authored samples are not presented as
-- community activity. Children (challenges, knowledge spaces, opportunities) inherit the flag from
-- their program, on backfill and on insert.

ALTER TABLE public.contribution_programs ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_challenges ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.knowledge_spaces ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.contribution_opportunities ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Seeded programs carry a seed_key; nothing else does.
UPDATE public.contribution_programs SET is_demo = true WHERE seed_key IS NOT NULL;

UPDATE public.community_challenges c SET is_demo = true
FROM public.contribution_programs p WHERE p.id = c.program_id AND p.is_demo;
UPDATE public.knowledge_spaces k SET is_demo = true
FROM public.contribution_programs p WHERE p.id = k.program_id AND p.is_demo;
UPDATE public.contribution_opportunities o SET is_demo = true
FROM public.contribution_programs p WHERE p.id = o.program_id AND p.is_demo;

CREATE OR REPLACE FUNCTION public.inherit_program_demo_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    SELECT p.is_demo INTO NEW.is_demo FROM public.contribution_programs p WHERE p.id = NEW.program_id;
    NEW.is_demo := coalesce(NEW.is_demo, false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_challenges_inherit_demo ON public.community_challenges;
CREATE TRIGGER community_challenges_inherit_demo
  BEFORE INSERT ON public.community_challenges
  FOR EACH ROW EXECUTE FUNCTION public.inherit_program_demo_flag();

DROP TRIGGER IF EXISTS knowledge_spaces_inherit_demo ON public.knowledge_spaces;
CREATE TRIGGER knowledge_spaces_inherit_demo
  BEFORE INSERT ON public.knowledge_spaces
  FOR EACH ROW EXECUTE FUNCTION public.inherit_program_demo_flag();

DROP TRIGGER IF EXISTS contribution_opportunities_inherit_demo ON public.contribution_opportunities;
CREATE TRIGGER contribution_opportunities_inherit_demo
  BEFORE INSERT ON public.contribution_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.inherit_program_demo_flag();

CREATE INDEX IF NOT EXISTS idx_community_challenges_is_demo ON public.community_challenges (is_demo);
CREATE INDEX IF NOT EXISTS idx_knowledge_spaces_is_demo ON public.knowledge_spaces (is_demo);
CREATE INDEX IF NOT EXISTS idx_contribution_opportunities_is_demo ON public.contribution_opportunities (is_demo);

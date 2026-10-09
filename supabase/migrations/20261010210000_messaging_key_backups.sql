-- Phase 7 step 7.1: an encrypted copy of a member's private messaging key, protected by a recovery code that only the
-- member knows, so the same messaging identity can be restored on another device. Owner-only in every direction.
CREATE TABLE IF NOT EXISTS public.messaging_key_backups (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  blob jsonb NOT NULL,
  public_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messaging_key_backups_blob_object CHECK (jsonb_typeof(blob) = 'object'),
  CONSTRAINT messaging_key_backups_public_key_not_empty CHECK (length(trim(public_key)) > 0)
);

ALTER TABLE public.messaging_key_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own messaging key backup" ON public.messaging_key_backups;
CREATE POLICY "Members read their own messaging key backup" ON public.messaging_key_backups
  FOR SELECT USING (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS "Members write their own messaging key backup" ON public.messaging_key_backups;
CREATE POLICY "Members write their own messaging key backup" ON public.messaging_key_backups
  FOR INSERT WITH CHECK (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS "Members update their own messaging key backup" ON public.messaging_key_backups;
CREATE POLICY "Members update their own messaging key backup" ON public.messaging_key_backups
  FOR UPDATE USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS "Members delete their own messaging key backup" ON public.messaging_key_backups;
CREATE POLICY "Members delete their own messaging key backup" ON public.messaging_key_backups
  FOR DELETE USING (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messaging_key_backups TO authenticated;

-- Account deletion removes the backup together with the messaging public key.
CREATE OR REPLACE FUNCTION public.messaging_key_backups_on_profile_key_cleared()
RETURNS trigger AS $$
BEGIN
  IF NEW.messaging_x25519_public_key IS NULL AND OLD.messaging_x25519_public_key IS NOT NULL AND NEW.deleted_at IS NOT NULL THEN
    DELETE FROM public.messaging_key_backups WHERE profile_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deleted_at') THEN
    DROP TRIGGER IF EXISTS messaging_key_backups_on_profile_key_cleared ON public.profiles;
    CREATE TRIGGER messaging_key_backups_on_profile_key_cleared
      AFTER UPDATE OF messaging_x25519_public_key ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.messaging_key_backups_on_profile_key_cleared();
  END IF;
END $$;

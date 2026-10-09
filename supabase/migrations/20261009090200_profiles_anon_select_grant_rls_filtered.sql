-- Follow-up to 20261009090000: revoking the anon table privilege made every anonymous embedded join on
-- profiles fail (PostgREST returns 401 permission denied for the whole query, e.g. guest Market listings
-- with their seller). Anonymous visitors keep the SELECT privilege, and the row-level policy (signed-in
-- members only) still returns them zero rows, so embeds come back null instead of erroring.

GRANT SELECT ON public.profiles TO anon;

/**
 * Publishes the first real consultation through the existing
 * Matter → voting proposal → publish_voting_proposal path.
 *
 * Idempotent on metadata.consultation_key = single-world-citizenship.
 * Does not insert ballots. Does not alter unrelated elections.
 *
 * Run: npx tsx scripts/publish-single-world-citizenship.ts
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import {
  SINGLE_WORLD_CITIZENSHIP_BODY,
  SINGLE_WORLD_CITIZENSHIP_KEY,
  SINGLE_WORLD_CITIZENSHIP_QUESTION,
  SINGLE_WORLD_CITIZENSHIP_TITLE,
} from '../src/lib/civic-voting/single-world-citizenship.ts';

const delimiter = '$swc_copy$';
for (const part of [
  SINGLE_WORLD_CITIZENSHIP_TITLE,
  SINGLE_WORLD_CITIZENSHIP_QUESTION,
  SINGLE_WORLD_CITIZENSHIP_BODY,
  SINGLE_WORLD_CITIZENSHIP_KEY,
]) {
  if (part.includes(delimiter)) {
    throw new Error('Consultation copy contains the SQL delimiter');
  }
}

const sql = `
DO $$
DECLARE
  v_founder_user uuid;
  v_founder_profile uuid;
  v_org uuid;
  v_existing_id uuid;
  v_existing_title text;
  v_existing_summary text;
  v_existing_body text;
  v_matter uuid;
  v_proposal uuid;
  v_election uuid;
  v_title text := ${delimiter}${SINGLE_WORLD_CITIZENSHIP_TITLE}${delimiter};
  v_question text := ${delimiter}${SINGLE_WORLD_CITIZENSHIP_QUESTION}${delimiter};
  v_body text := ${delimiter}${SINGLE_WORLD_CITIZENSHIP_BODY}${delimiter};
  v_key text := ${delimiter}${SINGLE_WORLD_CITIZENSHIP_KEY}${delimiter};
BEGIN
  SELECT e.id, e.title, e.summary, e.body
    INTO v_existing_id, v_existing_title, v_existing_summary, v_existing_body
  FROM public.civic_elections e
  WHERE e.metadata->>'consultation_key' = v_key
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    SELECT e.id, e.title, e.summary, e.body
      INTO v_existing_id, v_existing_title, v_existing_summary, v_existing_body
    FROM public.civic_elections e
    WHERE e.title = v_title
      AND coalesce(e.metadata->>'sample_batch', '') = ''
      AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_title IS DISTINCT FROM v_title
       OR v_existing_summary IS DISTINCT FROM v_question
       OR v_existing_body IS DISTINCT FROM v_body THEN
      RAISE EXCEPTION 'existing_consultation_wording_differs';
    END IF;
    UPDATE public.civic_elections
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'consultation_key', v_key,
      'consultation_kind', 'nonbinding',
      'catalog', 'live'
    )
    WHERE id = v_existing_id
      AND coalesce(metadata->>'consultation_key', '') = '';
    UPDATE public.civic_voting_proposals
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('consultation_key', v_key)
    WHERE election_id = v_existing_id
      AND coalesce(metadata->>'consultation_key', '') = '';
    RAISE NOTICE 'consultation_already_published %', v_existing_id;
    RETURN;
  END IF;

  SELECT p.user_id, p.id
    INTO v_founder_user, v_founder_profile
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND p.role = 'founder'
    AND p.username = 'maturehumanity'
  LIMIT 1;

  IF v_founder_user IS NULL OR v_founder_profile IS NULL THEN
    RAISE EXCEPTION 'founder_profile_required';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_founder_user::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_founder_user, 'role', 'authenticated')::text,
    true
  );

  IF public.current_profile_id() IS DISTINCT FROM v_founder_profile THEN
    RAISE EXCEPTION 'founder_session_not_established';
  END IF;
  IF NOT public.civic_can_manage_voting_proposals(v_founder_profile) THEN
    RAISE EXCEPTION 'founder_cannot_publish';
  END IF;

  v_org := public.resolve_civizen_org_profile();
  IF v_org IS NULL OR v_org = v_founder_profile THEN
    RAISE EXCEPTION 'civizen_org_profile_required';
  END IF;

  v_matter := public.create_matter(jsonb_build_object(
    'title', v_title,
    'description', v_question || E'\\n\\n' || v_body,
    'matter_type', 'question',
    'initiator_kind', 'person',
    'initiator_profile_id', v_founder_profile,
    'addressee_kind', 'organization',
    'addressee_profile_id', v_org,
    'visibility', 'public',
    'scope_kind', 'global',
    'submit', true
  ));

  v_proposal := public.create_voting_proposal_from_matter(
    v_matter,
    v_title,
    v_question,
    v_body,
    NULL
  );

  UPDATE public.civic_voting_proposals
  SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('consultation_key', v_key)
  WHERE id = v_proposal;

  v_election := public.publish_voting_proposal(v_proposal);

  UPDATE public.civic_elections
  SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'consultation_key', v_key,
    'consultation_kind', 'nonbinding',
    'catalog', 'live'
  )
  WHERE id = v_election;

  IF EXISTS (
    SELECT 1 FROM public.civic_ballots WHERE election_id = v_election
  ) THEN
    RAISE EXCEPTION 'publication_must_not_create_ballots';
  END IF;
END $$;

SELECT
  e.id AS election_id,
  e.title,
  e.summary,
  e.status,
  e.security_class,
  e.scope_country_code,
  e.voting_opens_at,
  e.voting_closes_at,
  e.metadata->>'consultation_key' AS consultation_key,
  e.metadata->>'consultation_kind' AS consultation_kind,
  e.metadata->>'catalog' AS catalog,
  coalesce(e.metadata->>'sample_batch', '') AS sample_batch,
  p.id AS proposal_id,
  p.status AS proposal_status,
  p.scope_kind,
  p.published_at,
  (SELECT count(*) FROM public.civic_ballots b WHERE b.election_id = e.id) AS ballots,
  (SELECT count(*) FROM public.civic_candidates c
     JOIN public.civic_contests ct ON ct.id = c.contest_id
    WHERE ct.election_id = e.id) AS options
FROM public.civic_elections e
LEFT JOIN public.civic_voting_proposals p ON p.election_id = e.id
WHERE e.metadata->>'consultation_key' = '${SINGLE_WORLD_CITIZENSHIP_KEY}';
`;

const file = '/tmp/civizen-publish-single-world-citizenship.sql';
writeFileSync(file, sql);
const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], {
  encoding: 'utf8',
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

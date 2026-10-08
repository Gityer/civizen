import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Local-only authorization harness.
 * Skipped unless all of the following are set and the URL is loopback:
 *   CIVIZEN_OPPORTUNITY_AUTH_TEST=1
 *   CIVIZEN_LOCAL_SUPABASE_URL
 *   CIVIZEN_LOCAL_SUPABASE_ANON_KEY
 *   CIVIZEN_LOCAL_SUPABASE_SERVICE_ROLE_KEY
 *
 * This does not run against the remote application database.
 */
function localHarness() {
  const enabled = process.env.CIVIZEN_OPPORTUNITY_AUTH_TEST === '1';
  const url = process.env.CIVIZEN_LOCAL_SUPABASE_URL?.trim() || '';
  const anon = process.env.CIVIZEN_LOCAL_SUPABASE_ANON_KEY?.trim() || '';
  const service = process.env.CIVIZEN_LOCAL_SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  const local = /localhost|127\.0\.0\.1/.test(url);
  if (!enabled || !local || !anon || !service) return null;
  return { url, anon, service };
}

const harness = localHarness();

type SessionClient = {
  client: SupabaseClient;
  userId: string;
  profileId: string;
  email: string;
  password: string;
};

async function signIn(url: string, anon: string, email: string, password: string): Promise<SessionClient> {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error('sign_in_failed');
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (profileError || !profile?.id) throw profileError ?? new Error('profile_missing');
  return { client, userId: data.user.id, profileId: String(profile.id), email, password };
}

describe.skipIf(!harness)('Slice 1 authorization (local supabase)', () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'AuthTest-pass-9!';
  let admin: SupabaseClient;
  let publisher: SessionClient;
  let owner: SessionClient;
  let participant: SessionClient;
  let stranger: SessionClient;
  let opportunityId = '';
  let draftId = '';
  let participationId = '';
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    if (!harness) return;
    admin = createClient(harness.url, harness.service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const makeUser = async (role: string, fullName: string) => {
      const email = `slice1-${role}-${suffix}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, username: `slice1_${role}_${suffix}` },
      });
      if (error || !data.user) throw error ?? new Error('create_user_failed');
      createdUserIds.push(data.user.id);
      return signIn(harness.url, harness.anon, email, password);
    };
    owner = await makeUser('owner', 'Linked Owner');
    publisher = await makeUser('publisher', 'Publisher Org');
    participant = await makeUser('participant', 'Ada Example');
    stranger = await makeUser('stranger', 'Unrelated Profile');
    const { error: linkError } = await admin.from('linked_accounts').insert({
      owner_profile_id: owner.profileId,
      linked_profile_id: publisher.profileId,
      relationship_type: 'business',
      business_name_normalized: `publisher org ${suffix}`,
      established_at: new Date().toISOString(),
      established_via: 'session_handshake',
    });
    if (linkError) throw linkError;

    const { data: draft, error: draftError } = await publisher.client.rpc('create_contribution_opportunity', {
      payload: { title: 'Draft clinic note', summary: 'Internal draft only.', status: 'draft' },
    });
    if (draftError || !draft) throw draftError ?? new Error('create_draft_failed');
    draftId = String(draft);

    const { data: openId, error: openError } = await publisher.client.rpc('create_contribution_opportunity', {
      payload: {
        title: 'Open clinic note',
        summary: 'Public contribution work.',
        status: 'open',
        evaluation_dimensions: ['quality', 'impact'],
      },
    });
    if (openError || !openId) throw openError ?? new Error('create_open_failed');
    opportunityId = String(openId);
  }, 60_000);

  afterAll(async () => {
    if (!harness) return;
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it('lets an unrelated profile read open opportunities but not drafts, applications, evidence, or evaluations', async () => {
    const { data: openRows, error: openError } = await stranger.client
      .from('contribution_opportunities')
      .select('id, status')
      .eq('id', opportunityId);
    expect(openError).toBeNull();
    expect(openRows).toEqual([{ id: opportunityId, status: 'open' }]);

    const { data: draftRows, error: draftError } = await stranger.client
      .from('contribution_opportunities')
      .select('id')
      .eq('id', draftId);
    expect(draftError).toBeNull();
    expect(draftRows ?? []).toEqual([]);

    const { data: parts } = await stranger.client
      .from('opportunity_participations')
      .select('id')
      .eq('opportunity_id', opportunityId);
    expect(parts ?? []).toEqual([]);
  });

  it('lets a participant read only their own participation and evidence', async () => {
    const { data: applied, error: applyError } = await participant.client.rpc('apply_to_contribution_opportunity', {
      p_opportunity_id: opportunityId,
      p_message: 'I can help.',
    });
    expect(applyError).toBeNull();
    participationId = String(applied);

    const { data: mine } = await participant.client
      .from('opportunity_participations')
      .select('id, participant_profile_id')
      .eq('opportunity_id', opportunityId);
    expect(mine).toEqual([{ id: participationId, participant_profile_id: participant.profileId }]);

    const { data: identities } = await participant.client.rpc('list_opportunity_applicant_identities', {
      p_opportunity_id: opportunityId,
    });
    expect(identities ?? []).toEqual([]);

    await publisher.client.rpc('review_opportunity_application', {
      p_participation_id: participationId,
      p_decision: 'accept',
    });
    await participant.client.rpc('start_opportunity_work', { p_participation_id: participationId });
    await participant.client.rpc('add_opportunity_evidence', {
      p_participation_id: participationId,
      p_description: 'Wrote the intake note.',
      p_reference_url: 'https://example.test/note',
    });

    const { data: evidence } = await participant.client
      .from('opportunity_participation_evidence')
      .select('description')
      .eq('participation_id', participationId);
    expect(evidence?.length).toBe(1);

    const { data: strangerEvidence } = await stranger.client
      .from('opportunity_participation_evidence')
      .select('id')
      .eq('participation_id', participationId);
    expect(strangerEvidence ?? []).toEqual([]);
  });

  it('lets the publisher and linked-account owner manage the opportunity and review participants', async () => {
    const { data: publisherParts } = await publisher.client
      .from('opportunity_participations')
      .select('id')
      .eq('opportunity_id', opportunityId);
    expect(publisherParts?.map((row) => row.id)).toContain(participationId);

    const { data: ownerParts } = await owner.client
      .from('opportunity_participations')
      .select('id')
      .eq('opportunity_id', opportunityId);
    expect(ownerParts?.map((row) => row.id)).toContain(participationId);

    const { data: identities, error } = await owner.client.rpc('list_opportunity_applicant_identities', {
      p_opportunity_id: opportunityId,
    });
    expect(error).toBeNull();
    expect(identities?.[0]).toMatchObject({
      participation_id: participationId,
      profile_id: participant.profileId,
    });
    expect(String(identities?.[0]?.display_name || identities?.[0]?.username || '')).not.toBe('');
  });

  it('rejects organizer RPCs from an unrelated profile', async () => {
    const { error } = await stranger.client.rpc('review_opportunity_application', {
      p_participation_id: participationId,
      p_decision: 'decline',
    });
    expect(error?.message ?? '').toMatch(/not_authorized/i);
  });

  it('prevents a participant from evaluating their own work', async () => {
    await participant.client.rpc('submit_opportunity_work', { p_participation_id: participationId });
    const { error: assessBeforeVerify } = await publisher.client.rpc('record_opportunity_work_assessment', {
      p_participation_id: participationId,
      p_scores: { quality: 90 },
    });
    expect(assessBeforeVerify?.message ?? '').toMatch(/work_not_verified/i);

    const { error } = await participant.client.rpc('evaluate_opportunity_work', {
      p_participation_id: participationId,
      p_decision: 'verified',
    });
    expect(error?.message ?? '').toMatch(/self_evaluation_forbidden|not_authorized/i);
  });

  it('projects exactly one contribution event after repeated verified projection', async () => {
    const { error } = await publisher.client.rpc('evaluate_opportunity_work', {
      p_participation_id: participationId,
      p_decision: 'verified',
      p_quality_score: 80,
      p_impact_score: 70,
    });
    expect(error).toBeNull();
    await publisher.client.rpc('project_opportunity_contribution_event', {
      p_participation_id: participationId,
    });
    await publisher.client.rpc('project_opportunity_contribution_event', {
      p_participation_id: participationId,
    });
    const { data: events } = await admin
      .from('profile_contribution_events')
      .select('id')
      .eq('source_table', 'opportunity_participations')
      .eq('source_id', participationId);
    expect(events).toHaveLength(1);
  });

  it('keeps evaluation independent of verification and blocks unauthorized assessors', async () => {
    const { data: events } = await admin
      .from('profile_contribution_events')
      .select('capacity_estimate, impact_estimate, collaboration_estimate')
      .eq('source_table', 'opportunity_participations')
      .eq('source_id', participationId);
    expect(events).toHaveLength(1);
    const before = events?.[0];

    const { error: publisherAssess } = await publisher.client.rpc('record_opportunity_work_assessment', {
      p_participation_id: participationId,
      p_scores: { quality: 90 },
    });
    expect(publisherAssess).toBeNull();

    const { error: selfAssess } = await participant.client.rpc('record_opportunity_work_assessment', {
      p_participation_id: participationId,
      p_scores: { quality: 99 },
    });
    expect(selfAssess?.message ?? '').toMatch(/self_evaluation_forbidden|not_authorized/i);

    const { error: strangerAssess } = await stranger.client.rpc('record_opportunity_work_assessment', {
      p_participation_id: participationId,
      p_scores: { quality: 10 },
    });
    expect(strangerAssess?.message ?? '').toMatch(/not_authorized/i);

    const { data: assessments } = await participant.client
      .from('opportunity_work_assessments')
      .select('quality_score, impact_score')
      .eq('participation_id', participationId);
    expect(assessments).toEqual([{ quality_score: 90, impact_score: null }]);

    const { data: strangerRows } = await stranger.client
      .from('opportunity_work_assessments')
      .select('id')
      .eq('participation_id', participationId);
    expect(strangerRows ?? []).toEqual([]);

    const { data: afterEvents } = await admin
      .from('profile_contribution_events')
      .select('capacity_estimate, collaboration_estimate')
      .eq('source_table', 'opportunity_participations')
      .eq('source_id', participationId);
    expect(afterEvents).toHaveLength(1);
    expect(afterEvents?.[0]?.capacity_estimate).toBe(90);
    expect(before?.capacity_estimate).not.toBe(90);
  });
});

import { supabase } from '@/integrations/supabase/client';

/** What my_getting_started() reports (v2 step B4). */
export type FirstStepsState = {
  lesson: boolean;
  voted: boolean;
  voteCounts: boolean;
  matter: boolean;
  verificationStarted: boolean;
  verified: boolean;
  profile: boolean;
  openElectionId: string | null;
};

export type FirstStepKey = 'lesson' | 'vote' | 'matter' | 'verify' | 'profile';
export type FirstStep = { key: FirstStepKey; done: boolean; href: string };

export function mapFirstSteps(data: unknown): FirstStepsState | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    lesson: row.lesson === true,
    voted: row.voted === true,
    voteCounts: row.vote_counts === true,
    matter: row.matter === true,
    verificationStarted: row.verification_started === true,
    verified: row.verified === true,
    profile: row.profile === true,
    openElectionId: typeof row.open_election_id === 'string' ? row.open_election_id : null,
  };
}

/** The steps in the order a newcomer meets them; the vote step only while a consultation is open or once voted. */
export function firstSteps(state: FirstStepsState): FirstStep[] {
  const steps: FirstStep[] = [
    { key: 'lesson', done: state.lesson, href: '/study/paths' },
  ];
  if (state.openElectionId || state.voted) {
    steps.push({ key: 'vote', done: state.voted, href: state.openElectionId ? `/governance/voting/${state.openElectionId}` : '/governance' });
  }
  steps.push(
    { key: 'matter', done: state.matter, href: '/contribute/matters' },
    { key: 'verify', done: state.verificationStarted, href: '/settings/profile' },
    { key: 'profile', done: state.profile, href: '/profile' },
  );
  return steps;
}

export async function loadFirstSteps(): Promise<FirstStepsState | null> {
  const { data, error } = await supabase.rpc('my_getting_started');
  if (error) return null;
  return mapFirstSteps(data);
}

const DISMISS_KEY = 'civizen.firstSteps.dismissed';

export function isFirstStepsDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissFirstSteps(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // the card simply comes back next time
  }
}

import { supabase } from '@/integrations/supabase/client';

/** What waits for the signed-in member on the Contribute hub, and the open items per lane (plan step D4). */
export type ContributeWaiting = {
  actionsDue: number;
  proposalsToSupport: number;
  ballotsOpen: number;
  challenges: number;
  knowledge: number;
};

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

export function parseContributeWaiting(raw: unknown): ContributeWaiting {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    actionsDue: count(row.actions_due),
    proposalsToSupport: count(row.proposals_to_support),
    ballotsOpen: count(row.ballots_open),
    challenges: count(row.challenges),
    knowledge: count(row.knowledge),
  };
}

export async function loadContributeWaiting(): Promise<ContributeWaiting> {
  const { data, error } = await supabase.rpc('contribute_waiting_for_me');
  if (error) throw error;
  return parseContributeWaiting(data);
}

/** The strip's items, in order, with where each leads; items with nothing waiting are left out. */
export const WAITING_ITEMS = [
  { field: 'actionsDue', path: '/contribute/matters?view=needs_action', labelKey: 'contribute.waiting.actionsDue' },
  { field: 'proposalsToSupport', path: '/governance', labelKey: 'contribute.waiting.proposalsToSupport' },
  { field: 'ballotsOpen', path: '/governance/voting', labelKey: 'contribute.waiting.ballotsOpen' },
] as const;

/** Lane ids that show how many items are open in them. */
export const LANE_COUNT_FIELDS: Partial<Record<string, 'challenges' | 'knowledge'>> = {
  challenges: 'challenges',
  knowledge: 'knowledge',
};

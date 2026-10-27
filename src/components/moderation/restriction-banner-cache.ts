import type { EnforcementAction } from '@/lib/member-enforcement';

const CACHE_MS = 60_000;
let entry: { profileId: string; at: number; actions: EnforcementAction[] } | null = null;

/** One minute of the member's own decisions, so the banner does not reload them on every page. */
export const restrictionCache = {
  get(profileId: string): EnforcementAction[] | null {
    return entry && entry.profileId === profileId && Date.now() - entry.at < CACHE_MS ? entry.actions : null;
  },
  set(profileId: string, actions: EnforcementAction[]): void {
    entry = { profileId, at: Date.now(), actions };
  },
  /** A fresh decision (an appeal sent, a step applied) shows at once. */
  reset(): void {
    entry = null;
  },
};

export type FirstRunStepId = 'photo' | 'bio' | 'background' | 'post' | 'endorse';

export type FirstRunStep = { id: FirstRunStepId; done: boolean };

export type FirstRunInput = {
  avatarUrl: string | null | undefined;
  bio: string | null | undefined;
  skillCount: number;
  experienceCount: number;
  postCount: number;
  endorsementsGivenCount: number;
};

/** The few things that make a new member's page and feed useful, in the order we suggest them. */
export function buildFirstRunSteps(input: FirstRunInput): FirstRunStep[] {
  return [
    { id: 'photo', done: Boolean(input.avatarUrl?.trim()) },
    { id: 'bio', done: Boolean(input.bio?.trim()) },
    { id: 'background', done: input.skillCount + input.experienceCount > 0 },
    { id: 'post', done: input.postCount > 0 },
    { id: 'endorse', done: input.endorsementsGivenCount > 0 },
  ];
}

export function isFirstRunComplete(steps: FirstRunStep[]): boolean {
  return steps.every((step) => step.done);
}

const dismissKey = (profileId: string) => `civizen:first-run-dismissed:${profileId}`;

export function isFirstRunDismissed(profileId: string): boolean {
  try {
    return window.localStorage.getItem(dismissKey(profileId)) === '1';
  } catch {
    return false;
  }
}

export function dismissFirstRun(profileId: string): void {
  try {
    window.localStorage.setItem(dismissKey(profileId), '1');
  } catch {
    // Storage can be unavailable (private mode); the card simply shows again next visit.
  }
}

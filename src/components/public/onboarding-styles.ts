import { cn } from '@/lib/utils';

export const onboardingContainerClass = 'mx-auto w-full max-w-3xl space-y-10 sm:space-y-12';

export const onboardingSectionTitleClass =
  'font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl';

export const onboardingSectionLeadClass = 'text-sm leading-relaxed text-foreground/75 sm:text-base';

/** Grouped list: one bordered card, one item per row with hairline dividers. */
export const onboardingGroupClass =
  'divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-card/50';

export const onboardingRowClass = 'flex h-full w-full items-center gap-3 px-4 py-3 text-left transition-colors';

/**
 * Large screens: the same grouped card as two columns. Pair with `onboardingGroupGridItemClass` on each `li`.
 * An odd last item spans both columns so no empty cell is left.
 */
export const onboardingGroupGridClass = 'lg:grid lg:grid-cols-2 lg:divide-y-0';

export const onboardingGroupGridItemClass =
  'lg:border-b lg:border-border/50 lg:odd:border-r lg:last:border-b-0 lg:last:odd:col-span-2 lg:last:odd:border-r-0 lg:[&:nth-last-child(2):odd]:border-b-0';

/** Secondary row text: small on phones, one step up on large screens. */
export const onboardingRowDetailClass = 'text-xs leading-snug text-muted-foreground lg:text-[0.8125rem]';

export function onboardingIconTile(className?: string) {
  return cn(
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary',
    className,
  );
}

import { cn } from '@/lib/utils';

export const onboardingContainerClass = 'mx-auto w-full max-w-3xl space-y-10 sm:space-y-12';

export const onboardingSectionTitleClass =
  'font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl';

export const onboardingSectionLeadClass = 'text-sm leading-relaxed text-foreground/75 sm:text-base';

export function onboardingIconTile(className?: string) {
  return cn(
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary',
    className,
  );
}

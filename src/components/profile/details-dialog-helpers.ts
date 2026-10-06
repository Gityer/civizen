import { cn } from '@/lib/utils';

/** Shared by the Education, Experience, Training and Skills detail dialogs. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const AUTOSAVE_MS = 650;

export function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function selectedOptionClass(selected: boolean): string {
  return cn(
    selected &&
      'bg-primary/20 text-foreground data-[selected=true]:bg-primary/30 data-[selected=true]:text-foreground',
  );
}

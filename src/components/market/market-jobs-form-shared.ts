import { useEffect, useState, type ReactNode } from 'react';

export function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() || '';
}

export type SentenceTokenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  empty: boolean;
  /** When false, empty tokens keep the accent color (used for cycling job types). */
  dimWhenEmpty?: boolean;
  /** Secondary dropdowns stay quieter so job type, place, and pay stay first. */
  emphasis?: 'primary' | 'secondary';
  children: ReactNode;
  panel: ReactNode;
  contentClassName?: string;
  triggerClassName?: string;
  onHoverChange?: (hovered: boolean) => void;
};

export function useCyclingIndex(length: number, enabled: boolean, paused: boolean) {
  const [index, setIndex] = useState(0);
  const [preferReducedMotion, setPreferReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPreferReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!enabled || paused || preferReducedMotion || length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [enabled, paused, preferReducedMotion, length]);

  return index;
}

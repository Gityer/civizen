import { useEffect, useState } from 'react';

/** Cycles through example options inside a sentence token; static when paused or reduced motion is on. */
export function CyclingOptionsLabel({
  options,
  active,
  paused,
  fallback,
}: {
  options: readonly string[];
  active: boolean;
  paused: boolean;
  fallback: string;
}) {
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
    if (!active || paused || preferReducedMotion || options.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % options.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [active, paused, preferReducedMotion, options]);

  if (!active || options.length === 0) return <>{fallback}</>;
  const label = options[index % options.length] ?? fallback;
  return (
    <span className="inline-block min-w-[4.5ch] transition-opacity duration-300" aria-hidden>
      {label}
    </span>
  );
}

import { useEffect, useState } from 'react';

import { DESKTOP_MIN_WIDTH_PX } from '@/lib/responsive-layout';

function readIsDesktop() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`).matches;
}

/** True at Tailwind `lg` and above — signed-in side rail / public primary nav band. */
export function useIsDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(readIsDesktop);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}

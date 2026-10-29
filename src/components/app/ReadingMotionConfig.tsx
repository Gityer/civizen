import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { MotionConfig } from 'framer-motion';

import { getReadingPreferences, subscribeReadingPreferences } from '@/lib/reading-preferences';

/** Framer Motion follows the device's reduced-motion setting, or always reduces when the member chose so in Settings. */
export function ReadingMotionConfig({ children }: { children: ReactNode }) {
  const motion = useSyncExternalStore(subscribeReadingPreferences, () => getReadingPreferences().motion, () => 'device');
  return <MotionConfig reducedMotion={motion === 'reduce' ? 'always' : 'user'}>{children}</MotionConfig>;
}

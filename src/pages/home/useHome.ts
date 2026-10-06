import { useHomeCore } from '@/pages/home/useHomeCore';
import { useHomeFeed } from '@/pages/home/useHomeFeed';
import { useHomePostActions } from '@/pages/home/useHomePostActions';
import { useHomeContent } from '@/pages/home/useHomeContent';
import { useHomeEngagement } from '@/pages/home/useHomeEngagement';

export function useHome() {
  const a = useHomeCore();
  const b = useHomeFeed({ ...a });
  const c = useHomePostActions({ ...a, ...b });
  const d = useHomeContent({ ...a, ...b, ...c });
  const e = useHomeEngagement({ ...a, ...b });
  return { ...a, ...b, ...c, ...d, ...e };
}

import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  VIEW_MARGIN,
  clampSize,
  type PanelSize,
} from '@/components/public/civi-widget-layout';
import type { HistoryTurn } from '@/lib/assistant/types';

export const STORAGE_KEY = 'civizen.public-civi';
export const SIZE_KEY = 'civizen.public-civi-size';

export type ChatItem = HistoryTurn & { id: string };

export function loadSize(): PanelSize {
  if (typeof window === 'undefined') return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  try {
    const raw = window.localStorage.getItem(SIZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PanelSize>;
      if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return clampSize(parsed.width, parsed.height);
      }
    }
  } catch {
    /* ignore */
  }
  return clampSize(Math.min(window.innerWidth - VIEW_MARGIN, DEFAULT_WIDTH), Math.min(window.innerHeight * 0.7, DEFAULT_HEIGHT));
}

export function persistSize(size: PanelSize) {
  try {
    window.localStorage.setItem(SIZE_KEY, JSON.stringify(size));
  } catch {
    /* ignore */
  }
}

export function loadStored(): ChatItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && (row.role === 'user' || row.role === 'assistant') && typeof row.content === 'string')
      .map((row, index) => ({
        id: row.id || `stored-${index}`,
        role: row.role,
        content: row.content,
      }));
  } catch {
    return [];
  }
}

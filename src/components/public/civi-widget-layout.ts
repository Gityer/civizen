export const DEFAULT_WIDTH = 352;

export const DEFAULT_HEIGHT = 448;

export const MIN_WIDTH = 280;

export const MIN_HEIGHT = 320;

export const VIEW_MARGIN = 24;

export type PanelSize = { width: number; height: number };

export type ResizeEdge = 'n' | 'w' | 'nw';

/** First bubble in a same-sender run gets a tail; later ones in that run do not. */
export function civiBubbleIsTailed(messages: Array<{ role: string }>, index: number): boolean {
  if (index <= 0) return true;
  return messages[index - 1]?.role !== messages[index]?.role;
}

export function clampSize(width: number, height: number): PanelSize {
  const maxW = typeof window === 'undefined' ? DEFAULT_WIDTH : Math.max(MIN_WIDTH, window.innerWidth - VIEW_MARGIN);
  const maxH = typeof window === 'undefined' ? DEFAULT_HEIGHT : Math.max(MIN_HEIGHT, window.innerHeight - VIEW_MARGIN);
  const nextW = Number.isFinite(width) ? width : DEFAULT_WIDTH;
  const nextH = Number.isFinite(height) ? height : DEFAULT_HEIGHT;
  return {
    width: Math.min(maxW, Math.max(MIN_WIDTH, Math.round(nextW))),
    height: Math.min(maxH, Math.max(MIN_HEIGHT, Math.round(nextH))),
  };
}

/** Top/left/corner drag: moving toward the outside enlarges the panel. */
export function panelSizeAfterEdgeDrag(
  start: PanelSize,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
  edge: ResizeEdge,
): PanelSize {
  const nextWidth = edge === 'n' ? start.width : start.width + (startX - clientX);
  const nextHeight = edge === 'w' ? start.height : start.height + (startY - clientY);
  return clampSize(nextWidth, nextHeight);
}

export function panelSizeAfterNwDrag(
  start: PanelSize,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
): PanelSize {
  return panelSizeAfterEdgeDrag(start, startX, startY, clientX, clientY, 'nw');
}

/** Keep the last question + answer fully visible when they fit; otherwise pin the question at the top. */
export function scrollTopForLastExchange(pairTop: number, pairBottom: number, viewHeight: number): number {
  if (viewHeight <= 0) return 0;
  const height = pairBottom - pairTop;
  if (height <= viewHeight) return Math.max(0, pairBottom - viewHeight);
  return Math.max(0, pairTop);
}

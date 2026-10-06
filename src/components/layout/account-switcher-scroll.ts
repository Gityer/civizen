/** Prefer the dominant axis so a vertical mouse wheel still moves the strip. */
export function accountSwitcherWheelDelta(deltaX: number, deltaY: number) {
  return Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
}

export function accountSwitcherDragScrollLeft(startScroll: number, startX: number, clientX: number) {
  return startScroll - (clientX - startX);
}

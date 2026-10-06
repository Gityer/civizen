const VIEWPORT_PAD = 8;

export function fitAgreementDatePicker(args: {
  trigger: { left: number; right: number; top: number; bottom: number };
  size: { width: number; height: number };
  viewport: { width: number; height: number };
  padding?: number;
}): { left: number; top: number } {
  const pad = args.padding ?? VIEWPORT_PAD;
  const { trigger, size, viewport } = args;
  let left = trigger.left;
  if (left + size.width > viewport.width - pad) left = viewport.width - pad - size.width;
  if (left < pad) left = pad;

  const below = trigger.bottom + 4;
  const above = trigger.top - 4 - size.height;
  const fitsBelow = below + size.height <= viewport.height - pad;
  const fitsAbove = above >= pad;
  let top = fitsBelow || !fitsAbove ? below : above;
  if (top + size.height > viewport.height - pad) top = Math.max(pad, viewport.height - pad - size.height);
  if (top < pad) top = pad;
  return { left, top };
}

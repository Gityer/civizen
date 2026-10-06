import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { accountSwitcherWheelDelta, accountSwitcherDragScrollLeft } from '@/components/layout/account-switcher-scroll';

const DRAG_THRESHOLD_PX = 12;

export function AccountSwitcherTrack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      const delta = accountSwitcherWheelDelta(event.deltaX, event.deltaY);
      if (delta === 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      event.preventDefault();
      event.stopPropagation();
      el.scrollLeft += delta;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if ((event.target as HTMLElement | null)?.closest('[data-account-switcher-no-drag]')) return;
      if (el.scrollWidth <= el.clientWidth) return;
      if (!Number.isFinite(event.clientX)) return;
      // A new press is a new gesture. Do not consume the upcoming tap
      // because a previous swipe set the leftover-click flag.
      suppressClickRef.current = false;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScroll: el.scrollLeft,
        moved: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!Number.isFinite(event.clientX)) return;
      const dx = event.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      if (!drag.moved) {
        drag.moved = true;
        el.dataset.dragging = 'true';
        el.setPointerCapture(event.pointerId);
      }
      el.scrollLeft = accountSwitcherDragScrollLeft(drag.startScroll, drag.startX, event.clientX);
    };

    const endDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.moved) suppressClickRef.current = true;
      dragRef.current = null;
      delete el.dataset.dragging;
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-testid="account-switcher-track"
      className={cn(
        'flex w-full min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden data-[dragging=true]:snap-none',
        className,
      )}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

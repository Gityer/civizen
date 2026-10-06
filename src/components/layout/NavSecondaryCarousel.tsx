import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MarketCategoryIcon } from '@/components/market/MarketCategoryIcon';
import { usePageSecondaryNavContext } from '@/contexts/PageSecondaryNavContext';
import type { SecondaryNavItem } from '@/contexts/PageSecondaryNavContext';
import { cn } from '@/lib/utils';

const TAP_SLOP_PX = 8;
const WHEEL_HEIGHT = 78;
const WHEEL_HEIGHT_WITH_ICONS = 88;
const SELECTED_Y = 60;
const SELECTED_Y_WITH_ICONS = 64;
const LABEL_EDGE_PADDING_PX = 44;
/** Center gap width (px) — matches nav + button; used for arc spread on every page. */
const CENTER_RESERVE_PX = 44;
const PILL_WIDTH_PX = 74;
const PILL_WIDTH_ICON_PX = 96;
const SEPARATOR_GAP_PX = 8;
/** How many slots are visible on the arc at once (larger lists scroll through). */
const VISIBLE_ARC_SLOTS = 7;
const MAX_VISIBLE_OFFSET = 3.6;

type WheelGeometry = {
  width: number;
  wheelHeight: number;
  pivotY: number;
  centerX: number;
  arcRadius: number;
  angleStep: number;
  arcSpan: number;
  pxPerSlot: number;
  centerExclusionRad: number;
  labelWidths: number[];
  usePairwisePitch: boolean;
};

function halfSpreadForItemCount(itemCount: number, safeWidth: number, centerX: number) {
  const availableHalf = centerX - LABEL_EDGE_PADDING_PX - CENTER_RESERVE_PX / 2;

  const widthRatio =
    itemCount <= 2 ? 0.13 :
    itemCount === 3 ? 0.16 :
    itemCount === 4 ? 0.19 :
    itemCount === 5 ? 0.21 :
    0.23;
  const widthBased = safeWidth * widthRatio;

  const minHalfSpread =
    itemCount <= 2 ? 42 :
    itemCount === 3 ? 54 :
    itemCount === 4 ? 66 :
    itemCount === 5 ? 78 :
    88;

  return Math.min(availableHalf, Math.max(minHalfSpread, widthBased));
}

function estimateTextPillWidth(label: string) {
  return Math.min(220, Math.max(PILL_WIDTH_PX, Math.ceil(label.length * 5.2) + 24));
}

function buildWheelGeometry(
  width: number,
  itemCount: number,
  hasIcons: boolean,
  labels: string[] = [],
): WheelGeometry {
  const safeWidth = Math.max(width, 280);
  const centerX = safeWidth / 2;
  const labelWidths = hasIcons
    ? []
    : labels.map((label) => estimateTextPillWidth(label));
  const nominalPillWidth = hasIcons
    ? PILL_WIDTH_ICON_PX
    : labelWidths.reduce((max, pillWidth) => Math.max(max, pillWidth), PILL_WIDTH_PX);

  const sideDrop = Math.max(5, Math.min(7, safeWidth * 0.014));
  const desiredHalfSpread = halfSpreadForItemCount(
    Math.min(itemCount, VISIBLE_ARC_SLOTS),
    safeWidth,
    centerX,
  );
  const arcRadius = Math.max(
    108,
    (desiredHalfSpread * desiredHalfSpread + sideDrop * sideDrop) / (2 * sideDrop),
  );
  const pivotY = (hasIcons ? SELECTED_Y_WITH_ICONS : SELECTED_Y) + arcRadius;

  const pairwiseSteps =
    !hasIcons && labelWidths.length > 1
      ? labelWidths.slice(0, -1).map((left, index) =>
          pairwiseAngleStep(arcRadius, left, labelWidths[index + 1]),
        )
      : [];
  const minAngleStep = Math.max(
    0.11,
    pairwiseSteps.length ? Math.max(...pairwiseSteps) : (nominalPillWidth * 1.08) / arcRadius,
  );
  const visibleSlots = Math.min(VISIBLE_ARC_SLOTS, Math.max(itemCount, 1));
  const arcSpan = minAngleStep * Math.max(visibleSlots - 1, 1);
  const angleStep = minAngleStep;
  const pxPerSlot = Math.max(
    28,
    pairwiseSteps.length
      ? Math.max(...pairwiseSteps) * arcRadius
      : nominalPillWidth * 0.92,
  );
  const centerExclusionRad = Math.asin(Math.min(0.999, CENTER_RESERVE_PX / arcRadius));

  return {
    width: safeWidth,
    wheelHeight: hasIcons ? WHEEL_HEIGHT_WITH_ICONS : WHEEL_HEIGHT,
    pivotY,
    centerX,
    arcRadius,
    angleStep,
    arcSpan,
    pxPerSlot,
    centerExclusionRad,
    labelWidths,
    usePairwisePitch: !hasIcons && labelWidths.length > 0,
  };
}

function pairwiseAngleStep(arcRadius: number, widthA: number, widthB: number) {
  const chord = widthA / 2 + widthB / 2 + SEPARATOR_GAP_PX;
  return Math.asin(Math.min(0.999, chord / arcRadius));
}

function slotIndexFor(slot: number, length: number) {
  return Math.min(length - 1, Math.max(0, Math.round(slot)));
}

/** Arc angle for a fractional slot relative to the wheel focus (pairwise pitch between neighbors). */
function angleForSlot(
  slot: number,
  focusSlot: number,
  geometry: WheelGeometry,
  length: number,
) {
  const delta = slot - focusSlot;
  if (Math.abs(delta) < 1e-6) return -Math.PI / 2;

  const sign = Math.sign(delta);
  const abs = Math.abs(delta);
  const full = Math.floor(abs);
  const frac = abs - full;
  let angle = -Math.PI / 2;

  for (let step = 0; step < full; step += 1) {
    const from = focusSlot + sign * step;
    const to = focusSlot + sign * (step + 1);
    const fromIdx = slotIndexFor(from, length);
    const toIdx = slotIndexFor(to, length);
    angle += sign * pairwiseAngleStep(
      geometry.arcRadius,
      geometry.labelWidths[fromIdx] ?? PILL_WIDTH_PX,
      geometry.labelWidths[toIdx] ?? PILL_WIDTH_PX,
    );
  }

  if (frac > 1e-6) {
    const fromIdx = slotIndexFor(focusSlot + sign * full, length);
    const toIdx = slotIndexFor(focusSlot + sign * (full + 1), length);
    angle += sign * frac * pairwiseAngleStep(
      geometry.arcRadius,
      geometry.labelWidths[fromIdx] ?? PILL_WIDTH_PX,
      geometry.labelWidths[toIdx] ?? PILL_WIDTH_PX,
    );
  }

  return angle;
}

const FOCUS_SNAP_DISTANCE = 0.42;

function wheelOffset(index: number, position: number, length: number, loop: boolean) {
  let offset = index - position;
  if (!loop || length <= 1) return offset;
  while (offset > length / 2) offset -= length;
  while (offset < -length / 2) offset += length;
  return offset;
}

function resolveSnapIndex(position: number, length: number) {
  if (length <= 0) return 0;
  return ((Math.round(position) % length) + length) % length;
}

function nearestWheelPositionForIndex(index: number, position: number, length: number) {
  const candidates = [index, index + length, index - length, index + 2 * length, index - 2 * length];
  return candidates.reduce((best, candidate) =>
    (Math.abs(candidate - position) < Math.abs(best - position) ? candidate : best),
  );
}

/** Place · midway between adjacent pill edges (not pill centers). */
function separatorAngleBetween(
  leftSlot: number,
  rightSlot: number,
  focusSlot: number,
  geometry: WheelGeometry,
  length: number,
) {
  if (!geometry.usePairwisePitch) {
    return angleForSlot((leftSlot + rightSlot) / 2, focusSlot, geometry, length);
  }

  const leftAngle = angleForSlot(leftSlot, focusSlot, geometry, length);
  const rightAngle = angleForSlot(rightSlot, focusSlot, geometry, length);
  const leftIdx = slotIndexFor(leftSlot, length);
  const rightIdx = slotIndexFor(rightSlot, length);
  const leftHalfRad = (geometry.labelWidths[leftIdx] ?? PILL_WIDTH_PX) / 2 / geometry.arcRadius;
  const rightHalfRad = (geometry.labelWidths[rightIdx] ?? PILL_WIDTH_PX) / 2 / geometry.arcRadius;
  return (leftAngle + leftHalfRad + rightAngle - rightHalfRad) / 2;
}

function itemAngle(
  index: number,
  wheelPosition: number,
  geometry: WheelGeometry,
  reserveCenter: boolean,
  length: number,
  loop: boolean,
) {
  const offset = wheelOffset(index, wheelPosition, length, loop);
  let angle = geometry.usePairwisePitch
    ? angleForSlot(index, wheelPosition, geometry, length)
    : -Math.PI / 2 + offset * geometry.angleStep;

  if (!reserveCenter || geometry.usePairwisePitch) {
    return angle;
  }

  // Focused item sits at the top of the arc (above the + button).
  if (Math.abs(offset) < FOCUS_SNAP_DISTANCE) {
    return -Math.PI / 2;
  }

  // Only push items that are clearly off-center — avoids a hard snap as neighbors approach focus.
  if (Math.abs(offset) >= 1) {
    const distFromTop = angle + Math.PI / 2;
    if (Math.abs(distFromTop) < geometry.centerExclusionRad) {
      angle = -Math.PI / 2 + Math.sign(offset) * geometry.centerExclusionRad;
    }
  }

  return angle;
}

function itemPosition(
  index: number,
  wheelPosition: number,
  geometry: WheelGeometry,
  reserveCenter: boolean,
  length: number,
  loop: boolean,
) {
  const angle = itemAngle(index, wheelPosition, geometry, reserveCenter, length, loop);
  return {
    x: geometry.centerX + Math.cos(angle) * geometry.arcRadius,
    y: geometry.pivotY + Math.sin(angle) * geometry.arcRadius,
    angle,
  };
}

function arcGuidePaths(geometry: WheelGeometry): string[] {
  const mid = -Math.PI / 2;
  const gap = geometry.centerExclusionRad;
  const startAngle = mid - geometry.arcSpan / 2;
  const endAngle = mid + geometry.arcSpan / 2;
  const leftEnd = mid - gap;
  const rightStart = mid + gap;

  const paths: string[] = [];
  if (startAngle < leftEnd - 0.02) {
    paths.push(arcSegmentPath(geometry, startAngle, leftEnd));
  }
  if (rightStart < endAngle - 0.02) {
    paths.push(arcSegmentPath(geometry, rightStart, endAngle));
  }
  return paths;
}

function arcSegmentPath(geometry: WheelGeometry, from: number, to: number) {
  const sx = geometry.centerX + Math.cos(from) * geometry.arcRadius;
  const sy = geometry.pivotY + Math.sin(from) * geometry.arcRadius;
  const ex = geometry.centerX + Math.cos(to) * geometry.arcRadius;
  const ey = geometry.pivotY + Math.sin(to) * geometry.arcRadius;
  return `M ${sx} ${sy} A ${geometry.arcRadius} ${geometry.arcRadius} 0 0 1 ${ex} ${ey}`;
}

const LOOP_END_SLOT_OFFSET = 0.5;
const LOOP_END_DASH_OFFSET = 0.14;

type LoopEndGuideProps = {
  geometry: WheelGeometry;
  itemCount: number;
  loop: boolean;
  wheelPosition: ReturnType<typeof useMotionValue<number>>;
  maxVisibleOffset: number;
};

type LoopEndMarkerProps = LoopEndGuideProps & {
  slotIndex: number;
  kind: 'dash' | 'dot';
};

function LoopEndMarker({
  slotIndex,
  kind,
  wheelPosition,
  geometry,
  itemCount,
  loop,
  maxVisibleOffset,
}: LoopEndMarkerProps) {
  const wrapSlot = itemCount - LOOP_END_SLOT_OFFSET;

  const transform = useTransform(wheelPosition, (pos) => {
    const dist = Math.abs(wheelOffset(wrapSlot, pos, itemCount, loop));
    if (dist > maxVisibleOffset) {
      return 'translate3d(-9999px, -9999px, 0)';
    }
    const { x, y, angle } = itemPosition(slotIndex, pos, geometry, false, itemCount, loop);
    const tangentDeg = ((angle + Math.PI / 2) * 180) / Math.PI;
    const rotation = kind === 'dot' ? 0 : tangentDeg;
    return `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rotation}deg)`;
  });

  const opacity = useTransform(wheelPosition, (pos) => {
    const dist = Math.abs(wheelOffset(wrapSlot, pos, itemCount, loop));
    if (dist > maxVisibleOffset) return 0;
    return Math.max(0.7, 1 - dist * 0.1);
  });

  if (kind === 'dot') {
    return (
      <motion.span
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-primary/45"
        style={{ transform, opacity }}
        aria-hidden
      />
    );
  }

  return (
    <motion.span
      className="absolute left-0 top-0 block h-px w-3 rounded-full bg-primary/40"
      style={{ transform, opacity }}
      aria-hidden
    />
  );
}

/** − · − at the loop join (last category ↔ first), subdued primary green. */
function LoopEndGuide({ geometry, itemCount, loop, wheelPosition, maxVisibleOffset }: LoopEndGuideProps) {
  const wrapSlot = itemCount - LOOP_END_SLOT_OFFSET;
  const shared = { geometry, itemCount, loop, wheelPosition, maxVisibleOffset };

  return (
    <div className="pointer-events-none absolute inset-0 z-15" aria-hidden>
      <LoopEndMarker slotIndex={wrapSlot - LOOP_END_DASH_OFFSET} kind="dash" {...shared} />
      <LoopEndMarker slotIndex={wrapSlot} kind="dot" {...shared} />
      <LoopEndMarker slotIndex={wrapSlot + LOOP_END_DASH_OFFSET} kind="dash" {...shared} />
    </div>
  );
}

export function NavSecondaryCarousel() {
  const {
    config,
    carouselVisible,
    cancelCarouselHide,
    scheduleCarouselHide,
  } = usePageSecondaryNavContext();

  const items = useMemo(() => config?.items ?? [], [config?.items]);
  const hasFab = Boolean(config?.fab);
  const loop = Boolean(config?.loop) && items.length > 1;
  const hasIcons = useMemo(() => items.some((item) => Boolean(item.icon)), [items]);
  const activeIndex = useMemo(
    () => Math.max(0, items.findIndex((item) => item.id === config?.value)),
    [items, config?.value],
  );

  const wheelPosition = useMotionValue(activeIndex);
  const arcTrackRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  const itemLabels = useMemo(() => items.map((item) => item.label), [items]);
  const geometry = useMemo(
    () => buildWheelGeometry(containerWidth, items.length, hasIcons, itemLabels),
    [containerWidth, hasIcons, itemLabels, items.length],
  );

  const arcPaths = useMemo(() => arcGuidePaths(geometry), [geometry]);

  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startPosition: 0,
    moved: false,
    dragAxis: null as 'horizontal' | null,
    captured: false,
  });

  useEffect(() => {
    const measure = () => {
      setContainerWidth(document.documentElement.clientWidth);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [carouselVisible]);

  useEffect(() => {
    const target = loop
      ? nearestWheelPositionForIndex(activeIndex, wheelPosition.get(), items.length)
      : activeIndex;
    animate(wheelPosition, target, {
      type: 'spring',
      stiffness: 420,
      damping: 34,
    });
  }, [activeIndex, items.length, loop, wheelPosition]);

  useEffect(() => {
    if (!carouselVisible) {
      dragRef.current.active = false;
      const target = loop
        ? nearestWheelPositionForIndex(activeIndex, wheelPosition.get(), items.length)
        : activeIndex;
      animate(wheelPosition, target, { duration: 0.15 });
    } else {
      wheelPosition.set(
        loop ? nearestWheelPositionForIndex(activeIndex, activeIndex, items.length) : activeIndex,
      );
    }
  }, [activeIndex, carouselVisible, items.length, loop, wheelPosition]);

  const snapToIndex = useCallback(
    (index: number, commit = true) => {
      const length = items.length;
      const normalized = loop ? resolveSnapIndex(index, length) : clampIndex(index, length);
      const targetPosition = loop
        ? nearestWheelPositionForIndex(normalized, wheelPosition.get(), length)
        : normalized;

      animate(wheelPosition, targetPosition, {
        type: 'spring',
        stiffness: 440,
        damping: 32,
      });

      if (!config || !commit) return;
      const item = items[normalized];
      if (item && !item.disabled && item.id !== config.value) {
        config.onChange(item.id);
      }
    },
    [config, items, loop, wheelPosition],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      cancelCarouselHide();
      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPosition: wheelPosition.get(),
        moved: false,
        dragAxis: null,
        captured: false,
      };
    },
    [cancelCarouselHide, wheelPosition],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active) return;
      if (event.pointerId !== dragRef.current.pointerId) return;

      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;

      if (!dragRef.current.dragAxis) {
        if (Math.abs(deltaX) < TAP_SLOP_PX && Math.abs(deltaY) < TAP_SLOP_PX) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          dragRef.current.active = false;
          dragRef.current.pointerId = -1;
          return;
        }

        dragRef.current.dragAxis = 'horizontal';
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current.captured = true;
        } catch {
          // Ignore unsupported capture in some touch webviews.
        }
      }

      event.preventDefault();
      if (Math.abs(deltaX) > TAP_SLOP_PX) {
        dragRef.current.moved = true;
      }
      const next = dragRef.current.startPosition - deltaX / geometry.pxPerSlot;
      if (loop) {
        wheelPosition.set(next);
      } else {
        const max = items.length - 1;
        const rubberBand = next < 0 ? next * 0.35 : next > max ? max + (next - max) * 0.35 : next;
        wheelPosition.set(rubberBand);
      }
    },
    [geometry.pxPerSlot, items.length, loop, wheelPosition],
  );

  const finishPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active) return;
      if (event.pointerId !== dragRef.current.pointerId) return;
      dragRef.current.active = false;
      dragRef.current.pointerId = -1;

      if (dragRef.current.captured && event.currentTarget.hasPointerCapture(event.pointerId)) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore capture release errors.
        }
      }
      dragRef.current.captured = false;
      dragRef.current.dragAxis = null;

      const current = wheelPosition.get();
      const targetIndex = loop
        ? resolveSnapIndex(current, items.length)
        : clampIndex(Math.round(current), items.length);

      if (!dragRef.current.moved) {
        const rect = event.currentTarget.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;

        let hitIndex = targetIndex;
        let hitDistance = Number.POSITIVE_INFINITY;
        for (let i = 0; i < items.length; i += 1) {
          if (loop && Math.abs(wheelOffset(i, current, items.length, true)) > MAX_VISIBLE_OFFSET) {
            continue;
          }
          const pos = itemPosition(i, current, geometry, hasFab, items.length, loop);
          const dx = localX - pos.x;
          const dy = localY - pos.y;
          const dist = dx * dx + dy * dy;
          if (dist < hitDistance) {
            hitDistance = dist;
            hitIndex = i;
          }
        }
        snapToIndex(hitIndex);
      } else {
        snapToIndex(loop ? current : targetIndex);
      }

      scheduleCarouselHide();
    },
    [geometry, hasFab, items.length, loop, scheduleCarouselHide, snapToIndex, wheelPosition],
  );

  if (!config || items.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {carouselVisible ? (
        <motion.div
          key="nav-secondary-carousel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'pointer-events-none fixed inset-x-0 z-60',
            hasFab
              ? 'bottom-[calc(6.35rem+env(safe-area-inset-bottom,0px))]'
              : 'bottom-20',
          )}
        >
          <div
            className="pointer-events-auto w-full pb-2 -mb-2"
            onPointerEnter={cancelCarouselHide}
            onPointerLeave={scheduleCarouselHide}
          >
            <div
              ref={arcTrackRef}
              role="listbox"
              aria-label="Section navigation"
              aria-activedescendant={items[activeIndex]?.id}
              className="relative mx-auto w-full touch-pan-y select-none"
              style={{ height: geometry.wheelHeight }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
            >
              <svg
                className="pointer-events-none absolute inset-x-0 top-0 overflow-visible"
                width="100%"
                height={geometry.wheelHeight}
                viewBox={`0 0 ${geometry.width} ${geometry.wheelHeight}`}
                preserveAspectRatio="none"
                aria-hidden
              >
                {arcPaths.map((path, pathIndex) => (
                  <path
                    key={`arc-${pathIndex}`}
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1}
                    className="text-border/30"
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {loop ? (
                <LoopEndGuide
                  geometry={geometry}
                  itemCount={items.length}
                  loop={loop}
                  wheelPosition={wheelPosition}
                  maxVisibleOffset={MAX_VISIBLE_OFFSET}
                />
              ) : null}

              {items.slice(0, -1).map((_, separatorIndex) => (
                <ArcSeparatorMarker
                  key={`sep-${separatorIndex}`}
                  slotIndex={separatorIndex + 0.5}
                  wheelPosition={wheelPosition}
                  geometry={geometry}
                  hasFab={hasFab}
                  itemCount={items.length}
                  loop={loop}
                  maxVisibleOffset={MAX_VISIBLE_OFFSET}
                />
              ))}

              {items.map((item, index) => (
                <CarouselArcItem
                  key={item.id}
                  item={item}
                  index={index}
                  wheelPosition={wheelPosition}
                  geometry={geometry}
                  hasFab={hasFab}
                  hasIcons={hasIcons}
                  itemCount={items.length}
                  loop={loop}
                  selectedId={config.value}
                  maxVisibleOffset={MAX_VISIBLE_OFFSET}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(length - 1, index));
}

type ArcSeparatorMarkerProps = {
  slotIndex: number;
  wheelPosition: ReturnType<typeof useMotionValue<number>>;
  geometry: WheelGeometry;
  hasFab: boolean;
  itemCount: number;
  loop: boolean;
  maxVisibleOffset: number;
};

function ArcSeparatorMarker({
  slotIndex,
  wheelPosition,
  geometry,
  hasFab,
  itemCount,
  loop,
  maxVisibleOffset,
}: ArcSeparatorMarkerProps) {
  const transform = useTransform(wheelPosition, (pos) => {
    const leftSlot = Math.floor(slotIndex);
    const rightSlot = Math.ceil(slotIndex);
    const angle = geometry.usePairwisePitch
      ? separatorAngleBetween(leftSlot, rightSlot, pos, geometry, itemCount)
      : itemAngle(slotIndex, pos, geometry, hasFab, itemCount, loop);
    const x = geometry.centerX + Math.cos(angle) * geometry.arcRadius;
    const y = geometry.pivotY + Math.sin(angle) * geometry.arcRadius;
    const tangentDeg = ((angle + Math.PI / 2) * 180) / Math.PI;
    return `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${tangentDeg}deg)`;
  });
  const opacity = useTransform(wheelPosition, (pos) => {
    const dist = Math.abs(wheelOffset(slotIndex, pos, itemCount, loop));
    if (dist > maxVisibleOffset) return 0;
    return Math.max(0.45, 0.8 - dist * 0.18);
  });

  return (
    <motion.span
      className="absolute left-0 top-0 px-0.5 text-[11px] font-bold leading-none text-muted-foreground/75"
      style={{ transform, opacity }}
      aria-hidden
    >
      ·
    </motion.span>
  );
}

type CarouselArcItemProps = {
  item: SecondaryNavItem;
  index: number;
  wheelPosition: ReturnType<typeof useMotionValue<number>>;
  geometry: WheelGeometry;
  hasFab: boolean;
  hasIcons: boolean;
  itemCount: number;
  loop: boolean;
  selectedId: string;
  maxVisibleOffset: number;
};

function CarouselArcItem({
  item,
  index,
  wheelPosition,
  geometry,
  hasFab,
  hasIcons,
  itemCount,
  loop,
  selectedId,
  maxVisibleOffset,
}: CarouselArcItemProps) {
  const Icon = item.icon;
  const transform = useTransform(wheelPosition, (pos) => {
    const { x, y, angle } = itemPosition(index, pos, geometry, hasFab, itemCount, loop);
    const dist = Math.abs(wheelOffset(index, pos, itemCount, loop));
    const tangentDeg = ((angle + Math.PI / 2) * 180) / Math.PI;
    return `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${tangentDeg}deg)`;
  });
  const opacity = useTransform(wheelPosition, (pos) => {
    const dist = Math.abs(wheelOffset(index, pos, itemCount, loop));
    if (dist > maxVisibleOffset) return 0;
    return Math.max(0.62, 1 - dist * 0.2);
  });
  const color = useTransform(wheelPosition, (pos) =>
    Math.abs(wheelOffset(index, pos, itemCount, loop)) < FOCUS_SNAP_DISTANCE
      ? 'hsl(var(--primary))'
      : 'hsl(var(--primary) / 0.65)',
  );
  const zIndex = useTransform(wheelPosition, (pos) => {
    const dist = Math.abs(wheelOffset(index, pos, itemCount, loop));
    if (dist < FOCUS_SNAP_DISTANCE) return 40;
    return 12 - dist;
  });
  const focusAmount = useTransform(wheelPosition, (pos) => {
    const dist = Math.abs(wheelOffset(index, pos, itemCount, loop));
    if (dist >= FOCUS_SNAP_DISTANCE) return 0;
    return 1 - dist / FOCUS_SNAP_DISTANCE;
  });
  const flankAmount = useTransform(focusAmount, (focus) => 1 - focus);

  const isCommitted = item.id === selectedId;

  return (
    <motion.div
      role="option"
      aria-selected={isCommitted}
      aria-disabled={item.disabled}
      title={item.title ?? item.label}
      className={cn(
        'absolute left-0 top-0 -translate-x-1/2',
        'pointer-events-none text-center',
        'w-auto max-w-[min(100vw-2rem,16rem)]',
        'whitespace-nowrap',
        item.disabled && 'opacity-40',
      )}
      style={{ transform, opacity, zIndex }}
    >
      <motion.span
        className={cn(
          'relative inline-flex items-center justify-center rounded-full border px-2 py-1',
          'text-center text-[11px] font-semibold leading-tight',
          '[text-shadow:0_1px_1px_rgba(0,0,0,0.05)]',
          'backdrop-blur-[2px]',
          isCommitted
            ? 'border-border/45 bg-background/65'
            : 'border-border/30 bg-background/45',
        )}
        style={{ color }}
      >
        {hasIcons ? (
          <>
            <motion.span
              className="inline-flex max-w-17 items-center gap-1"
              style={{ opacity: flankAmount }}
              aria-hidden
            >
              {Icon ? (
                <MarketCategoryIcon
                  icon={Icon}
                  className="h-5 w-5 bg-muted/90"
                  iconClassName="h-3 w-3"
                />
              ) : null}
              <span className="truncate">{item.label}</span>
            </motion.span>
            <motion.span
              className="absolute inset-0 inline-flex items-center justify-center gap-1 px-1"
              style={{ opacity: focusAmount }}
              aria-hidden={!isCommitted}
            >
              {Icon ? (
                <MarketCategoryIcon
                  icon={Icon}
                  className="h-5 w-5 bg-muted/90"
                  iconClassName="h-3 w-3"
                />
              ) : null}
              <span className="whitespace-nowrap">{item.label}</span>
            </motion.span>
          </>
        ) : (
          <span className="whitespace-nowrap">{item.label}</span>
        )}
      </motion.span>
    </motion.div>
  );
}

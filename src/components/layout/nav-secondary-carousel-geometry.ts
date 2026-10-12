import { TAP_SLOP_PX, WHEEL_HEIGHT, WHEEL_HEIGHT_WITH_ICONS, SELECTED_Y, SELECTED_Y_WITH_ICONS, LABEL_EDGE_PADDING_PX, CENTER_RESERVE_PX, PILL_WIDTH_PX, NOMINAL_PILL_WIDTH_ICON, PILL_ROTATION_CLEARANCE, SEPARATOR_GAP_PX, REFERENCE_LAYOUT_WIDTH, SHALLOW_ARC_MIN_WIDTH, MAX_ARC_HALF_SPREAD_PX, ARC_EDGE_INSET_PX, ARC_ENDPOINT_DROP_PX, FOCUS_SLOT_SNAP, FOCUS_VISUAL_DISTANCE, ICON_PHONE_TARGET_ENDPOINT_RAD, OUTER_SLOT_ANGLE_EXTENSION, FAB_ROW_BOTTOM_REM, FAB_BUTTON_HEIGHT_PX, FOCUS_ABOVE_FAB_PX } from './nav-secondary-carousel-constants';
export { TAP_SLOP_PX, WHEEL_HEIGHT, WHEEL_HEIGHT_WITH_ICONS, SELECTED_Y, SELECTED_Y_WITH_ICONS, LABEL_EDGE_PADDING_PX, CENTER_RESERVE_PX, PILL_WIDTH_PX, NOMINAL_PILL_WIDTH_ICON, PILL_ROTATION_CLEARANCE, SEPARATOR_GAP_PX, REFERENCE_LAYOUT_WIDTH, SHALLOW_ARC_MIN_WIDTH, MAX_ARC_HALF_SPREAD_PX, ARC_EDGE_INSET_PX, ARC_ENDPOINT_DROP_PX, FOCUS_SLOT_SNAP, FOCUS_VISUAL_DISTANCE, ICON_PHONE_TARGET_ENDPOINT_RAD, OUTER_SLOT_ANGLE_EXTENSION, FAB_ROW_BOTTOM_REM, FAB_BUTTON_HEIGHT_PX, FOCUS_ABOVE_FAB_PX } from './nav-secondary-carousel-constants';

/** Pure arc-wheel geometry for NavSecondaryCarousel (testable, no React). */

export type WheelGeometry = {
  width: number;
  wheelHeight: number;
  pivotY: number;
  centerX: number;
  arcRadius: number;
  angleStep: number;
  arcSpan: number;
  arcEndpointAngle: number;
  pxPerSlot: number;
  centerExclusionRad: number;
  visibleSlots: number;
  maxVisibleOffset: number;
  focusClearanceRad: number;
  stepRad: number;
  /** Max vertical drop (px) from the focused row — keeps flanks inside the wheel above the nav. */
  maxFlankDropPx: number;
  focusRowY: number;
};

export type ArcItemPlacement = {
  x: number;
  y: number;
  angle: number;
  /** Tangent to the arc at this point, in degrees (CSS rotate). */
  tangentDeg: number;
};

/** Estimated pill width from label (icon + text + padding). */
export function estimatePillWidth(hasIcons: boolean, label: string) {
  if (!hasIcons) return PILL_WIDTH_PX;
  return Math.min(200, Math.max(NOMINAL_PILL_WIDTH_ICON, Math.ceil(label.length * 5.5) + 44));
}

export function estimateFocusedPillWidth(hasIcons: boolean, label: string) {
  return estimatePillWidth(hasIcons, label);
}

export function visibleSlotCount(viewportWidth: number, itemCount: number) {
  if (itemCount <= 1) return 1;
  if (viewportWidth >= 1100) return Math.min(itemCount, 13);
  if (viewportWidth >= 900) return Math.min(itemCount, 11);
  if (viewportWidth >= 700) return Math.min(itemCount, 9);
  if (viewportWidth >= 520) return Math.min(itemCount, 7);
  return Math.min(itemCount, 5);
}

/** Half-width of the arc where it meets the lower screen edges. */
export function arcHalfSpreadPx(viewportWidth: number, hasFab: boolean, hasIcons = false) {
  const safeWidth = Math.max(viewportWidth, 280);
  const centerX = safeWidth / 2;
  const centerReserve = hasFab ? CENTER_RESERVE_PX / 2 : 0;
  const edgeSpread = Math.max(72, centerX - ARC_EDGE_INSET_PX - centerReserve);
  const referenceSpread = Math.max(
    72,
    REFERENCE_LAYOUT_WIDTH / 2 - ARC_EDGE_INSET_PX - centerReserve,
  );
  const cappedSpread = hasIcons
    ? referenceSpread
    : Math.min(referenceSpread, MAX_ARC_HALF_SPREAD_PX);

  if (safeWidth <= REFERENCE_LAYOUT_WIDTH) return cappedSpread;
  if (safeWidth >= 1100) return edgeSpread;

  const blend =
    (safeWidth - REFERENCE_LAYOUT_WIDTH) / (1100 - REFERENCE_LAYOUT_WIDTH);
  return cappedSpread + (edgeSpread - cappedSpread) * blend;
}

/** Minimum angular step so pill centers do not overlap along the arc. */
export function arcPitchAngleStep(arcRadius: number, nominalPitchPx: number) {
  return Math.max(0.05, (nominalPitchPx + SEPARATOR_GAP_PX) / arcRadius);
}

/** Horizontal distance between arc pill centers one slot from focus. */
export function horizontalCenterDistance(angleStep: number, arcRadius: number) {
  return arcRadius * Math.sin(Math.max(0, angleStep));
}

/** Minimum angle step so pill rects do not overlap horizontally (focus + one flank). */
export function minAngleStepForHorizontalClearance(
  arcRadius: number,
  focusPillWidth: number,
  flankPillWidth: number,
) {
  const halfSum = focusPillWidth / 2 + flankPillWidth / 2 + SEPARATOR_GAP_PX + 14;
  return Math.asin(Math.min(0.999, halfSum / arcRadius));
}

/** How many flank slots fit at pitch spacing before the arc endpoint. */
export function arcFlankCapacity(
  arcEndpointAngle: number,
  focusClearanceRad: number,
  arcRadius: number,
  nominalPitchPx: number,
) {
  const availableAngle = Math.max(0, arcEndpointAngle - focusClearanceRad);
  const pitchRad = arcPitchAngleStep(arcRadius, nominalPitchPx);
  if (pitchRad <= 0) return 0;
  return Math.floor(availableAngle / pitchRad);
}

/** Distribute flank slots evenly between focus clearance and arc endpoint. */
export function distributedFlankAngleStep(
  arcEndpointAngle: number,
  focusClearanceRad: number,
  flankSlotsPerSide: number,
) {
  if (flankSlotsPerSide <= 0) return 0.08;
  return Math.max(
    0.08,
    (arcEndpointAngle - focusClearanceRad) / flankSlotsPerSide,
  );
}

export function buildWheelGeometry(
  width: number,
  itemCount: number,
  hasIcons: boolean,
  focusLabel: string,
  hasFab = false,
  itemLabels: string[] = [],
): WheelGeometry {
  const safeWidth = Math.max(width, 280);
  const centerX = safeWidth / 2;
  const visibleSlots = visibleSlotCount(safeWidth, itemCount);
  const spreadSlots = Math.max(visibleSlots, 1);
  const slotsPerSide = spreadSlots / 2;
  const nominalPill = hasIcons ? NOMINAL_PILL_WIDTH_ICON : PILL_WIDTH_PX;

  const focusPillWidth = estimateFocusedPillWidth(hasIcons, focusLabel);
  const nominalPitchPx = nominalPill * PILL_ROTATION_CLEARANCE;

  const desiredHalfSpread = arcHalfSpreadPx(safeWidth, hasFab, hasIcons);
  const sideDrop = ARC_ENDPOINT_DROP_PX;

  const shallowRadius =
    (desiredHalfSpread * desiredHalfSpread + sideDrop * sideDrop) / (2 * sideDrop);
  const iconPhoneRadius =
    (desiredHalfSpread / Math.sin(Math.min(0.999, ICON_PHONE_TARGET_ENDPOINT_RAD))) * 1.18;
  const arcRadius =
    hasIcons && safeWidth < 520
      ? Math.max(desiredHalfSpread, Math.min(shallowRadius, iconPhoneRadius))
      : safeWidth <= REFERENCE_LAYOUT_WIDTH
        ? Math.max(desiredHalfSpread, shallowRadius, 108)
        : safeWidth >= SHALLOW_ARC_MIN_WIDTH
          ? Math.max(desiredHalfSpread, 108, shallowRadius)
          : Math.max(desiredHalfSpread, shallowRadius, 108);
  const arcEndpointAngle = Math.asin(Math.min(0.999, desiredHalfSpread / arcRadius));
  const arcSpan = arcEndpointAngle * 2;
  const pxPerSlot = Math.max(26, focusPillWidth * 0.9);
  const centerExclusionRad = Math.asin(Math.min(0.999, CENTER_RESERVE_PX / arcRadius));
  const focusClearanceRad = Math.max(
    centerExclusionRad,
    hasIcons && safeWidth < 520
      ? centerExclusionRad
      : Math.max(
          (focusPillWidth / 2 + 6) / arcRadius,
          (nominalPill / 2 + 4) / arcRadius,
        ),
  );

  const pitchAngleStep = arcPitchAngleStep(arcRadius, nominalPitchPx);
  const flankSlotsPerSide = Math.max(1, Math.floor(spreadSlots / 2));
  const distributedStep = distributedFlankAngleStep(
    arcEndpointAngle,
    focusClearanceRad,
    flankSlotsPerSide,
  );
  const minHorizontalStep = minAngleStepForHorizontalClearance(
    arcRadius,
    focusPillWidth,
    nominalPill,
  );
  const useDistributedIconStep = hasIcons && safeWidth < 520;
  const angleStep = useDistributedIconStep
    ? Math.max(distributedStep, minHorizontalStep)
    : Math.max(pitchAngleStep, minHorizontalStep);
  const stepRad = angleStep + SEPARATOR_GAP_PX / arcRadius;
  const flankCapacity = arcFlankCapacity(
    arcEndpointAngle,
    focusClearanceRad,
    arcRadius,
    nominalPitchPx,
  );
  const minFlankSlots = Math.max(1, Math.floor(spreadSlots / 2));
  const capacityOffset =
    flankCapacity > 0 ? FOCUS_SLOT_SNAP + flankCapacity : FOCUS_SLOT_SNAP;
  const phoneIconMinOffset = hasIcons && safeWidth < 520 ? 2 : minFlankSlots;
  const maxVisibleOffset = Math.min(
    spreadSlots / 2 + 0.15,
    Math.max(phoneIconMinOffset, minFlankSlots, capacityOffset),
  );

  const focusRowY = hasIcons ? SELECTED_Y_WITH_ICONS : SELECTED_Y;
  const maxFlankDropPx = hasIcons
    ? Math.max(56, Math.ceil(arcRadius * 0.28))
    : safeWidth <= REFERENCE_LAYOUT_WIDTH
      ? 22
      : 36;
  const pivotY = focusRowY + arcRadius;

  const geometryDraft: WheelGeometry = {
    width: safeWidth,
    wheelHeight: hasIcons ? WHEEL_HEIGHT_WITH_ICONS : WHEEL_HEIGHT,
    pivotY,
    centerX,
    arcRadius,
    angleStep,
    arcSpan,
    arcEndpointAngle,
    pxPerSlot,
    centerExclusionRad,
    visibleSlots,
    maxVisibleOffset,
    focusClearanceRad,
    stepRad,
    maxFlankDropPx,
    focusRowY,
  };

  return { ...geometryDraft, wheelHeight: resolveWheelHeight(geometryDraft, hasIcons) };
}

function resolveWheelHeight(geometry: WheelGeometry, hasIcons: boolean) {
  const base = hasIcons ? WHEEL_HEIGHT_WITH_ICONS : WHEEL_HEIGHT;
  const focusIndex = 100;
  const flankExtent = Math.ceil(geometry.maxVisibleOffset);
  const offsets = [];
  for (let offset = -flankExtent; offset <= flankExtent; offset += 1) {
    offsets.push(offset);
  }
  let maxY = geometry.focusRowY;

  for (const offset of offsets) {
    const placement = itemPlacement(
      focusIndex + offset,
      focusIndex,
      geometry,
      true,
      200,
      false,
    );
    maxY = Math.max(maxY, placement.y);
  }

  return Math.max(base, Math.ceil(maxY + 28));
}

/** Negative translateY (px) so focus sits just above the center + when carousel bottom aligns with FAB row. */
export function fabArcLiftPx(geometry: Pick<WheelGeometry, 'wheelHeight' | 'focusRowY'>, hasFab: boolean) {
  if (!hasFab) return 0;
  const fabBottomPx = FAB_ROW_BOTTOM_REM * 16;
  const targetFocusFromBottom = fabBottomPx + FAB_BUTTON_HEIGHT_PX + FOCUS_ABOVE_FAB_PX;
  const focusFromBottom = fabBottomPx + geometry.wheelHeight - geometry.focusRowY;
  return Math.max(0, focusFromBottom - targetFocusFromBottom);
}

export function arcItemOpacityFactor(
  rawOffset: number,
  dist: number,
  maxVisibleOffset: number,
  geometry: Pick<WheelGeometry, 'width'>,
  hasIcons: boolean,
) {
  if (dist > maxVisibleOffset + 0.02) return 0;
  // Phone icon arcs: hide outer left slot at ±2 when it overlaps the −1 neighbor (reference mock).
  if (hasIcons && geometry.width < 520 && rawOffset <= -2 && dist >= 1.9) return 0;
  return 1;
}

export function wheelOffset(index: number, position: number, length: number, loop: boolean) {
  let offset = index - position;
  if (!loop || length <= 1) return offset;
  while (offset > length / 2) offset -= length;
  while (offset < -length / 2) offset += length;
  return offset;
}

/** Tangent in degrees. When settled at focus, label is flat; while scrolling, follows the arc. */
export function tangentDegForPlacement(
  offset: number,
  angle: number,
  geometry: WheelGeometry,
  flattenFocus: boolean,
) {
  if (flattenFocus && Math.abs(offset) < FOCUS_SLOT_SNAP) {
    return 0;
  }
  const naturalAngle = -Math.PI / 2 + offset * geometry.angleStep;
  const motionAngle = Math.abs(offset) < FOCUS_SLOT_SNAP ? naturalAngle : angle;
  return ((motionAngle + Math.PI / 2) * 180) / Math.PI;
}

export function itemAngle(
  index: number,
  wheelPosition: number,
  geometry: WheelGeometry,
  reserveCenter: boolean,
  length: number,
  loop: boolean,
) {
  const offset = wheelOffset(index, wheelPosition, length, loop);

  if (reserveCenter && Math.abs(offset) < FOCUS_SLOT_SNAP) {
    return -Math.PI / 2;
  }

  const sign = Math.sign(offset) || 1;
  const absOffset = Math.abs(offset);
  const linearAbs = absOffset * geometry.angleStep;
  if (absOffset >= 2 - FOCUS_SLOT_SNAP) {
    const extended = Math.min(
      geometry.arcEndpointAngle + OUTER_SLOT_ANGLE_EXTENSION,
      linearAbs,
    );
    return -Math.PI / 2 + sign * extended;
  }
  const minAbs =
    absOffset <= 1 + FOCUS_SLOT_SNAP
      ? geometry.focusClearanceRad
      : geometry.focusClearanceRad + (absOffset - 1 - FOCUS_SLOT_SNAP) * geometry.angleStep;
  const absFromTop = Math.min(geometry.arcEndpointAngle, Math.max(linearAbs, minAbs));

  return -Math.PI / 2 + sign * absFromTop;
}

function placementY(angle: number, geometry: WheelGeometry) {
  const circleY = geometry.pivotY + Math.sin(angle) * geometry.arcRadius;
  const drop = Math.max(0, circleY - geometry.focusRowY);
  if (drop <= geometry.maxFlankDropPx) {
    return circleY;
  }
  return geometry.focusRowY + geometry.maxFlankDropPx;
}

export function itemPlacement(
  index: number,
  wheelPosition: number,
  geometry: WheelGeometry,
  reserveCenter: boolean,
  length: number,
  loop: boolean,
  flattenFocus = true,
): ArcItemPlacement {
  const offset = wheelOffset(index, wheelPosition, length, loop);
  const angle = itemAngle(index, wheelPosition, geometry, reserveCenter, length, loop);
  return {
    x: geometry.centerX + Math.cos(angle) * geometry.arcRadius,
    y: placementY(angle, geometry),
    angle,
    tangentDeg: tangentDegForPlacement(offset, angle, geometry, flattenFocus),
  };
}

/** CSS transform for an arc item: position on the circle + tangent rotation. */
export function arcItemTransform(placement: ArcItemPlacement) {
  return `translate3d(${placement.x}px, ${placement.y}px, 0) translate(-50%, -50%) rotate(${placement.tangentDeg}deg)`;
}

/** Left/right guide path angles (radians), excluding the center FAB gap. */
export function arcGuideSegmentAngles(geometry: WheelGeometry) {
  const mid = -Math.PI / 2;
  const gap = Math.max(geometry.centerExclusionRad, geometry.focusClearanceRad * 0.92);
  const startAngle = mid - geometry.arcSpan / 2;
  const endAngle = mid + geometry.arcSpan / 2;
  return {
    left: { from: startAngle, to: mid - gap },
    right: { from: mid + gap, to: endAngle },
  };
}

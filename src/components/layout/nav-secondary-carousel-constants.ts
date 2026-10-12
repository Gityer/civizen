
/** Layout constants of the secondary navigation wheel; the geometry functions live in nav-secondary-carousel-geometry.ts. */
export const TAP_SLOP_PX = 8;

export const WHEEL_HEIGHT = 78;

export const WHEEL_HEIGHT_WITH_ICONS = 88;

export const SELECTED_Y = 60;

export const SELECTED_Y_WITH_ICONS = 56;

export const LABEL_EDGE_PADDING_PX = 44;

/** Center gap width (px) — matches nav + button; used for arc spread on every page. */
export const CENTER_RESERVE_PX = 44;

export const PILL_WIDTH_PX = 74;

export const NOMINAL_PILL_WIDTH_ICON = 92;

/** Extra factor for rotated pill bounding box along the arc chord. */
export const PILL_ROTATION_CLEARANCE = 1.08;

/** Gap between pill edges on the arc (space · space). */
export const SEPARATOR_GAP_PX = 10;

/** Reference phone width — arc spread is capped near this size. */
export const REFERENCE_LAYOUT_WIDTH = 390;

/** Wider layouts use a shallower arc only from this width (avoids huge radius mid-size viewports). */
export const SHALLOW_ARC_MIN_WIDTH = 700;

/** Max half-width of the arc on narrow layouts. */
export const MAX_ARC_HALF_SPREAD_PX = 118;

/** Arc endpoints sit this far from the screen edge (above the nav). */
export const ARC_EDGE_INSET_PX = 18;

/** Vertical drop from arc apex to endpoints — larger values = tighter (sharper) arc, more angular room. */
export const ARC_ENDPOINT_DROP_PX = 26;

export const FOCUS_SLOT_SNAP = 0.14;

export const FOCUS_VISUAL_DISTANCE = 0.4;

/** Icon + label carousels on phone: target arc endpoint angle (wide spread + moderate flank tilt). */
export const ICON_PHONE_TARGET_ENDPOINT_RAD = 0.85;

/** Extra angle (rad) for ±2 slots so outer pills clear neighbors (may clip at screen edge). */
export const OUTER_SLOT_ANGLE_EXTENSION = 0.72;

/** FAB row anchor — keep in sync with MobileNav FAB wrapper `bottom`. */
export const FAB_ROW_BOTTOM_REM = 4.15;

export const FAB_BUTTON_HEIGHT_PX = 36;

/** Gap between FAB top edge and focused pill center on phone icon layouts. */
export const FOCUS_ABOVE_FAB_PX = 12;

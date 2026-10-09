# NavSecondaryCarousel — UX & geometry spec

**Canonical source of truth** for the bottom arc secondary nav (`NavSecondaryCarousel`). Agents **must read this file** before changing:

- `src/components/layout/NavSecondaryCarousel.tsx`
- `src/components/layout/nav-secondary-carousel-geometry.ts`
- Market/Home/Study secondary nav config
- Arc verification scripts under `scripts/verify-arc-carousel-*`

**Reference screenshots (approved):** user-provided Marketplace mock at 390px width — wide shallow arc, focus at apex, **Sell · For you · Local · Jobs** visible (Jobs may clip at screen edge), **·** separators on the arc path.

---

> **Market (since 2026-10-09, decision D3):** the Market page is the Jobs board plus the Agreements shortcut and no longer registers a secondary arc. The Market-specific rules below (icons + loop, persistence, carousel order, last-section memory) are historical; Home and Study still use the arc exactly as described.

## Purpose

When the user is on a primary tab that exposes secondary sections (Home, Study, Market), tapping/hovering that tab reveals a **curved arc wheel** above the bottom nav (and above the center **+** FAB when present). The wheel lets users **swipe/drag** to change section without leaving the page.

Market uses the **same arc component** as Home/Study (not the horizontal strip), with **icon + label** pills.

---

## Visual layout (390px phone, Market, focus = For you)

| Element | Rule |
|--------|------|
| **Arc shape** | Wide, **shallow** curve: endpoints approach lower left/right screen area; **apex at top center** above the FAB |
| **Focus pill** | Centered at apex, **horizontal** (0° rotation) when wheel is **settled** |
| **Flank pills** | Follow arc **tangent** while scrolling; when settled, ±1 neighbors show **moderate** tilt (~20°–45°), not ~70°+ |
| **Visible neighbors** | At least **4** category pills: immediate context shows **Sell**, **For you**, **Local**, **Jobs** (Saved appears when scrolled); partial edge clip on outermost pill is OK |
| **Separators** | Subdued **·** dots on the arc path between adjacent slots |
| **FAB** | Center **+** stays below focus; arc items must not overlap FAB hit target |
| **Z-order** | Carousel chrome `z-[56]`, bottom nav `z-50`, FAB `z-[70]` — flanks must not render behind nav |

---

## Behavior

1. **Reveal:** Double-tap active primary tab, or pointer enter on active tab, shows carousel (`carouselVisible`).
2. **Drag:** Horizontal drag spins `wheelPosition`; spring snap on release. Vertical swipes on the arc track pass through to page scroll (axis lock — do not use `touch-none` or `preventDefault` on pointer down).
3. **Loop (Market):** `loop: true` — infinite wheel through all categories.
4. **Focus label (Market, icons):** Centered item shows full label with **· icon Name ·**; side items may truncate.
5. **Persistence (Market):** Arc stays visible on the Market page (`persistCarousel: true`) — no 3s auto-hide.
6. **Rotation:** `flattenFocus: true` when settled → focus flat; flanks use tangent. While dragging, all items follow tangent.
7. **Hide:** Pointer leaves chrome → scheduled hide (unless `persistCarousel`).
8. **Scroll chrome:** Bottom nav (+ FAB) uses `useShowOnScrollUp` — hide on scroll down, show on scroll up (same pattern as app top chrome). Secondary carousel/strip closes while the bar is hidden; Market `persistCarousel` restores the arc when the bar returns.

---

## Market carousel order

From `MARKET_CAROUSEL_SECTION_IDS`:

**Saved · Sell · For you · Local · Jobs · Vehicles · …**

Default section: restore the user’s **last Market section** from local storage. If **For you** has listings newer than the last time For you was opened, open **For you** instead. Fallback when nothing is remembered: **jobs**.

---

## Geometry constants (phone, icons + FAB)

Implemented in `nav-secondary-carousel-geometry.ts`:

- **Visible slots:** 5 on viewports `< 520px` (center + 2 per side), not 3.
- **Arc spread:** Use full reference half-spread (not capped to 118px when `hasIcons`).
- **Radius:** Shallow arc from spread + `ARC_ENDPOINT_DROP_PX`; large enough for two flank steps.
- **Angle step:** **Distributed** along endpoint span: `(arcEndpointAngle - focusClearance) / flankSlotsPerSide` — not `minHorizontalStep` inflation on phone icon layouts.
- **maxVisibleOffset:** ≥ **2** on phone icon layouts (show Jobs at +2).
- **Outer left (−2):** hidden at default focus when it would overlap −1 (see `arcItemOpacityFactor`); **Saved** appears when scrolled into focus.
- **Outer right (+2):** may extend past nominal arc endpoint (`OUTER_SLOT_ANGLE_EXTENSION`) and clip at screen edge — separate from +1 neighbor.

---

## Regression verification

```bash
npm run verify:post-dev
```

Includes:

- `verify:agent-context` — spec + AGENTS links exist
- `verify:arc-carousel-layout` — geometry at 360–480px widths
- `verify:arc-carousel-visible` — Playwright DOM: ≥4 visible Market pills, flank rotation band, no overlap

**Do not** mark arc work complete when only DOM count passes — compare against this spec and reference screenshots.

---

## Related files

| File | Role |
|------|------|
| `NavSecondaryCarousel.tsx` | UI, motion, drag |
| `nav-secondary-carousel-geometry.ts` | Pure geometry |
| `MobileNav.tsx` | Carousel vs strip, FAB |
| `PageSecondaryNavContext` | Visibility + config |
| `src/pages/Market.tsx` | Market items + FAB |
| `memory-bank/activeContext.md` | Current focus pointer |

---

## Large screens (`lg` / 1024px+)

Phone bottom bar + arc remain the canonical interaction below `lg`.

On large screens:

- Primary destinations move to the left **AppSideNav** (`src/components/layout/AppSideNav.tsx`).
- Bottom nav, FAB, and arc/strip mount only below `lg` via `useIsDesktopLayout`.
- Secondary sections render as a sticky top strip via **NavSecondaryDesktop** (same section ids / onChange as the phone arc).
- Market keeps `persistCarousel: true` so the phone arc stays open when the bottom bar is visible; desktop always shows the secondary strip while a registering page is active.
- Arc geometry verify scripts stay phone-width (`390px`) — do not retarget them to desktop.

Tokens: `src/lib/responsive-layout.ts`. Spec overview: `large-screen-layout.md`.


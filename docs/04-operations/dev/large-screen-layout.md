# Large-screen layout

Civizen stays **mobile-first**. Below Tailwind `lg` (1024px) the phone chrome is unchanged.

From `lg` upward, the composition changes — same destinations and actions, different frame.

## Signed-in app

| Phone | Large screen |
|-------|----------------|
| Bottom bar (Home · Study · Contribute · Market · Messaging) | Left **AppSideNav** |
| Arc / strip above the bottom bar | Sticky **NavSecondaryDesktop** strip at the top of main |
| Center FAB | Labeled action at the bottom of the side rail |
| Full-bleed feed column | Comfortable reading width where the page sets it (Home uses `max-w-3xl`) |

Implementation:

- `src/lib/responsive-layout.ts`
- `src/components/layout/AppSideNav.tsx`
- `src/components/layout/NavSecondaryDesktop.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/MobileNav.tsx` (phone-only mount)
- `src/hooks/useIsDesktopLayout.ts` (mount gate at 1024px — desktop chrome is not in the phone DOM)

Secondary arc geometry and `verify:arc-carousel-*` remain phone-only. See `nav-secondary-carousel.md`.

## Public website

| Phone | Large screen |
|-------|----------------|
| Logo + compact toolbar (Jobs / Download / language / theme) | Logo + **PublicPrimaryNav** (Why · Areas · Jobs · Documents · Governance) + Sign in / Join + Download |
| Footer as a single wrapped link row | Footer with brand line + multi-column link grid |
| Narrow content column | **reading** (`max-w-3xl`) for essays; **directory** (`max-w-5xl`) for Areas / Download / Governance landing |

Implementation:

- `src/components/public/PublicPrimaryNav.tsx`
- `src/components/public/PublicPageHeader.tsx`
- `src/components/public/PublicPageToolbar.tsx`
- `src/components/public/PublicPageShell.tsx` (`layout`, `showFooter`)
- `src/components/public/PublicPageFooter.tsx`

Do not turn the public site into a dense dashboard. Extra width shows next useful destinations and side-by-side directory cards — not every control at once.

# Onboarding landing (`/onboarding`)

Public landing for signed-out visitors, on the website and inside the installed app.
Mobile-first. Follows **Simple by default. Advanced by need.**

## Order

1. **Hero** — Civizen, slogan, one-line summary, then **one** action row: **Join the network** (primary, wide) + **Sign in** (outline). Jobs link below.
2. **Our mission** — mission lead + trust line.
3. **What Civizen is today** — one grouped list, one module per row (icon · title · 2-line description · chevron when it links). Early-access badge beside the title; build version + "Expanding next" as one small line under the list.
4. **See it in action** — phone screenshots of real **guest-visible** pages (Civic voting, Public documents, Areas), each linking to that page. Swipe strip below `sm` (next card peeks in), three columns from `sm`. Light and Dark image per page, swapped by the `dark` class. Only signed-out pages are captured so no personal data is published.
5. **Choose your path** — grouped rows: Look for work · Explore first · Study the system · Try the app. *Try the app* is hidden in the native app.
6. **More details** — one accordion, all closed by default: Where this is intended to lead · Outcomes we pursue (+ Harm we work to end) · How we get there · How the system fits together.
7. **Try the Android build** — download card. **Web only**; not rendered in the native app.
8. **Open, auditable, and documented** — grouped link list.
9. **Common questions** — FAQ accordion.
10. Footer.

## Large screens (`lg`, 1024px+)

Same sections and order, different frame — not a denser dashboard.

- **Width:** content uses the public header band width (`max-w-6xl`, same side padding), so header and content edges line up. Prose (mission) stays at reading width (`max-w-3xl`).
- **Hero:** two columns — copy and actions on the left (left-aligned), the **See it in action** phones on the right (titles only, captions hidden, loaded eagerly). The standalone See it in action section is not rendered on large screens, so the screenshots appear once.
- **What Civizen is today:** the grouped card becomes two columns; an odd last item spans both. Row descriptions step up from `text-xs` to 13px.
- **Paired sections:** Choose your path | More details side by side; Try the Android build | Open, auditable, and documented side by side.
- FAQ and footer stay full width.

## Join / Sign in rule

- On first view, Join / Sign in appear **once** (the hero).
- The other pairs show **only after the hero actions scroll off screen** (`useElementOffscreen` on the hero action row) and hide again when they return:
  - below `lg`: the sticky bottom bar slides in;
  - from `lg`: the public header's Sign in / Join fade in (`PublicPageHeader hideGuestAuthActions`; the header keeps their space so it does not shift). Other public pages leave this off and always show their header pair.
- The bar reserves right padding so neither button sits under the Civi launcher (bottom-right, 56px).
- Do not add more Join / Sign in buttons in page sections (no closing CTA block, no Join row in Choose your path).

## Implementation

- `src/pages/Onboarding.tsx`
- `src/components/public/OnboardingHero.tsx` (`ctaRef`, `data-testid="onboarding-hero-actions"`)
- `src/components/public/OnboardingStickyCta.tsx` (`data-testid="onboarding-sticky-cta"`, `aria-hidden` while hidden)
- `src/components/public/OnboardingProductOverview.tsx`, `OnboardingGetStartedHub.tsx`, `OnboardingDeepDive.tsx`, `OnboardingSystemAndTrust.tsx`, `OnboardingVisitorFaq.tsx`
- `src/components/public/OnboardingScreenshots.tsx` (`data-testid="onboarding-screenshots"`); images in `public/landing/<page>-<light|dark>.jpg`
- Regenerate the images when those pages change: start the app, then `node scripts/capture-landing-screenshots.mjs [baseUrl]` (Playwright; signed-out, 375×760 @2x, reduced motion, Civi launcher hidden for the capture)
- `OnboardingScreenshots variant="hero"` for the large-screen hero column; `useIsDesktopLayout` decides hero vs standalone section
- `src/hooks/useElementOffscreen.ts` (drives both the sticky bar and the header pair)
- Shared row styles: `onboardingGroupClass` / `onboardingRowClass` / `onboardingRowDetailClass`, two-column grid `onboardingGroupGridClass` + `onboardingGroupGridItemClass` in `onboarding-styles.ts`

Regression guard: `src/pages/Onboarding.test.tsx` — exactly one Join and one Sign in reachable on first render, including the header pair being `aria-hidden`.

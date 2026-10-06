/**
 * Shared large-screen layout tokens.
 * Breakpoint matches Tailwind `lg` (1024px).
 * Phone chrome (bottom nav + arc) stays below this; desktop side rail starts here.
 */
export const DESKTOP_MIN_WIDTH_PX = 1024;

/** Left side-rail width for signed-in desktop shell. */
export const APP_SIDE_NAV_WIDTH_REM = 14;

/** Tailwind classes for side-rail offset on main content. */
export const APP_SIDE_NAV_OFFSET_CLASS = 'lg:pl-56';

/** Public reading column (essays, Why this exists). */
export const PUBLIC_READING_MAX_CLASS = 'max-w-3xl';

/** Public directory / discovery pages (Areas, documents lists, Jobs hubs). */
export const PUBLIC_DIRECTORY_MAX_CLASS = 'max-w-5xl';

/** Public site chrome (header band) on large screens. */
export const PUBLIC_CHROME_MAX_CLASS = 'max-w-6xl';

/** Signed-in directory/hub pages (Contribute, Study): centred, capped so cards stay readable on wide screens. */
export const APP_DIRECTORY_MAX_CLASS = 'mx-auto w-full max-w-5xl';

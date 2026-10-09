/** Stable profile id for Civi, Civizen’s AI assistant (matches DB migration). */
import { getCiviAvatarUrl } from '@/lib/civi-avatar';

export const CIVI_ASSISTANT_PROFILE_ID = 'a0000000-0000-4000-8000-000000000001';

export const CIVI_ASSISTANT_DISPLAY_NAME = 'Civi';
export const CIVI_ASSISTANT_USERNAME = 'civi';

/** Public path (Vite `public/`) — Civic C by default; follows the local Civi avatar choice. */
export const CIVI_AVATAR_URL = getCiviAvatarUrl('c');

export function resolveMessagingAvatarUrl(
  profileId: string | null | undefined,
  storedAvatarUrl: string | null | undefined,
): string | undefined {
  if (profileId === CIVI_ASSISTANT_PROFILE_ID) return getCiviAvatarUrl();
  return storedAvatarUrl?.trim() || undefined;
}

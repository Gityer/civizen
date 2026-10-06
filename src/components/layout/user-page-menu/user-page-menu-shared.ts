import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type LinkedAccountRow = {
  id: string;
  owner_profile_id: string;
  linked_profile_id: string;
  relationship_type: string;
  owner: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    deleted_at?: string | null;
  } | null;
  linked: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    deleted_at?: string | null;
  } | null;
};

export type AccountOption = {
  profileId: string;
  label: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  accountType: 'personal' | 'business' | 'linked';
};

export function getInitials(name?: string | null, username?: string | null) {
  const source = name?.trim() || username?.trim() || '?';
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function createEphemeralSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function isNetworkFetchError(error: { message?: string | null; details?: string | null } | null | undefined) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('failed to fetch') || message.includes('network');
}

export function raceTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export type UserPageMenuProps = { size?: 'sm' | 'md' };

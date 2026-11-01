/**
 * The app-wide signal that an action needs a verified identity. Kept free of imports so the Supabase client can use it:
 * any request the server refuses with 'verification_required' raises the verification prompt, wherever it came from.
 */
export const VERIFICATION_REQUIRED_EVENT = 'civizen:verification-required';

/** Asks the app to offer verification, then come back to `next` (the current page by default). */
export function requestVerification(next?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VERIFICATION_REQUIRED_EVENT, { detail: { next: next ?? `${window.location.pathname}${window.location.search}` } }));
}

/** fetch for the Supabase client: passes every response through, and raises the prompt on a verification refusal. */
export async function verificationAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 403 || response.status === 400) {
    try {
      const text = await response.clone().text();
      if (text.includes('verification_required')) requestVerification();
    } catch {
      // the body could not be read; the caller still gets the response
    }
  }
  return response;
}

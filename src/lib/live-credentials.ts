// Which credential opens a Live socket: the learner's own key if they saved
// one, otherwise a single-use token from /api/live-token, where the real key
// stays on the server.

/** Stands in for a key when the server holds it. Never stored. */
export const SERVER_CREDENTIAL = 'server';

const STORAGE_KEY = 'hearafrica_gemini_api_key';

export function storedCredential(): string {
  if (typeof window === 'undefined') return SERVER_CREDENTIAL;
  // Falls back to the pre-rename key so an existing local key survives.
  return localStorage.getItem(STORAGE_KEY) || localStorage.getItem('openafrica_gemini_api_key') || SERVER_CREDENTIAL;
}

/** Saves a learner's own key; an empty one hands back to the server. */
export function saveCredential(key: string): string {
  const trimmed = key.trim();
  if (!trimmed || trimmed === SERVER_CREDENTIAL) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('openafrica_gemini_api_key');
    return SERVER_CREDENTIAL;
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
  return trimmed;
}

/** What the key field should show: the server credential is not a key. */
export function displayedKey(credential: string): string {
  return credential === SERVER_CREDENTIAL ? '' : credential;
}

/** The value to hand the SDK as `apiKey` for one new socket. */
export async function liveApiKey(credential: string): Promise<string> {
  if (credential !== SERVER_CREDENTIAL) return credential;
  const response = await fetch('/api/live-token', { method: 'POST' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.token !== 'string') {
    throw new Error(body.error || `Could not get a voice token (HTTP ${response.status}).`);
  }
  return body.token;
}

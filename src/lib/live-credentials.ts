// Every Live socket opens with a single-use token from /api/live-token, so the
// real key stays on the server.

export async function liveToken(): Promise<string> {
  const response = await fetch('/api/live-token', { method: 'POST' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.token !== 'string') {
    throw new Error(body.error || `Could not get a voice token (HTTP ${response.status}).`);
  }
  return body.token;
}

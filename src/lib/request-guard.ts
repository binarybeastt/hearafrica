// Server-side checks shared by the routes that spend the Gemini key.

/** Browsers mark cross-site requests; refusing them stops other sites spending the quota. */
export function isCrossSite(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return true;
  const origin = request.headers.get('origin');
  return !!origin && new URL(origin).host !== request.headers.get('host');
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Allows `limit` requests per IP per window. Per server instance, so it is a
 * speed bump rather than a quota: several instances each keep their own count,
 * and a restart forgets it.
 */
export function rateLimiter(limit: number, windowMs: number) {
  const seen = new Map<string, number[]>();
  return function limited(request: Request): boolean {
    const ip = clientIp(request);
    const now = Date.now();
    const recent = (seen.get(ip) || []).filter((t) => now - t < windowMs);
    const over = recent.length >= limit;
    if (!over) recent.push(now);
    seen.set(ip, recent);
    return over;
  };
}

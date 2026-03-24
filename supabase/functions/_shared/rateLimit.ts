// Simple in-memory rate limiter for edge functions
// Uses a sliding window approach with configurable limits

const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a request should be rate limited.
 * @param identifier - IP address or other identifier
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Window size in milliseconds (default: 60000 = 1 min)
 * @returns true if the request should be BLOCKED
 */
export function isRateLimited(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(identifier, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return true;
  }

  return false;
}

/**
 * Get the client IP from request headers (Supabase edge functions).
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Return a 429 Too Many Requests response.
 */
export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

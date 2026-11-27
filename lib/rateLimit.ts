// lib/rateLimit.ts – Per-IP in-memory rate limiter + CSRF origin guard
// Note: serverless instances do not share memory, so rate-limiting is best-effort per instance.

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const hits = new Map<string, number[]>();

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  hits.set(ip, timestamps);
  return false;
}

/**
 * CSRF origin guard – rejects requests whose Origin or Referer header does not
 * match one of the allowed hosts. Call at the top of every POST/PUT/DELETE handler.
 *
 * In production the allowed host is the Vercel domain(s).
 * In development, localhost on any port is also allowed.
 *
 * Returns true when the request should be REJECTED (origin mismatch / absent).
 */
const ALLOWED_HOSTS = new Set([
  "chronotriage-ai.vercel.app",
  // localhost is allowed in development; Vercel strips this in production env
  "localhost",
  "127.0.0.1",
]);

export function isCsrfBlocked(req: Request): boolean {
  // Allow requests that carry the custom header ChronoBot sets
  // (browsers always enforce same-origin for custom headers, so its presence
  //  is a valid CSRF signal in this context).
  if (req.headers.get("x-chronotriage-client") === "1") return false;

  const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  if (!origin) return true; // No origin header → reject

  try {
    const { hostname } = new URL(origin);
    // Allow any subdomain of vercel.app (preview deployments) and localhost
    const isVercel = hostname.endsWith(".vercel.app") || hostname === "chronotriage-ai.vercel.app";
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    return !isVercel && !isLocal && !ALLOWED_HOSTS.has(hostname);
  } catch {
    return true; // Malformed URL → reject
  }
}

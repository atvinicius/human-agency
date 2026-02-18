// In-memory sliding-window rate limiter for Vercel Edge Functions.
// Each edge isolate keeps its own map — this is "best effort" rate limiting
// (not globally consistent), but catches most abuse patterns.

const windows = new Map(); // key → { count, resetAt }

const DEFAULTS = {
  agent: { maxRequests: 10, windowMs: 60_000 },   // 10 req/min for LLM calls
  credits: { maxRequests: 20, windowMs: 60_000 },  // 20 req/min for balance/promo
  promo: { maxRequests: 5, windowMs: 60_000 },     // 5 req/min for promo redemption
};

// Evict stale entries every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of windows) {
    if (now > entry.resetAt) windows.delete(key);
  }
}

/**
 * Check rate limit for a given key (userId or IP) and category.
 * Returns { allowed, remaining, retryAfterMs } or null if no limit applies.
 */
export function checkRateLimit(key, category = 'agent') {
  if (!key) return { allowed: true, remaining: Infinity };

  cleanup();

  const config = DEFAULTS[category] || DEFAULTS.agent;
  const bucketKey = `${category}:${key}`;
  const now = Date.now();

  let entry = windows.get(bucketKey);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    windows.set(bucketKey, entry);
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfterMs = entry.resetAt - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count };
}

/**
 * Build a 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(retryAfterMs, corsHeaders = {}) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(JSON.stringify({
    error: 'Too many requests',
    retryAfter: retryAfterSec,
  }), {
    status: 429,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSec),
    },
  });
}

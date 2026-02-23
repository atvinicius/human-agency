// CORS configuration
// Set ALLOWED_ORIGIN env var in production (e.g., "https://humanagency.io").
// Falls back to "*" in development.

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// Security headers included in all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

/**
 * Get CORS + security headers for Edge runtime (Request object with `headers.get()`).
 */
export function getCorsHeaders(req) {
  // Support both Edge `Request` (headers.get) and Node.js `req` (headers plain object)
  const origin = typeof req?.headers?.get === 'function'
    ? req.headers.get('origin') || ''
    : req?.headers?.origin || '';

  // In production, only allow the configured origin
  if (ALLOWED_ORIGIN !== '*') {
    // Support comma-separated list of origins
    const allowed = ALLOWED_ORIGIN.split(',').map((o) => o.trim());
    const matchedOrigin = allowed.includes(origin) ? origin : allowed[0];
    return {
      'Access-Control-Allow-Origin': matchedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
      ...SECURITY_HEADERS,
    };
  }

  // Development fallback
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...SECURITY_HEADERS,
  };
}

/**
 * Set CORS + security headers on a Node.js `res` object (used by iterate.js, orchestrate.js).
 */
export function setNodeCorsHeaders(res, req) {
  const origin = req?.headers?.origin || '';

  if (ALLOWED_ORIGIN !== '*') {
    const allowed = ALLOWED_ORIGIN.split(',').map((o) => o.trim());
    const matchedOrigin = allowed.includes(origin) ? origin : allowed[0];
    res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Orchestrate-Secret');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

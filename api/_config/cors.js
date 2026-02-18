// CORS configuration
// Set ALLOWED_ORIGIN env var in production (e.g., "https://humanagency.io").
// Falls back to "*" in development.

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export function getCorsHeaders(req) {
  const origin = req?.headers?.get?.('origin') || '';

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
    };
  }

  // Development fallback
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

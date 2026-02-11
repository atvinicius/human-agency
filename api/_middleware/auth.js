import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Server-side Supabase client for JWT validation (service key, no session persistence)
const supabaseAuth = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })
  : null;

/**
 * Validate JWT from Authorization header.
 * Returns the authenticated user or null if invalid/missing.
 */
export async function authenticateRequest(req) {
  // If Supabase auth is not configured, skip authentication (demo mode)
  if (!supabaseAuth) return null;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return null;

  // Reject unverified users
  if (!user.email_confirmed_at) return null;

  return user;
}

/**
 * Return a 401 Unauthorized JSON response.
 */
export function unauthorizedResponse(corsHeaders) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Orchestration dispatcher — lightweight entry point called by pg_cron.
// Finds active sessions and delegates to iterate.js logic.

import { createClient } from '@supabase/supabase-js';
import { setNodeCorsHeaders } from './_config/cors.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

const ORCHESTRATE_SECRET = process.env.ORCHESTRATE_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

export default async function handler(req, res) {
  setNodeCorsHeaders(res, req);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const secret = req.headers['x-orchestrate-secret'];
  if (!ORCHESTRATE_SECRET || secret !== ORCHESTRATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    // Find active and synthesizing sessions
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, status')
      .in('status', ['active', 'synthesizing']);

    if (error || !sessions || sessions.length === 0) {
      // No active sessions — disable the cron job to save invocations
      await supabase.rpc('disable_orchestration');
      return res.status(200).json({ action: 'idle', sessions: 0, cron: 'disabled' });
    }

    const results = [];

    // Safe base URL priority: env var > validated Host header > localhost
    // VERCEL_URL points to the deployment preview domain (has Deployment Protection)
    // so we skip it — the Host header from pg_cron is the production URL.
    let baseUrl;
    if (process.env.ORCHESTRATE_BASE_URL) {
      baseUrl = process.env.ORCHESTRATE_BASE_URL;
    } else {
      const host = req.headers['host'];
      if (host && /^[\w.-]+(:\d+)?$/.test(host)) {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        baseUrl = `${protocol}://${host}`;
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }

    for (const session of sessions) {
      try {
        const response = await fetch(`${baseUrl}/api/iterate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Orchestrate-Secret': ORCHESTRATE_SECRET,
          },
          body: JSON.stringify({
            sessionId: session.id,
            mode: session.status === 'synthesizing' ? 'synthesize' : 'iterate',
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          // Got HTML instead of JSON — likely Deployment Protection or redirect
          console.error(`iterate returned non-JSON (${response.status}) for session ${session.id}`);
          results.push({ sessionId: session.id, error: `Non-JSON response: ${response.status}` });
          continue;
        }

        const result = await response.json();
        results.push({ sessionId: session.id, ...result });
      } catch (err) {
        console.error(`Failed to iterate session ${session.id}:`, err);
        results.push({ sessionId: session.id, error: 'Iteration failed' });
      }
    }

    return res.status(200).json({ action: 'dispatched', results });

  } catch (error) {
    console.error('Orchestrate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

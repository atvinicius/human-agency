import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, unauthorizedResponse } from './_middleware/auth.js';

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })
  : null;

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authUser = await authenticateRequest(req);
  if (!authUser) {
    return unauthorizedResponse(corsHeaders);
  }

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Credits system not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // GET — return user balance
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('user_credits')
      .select('balance, lifetime_earned, lifetime_spent')
      .eq('user_id', authUser.id)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ balance: 0, lifetime_earned: 0, lifetime_spent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // POST — actions (redeem promo code)
  if (req.method === 'POST') {
    const { action, code } = await req.json();

    if (action === 'redeem' && code) {
      const { data, error } = await supabaseAdmin.rpc('redeem_promo_code', {
        p_user_id: authUser.id,
        p_code: code,
      });

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

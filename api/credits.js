import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from './_config/cors.js';
import { authenticateRequest, unauthorizedResponse } from './_middleware/auth.js';
import { checkRateLimit, rateLimitResponse } from './_middleware/rateLimit.js';

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
  const corsHeaders = getCorsHeaders(req);

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

  // Rate limit — tighter for promo redemption, looser for balance check
  const rlCategory = req.method === 'POST' ? 'promo' : 'credits';
  const rateCheck = checkRateLimit(authUser.id, rlCategory);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs, corsHeaders);
  }

  // GET — return user balance
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('user_credits')
      .select('balance, lifetime_earned, lifetime_spent')
      .eq('user_id', authUser.id)
      .single();

    if (error || !data) {
      // No credit row — DB trigger should have created one on signup but may have
      // failed or not been applied. Auto-grant beta credits as a fallback.
      const BETA_CREDITS = 10.00;
      const { data: grantedRow, error: grantError } = await supabaseAdmin
        .from('user_credits')
        .upsert(
          { user_id: authUser.id, balance: BETA_CREDITS, lifetime_earned: BETA_CREDITS },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
        .select('balance, lifetime_earned, lifetime_spent')
        .single();

      if (grantError || !grantedRow) {
        console.error('[credits] Failed to auto-grant beta credits:', grantError?.message);
        return new Response(JSON.stringify({ balance: 0, lifetime_earned: 0, lifetime_spent: 0 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the grant for audit trail
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: authUser.id,
        amount: BETA_CREDITS,
        type: 'grant',
        source: 'beta-welcome-fallback',
        description: 'Beta tester welcome credits (auto-granted)',
        balance_after: grantedRow.balance,
      }).then(({ error: txError }) => {
        if (txError) console.error('[credits] Failed to log beta grant transaction:', txError.message);
      });

      return new Response(JSON.stringify(grantedRow), {
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

import { createClient } from '@supabase/supabase-js';
import { calculateCost, RATE_LIMITS } from '../_config/pricing.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })
  : null;

/**
 * Check if a user has sufficient credits to make an API call.
 * Returns { allowed, balance } or null if credits system is not configured.
 */
export async function checkCredits(userId) {
  if (!supabaseAdmin || !userId) return null; // Credits not enforced

  const { data, error } = await supabaseAdmin
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // No credit record means the user hasn't activated credits yet —
    // allow the call (credits not enforced for this user).
    return null;
  }

  return {
    allowed: data.balance >= RATE_LIMITS.min_balance_to_start,
    balance: data.balance,
  };
}

/**
 * Deduct credits after a successful API call.
 * Uses atomic RPC to prevent race conditions.
 */
export async function deductCredits(userId, modelId, promptTokens, completionTokens, sessionId = null) {
  if (!supabaseAdmin || !userId) return null;

  const cost = calculateCost(modelId, promptTokens, completionTokens);
  if (cost <= 0) return null;

  const { data, error } = await supabaseAdmin.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: cost,
    p_model_id: modelId,
    p_prompt_tokens: promptTokens,
    p_completion_tokens: completionTokens,
    p_session_id: sessionId,
  });

  if (error) {
    console.error('Failed to deduct credits:', error);
    return null;
  }

  return data; // { success, balance, cost } or { success: false, error }
}

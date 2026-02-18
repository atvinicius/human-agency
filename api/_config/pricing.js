// Model pricing configuration
// Fallback values — can be overridden via model_pricing table in Supabase

export const MODEL_PRICING = {
  'moonshotai/kimi-k2': {
    input_cost_per_million: 0.50,
    output_cost_per_million: 2.40,
  },
};

export const SEARCH_PRICING = {
  cost_per_search: 0.005, // $0.005 per web search query
};

export const RATE_LIMITS = {
  min_balance_to_start: 0.01,
};

/**
 * Calculate the USD cost for a given model's token usage.
 */
export function calculateCost(modelId, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;

  const inputCost = (promptTokens / 1_000_000) * pricing.input_cost_per_million;
  const outputCost = (completionTokens / 1_000_000) * pricing.output_cost_per_million;
  return Math.round((inputCost + outputCost) * 10000) / 10000; // 4 decimal places
}

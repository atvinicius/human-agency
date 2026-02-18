// Model pricing configuration

export const MODEL_PRICING = {
  'moonshotai/kimi-k2': {
    input_cost_per_million: 0.50,
    output_cost_per_million: 2.40,
  },
};

// Fallback pricing for unknown models — uses the highest known rate
// so we never give away free API calls on model typos or new models.
export const DEFAULT_PRICING = {
  input_cost_per_million: 0.50,
  output_cost_per_million: 2.40,
};

// Platform markup applied to all costs (1.5 = 50% margin)
export const PLATFORM_MARKUP = 1.5;

export const SEARCH_PRICING = {
  cost_per_search: 0.005, // $0.005 per web search query
};

export const RATE_LIMITS = {
  min_balance_to_start: 0.01,
};

/**
 * Calculate the USD cost for a given model's token usage.
 * Unknown models use DEFAULT_PRICING (never returns 0 for real token usage).
 * Includes PLATFORM_MARKUP to cover infrastructure costs.
 */
export function calculateCost(modelId, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[modelId] || DEFAULT_PRICING;

  const inputCost = (promptTokens / 1_000_000) * pricing.input_cost_per_million;
  const outputCost = (completionTokens / 1_000_000) * pricing.output_cost_per_million;
  const baseCost = inputCost + outputCost;
  return Math.round(baseCost * PLATFORM_MARKUP * 10000) / 10000; // 4 decimal places
}

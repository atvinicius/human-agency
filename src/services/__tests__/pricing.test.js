import { describe, it, expect } from 'vitest';
import { calculateCost, MODEL_PRICING, DEFAULT_PRICING, PLATFORM_MARKUP, SEARCH_PRICING } from '../../../api/_config/pricing';

describe('calculateCost', () => {
  it('should calculate cost for Kimi K2 with markup', () => {
    // 1000 prompt tokens, 500 completion tokens
    const cost = calculateCost('moonshotai/kimi-k2', 1000, 500);
    // Input: (1000/1M) * 0.50 = 0.0005
    // Output: (500/1M) * 2.40 = 0.0012
    // Base: 0.0017 * 1.5 markup = 0.00255 → rounds to 0.0025 (4dp)
    expect(cost).toBe(0.0025);
  });

  it('should use DEFAULT_PRICING for unknown model (not 0)', () => {
    const knownCost = calculateCost('moonshotai/kimi-k2', 1000, 500);
    const unknownCost = calculateCost('unknown/model', 1000, 500);
    // Unknown model uses DEFAULT_PRICING (same rates as Kimi K2)
    expect(unknownCost).toBe(knownCost);
    expect(unknownCost).toBeGreaterThan(0);
  });

  it('should handle zero tokens', () => {
    const cost = calculateCost('moonshotai/kimi-k2', 0, 0);
    expect(cost).toBe(0);
  });

  it('should handle large token counts with markup', () => {
    // 1M prompt tokens, 1M completion tokens
    const cost = calculateCost('moonshotai/kimi-k2', 1_000_000, 1_000_000);
    // Base: Input 0.50 + Output 2.40 = 2.90
    // With 1.5x markup: 4.35
    expect(cost).toBe(4.35);
  });

  it('should round to 4 decimal places', () => {
    // 333 prompt tokens, 777 completion tokens
    const cost = calculateCost('moonshotai/kimi-k2', 333, 777);
    // Input: (333/1M) * 0.50 = 0.0001665
    // Output: (777/1M) * 2.40 = 0.0018648
    // Base: 0.0020313 * 1.5 = 0.00304695 → rounds to 0.003
    expect(cost).toBe(0.003);
  });

  it('should have Kimi K2 in MODEL_PRICING', () => {
    expect(MODEL_PRICING['moonshotai/kimi-k2']).toBeDefined();
    expect(MODEL_PRICING['moonshotai/kimi-k2'].input_cost_per_million).toBe(0.50);
    expect(MODEL_PRICING['moonshotai/kimi-k2'].output_cost_per_million).toBe(2.40);
  });

  it('should have DEFAULT_PRICING defined', () => {
    expect(DEFAULT_PRICING).toBeDefined();
    expect(DEFAULT_PRICING.input_cost_per_million).toBeGreaterThan(0);
    expect(DEFAULT_PRICING.output_cost_per_million).toBeGreaterThan(0);
  });

  it('should have PLATFORM_MARKUP > 1', () => {
    expect(PLATFORM_MARKUP).toBe(1.5);
  });

  it('should have SEARCH_PRICING defined', () => {
    expect(SEARCH_PRICING.cost_per_search).toBe(0.005);
  });
});

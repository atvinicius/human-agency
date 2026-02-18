import { describe, it, expect } from 'vitest';
import { calculateCost, MODEL_PRICING } from '../../../api/_config/pricing';

describe('calculateCost', () => {
  it('should calculate cost for Kimi K2', () => {
    // 1000 prompt tokens, 500 completion tokens
    const cost = calculateCost('moonshotai/kimi-k2', 1000, 500);
    // Input: (1000/1M) * 0.50 = 0.0005
    // Output: (500/1M) * 2.40 = 0.0012
    // Total: 0.0017
    expect(cost).toBe(0.0017);
  });

  it('should return 0 for unknown model', () => {
    const cost = calculateCost('unknown/model', 1000, 500);
    expect(cost).toBe(0);
  });

  it('should handle zero tokens', () => {
    const cost = calculateCost('moonshotai/kimi-k2', 0, 0);
    expect(cost).toBe(0);
  });

  it('should handle large token counts', () => {
    // 1M prompt tokens, 1M completion tokens
    const cost = calculateCost('moonshotai/kimi-k2', 1_000_000, 1_000_000);
    // Input: 0.50, Output: 2.40, Total: 2.90
    expect(cost).toBe(2.9);
  });

  it('should round to 4 decimal places', () => {
    // 333 prompt tokens, 777 completion tokens
    const cost = calculateCost('moonshotai/kimi-k2', 333, 777);
    // Input: (333/1M) * 0.50 = 0.0001665
    // Output: (777/1M) * 2.40 = 0.0018648
    // Total: 0.0020313 → rounds to 0.002
    expect(cost).toBe(0.002);
  });

  it('should have Kimi K2 in MODEL_PRICING', () => {
    expect(MODEL_PRICING['moonshotai/kimi-k2']).toBeDefined();
    expect(MODEL_PRICING['moonshotai/kimi-k2'].input_cost_per_million).toBe(0.50);
    expect(MODEL_PRICING['moonshotai/kimi-k2'].output_cost_per_million).toBe(2.40);
  });
});

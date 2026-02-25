import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCreditStore } from '../creditStore';

// Mock authStore
vi.mock('../authStore', () => ({
  useAuthStore: {
    getState: () => ({
      getAccessToken: () => 'mock-token',
    }),
  },
}));

describe('creditStore', () => {
  beforeEach(() => {
    useCreditStore.setState({
      balance: null,
      loading: false,
      error: null,
      _refreshInterval: null,
      _fetchInFlight: false,
      _lastFetchTime: 0,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    useCreditStore.getState().stopAutoRefresh();
  });

  it('should have initial state', () => {
    const state = useCreditStore.getState();
    expect(state.balance).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should update balance', () => {
    useCreditStore.getState().updateBalance(10.0);
    expect(useCreditStore.getState().balance).toBe(10.0);
  });

  it('should report hasCredits correctly', () => {
    // null balance → false
    expect(useCreditStore.getState().hasCredits()).toBe(false);

    // 0 balance → false
    useCreditStore.getState().updateBalance(0);
    expect(useCreditStore.getState().hasCredits()).toBe(false);

    // below threshold → false
    useCreditStore.getState().updateBalance(0.005);
    expect(useCreditStore.getState().hasCredits()).toBe(false);

    // at threshold → true
    useCreditStore.getState().updateBalance(0.01);
    expect(useCreditStore.getState().hasCredits()).toBe(true);

    // above threshold → true
    useCreditStore.getState().updateBalance(5.0);
    expect(useCreditStore.getState().hasCredits()).toBe(true);
  });

  it('should fetch balance from API', async () => {
    const mockResponse = { balance: 9.50, lifetime_earned: 10.0, lifetime_spent: 0.50 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await useCreditStore.getState().fetchBalance();

    expect(global.fetch).toHaveBeenCalledWith('/api/credits', {
      headers: { Authorization: 'Bearer mock-token' },
    });
    expect(useCreditStore.getState().balance).toBe(9.50);
    expect(useCreditStore.getState().loading).toBe(false);
  });

  it('should handle fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    await useCreditStore.getState().fetchBalance();
    expect(useCreditStore.getState().error).toBe('Failed to fetch credits');
    expect(useCreditStore.getState().loading).toBe(false);
  });

  it('should redeem promo code', async () => {
    const mockResponse = { success: true, balance: 10.0, credited: 10.0 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await useCreditStore.getState().redeemPromoCode('amigos');

    expect(global.fetch).toHaveBeenCalledWith('/api/credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ action: 'redeem', code: 'amigos' }),
    });
    expect(result.success).toBe(true);
    expect(useCreditStore.getState().balance).toBe(10.0);
  });

  it('should handle failed promo code redemption', async () => {
    const mockResponse = { success: false, error: 'Invalid promo code' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await useCreditStore.getState().redeemPromoCode('invalid');
    expect(result.success).toBe(false);
    // Balance should not change
    expect(useCreditStore.getState().balance).toBeNull();
  });
});

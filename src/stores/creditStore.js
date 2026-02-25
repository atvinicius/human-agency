import { create } from 'zustand';
import { useAuthStore } from './authStore';

export const useCreditStore = create((set, get) => ({
  balance: null,
  loading: false,
  error: null,
  _refreshInterval: null,
  _authUnsub: null,
  _fetchInFlight: false,
  _lastFetchTime: 0,

  fetchBalance: async () => {
    // Deduplication: skip if a fetch is already in progress
    if (get()._fetchInFlight) return false;
    // Throttle: skip if fetched less than 5s ago
    if (Date.now() - get()._lastFetchTime < 5000) return false;

    const token = useAuthStore.getState().getAccessToken();
    if (!token) {
      console.warn('[credits] fetchBalance skipped — no access token yet');
      return false;
    }

    set({ loading: true, _fetchInFlight: true });
    try {
      const res = await fetch('/api/credits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch credits');
      const data = await res.json();
      set({ balance: data.balance, loading: false, error: null, _fetchInFlight: false, _lastFetchTime: Date.now() });
      return true;
    } catch (err) {
      console.error('[credits] fetchBalance failed:', err.message);
      set({ loading: false, error: err.message, _fetchInFlight: false, _lastFetchTime: Date.now() });
      return false;
    }
  },

  updateBalance: (newBalance) => {
    set({ balance: newBalance });
  },

  hasCredits: () => {
    const { balance } = get();
    return balance !== null && balance >= 0.01;
  },

  redeemPromoCode: async (code) => {
    const token = useAuthStore.getState().getAccessToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'redeem', code }),
      });
      const data = await res.json();
      if (data.success) {
        set({ balance: data.balance });
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  startAutoRefresh: () => {
    const interval = get()._refreshInterval;
    if (interval) return; // Already running

    get().fetchBalance();
    const id = setInterval(() => get().fetchBalance(), 120_000); // 2min (was 30s — 4x reduction)
    set({ _refreshInterval: id });

    // When auth session appears (e.g. after page reload), fetch immediately
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (state.session && !prev.session) {
        get().fetchBalance();
      }
    });
    set({ _authUnsub: unsub });
  },

  stopAutoRefresh: () => {
    const id = get()._refreshInterval;
    if (id) {
      clearInterval(id);
      set({ _refreshInterval: null });
    }
    const unsub = get()._authUnsub;
    if (unsub) {
      unsub();
      set({ _authUnsub: null });
    }
  },
}));

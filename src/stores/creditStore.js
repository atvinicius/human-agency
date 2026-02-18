import { create } from 'zustand';
import { useAuthStore } from './authStore';

export const useCreditStore = create((set, get) => ({
  balance: null,
  loading: false,
  error: null,
  _refreshInterval: null,

  fetchBalance: async () => {
    const token = useAuthStore.getState().getAccessToken();
    if (!token) return;

    set({ loading: true });
    try {
      const res = await fetch('/api/credits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch credits');
      const data = await res.json();
      set({ balance: data.balance, loading: false, error: null });
    } catch (err) {
      set({ loading: false, error: err.message });
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
    const id = setInterval(() => get().fetchBalance(), 30_000);
    set({ _refreshInterval: id });
  },

  stopAutoRefresh: () => {
    const id = get()._refreshInterval;
    if (id) {
      clearInterval(id);
      set({ _refreshInterval: null });
    }
  },
}));

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initialize: () => {
    if (!isSupabaseConfigured()) {
      set({ loading: false });
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error);
        set({ loading: false, error: error.message });
        return;
      }
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    // Listen for auth changes (token refresh, magic link, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      }
    );

    // Return unsubscribe for cleanup
    return () => subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      return { error };
    }
    return { data };
  },

  signUp: async (email, password) => {
    set({ error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message });
      return { error };
    }
    return { data };
  },

  signInWithMagicLink: async (email) => {
    set({ error: null });
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      set({ error: error.message });
      return { error };
    }
    return { data };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error: error.message });
      return;
    }
    set({ user: null, session: null });
  },

  getAccessToken: () => get().session?.access_token ?? null,

  clearError: () => set({ error: null }),
}));

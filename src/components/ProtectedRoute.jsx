import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { isSupabaseConfigured } from '../lib/supabase';

export default function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  // If Supabase is not configured, pass through (demo mode)
  if (!isSupabaseConfigured()) return children;

  // Still initializing auth — don't redirect yet
  if (loading) return null;

  // Not authenticated or email not confirmed — redirect to login
  if (!user || !user.email_confirmed_at) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

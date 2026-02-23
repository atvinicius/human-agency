import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { isSupabaseConfigured } from './lib/supabase';
import Landing from './pages/Landing';
import Demo from './pages/Demo';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const initTheme = useThemeStore((state) => state.initTheme);
  const authLoading = useAuthStore((state) => state.loading);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initTheme();
    const unsubscribe = initialize();
    return () => unsubscribe?.();
  }, [initTheme, initialize]);

  // Show loading gate while auth initializes (only when Supabase is configured)
  if (isSupabaseConfigured() && authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--theme-bg)',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--theme-border)',
            borderTopColor: 'var(--theme-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/demo"
            element={
              <ProtectedRoute>
                <Demo />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </>
  );
}

export default App;

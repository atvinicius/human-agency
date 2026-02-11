import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [timedOut, setTimedOut] = useState(false);

  // Navigate to /demo once user is set by onAuthStateChange
  useEffect(() => {
    if (user) {
      navigate('/demo', { replace: true });
    }
  }, [user, navigate]);

  // Timeout fallback — redirect to login after 5s if auth never completes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().user) {
        setTimedOut(true);
        navigate('/login', { replace: true });
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ marginBottom: '16px', display: 'inline-block' }}
        >
          <Loader size={32} style={{ color: 'var(--theme-accent)' }} />
        </motion.div>
        <p style={{ fontSize: '16px', color: 'var(--theme-text-secondary)' }}>
          {timedOut ? 'Redirecting...' : 'Completing sign in...'}
        </p>
      </motion.div>
    </div>
  );
}

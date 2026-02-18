import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function BetaWelcome({ userId, onDismiss }) {
  const handleDismiss = () => {
    if (userId) {
      localStorage.setItem(`beta_welcome_seen_${userId}`, 'true');
    }
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--theme-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          borderRadius: '16px',
          padding: '48px 40px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--theme-accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Sparkles size={28} style={{ color: 'var(--theme-accent)' }} />
        </motion.div>

        <h2
          className="font-serif"
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'var(--theme-text-primary)',
            marginBottom: '12px',
          }}
        >
          Welcome to the Beta
        </h2>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--theme-text-secondary)',
            lineHeight: 1.7,
            marginBottom: '24px',
          }}
        >
          You've been granted{' '}
          <strong style={{ color: 'var(--theme-accent)', fontSize: '16px' }}>$10.00 in credits</strong>{' '}
          as a beta tester. Use them to launch research missions and explore what multi-agent AI can do.
        </p>

        <div
          style={{
            padding: '16px',
            background: 'var(--theme-bg)',
            borderRadius: '10px',
            marginBottom: '28px',
          }}
        >
          <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--theme-accent)', marginBottom: '4px' }}>
            $10.00
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Beta Credits
          </div>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: 'var(--theme-accent)',
            border: 'none',
            borderRadius: '10px',
            color: 'var(--theme-accent-text)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          Start Exploring
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}

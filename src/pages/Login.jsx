import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader, CheckCircle, Gift, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/demo';

  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithMagicLink = useAuthStore((s) => s.signInWithMagicLink);
  const clearError = useAuthStore((s) => s.clearError);

  const [method, setMethod] = useState('magic'); // 'magic' | 'password'
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [showPromoField, setShowPromoField] = useState(false);

  // Redirect if already logged in (and verified)
  useEffect(() => {
    if (user && user.email_confirmed_at) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    clearError();

    // Store promo code before auth so it can be redeemed after confirmation
    if (mode === 'signup' && promoCode.trim()) {
      localStorage.setItem('pending_promo_code', promoCode.trim());
    }

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);
    if (!result.error) {
      if (result.needsConfirmation) {
        setConfirmationPending(true);
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    clearError();

    // Store promo code before magic link redirect
    if (promoCode.trim()) {
      localStorage.setItem('pending_promo_code', promoCode.trim());
    }

    const result = await signInWithMagicLink(email);
    setLoading(false);
    if (!result.error) {
      setMagicLinkSent(true);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    background: 'var(--theme-bg)',
    border: '1px solid var(--theme-border)',
    borderRadius: '8px',
    color: 'var(--theme-text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const iconStyle = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--theme-text-muted)',
    pointerEvents: 'none',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--theme-bg)',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          borderRadius: '12px',
          padding: '40px 32px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            className="font-serif"
            style={{
              fontSize: '24px',
              fontWeight: 500,
              color: 'var(--theme-text-primary)',
              marginBottom: '8px',
            }}
          >
            Human Agency
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)' }}>
            Sign in to Mission Control
          </p>
        </div>

        {/* Email confirmation pending */}
        {confirmationPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '16px 0' }}
          >
            <CheckCircle
              size={48}
              style={{ color: 'var(--theme-accent)', marginBottom: '16px', display: 'block', margin: '0 auto 16px' }}
            />
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '8px' }}>
              Confirm your email
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)', marginBottom: '20px' }}>
              We sent a confirmation link to <strong style={{ color: 'var(--theme-text-primary)' }}>{email}</strong>
            </p>
            <button
              onClick={() => {
                setConfirmationPending(false);
                setMode('signin');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--theme-accent)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Back to Sign In
            </button>
          </motion.div>
        )}

        {/* Method toggle + forms (hidden when confirmation pending) */}
        {!confirmationPending && (<>
        <div
          style={{
            display: 'flex',
            background: 'var(--theme-bg)',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '24px',
          }}
        >
          {[
            { key: 'magic', label: 'Magic Link' },
            { key: 'password', label: 'Email & Password' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setMethod(key);
                clearError();
                setMagicLinkSent(false);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: method === key ? 'var(--theme-surface)' : 'transparent',
                color: method === key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
                boxShadow: method === key ? 'var(--theme-shadow)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'hsla(0, 70%, 50%, 0.1)',
              border: '1px solid hsla(0, 70%, 50%, 0.3)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'hsl(0, 70%, 60%)',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Password mode */}
        {method === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={iconStyle} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={iconStyle} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  style={inputStyle}
                />
              </div>
              {mode === 'signup' && !showPromoField && (
                <button
                  type="button"
                  onClick={() => setShowPromoField(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--theme-text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Gift size={12} />
                  Have a promo code?
                  <ChevronDown size={12} />
                </button>
              )}
              {mode === 'signup' && showPromoField && (
                <div style={{ position: 'relative' }}>
                  <Gift size={16} style={iconStyle} />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo code (optional)"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'var(--theme-border)' : 'var(--theme-accent)',
                border: 'none',
                borderRadius: '8px',
                color: loading ? 'var(--theme-text-muted)' : 'var(--theme-accent-text)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader size={16} />
                </motion.div>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--theme-text-muted)' }}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  clearError();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--theme-accent)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: 0,
                }}
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </form>
        )}

        {/* Magic link mode */}
        {method === 'magic' && !magicLinkSent && (
          <form onSubmit={handleMagicLink}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={iconStyle} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  style={inputStyle}
                />
              </div>
              {!showPromoField ? (
                <button
                  type="button"
                  onClick={() => setShowPromoField(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--theme-text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Gift size={12} />
                  Have a promo code?
                  <ChevronDown size={12} />
                </button>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Gift size={16} style={iconStyle} />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo code (optional)"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'var(--theme-border)' : 'var(--theme-accent)',
                border: 'none',
                borderRadius: '8px',
                color: loading ? 'var(--theme-text-muted)' : 'var(--theme-accent-text)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader size={16} />
                </motion.div>
              ) : (
                <>
                  Send Magic Link
                  <Mail size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Magic link sent */}
        {method === 'magic' && magicLinkSent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '16px 0' }}
          >
            <CheckCircle
              size={48}
              style={{ color: 'var(--theme-accent)', marginBottom: '16px', display: 'block', margin: '0 auto 16px' }}
            />
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '8px' }}>
              Check your email
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)', marginBottom: '20px' }}>
              We sent a magic link to <strong style={{ color: 'var(--theme-text-primary)' }}>{email}</strong>
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--theme-accent)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Send again
            </button>
          </motion.div>
        )}
        </>)}
      </motion.div>
    </div>
  );
}

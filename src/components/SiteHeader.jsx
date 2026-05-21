import { Link, useLocation } from 'react-router-dom';
import { LogIn, Play } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '../stores/authStore';
import { isSupabaseConfigured } from '../lib/supabase';

export default function SiteHeader() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const showAuth = isSupabaseConfigured();
  const ctaIsLogin = showAuth && !user;
  const CtaIcon = ctaIsLogin ? LogIn : Play;

  const navLinks = [
    { to: '/', label: 'Product' },
    { to: '/manifesto', label: 'Manifesto' },
  ];

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand">
          Human Agency
        </Link>

        <nav className="site-header__nav" aria-label="Primary navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`site-header__nav-link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="site-header__actions">
          <Link to={ctaIsLogin ? '/login' : '/demo'} className="site-header__cta">
            <CtaIcon size={15} />
            <span>{ctaIsLogin ? 'Sign In' : showAuth && user ? 'Mission Control' : 'Try Demo'}</span>
          </Link>
          <ThemeToggle size="small" />
        </div>
      </div>
    </header>
  );
}

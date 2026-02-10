import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

export default function ThemeToggle({ size = 'default' }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const sizes = {
    small: { button: 32, icon: 14 },
    default: { button: 40, icon: 18 },
  };

  const { button, icon } = sizes[size] || sizes.default;

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: button,
        height: button,
        borderRadius: '50%',
        border: '1px solid var(--theme-border)',
        background: 'var(--theme-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        color: 'var(--theme-text-secondary)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? <Moon size={icon} /> : <Sun size={icon} />}
      </motion.div>
    </motion.button>
  );
}

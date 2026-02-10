import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' is the default/standard theme

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });

        // Update document class for CSS
        if (newTheme === 'light') {
          document.documentElement.classList.add('light-theme');
          document.documentElement.classList.remove('dark-theme');
        } else {
          document.documentElement.classList.add('dark-theme');
          document.documentElement.classList.remove('light-theme');
        }
      },

      setTheme: (theme) => {
        set({ theme });
        if (theme === 'light') {
          document.documentElement.classList.add('light-theme');
          document.documentElement.classList.remove('dark-theme');
        } else {
          document.documentElement.classList.add('dark-theme');
          document.documentElement.classList.remove('light-theme');
        }
      },

      // Initialize theme on app load
      initTheme: () => {
        const theme = get().theme;
        if (theme === 'light') {
          document.documentElement.classList.add('light-theme');
          document.documentElement.classList.remove('dark-theme');
        } else {
          document.documentElement.classList.add('dark-theme');
          document.documentElement.classList.remove('light-theme');
        }
      },
    }),
    {
      name: 'human-agency-theme',
    }
  )
);

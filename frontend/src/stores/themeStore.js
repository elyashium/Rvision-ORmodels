import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: false,
      
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),
      
      initializeTheme: () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          set({ isDarkMode: savedTheme === 'dark' });
        } else {
          // Check system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          set({ isDarkMode: prefersDark });
        }
      }
    }),
    {
      name: 'theme-storage',
      getStorage: () => localStorage,
    }
  )
);

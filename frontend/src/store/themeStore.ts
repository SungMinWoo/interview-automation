import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  initialize: () => void;
}

const applyTheme = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
  }
};

const getInitialTheme = (): boolean => {
  const stored = localStorage.getItem('theme');
  if (stored !== null) {
    return stored === 'dark';
  }
  return true; // default dark
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: getInitialTheme(),

  toggle: () => {
    const newIsDark = !get().isDark;
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    applyTheme(newIsDark);
    set({ isDark: newIsDark });
  },

  initialize: () => {
    const isDark = get().isDark;
    applyTheme(isDark);
  },
}));

import { useThemeStore } from '@/store/themeStore';

export function useTheme() {
  const isDark = useThemeStore((state) => state.isDark);
  const toggle = useThemeStore((state) => state.toggle);
  return { isDark, toggle };
}

import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// 从 localStorage 加载主题
const loadTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // 默认使用系统主题
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

// 应用主题到 document
const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch (error) {
    console.error('保存主题失败:', error);
  }
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = loadTheme();
  applyTheme(initialTheme);

  return {
    theme: initialTheme,

    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },

    toggleTheme: () => {
      const newTheme = get().theme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      set({ theme: newTheme });
    },
  };
});

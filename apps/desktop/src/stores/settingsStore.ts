import { create } from 'zustand';

interface SettingsState {
  autoPlayGif: boolean;
  setAutoPlayGif: (value: boolean) => void;
}

// 从 localStorage 加载设置
const loadAutoPlayGif = (): boolean => {
  try {
    const saved = localStorage.getItem('autoPlayGif');
    return saved === null ? true : saved === 'true'; // 默认开启
  } catch {
    return true;
  }
};

export const useSettingsStore = create<SettingsState>((set) => ({
  autoPlayGif: loadAutoPlayGif(),
  
  setAutoPlayGif: (value) => {
    try {
      localStorage.setItem('autoPlayGif', String(value));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
    set({ autoPlayGif: value });
  },
}));

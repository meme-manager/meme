/**
 * 搜索状态管理
 */

import { create } from 'zustand';
import { searchAssets, type SearchFilters, type SearchResult } from '../lib/search';

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  searchHistory: string[]; // 搜索历史，最多保存10条
  
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  search: () => Promise<void>;
  clearResults: () => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// 从 localStorage 加载搜索历史
const loadSearchHistory = (): string[] => {
  try {
    const saved = localStorage.getItem('search_history');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  filters: {},
  results: null,
  loading: false,
  error: null,
  searchHistory: loadSearchHistory(),
  
  setQuery: (query) => {
    set({ query });
    // 自动搜索（带防抖）
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      get().search();
    }, 300);
  },
  
  setFilters: (filters) => {
    set({ filters });
    get().search();
  },
  
  search: async () => {
    const { query, filters, addToHistory } = get();
    
    // 如果没有查询词且没有筛选条件，清空结果
    if (!query.trim() && Object.keys(filters).length === 0) {
      set({ results: null });
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      const results = await searchAssets(query, filters);
      set({ results, loading: false });
      
      // 添加到搜索历史
      if (query.trim()) {
        addToHistory(query.trim());
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
    }
  },
  
  clearResults: () => {
    set({ results: null, query: '', filters: {} });
  },
  
  addToHistory: (query) => {
    if (!query.trim()) return;
    
    set(state => {
      // 移除重复项
      const newHistory = [query, ...state.searchHistory.filter(q => q !== query)]
        .slice(0, 10); // 最多保存10条
      
      // 保存到 localStorage
      try {
        localStorage.setItem('search_history', JSON.stringify(newHistory));
      } catch (error) {
        console.error('保存搜索历史失败:', error);
      }
      
      return { searchHistory: newHistory };
    });
  },
  
  clearHistory: () => {
    set({ searchHistory: [] });
    try {
      localStorage.removeItem('search_history');
    } catch (error) {
      console.error('清除搜索历史失败:', error);
    }
  },
}));

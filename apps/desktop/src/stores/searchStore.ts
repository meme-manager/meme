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
  
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  search: () => Promise<void>;
  clearResults: () => void;
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  filters: {},
  results: null,
  loading: false,
  error: null,
  
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
    const { query, filters } = get();
    
    // 如果没有查询词，清空结果
    if (!query.trim()) {
      set({ results: null });
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      const results = await searchAssets(query, filters);
      set({ results, loading: false });
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
}));

/**
 * 搜索状态管理
 */

import { create } from 'zustand';
import type { SearchOptions, SearchResult, SearchFilter } from '../types/search';
import { searchAssets } from '../lib/search';

interface SearchState {
  query: string;
  filters: SearchFilter[];
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setQuery: (query: string) => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (type: string, value: any) => void;
  clearFilters: () => void;
  search: (options?: Partial<SearchOptions>) => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  filters: [],
  results: null,
  loading: false,
  error: null,
  
  setQuery: (query) => {
    set({ query });
    // 自动搜索（带防抖）
    const timeoutId = setTimeout(() => {
      get().search();
    }, 300);
    return () => clearTimeout(timeoutId);
  },
  
  addFilter: (filter) => {
    set(state => ({
      filters: [...state.filters, { ...filter, active: true }]
    }));
    get().search();
  },
  
  removeFilter: (type, value) => {
    set(state => ({
      filters: state.filters.filter(
        f => !(f.type === type && f.value === value)
      )
    }));
    get().search();
  },
  
  clearFilters: () => {
    set({ filters: [] });
    get().search();
  },
  
  search: async (options = {}) => {
    const { query, filters } = get();
    
    set({ loading: true, error: null });
    
    try {
      // 构建搜索选项
      const searchOptions: SearchOptions = {
        query,
        filters: {
          mimeTypes: filters
            .filter(f => f.type === 'mimeType' && f.active)
            .map(f => f.value as string),
          tags: filters
            .filter(f => f.type === 'tag' && f.active)
            .map(f => f.value as string),
          collections: filters
            .filter(f => f.type === 'collection' && f.active)
            .map(f => f.value as string),
        },
        ...options,
      };
      
      const results = await searchAssets(searchOptions);
      set({ results, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
    }
  },
  
  clearResults: () => {
    set({ results: null, query: '', filters: [] });
  },
}));

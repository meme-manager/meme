/**
 * 标签状态管理
 */

import { create } from 'zustand';
import type { Tag } from '../types/asset';
import {
  listTags,
  createTag,
  deleteTag,
  getOrCreateTag,
} from '../lib/database/operations';

interface TagState {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadTags: () => Promise<void>;
  createNewTag: (name: string, color?: string) => Promise<Tag | null>;
  deleteTagById: (id: string) => Promise<void>;
  getOrCreateTagByName: (name: string) => Promise<Tag | null>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,
  error: null,
  
  loadTags: async () => {
    set({ loading: true, error: null });
    try {
      const tags = await listTags();
      set({ tags, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
    }
  },
  
  createNewTag: async (name, color) => {
    set({ loading: true, error: null });
    try {
      const tag = await createTag({
        name,
        color: color || null,
        description: null,
        icon: null,
      });
      await get().loadTags();
      set({ loading: false });
      return tag;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
      return null;
    }
  },
  
  deleteTagById: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteTag(id);
      await get().loadTags();
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
    }
  },
  
  getOrCreateTagByName: async (name) => {
    try {
      const tag = await getOrCreateTag(name);
      await get().loadTags();
      return tag;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
}));

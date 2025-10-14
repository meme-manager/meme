/**
 * 资产状态管理
 */

import { create } from 'zustand';
import type { Asset } from '../types/asset';
import { listAssets, deleteAsset, incrementUseCount } from '../lib/database/operations';
import { importAsset, importAssets } from '../lib/assetManager';

interface AssetState {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  selectedAssetIds: Set<string>;
  
  // Actions
  loadAssets: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  importSingleAsset: (file: File, options?: any) => Promise<void>;
  importMultipleAssets: (files: File[], options?: any) => Promise<void>;
  deleteAssetById: (id: string) => Promise<void>;
  incrementAssetUseCount: (id: string) => Promise<void>;
  selectAsset: (id: string) => void;
  deselectAsset: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  loading: false,
  error: null,
  selectedAssetIds: new Set(),
  
  loadAssets: async () => {
    set({ loading: true, error: null });
    try {
      const assets = await listAssets();
      set({ assets, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : String(error),
        loading: false 
      });
    }
  },
  
  refreshAssets: async () => {
    await get().loadAssets();
  },
  
  importSingleAsset: async (file, options) => {
    set({ loading: true, error: null });
    try {
      const result = await importAsset({ file, ...options });
      if (result.success) {
        await get().refreshAssets();
      } else {
        set({ error: result.error || '导入失败' });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      set({ loading: false });
    }
  },
  
  importMultipleAssets: async (files, options) => {
    set({ loading: true, error: null });
    try {
      await importAssets(files, options);
      await get().refreshAssets();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      set({ loading: false });
    }
  },
  
  deleteAssetById: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteAsset(id);
      await get().refreshAssets();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      set({ loading: false });
    }
  },
  
  incrementAssetUseCount: async (id) => {
    try {
      await incrementUseCount(id);
      // 更新本地状态
      set(state => ({
        assets: state.assets.map(asset =>
          asset.id === id
            ? { ...asset, use_count: asset.use_count + 1, last_used_at: Date.now() }
            : asset
        )
      }));
    } catch (error) {
      console.error('Failed to increment use count:', error);
    }
  },
  
  selectAsset: (id) => {
    set(state => ({
      selectedAssetIds: new Set(state.selectedAssetIds).add(id)
    }));
  },
  
  deselectAsset: (id) => {
    set(state => {
      const newSet = new Set(state.selectedAssetIds);
      newSet.delete(id);
      return { selectedAssetIds: newSet };
    });
  },
  
  clearSelection: () => {
    set({ selectedAssetIds: new Set() });
  },
  
  selectAll: () => {
    set(state => ({
      selectedAssetIds: new Set(state.assets.map(a => a.id))
    }));
  },
}));

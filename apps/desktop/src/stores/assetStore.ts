/**
 * 资产状态管理
 */

import { create } from 'zustand';
import type { Asset } from '../types/asset';
import { listAssets, deleteAsset, incrementUseCount } from '../lib/database/operations';
import { importAsset, importAssets } from '../lib/assetManager';
import { useImportProgress } from '../components/import/ImportProgress';
import { useToastStore } from '../components/ui/Toast';

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
    
    const progressStore = useImportProgress.getState();
    const toastStore = useToastStore.getState();
    
    try {
      // 为每个文件创建进度任务
      const taskIds = files.map(file => progressStore.addTask(file.name));
      
      // 导入文件
      const results = await importAssets(files, {
        ...options,
        onProgress: (current) => {
          const taskId = taskIds[current - 1];
          if (taskId) {
            progressStore.updateTask(taskId, {
              status: 'processing',
              progress: 100,
            });
          }
        },
      });
      
      // 更新任务状态
      results.forEach((result, index) => {
        const taskId = taskIds[index];
        if (taskId) {
          if (result.success) {
            progressStore.updateTask(taskId, {
              status: result.is_duplicate ? 'error' : 'success',
              progress: 100,
              error: result.is_duplicate ? '文件已存在' : undefined,
            });
          } else {
            progressStore.updateTask(taskId, {
              status: 'error',
              progress: 0,
              error: result.error || '导入失败',
            });
          }
        }
      });
      
      // 显示总结Toast
      const successCount = results.filter(r => r.success && !r.is_duplicate).length;
      const duplicateCount = results.filter(r => r.is_duplicate).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toastStore.addToast(`成功导入 ${successCount} 张图片`, 'success');
      }
      if (duplicateCount > 0) {
        toastStore.addToast(`跳过 ${duplicateCount} 张重复图片`, 'warning');
      }
      if (errorCount > 0) {
        toastStore.addToast(`${errorCount} 张图片导入失败`, 'error');
      }
      
      await get().refreshAssets();
    } catch (error) {
      toastStore.addToast('导入失败', 'error');
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

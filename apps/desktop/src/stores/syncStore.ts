/**
 * 同步状态管理 Store
 */

import { create } from 'zustand';
import { syncManager } from '../lib/sync/syncManager';
import { apiClient } from '../lib/api/client';
import type { DeviceInfo, SyncResult } from '../types/sync';

const LOG_PREFIX = '[Sync Store]';

interface SyncState {
  // 同步状态
  enabled: boolean;
  syncing: boolean;
  lastSyncTime: number | null;
  lastSyncSuccess: boolean;
  error: string | null;
  
  // 认证信息
  isAuthenticated: boolean;
  userId: string | null;
  deviceId: string | null;
  token: string | null;
  
  // 配额信息
  quota: {
    assets: { used: number; limit: number; percentage: number };
    storage: { used: number; limit: number; percentage: number };
    shares: { used: number; limit: number; percentage: number };
  } | null;
  
  // Actions
  initialize: () => Promise<void>;
  login: (deviceInfo: DeviceInfo) => Promise<void>;
  logout: () => Promise<void>;
  enableSync: () => Promise<void>;
  disableSync: () => Promise<void>;
  performSync: () => Promise<SyncResult>;
  loadQuota: () => Promise<void>;
  setError: (error: string | null) => void;
}

/**
 * 从 localStorage 加载同步配置
 */
const loadSyncConfig = () => {
  try {
    const enabled = localStorage.getItem('sync_enabled') === 'true';
    const lastSyncTime = localStorage.getItem('sync_last_time');
    const userId = localStorage.getItem('sync_user_id');
    const deviceId = localStorage.getItem('sync_device_id');
    const token = localStorage.getItem('sync_token');
    
    return {
      enabled,
      lastSyncTime: lastSyncTime ? parseInt(lastSyncTime) : null,
      userId,
      deviceId,
      token,
      isAuthenticated: !!(userId && token),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} 加载配置失败:`, error);
    return {
      enabled: false,
      lastSyncTime: null,
      userId: null,
      deviceId: null,
      token: null,
      isAuthenticated: false,
    };
  }
};

/**
 * 保存同步配置到 localStorage
 */
const saveSyncConfig = (config: {
  enabled?: boolean;
  lastSyncTime?: number;
  userId?: string;
  deviceId?: string;
  token?: string;
}) => {
  try {
    if (config.enabled !== undefined) {
      localStorage.setItem('sync_enabled', String(config.enabled));
    }
    if (config.lastSyncTime !== undefined) {
      localStorage.setItem('sync_last_time', String(config.lastSyncTime));
    }
    if (config.userId !== undefined) {
      localStorage.setItem('sync_user_id', config.userId);
    }
    if (config.deviceId !== undefined) {
      localStorage.setItem('sync_device_id', config.deviceId);
    }
    if (config.token !== undefined) {
      localStorage.setItem('sync_token', config.token);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 保存配置失败:`, error);
  }
};

/**
 * 清除同步配置
 */
const clearSyncConfig = () => {
  try {
    localStorage.removeItem('sync_enabled');
    localStorage.removeItem('sync_last_time');
    localStorage.removeItem('sync_user_id');
    localStorage.removeItem('sync_device_id');
    localStorage.removeItem('sync_token');
  } catch (error) {
    console.error(`${LOG_PREFIX} 清除配置失败:`, error);
  }
};

/**
 * 创建同步 Store
 */
export const useSyncStore = create<SyncState>((set, get) => {
  const initialConfig = loadSyncConfig();
  
  return {
    // 初始状态
    enabled: initialConfig.enabled,
    syncing: false,
    lastSyncTime: initialConfig.lastSyncTime,
    lastSyncSuccess: true,
    error: null,
    
    isAuthenticated: initialConfig.isAuthenticated,
    userId: initialConfig.userId,
    deviceId: initialConfig.deviceId,
    token: initialConfig.token,
    
    quota: null,
    
    /**
     * 初始化同步管理器
     */
    initialize: async () => {
      console.log(`${LOG_PREFIX} 初始化`);
      const state = get();
      
      if (state.isAuthenticated && state.userId && state.deviceId && state.token) {
        try {
          await syncManager.initialize({
            enabled: state.enabled,
            lastSyncTime: state.lastSyncTime || 0,
            deviceId: state.deviceId,
            userId: state.userId,
            token: state.token,
          });
          
          console.log(`${LOG_PREFIX} 初始化成功`);
        } catch (error) {
          console.error(`${LOG_PREFIX} 初始化失败:`, error);
          set({ error: error instanceof Error ? error.message : '初始化失败' });
        }
      }
    },
    
    /**
     * 登录/注册设备
     */
    login: async (deviceInfo: DeviceInfo) => {
      console.log(`${LOG_PREFIX} 登录设备: ${deviceInfo.device_name}`);
      set({ error: null });
      
      try {
        const response = await apiClient.deviceRegister(deviceInfo);
        
        // 保存认证信息
        saveSyncConfig({
          userId: response.user_id,
          deviceId: deviceInfo.device_id,
          token: response.token,
        });
        
        // 更新状态
        set({
          isAuthenticated: true,
          userId: response.user_id,
          deviceId: deviceInfo.device_id,
          token: response.token,
        });
        
        // 初始化同步管理器
        await syncManager.initialize({
          enabled: get().enabled,
          lastSyncTime: get().lastSyncTime || 0,
          deviceId: deviceInfo.device_id,
          userId: response.user_id,
          token: response.token,
        });
        
        console.log(`${LOG_PREFIX} 登录成功,用户: ${response.user_id}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} 登录失败:`, error);
        const errorMessage = error instanceof Error ? error.message : '登录失败';
        set({ error: errorMessage });
        throw error;
      }
    },
    
    /**
     * 登出
     */
    logout: async () => {
      console.log(`${LOG_PREFIX} 登出`);
      
      // 禁用同步
      await syncManager.disable();
      
      // 清除配置
      clearSyncConfig();
      
      // 重置状态
      set({
        enabled: false,
        isAuthenticated: false,
        userId: null,
        deviceId: null,
        token: null,
        lastSyncTime: null,
        quota: null,
        error: null,
      });
    },
    
    /**
     * 启用同步
     */
    enableSync: async () => {
      console.log(`${LOG_PREFIX} 启用同步`);
      
      if (!get().isAuthenticated) {
        set({ error: '请先登录' });
        throw new Error('请先登录');
      }
      
      saveSyncConfig({ enabled: true });
      set({ enabled: true, error: null });
    },
    
    /**
     * 禁用同步
     */
    disableSync: async () => {
      console.log(`${LOG_PREFIX} 禁用同步`);
      
      await syncManager.disable();
      saveSyncConfig({ enabled: false });
      set({ enabled: false, error: null });
    },
    
    /**
     * 执行同步
     */
    performSync: async () => {
      console.log(`${LOG_PREFIX} 开始同步`);
      
      if (!get().isAuthenticated) {
        const error = '请先登录';
        set({ error });
        throw new Error(error);
      }
      
      if (!get().enabled) {
        const error = '同步未启用';
        set({ error });
        throw new Error(error);
      }
      
      if (get().syncing) {
        const error = '同步正在进行中';
        set({ error });
        throw new Error(error);
      }
      
      set({ syncing: true, error: null });
      
      try {
        const result = await syncManager.sync();
        
        if (result.success) {
          saveSyncConfig({ lastSyncTime: result.timestamp });
          set({
            lastSyncTime: result.timestamp,
            lastSyncSuccess: true,
            syncing: false,
          });
          console.log(`${LOG_PREFIX} 同步成功`);
        } else {
          set({
            lastSyncSuccess: false,
            syncing: false,
            error: result.error || '同步失败',
          });
          console.error(`${LOG_PREFIX} 同步失败:`, result.error);
        }
        
        return result;
      } catch (error) {
        console.error(`${LOG_PREFIX} 同步异常:`, error);
        const errorMessage = error instanceof Error ? error.message : '同步失败';
        set({
          syncing: false,
          lastSyncSuccess: false,
          error: errorMessage,
        });
        throw error;
      }
    },
    
    /**
     * 加载配额信息
     */
    loadQuota: async () => {
      console.log(`${LOG_PREFIX} 加载配额信息`);
      
      if (!get().isAuthenticated) {
        return;
      }
      
      try {
        const quota = await apiClient.getQuota();
        set({ quota });
        console.log(`${LOG_PREFIX} 配额加载成功`);
      } catch (error) {
        console.error(`${LOG_PREFIX} 加载配额失败:`, error);
      }
    },
    
    /**
     * 设置错误信息
     */
    setError: (error: string | null) => {
      set({ error });
    },
  };
});

/**
 * 云同步设置组件 - 内联版本(适配设置面板)
 */

import { useState, useEffect } from 'react';
import { useSyncStore } from '../../stores/syncStore';
import { apiClient } from '../../lib/api/client';

export function CloudSyncSettingsInline() {
  const {
    enabled,
    syncing,
    lastSyncTime,
    lastSyncSuccess,
    error,
    isAuthenticated,
    userId,
    quota,
    initialize,
    login,
    logout,
    enableSync,
    disableSync,
    performSync,
    loadQuota,
    setError,
  } = useSyncStore();

  const [deviceName, setDeviceName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787');

  // 初始化
  useEffect(() => {
    const init = async () => {
      initialize();
      
      // 从 localStorage 恢复保存的 API 地址
      const savedApiUrl = localStorage.getItem('sync_api_url');
      if (savedApiUrl) {
        setApiUrl(savedApiUrl);
        apiClient.setBaseUrl(savedApiUrl);
        console.log('[CloudSyncInline] 恢复 API 地址:', savedApiUrl);
      } else {
        // 如果没有保存的地址，使用 apiClient 的当前地址
        setApiUrl(apiClient.getBaseUrl());
      }
      
      if (isAuthenticated) {
        loadQuota();
      }
    };
    init();
  }, [isAuthenticated]);

  // 获取设备信息
  const getDeviceInfo = () => {
    const platform = navigator.platform.toLowerCase();
    let deviceType: 'macos' | 'windows' | 'linux' = 'macos';
    
    if (platform.includes('win')) {
      deviceType = 'windows';
    } else if (platform.includes('linux')) {
      deviceType = 'linux';
    }

    return {
      device_id: crypto.randomUUID(),
      device_name: deviceName || `${deviceType} 设备`,
      device_type: 'desktop' as const,
      platform: deviceType,
    };
  };

  // 登录处理
  const handleLogin = async () => {
    if (!deviceName.trim()) {
      setError('请输入设备名称');
      return;
    }

    if (!apiUrl.trim()) {
      setError('请输入服务器地址');
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      // 设置 API 地址
      apiClient.setBaseUrl(apiUrl.trim());
      console.log('[CloudSync] 使用 API 地址:', apiUrl.trim());
      
      // 保存 API 地址到 localStorage（登录前保存，以便 login 函数能获取到）
      localStorage.setItem('sync_api_url', apiUrl.trim());
      
      // 登录
      const deviceInfo = getDeviceInfo();
      await login(deviceInfo);
      setDeviceName('');
    } catch (error) {
      console.error('登录失败:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 登出处理
  const handleLogout = async () => {
    if (confirm('确定要退出登录吗?这不会删除本地数据。')) {
      await logout();
    }
  };

  // 同步处理
  const handleSync = async () => {
    console.log('[CloudSyncInline] === 开始手动同步 ===');
    console.log('[CloudSyncInline] 当前状态:', {
      enabled,
      isAuthenticated,
      userId,
      syncing
    });
    
    try {
      const result = await performSync();
      console.log('[CloudSyncInline] 同步结果:', result);
      
      if (result.success) {
        console.log(`[CloudSyncInline] ✅ 同步成功: 拉取 ${result.pulledCount} 条, 推送 ${result.pushedCount} 条`);
      } else {
        console.error('[CloudSyncInline] ❌ 同步失败:', result.error);
      }
      
      await loadQuota();
    } catch (error) {
      console.error('[CloudSyncInline] 同步异常:', error);
    }
  };

  // 切换同步开关
  const handleToggleSync = async (checked: boolean) => {
    try {
      if (checked) {
        await enableSync();
        // 清除之前的错误
        setError(null);
      } else {
        await disableSync();
        setError(null);
      }
    } catch (error) {
      console.error('切换同步失败:', error);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className="cloud-sync-inline">
        {error && (
          <div className="sync-error">
            ⚠️ {error}
          </div>
        )}
        
        <div className="sync-login-form">
          {/* 服务器地址 */}
          <div className="sync-form-group">
            <label className="sync-label">
              服务器地址
              <button
                type="button"
                className="sync-link-button"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? '▼' : '▶'} 高级选项
              </button>
            </label>
            <input
              type="text"
              className="sync-input"
              placeholder="例如: https://your-worker.workers.dev"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="sync-hint">
              Workers API 地址,默认使用本地开发服务器
            </p>
          </div>

          {/* 设备名称 */}
          <div className="sync-form-group">
            <label className="sync-label">设备名称</label>
            <input
              type="text"
              className="sync-input"
              placeholder="例如: 我的 MacBook Pro"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <p className="sync-hint">
              用于在多设备管理中识别此设备
            </p>
          </div>

          <button
            className="sync-button sync-button-primary"
            onClick={handleLogin}
            disabled={isLoggingIn || !deviceName.trim() || !apiUrl.trim()}
          >
            {isLoggingIn ? '🔄 登录中...' : '🚀 登录并启用云同步'}
          </button>
        </div>

        <style>{`
          .cloud-sync-inline {
            padding: 12px 0;
          }
          
          .sync-error {
            padding: 8px 12px;
            background: #fee;
            color: #c33;
            border-radius: 6px;
            font-size: 13px;
            margin-bottom: 12px;
          }
          
          .sync-login-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          
          .sync-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          
          .sync-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-color, #333);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .sync-link-button {
            background: none;
            border: none;
            color: var(--primary-color, #007AFF);
            font-size: 12px;
            cursor: pointer;
            padding: 0;
          }
          
          .sync-link-button:hover {
            text-decoration: underline;
          }
          
          .sync-input {
            padding: 10px 12px;
            border: 1px solid var(--border-color, #ddd);
            border-radius: 6px;
            font-size: 14px;
            background: var(--input-bg, white);
            color: var(--text-color, #333);
          }
          
          .sync-input:focus {
            outline: none;
            border-color: var(--primary-color, #007AFF);
          }
          
          .sync-button {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .sync-button-primary {
            background: var(--primary-color, #007AFF);
            color: white;
          }
          
          .sync-button-primary:hover:not(:disabled) {
            background: var(--primary-hover, #0051D5);
          }
          
          .sync-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .sync-hint {
            font-size: 12px;
            color: var(--text-secondary, #666);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // 已登录状态
  return (
    <div className="cloud-sync-inline">
      {error && (
        <div className="sync-error">
          ⚠️ {error}
        </div>
      )}

      {/* 服务器信息 */}
      <div className="sync-server-info">
        <div className="sync-info-row">
          <span className="sync-info-label">🌐 服务器:</span>
          <span className="sync-info-value">{apiUrl}</span>
        </div>
        <div className="sync-info-row">
          <span className="sync-info-label">👤 用户ID:</span>
          <span className="sync-info-value">{userId?.slice(0, 8)}...</span>
        </div>
      </div>

      {/* 同步开关 */}
      <div className="settings-item">
        <div className="settings-item-info">
          <div className="settings-item-label">
            {enabled ? '✅ 已启用' : '⏸️ 已暂停'}
          </div>
          <div className="settings-item-desc">
            自动同步到云端
          </div>
        </div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggleSync(e.target.checked)}
            disabled={syncing}
          />
          <span className="settings-toggle-slider"></span>
        </label>
      </div>

      {/* 同步状态 */}
      <div className="sync-status">
        <div className="sync-status-row">
          <span className="sync-status-label">最后同步:</span>
          <span className="sync-status-value">
            {lastSyncSuccess ? '✅' : '❌'} {formatTime(lastSyncTime)}
          </span>
        </div>
        
        {quota && (
          <>
            <div className="sync-status-row">
              <span className="sync-status-label">资产数量:</span>
              <span className="sync-status-value">
                {quota.assets.used} / {quota.assets.limit}
              </span>
            </div>
            <div className="sync-status-row">
              <span className="sync-status-label">存储空间:</span>
              <span className="sync-status-value">
                {formatBytes(quota.storage.used)} / {formatBytes(quota.storage.limit)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="sync-actions">
        <button
          className="sync-button sync-button-primary"
          onClick={handleSync}
          disabled={syncing || !enabled}
        >
          {syncing ? '🔄 同步中...' : '🔄 立即同步'}
        </button>
        <button
          className="sync-button sync-button-secondary"
          onClick={handleLogout}
        >
          🚪 退出登录
        </button>
      </div>

      <style>{`
        .cloud-sync-inline {
          padding: 12px 0;
        }
        
        .sync-error {
          padding: 8px 12px;
          background: #fee;
          color: #c33;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        
        .sync-server-info {
          margin-bottom: 12px;
          padding: 10px 12px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 6px;
          font-size: 12px;
        }
        
        .sync-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        
        .sync-info-label {
          color: var(--text-secondary, #666);
        }
        
        .sync-info-value {
          font-family: monospace;
          color: var(--text-color, #333);
          font-weight: 500;
        }
        
        .sync-status {
          margin: 12px 0;
          padding: 12px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 6px;
        }
        
        .sync-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 13px;
        }
        
        .sync-status-label {
          color: var(--text-secondary, #666);
        }
        
        .sync-status-value {
          font-weight: 500;
          color: var(--text-color, #333);
        }
        
        .sync-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        
        .sync-button {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .sync-button-primary {
          background: var(--primary-color, #007AFF);
          color: white;
        }
        
        .sync-button-primary:hover:not(:disabled) {
          background: var(--primary-hover, #0051D5);
        }
        
        .sync-button-secondary {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-color, #333);
        }
        
        .sync-button-secondary:hover {
          background: var(--bg-hover, #e5e5e5);
        }
        
        .sync-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

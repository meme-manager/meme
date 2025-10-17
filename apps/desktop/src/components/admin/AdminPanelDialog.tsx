/**
 * 管理员面板对话框
 */

import { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { apiClient } from '../../lib/api/client';
import './AdminPanelDialog.css';

interface AdminPanelDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ServerStats {
  devices: number;
  assets: number;
  deleted_assets: number;
  tags: number;
  shares: number;
  storage_used: number;
}

export function AdminPanelDialog({ open, onClose }: AdminPanelDialogProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'stats' | 'security'>('login');
  
  // 登录表单
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // 统计数据
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // 密码设置
  const [syncPassword, setSyncPassword] = useState('');
  const [oldAdminPassword, setOldAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 从 localStorage 恢复 token
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
      setActiveTab('stats');
    }
  }, []);

  // 获取 API 基础 URL
  const getApiBaseURL = () => {
    return apiClient.getBaseUrl();
  };

  // 登录
  const handleLogin = async () => {
    if (!password) {
      setLoginError('请输入管理员密码');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await fetch(`${getApiBaseURL()}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '登录失败');
      }

      const token = data.data.token;
      setAdminToken(token);
      setIsAuthenticated(true);
      localStorage.setItem('admin_token', token);
      setPassword('');
      setActiveTab('stats');
      
      console.log('[Admin] 登录成功');
    } catch (error) {
      console.error('[Admin] 登录失败:', error);
      setLoginError(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 登出
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminToken(null);
    localStorage.removeItem('admin_token');
    setActiveTab('login');
  };

  // 加载统计数据
  const loadStats = async () => {
    if (!adminToken) return;

    setLoadingStats(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${getApiBaseURL()}/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '获取统计失败');
      }

      setStats(data.data);
    } catch (error) {
      console.error('[Admin] 获取统计失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '获取统计失败');
    } finally {
      setLoadingStats(false);
    }
  };

  // 设置同步密码
  const handleSetSyncPassword = async () => {
    if (!syncPassword) {
      setErrorMessage('请输入同步密码');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${getApiBaseURL()}/admin/set-sync-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ password: syncPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '设置同步密码失败');
      }

      setSuccessMessage('✅ 同步密码设置成功！现在可以使用此密码连接服务器。');
      setSyncPassword('');
      
      // 3秒后自动清除成功消息
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('[Admin] 设置同步密码失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '设置同步密码失败');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // 清除同步密码
  const handleClearSyncPassword = async () => {
    if (!confirm('⚠️ 确定要清除同步密码吗？\n\n清除后任何人都可以连接服务器！建议立即设置新密码。')) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${getApiBaseURL()}/admin/clear-sync-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '清除同步密码失败');
      }

      setSuccessMessage('✅ 同步密码已清除。建议立即设置新密码！');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('[Admin] 清除同步密码失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '清除同步密码失败');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // 修改管理员密码
  const handleChangeAdminPassword = async () => {
    if (!oldAdminPassword || !newAdminPassword) {
      setErrorMessage('请填写所有密码字段');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setErrorMessage('两次输入的新密码不一致');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (newAdminPassword.length < 6) {
      setErrorMessage('新密码长度至少为 6 位');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${getApiBaseURL()}/admin/set-admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          old_password: oldAdminPassword,
          new_password: newAdminPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '修改管理员密码失败');
      }

      setSuccessMessage('✅ 管理员密码修改成功！3秒后自动登出，请使用新密码重新登录。');
      setOldAdminPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      
      // 3秒后自动登出
      setTimeout(() => {
        handleLogout();
      }, 3000);
    } catch (error) {
      console.error('[Admin] 修改管理员密码失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '修改管理员密码失败');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // 自动加载统计
  useEffect(() => {
    if (isAuthenticated && activeTab === 'stats' && open) {
      loadStats();
    }
  }, [isAuthenticated, activeTab, open]);

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <Dialog open={open} onClose={onClose} title="🛡️ 管理员面板">
      <div className="admin-panel">
        {/* 成功/错误提示 */}
        {successMessage && (
          <div className="admin-alert admin-alert-success">
            ✅ {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="admin-alert admin-alert-error">
            ❌ {errorMessage}
          </div>
        )}

        {/* 登录界面 */}
        {!isAuthenticated && (
          <div className="admin-section">
            <h3 className="admin-section-title">🔐 管理员登录</h3>
            <p className="admin-section-desc">使用管理员密码登录以访问管理功能</p>
            
            <div className="admin-form">
              <div className="admin-form-group">
                <label>管理员密码</label>
                <input
                  type="password"
                  className="admin-input"
                  placeholder="输入管理员密码（默认: admin）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                {loginError && (
                  <p className="admin-form-error">{loginError}</p>
                )}
              </div>
              
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleLogin}
                disabled={isLoggingIn || !password}
              >
                {isLoggingIn ? '登录中...' : '登录'}
              </button>
              
              <p className="admin-hint">
                ⚠️ 首次使用默认密码为 <code>admin</code>，登录后请立即修改
              </p>
            </div>
          </div>
        )}

        {/* 管理界面 */}
        {isAuthenticated && (
          <>
            {/* 标签页导航 */}
            <div className="admin-tabs">
              <button
                className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                📊 统计
              </button>
              <button
                className={`admin-tab ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                🔒 安全
              </button>
              <button
                className="admin-tab admin-logout-btn"
                onClick={handleLogout}
              >
                登出
              </button>
            </div>

            {/* 统计信息 */}
            {activeTab === 'stats' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h3 className="admin-section-title">📊 服务器统计</h3>
                  <button
                    className="admin-btn-small"
                    onClick={loadStats}
                    disabled={loadingStats}
                  >
                    {loadingStats ? '⏳' : '🔄'} 刷新
                  </button>
                </div>

                {stats ? (
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                      <div className="admin-stat-value">{stats.devices}</div>
                      <div className="admin-stat-label">设备数量</div>
                    </div>
                    <div className="admin-stat-card">
                      <div className="admin-stat-value">{stats.assets}</div>
                      <div className="admin-stat-label">资产数量</div>
                    </div>
                    <div className="admin-stat-card">
                      <div className="admin-stat-value">{stats.tags}</div>
                      <div className="admin-stat-label">标签数量</div>
                    </div>
                    <div className="admin-stat-card">
                      <div className="admin-stat-value">{stats.shares}</div>
                      <div className="admin-stat-label">分享数量</div>
                    </div>
                    <div className="admin-stat-card">
                      <div className="admin-stat-value">{formatBytes(stats.storage_used)}</div>
                      <div className="admin-stat-label">存储使用</div>
                    </div>
                    <div className="admin-stat-card">
                      <div className="admin-stat-value">{stats.deleted_assets}</div>
                      <div className="admin-stat-label">已删除资产</div>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty">
                    点击刷新按钮加载统计数据
                  </div>
                )}
              </div>
            )}

            {/* 安全设置 */}
            {activeTab === 'security' && (
              <div className="admin-section">
                {/* 同步密码 */}
                <div className="admin-subsection">
                  <h3 className="admin-section-title">🔒 同步密码设置</h3>
                  <p className="admin-section-desc">
                    设置同步密码以保护服务器，防止未授权设备连接
                  </p>
                  
                  <div className="admin-form">
                    <div className="admin-form-group">
                      <label>同步密码</label>
                      <input
                        type="password"
                        className="admin-input"
                        placeholder="输入新的同步密码"
                        value={syncPassword}
                        onChange={(e) => setSyncPassword(e.target.value)}
                      />
                      <p className="admin-hint">
                        设置后，所有新设备连接时都需要输入此密码
                      </p>
                    </div>
                    
                    <div className="admin-form-actions">
                      <button
                        className="admin-btn admin-btn-primary"
                        onClick={handleSetSyncPassword}
                        disabled={!syncPassword}
                      >
                        🔒 设置同步密码
                      </button>
                      <button
                        className="admin-btn admin-btn-secondary"
                        onClick={handleClearSyncPassword}
                      >
                        🔓 清除同步密码
                      </button>
                    </div>
                  </div>
                </div>

                {/* 管理员密码 */}
                <div className="admin-subsection">
                  <h3 className="admin-section-title">🔑 修改管理员密码</h3>
                  <p className="admin-section-desc">
                    定期修改管理员密码以提高安全性
                  </p>
                  
                  <div className="admin-form">
                    <div className="admin-form-group">
                      <label>当前密码</label>
                      <input
                        type="password"
                        className="admin-input"
                        placeholder="输入当前管理员密码"
                        value={oldAdminPassword}
                        onChange={(e) => setOldAdminPassword(e.target.value)}
                      />
                    </div>
                    
                    <div className="admin-form-group">
                      <label>新密码</label>
                      <input
                        type="password"
                        className="admin-input"
                        placeholder="输入新密码（至少 6 位）"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                      />
                    </div>
                    
                    <div className="admin-form-group">
                      <label>确认新密码</label>
                      <input
                        type="password"
                        className="admin-input"
                        placeholder="再次输入新密码"
                        value={confirmAdminPassword}
                        onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      />
                    </div>
                    
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={handleChangeAdminPassword}
                      disabled={!oldAdminPassword || !newAdminPassword || !confirmAdminPassword}
                    >
                      🔑 修改密码
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

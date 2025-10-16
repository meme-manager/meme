/**
 * 云同步设置组件
 */

import { useState, useEffect } from 'react';
import { useSyncStore } from '../../stores/syncStore';
import { 
  Button,
  Switch,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Progress,
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  LogIn,
  LogOut,
  Database,
  HardDrive,
  Share2
} from '../ui';

export function CloudSyncSettings() {
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

  // 初始化
  useEffect(() => {
    initialize();
    if (isAuthenticated) {
      loadQuota();
    }
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

    setIsLoggingIn(true);
    setError(null);

    try {
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
    try {
      await performSync();
      await loadQuota();
    } catch (error) {
      console.error('同步失败:', error);
    }
  };

  // 切换同步开关
  const handleToggleSync = async (checked: boolean) => {
    try {
      if (checked) {
        await enableSync();
      } else {
        await disableSync();
      }
    } catch (error) {
      console.error('切换同步失败:', error);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Cloud className="w-6 h-6" />
          云同步设置
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          将你的表情包同步到云端,在多个设备间保持一致
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 未登录状态 */}
      {!isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              登录云同步
            </CardTitle>
            <CardDescription>
              首次使用需要注册设备,数据将加密存储在 Cloudflare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">设备名称</Label>
              <Input
                id="device-name"
                placeholder="例如: 我的 MacBook Pro"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <p className="text-xs text-muted-foreground">
                用于在多设备管理中识别此设备
              </p>
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={isLoggingIn || !deviceName.trim()}
              className="w-full"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  登录并启用云同步
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 已登录状态 */}
      {isAuthenticated && (
        <>
          {/* 同步状态卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {enabled ? (
                    <Cloud className="w-5 h-5 text-green-500" />
                  ) : (
                    <CloudOff className="w-5 h-5 text-gray-400" />
                  )}
                  同步状态
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={handleToggleSync}
                  disabled={syncing}
                />
              </CardTitle>
              <CardDescription>
                用户 ID: {userId?.slice(0, 8)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 最后同步时间 */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">最后同步:</span>
                <span className="flex items-center gap-2">
                  {lastSyncSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  {formatTime(lastSyncTime)}
                </span>
              </div>

              {/* 同步按钮 */}
              <Button
                onClick={handleSync}
                disabled={!enabled || syncing}
                className="w-full"
                variant={enabled ? 'default' : 'secondary'}
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    立即同步
                  </>
                )}
              </Button>

              {/* 登出按钮 */}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
                disabled={syncing}
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </CardContent>
          </Card>

          {/* 配额信息卡片 */}
          {quota && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  配额使用情况
                </CardTitle>
                <CardDescription>
                  免费版配额,完全够个人使用
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 图片数量 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">图片数量</span>
                    <span className="font-medium">
                      {quota.assets.used} / {quota.assets.limit}
                    </span>
                  </div>
                  <Progress value={quota.assets.percentage} />
                </div>

                {/* 存储空间 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <HardDrive className="w-4 h-4" />
                      存储空间
                    </span>
                    <span className="font-medium">
                      {formatBytes(quota.storage.used)} / {formatBytes(quota.storage.limit)}
                    </span>
                  </div>
                  <Progress value={quota.storage.percentage} />
                </div>

                {/* 分享数量 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Share2 className="w-4 h-4" />
                      分享数量
                    </span>
                    <span className="font-medium">
                      {quota.shares.used} / {quota.shares.limit}
                    </span>
                  </div>
                  <Progress value={quota.shares.percentage} />
                </div>

                {/* 警告提示 */}
                {quota.storage.percentage > 80 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      存储空间即将用完,建议删除一些不需要的图片
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* 说明信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">关于云同步</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 数据存储在 Cloudflare 全球边缘网络,安全可靠</p>
              <p>• 采用增量同步,只传输变更的数据,节省流量</p>
              <p>• 冲突采用"最后写入获胜"策略,时间戳新的覆盖旧的</p>
              <p>• 免费版配额: 10000张图片 / 1GB存储 / 100个分享</p>
              <p>• 本地数据始终保留,云同步只是备份和同步功能</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

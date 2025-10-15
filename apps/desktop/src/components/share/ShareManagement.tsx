/**
 * 分享管理组件
 * 查看和管理已创建的分享
 */

import { useState, useEffect } from 'react';
import { shareManager, type ShareListItem } from '../../lib/share/shareManager';
import { useSyncStore } from '../../stores/syncStore';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Share2, 
  Copy, 
  Trash2, 
  Eye, 
  Download, 
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from '../ui';

export function ShareManagement() {
  const { isAuthenticated } = useSyncStore();
  
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 加载分享列表
  const loadShares = async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await shareManager.listShares();
      setShares(result);
    } catch (error) {
      console.error('加载分享列表失败:', error);
      setError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadShares();
  }, [isAuthenticated]);

  // 删除分享
  const handleDelete = async (shareId: string) => {
    if (!confirm('确定要删除这个分享吗?删除后链接将失效。')) {
      return;
    }

    try {
      await shareManager.deleteShare(shareId);
      setShares(shares.filter(s => s.share_id !== shareId));
    } catch (error) {
      console.error('删除分享失败:', error);
      setError(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 复制链接
  const handleCopy = async (shareId: string) => {
    const shareUrl = `${window.location.origin}/s/${shareId}`;
    
    try {
      await shareManager.copyShareLink(shareUrl);
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 打开分享链接
  const handleOpen = (shareId: string) => {
    const shareUrl = `${window.location.origin}/s/${shareId}`;
    window.open(shareUrl, '_blank');
  };

  // 格式化时间
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 检查是否过期
  const isExpired = (expiresAt?: number) => {
    if (!expiresAt) return false;
    return expiresAt < Date.now();
  };

  if (!isAuthenticated) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          请先登录云同步才能使用分享功能
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="w-6 h-6" />
            我的分享
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理已创建的分享链接
          </p>
        </div>
        <Button onClick={loadShares} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 加载中 */}
      {loading && shares.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>加载中...</p>
        </div>
      )}

      {/* 空状态 */}
      {!loading && shares.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Share2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">还没有创建任何分享</p>
            <p className="text-sm text-muted-foreground mt-1">
              选择表情包后点击分享按钮创建分享链接
            </p>
          </CardContent>
        </Card>
      )}

      {/* 分享列表 */}
      {shares.length > 0 && (
        <div className="grid gap-4">
          {shares.map((share) => {
            const expired = isExpired(share.expires_at);
            
            return (
              <Card key={share.share_id} className={expired ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {share.title || '未命名分享'}
                        {expired && (
                          <span className="ml-2 text-sm font-normal text-red-500">
                            (已过期)
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        创建于 {formatDate(share.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpen(share.share_id)}
                        title="打开链接"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(share.share_id)}
                        title="复制链接"
                      >
                        <Copy className={`w-4 h-4 ${copiedId === share.share_id ? 'text-green-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(share.share_id)}
                        title="删除分享"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* 图片数量 */}
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">图片数</div>
                        <div className="font-medium">{share.asset_count}</div>
                      </div>
                    </div>

                    {/* 查看次数 */}
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">查看</div>
                        <div className="font-medium">{share.view_count}</div>
                      </div>
                    </div>

                    {/* 下载次数 */}
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">下载</div>
                        <div className="font-medium">{share.download_count}</div>
                      </div>
                    </div>

                    {/* 有效期 */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">有效期</div>
                        <div className="font-medium">
                          {shareManager.formatExpiryTime(share.expires_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

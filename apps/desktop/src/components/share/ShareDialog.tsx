/**
 * 分享对话框组件
 */

import { useState } from 'react';
import { shareManager, type ShareOptions } from '../../lib/share/shareManager';
import { useSyncStore } from '../../stores/syncStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog-new';
import {
  Button,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  Share2, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Link,
  Clock,
  Download
} from '../ui';
import '../ui/select.css';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetIds: string[];
}

export function ShareDialog({ open, onOpenChange, selectedAssetIds }: ShareDialogProps) {
  const { isAuthenticated } = useSyncStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresIn, setExpiresIn] = useState<string>('');
  const [maxDownloads, setMaxDownloads] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expiryOptions = shareManager.getExpiryOptions();

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setExpiresIn('');
    setMaxDownloads('');
    setShareUrl(null);
    setCopied(false);
    setError(null);
  };

  // 关闭对话框
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // 创建分享
  const handleCreateShare = async () => {
    if (!isAuthenticated) {
      setError('请先登录云同步');
      return;
    }

    if (selectedAssetIds.length === 0) {
      setError('请至少选择一张图片');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const options: ShareOptions = {
        asset_ids: selectedAssetIds,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        expires_in: expiresIn ? parseInt(expiresIn) : undefined,
        max_downloads: maxDownloads ? parseInt(maxDownloads) : undefined,
      };

      const result = await shareManager.createShare(options);
      setShareUrl(result.share_url);
    } catch (error) {
      console.error('创建分享失败:', error);
      setError(error instanceof Error ? error.message : '创建分享失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 复制链接
  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await shareManager.copyShareLink(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      setError('复制到剪贴板失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            分享表情包
          </DialogTitle>
          <DialogDescription>
            创建分享链接,让朋友可以在线预览和导入表情包
          </DialogDescription>
        </DialogHeader>

        {/* 未登录提示 */}
        {!isAuthenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              分享功能需要先登录云同步,请前往设置页面登录
            </AlertDescription>
          </Alert>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 分享成功 */}
        {shareUrl ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                分享创建成功!复制链接发送给朋友吧
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>分享链接</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  variant={copied ? 'default' : 'outline'}
                  size="icon"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">
                完成
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                创建新分享
              </Button>
            </div>
          </div>
        ) : (
          /* 创建分享表单 */
          <div className="space-y-4">
            {/* 选中的图片数量 */}
            <div className="text-sm text-muted-foreground">
              已选择 <span className="font-medium text-foreground">{selectedAssetIds.length}</span> 张图片
            </div>

            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">标题 (可选)</Label>
              <Input
                id="title"
                placeholder="例如: 我的表情包合集"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">描述 (可选)</Label>
              <Textarea
                id="description"
                placeholder="添加一些描述..."
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            {/* 有效期 */}
            <div className="space-y-2">
              <Label htmlFor="expires-in" className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                有效期
              </Label>
              <select
                id="expires-in"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="select-native"
              >
                {expiryOptions.map((option) => (
                  <option 
                    key={option.label} 
                    value={option.value?.toString() || ''}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 最大下载次数 */}
            <div className="space-y-2">
              <Label htmlFor="max-downloads" className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                最大下载次数 (可选)
              </Label>
              <Input
                id="max-downloads"
                type="number"
                placeholder="不限制"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                min="1"
                max="10000"
              />
              <p className="text-xs text-muted-foreground">
                留空表示不限制下载次数
              </p>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        {!shareUrl && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button
              onClick={handleCreateShare}
              disabled={!isAuthenticated || isCreating || selectedAssetIds.length === 0}
            >
              {isCreating ? (
                <>
                  <Link className="w-4 h-4 mr-2 animate-pulse" />
                  创建中...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  创建分享
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

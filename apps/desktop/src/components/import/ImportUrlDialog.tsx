import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAssetStore } from '../../stores/assetStore';
import { useToastStore } from '../ui/Toast';
import { createAsset, getAssetByHash } from '../../lib/database/operations';
import './ImportUrlDialog.css';

interface ImportUrlDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportUrlDialog({ open, onClose }: ImportUrlDialogProps) {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { refreshAssets } = useAssetStore();
  const { addToast } = useToastStore.getState();

  const handleAddUrl = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    
    // 简单的URL验证
    try {
      new URL(trimmedUrl);
      if (!urls.includes(trimmedUrl)) {
        setUrls([...urls, trimmedUrl]);
        setUrl('');
        setMessage('');
      } else {
        setMessage('URL已存在');
      }
    } catch {
      setMessage('请输入有效的URL');
    }
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (urls.length === 0) {
      setMessage('请至少添加一个URL');
      return;
    }

    setLoading(true);
    setMessage('正在下载...');

    try {
      let successCount = 0;
      let failCount = 0;
      
      // 使用Tauri后端下载所有URL的图片
      for (const urlStr of urls) {
        try {
          setMessage(`正在下载: ${urlStr.substring(0, 50)}...`);
          
          // 调用Tauri命令下载并保存图片
          const result = await invoke<Record<string, string>>('import_from_url', { url: urlStr });
          
          // 检查是否已存在
          const existing = await getAssetByHash(result.hash);
          if (existing) {
            console.log('Asset already exists:', result.hash);
            successCount++;
            continue;
          }
          
          // 获取图片尺寸
          const img = new Image();
          img.src = `asset://localhost/${result.file_path}`;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          
          // 创建数据库记录
          await createAsset({
            content_hash: result.hash,
            file_name: result.file_name,
            file_path: result.file_path,
            mime_type: result.file_name.endsWith('.gif') ? 'image/gif' : 
                       result.file_name.endsWith('.png') ? 'image/png' :
                       result.file_name.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
            file_size: 0, // 后端没有返回文件大小
            width: img.naturalWidth || 0,
            height: img.naturalHeight || 0,
            source_url: urlStr,
            source_platform: 'url',
            thumb_small: result.thumb_small || null,
            thumb_medium: result.thumb_medium || null,
            thumb_large: result.thumb_large || null,
            last_used_at: null,
            use_count: 0,
            synced: 0,
            cloud_url: null,
            deleted: 0,
            deleted_at: null,
          });
          
          successCount++;
        } catch (error) {
          console.error(`Failed to import ${urlStr}:`, error);
          failCount++;
        }
      }

      // 刷新资产列表
      await refreshAssets();

      if (successCount === 0) {
        setMessage('没有成功下载任何图片');
        addToast('URL导入失败', 'error');
        setLoading(false);
        return;
      }

      // 显示结果
      if (failCount > 0) {
        setMessage(`成功导入 ${successCount} 张，失败 ${failCount} 张`);
        addToast(`成功导入 ${successCount} 张图片，${failCount} 张失败`, 'warning');
      } else {
        setMessage(`成功导入 ${successCount} 张图片`);
        addToast(`成功导入 ${successCount} 张图片`, 'success');
      }
      
      setTimeout(() => {
        onClose();
        setUrls([]);
        setUrl('');
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error('Import error:', error);
      setMessage('导入失败');
      addToast('导入失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter(line => line.trim());
      const validUrls: string[] = [];
      
      for (const line of lines) {
        try {
          new URL(line.trim());
          if (!urls.includes(line.trim()) && !validUrls.includes(line.trim())) {
            validUrls.push(line.trim());
          }
        } catch {
          // 忽略无效URL
        }
      }
      
      if (validUrls.length > 0) {
        setUrls([...urls, ...validUrls]);
        setMessage(`添加了 ${validUrls.length} 个URL`);
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMessage('剪贴板中没有有效的URL');
      }
    } catch (error) {
      console.error('Paste error:', error);
      setMessage('粘贴失败');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="从URL导入"
      footer={
        <div className="import-url-footer">
          {message && <span className="footer-message">{message}</span>}
          <div className="footer-actions">
            <Button onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={loading || urls.length === 0}>
              {loading ? '导入中...' : `导入 (${urls.length})`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="import-url-dialog">
        <div className="url-input-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddUrl();
              }
            }}
            placeholder="输入图片URL，按回车添加"
            disabled={loading}
          />
          <Button onClick={handleAddUrl} disabled={loading}>
            添加
          </Button>
          <Button onClick={handlePaste} disabled={loading}>
            📋 粘贴
          </Button>
        </div>

        <div className="url-list">
          {urls.length === 0 && (
            <div className="url-list-empty">
              <p>还没有添加URL</p>
              <p className="hint">支持批量粘贴多个URL（每行一个）</p>
            </div>
          )}
          {urls.map((urlStr, index) => (
            <div key={index} className="url-item">
              <span className="url-text" title={urlStr}>
                {urlStr}
              </span>
              <button
                className="url-remove"
                onClick={() => handleRemoveUrl(index)}
                disabled={loading}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

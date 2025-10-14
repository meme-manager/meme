import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAssetStore } from '../../stores/assetStore';
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
  const { importMultipleAssets } = useAssetStore();

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
      // 下载所有URL的图片
      const files: File[] = [];
      for (const urlStr of urls) {
        try {
          const response = await fetch(urlStr);
          if (!response.ok) {
            console.error(`Failed to fetch ${urlStr}`);
            continue;
          }
          
          const blob = await response.blob();
          if (!blob.type.startsWith('image/')) {
            console.error(`Not an image: ${urlStr}`);
            continue;
          }
          
          // 从URL提取文件名
          const urlObj = new URL(urlStr);
          const pathname = urlObj.pathname;
          const filename = pathname.split('/').pop() || `image-${Date.now()}.${blob.type.split('/')[1]}`;
          
          const file = new File([blob], filename, { type: blob.type });
          files.push(file);
        } catch (error) {
          console.error(`Error downloading ${urlStr}:`, error);
        }
      }

      if (files.length === 0) {
        setMessage('没有成功下载任何图片');
        setLoading(false);
        return;
      }

      // 导入文件
      await importMultipleAssets(files, {
        source_platform: 'url',
      });

      setMessage(`成功导入 ${files.length} 张图片`);
      setTimeout(() => {
        onClose();
        setUrls([]);
        setUrl('');
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error('Import error:', error);
      setMessage('导入失败');
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

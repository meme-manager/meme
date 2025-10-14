import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useTagStore } from '../../stores/tagStore';
import { useAssetStore } from '../../stores/assetStore';
import { getAssetTags, addAssetTag, removeAssetTag, incrementUseCount } from '../../lib/database/operations';
import type { Asset } from '../../types/asset';
import './AssetDetail.css';

interface AssetDetailProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
  use_count: number;
  created_at: number;
}

export function AssetDetail({ asset, open, onClose }: AssetDetailProps) {
  const { tags: allTags, loadTags } = useTagStore();
  const { deleteAssetById } = useAssetStore();
  const [assetTags, setAssetTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  
  useEffect(() => {
    if (asset && open) {
      loadAssetTags();
      loadTags();
    }
  }, [asset, open]);
  
  const loadAssetTags = async () => {
    if (!asset) return;
    try {
      const tags = await getAssetTags(asset.id);
      setAssetTags(tags);
    } catch (error) {
      console.error('Failed to load asset tags:', error);
    }
  };
  
  const handleAddTag = async (tagId: string) => {
    if (!asset) return;
    setLoading(true);
    try {
      await addAssetTag(asset.id, tagId);
      await loadAssetTags();
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveTag = async (tagId: string) => {
    if (!asset) return;
    setLoading(true);
    try {
      await removeAssetTag(asset.id, tagId);
      await loadAssetTags();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopyImage = async () => {
    if (!asset) return;
    try {
      // 复制文件路径到剪贴板
      await writeText(asset.file_path);
      await incrementUseCount(asset.id);
      setMessage('已复制文件路径到剪贴板，可以直接粘贴到聊天软件');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setMessage(`复制失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };
  
  const handleDelete = async () => {
    if (!asset) return;
    if (!confirm(`确定要删除 ${asset.file_name} 吗？`)) return;
    
    setLoading(true);
    try {
      await deleteAssetById(asset.id);
      setMessage('已删除');
      onClose();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      setMessage('删除失败');
    } finally {
      setLoading(false);
    }
  };
  
  if (!asset) return null;
  
  const imageSrc = convertFileSrc(asset.file_path);
  const assetTagIds = new Set(assetTags.map(t => t.id));
  const availableTags = allTags.filter(t => !assetTagIds.has(t.id));
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="图片详情"
      footer={
        <div className="asset-detail-footer">
          {message && <span className="footer-message">{message}</span>}
          <div className="footer-actions">
            <Button onClick={handleCopyImage} disabled={loading}>
              📋 复制
            </Button>
            <Button onClick={handleDelete} disabled={loading}>
              🗑️ 删除
            </Button>
            <Button onClick={onClose}>关闭</Button>
          </div>
        </div>
      }
    >
      <div className="asset-detail">
        <div className="asset-detail-image">
          <img src={imageSrc} alt={asset.file_name} />
        </div>
        
        <div className="asset-detail-info">
          <div className="info-row">
            <span className="info-label">文件名</span>
            <span className="info-value">{asset.file_name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">尺寸</span>
            <span className="info-value">{asset.width} × {asset.height}</span>
          </div>
          <div className="info-row">
            <span className="info-label">大小</span>
            <span className="info-value">{(asset.file_size / 1024).toFixed(2)} KB</span>
          </div>
          <div className="info-row">
            <span className="info-label">使用次数</span>
            <span className="info-value">{asset.use_count}</span>
          </div>
        </div>
        
        <div className="asset-detail-tags">
          <h3>标签</h3>
          <div className="current-tags">
            {assetTags.length === 0 && (
              <div className="empty-tags">暂无标签</div>
            )}
            {assetTags.map(tag => (
              <div key={tag.id} className="tag-chip">
                <span
                  className="tag-chip-color"
                  style={{ background: tag.color || '#6b7280' }}
                />
                <span className="tag-chip-name">{tag.name}</span>
                <button
                  className="tag-chip-remove"
                  onClick={() => handleRemoveTag(tag.id)}
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          {availableTags.length > 0 && (
            <>
              <h4>添加标签</h4>
              <div className="available-tags">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    className="tag-option"
                    onClick={() => handleAddTag(tag.id)}
                    disabled={loading}
                  >
                    <span
                      className="tag-option-color"
                      style={{ background: tag.color || '#6b7280' }}
                    />
                    <span className="tag-option-name">{tag.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { useAssetStore } from '../../stores/assetStore';
import { useToastStore } from '../ui/Toast';
import { getAssetTags } from '../../lib/database/operations';
import { TagSelector } from '../tag/TagSelector';
import type { Asset } from '../../types/asset';
import './AssetCard.css';

interface AssetCardProps {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onOpenDetail?: () => void;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export function AssetCard({ asset, selected, onSelect, onOpenDetail }: AssetCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [assetTags, setAssetTags] = useState<Tag[]>([]);
  const { incrementAssetUseCount, deleteAssetById, toggleFavorite, favoriteAssetIds } = useAssetStore();
  const { addToast } = useToastStore.getState();
  const imageSrc = convertFileSrc(asset.thumb_medium || asset.file_path);
  const isGif = asset.mime_type === 'image/gif';
  const isFavorite = favoriteAssetIds.has(asset.id);
  
  // 加载资产标签
  useEffect(() => {
    loadAssetTags();
  }, [asset.id]);
  
  const loadAssetTags = async () => {
    try {
      const tags = await getAssetTags(asset.id);
      setAssetTags(tags);
    } catch (error) {
      console.error('Failed to load asset tags:', error);
    }
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    // 设置拖拽数据为文件路径
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/uri-list', `file://${asset.file_path}`);
    e.dataTransfer.setData('text/plain', asset.file_path);
  };

  const handleClick = async (e: React.MouseEvent) => {
    console.log('[AssetCard] handleClick 被调用');
    console.log('[AssetCard] event.target:', e.target);
    console.log('[AssetCard] isHovering:', isHovering);
    
    // Cmd/Ctrl + 点击：多选
    if (e.metaKey || e.ctrlKey) {
      console.log('[AssetCard] Cmd/Ctrl + 点击，多选');
      onSelect?.();
      return;
    }
    
    // 普通点击：打开详情页
    // 注意：按钮会自己阻止冒泡，所以点击按钮不会触发这里
    console.log('[AssetCard] 打开详情页');
    onOpenDetail?.();
  };
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await invoke('copy_image_to_clipboard', {
        filePath: asset.file_path
      });
      
      // 视觉反馈
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 500);
      
      // Toast 提示
      addToast('✅ 已复制', 'success');
      
      // 更新使用次数
      await incrementAssetUseCount(asset.id);
    } catch (error) {
      console.error('复制失败:', error);
      addToast('❌ 复制失败', 'error');
    }
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const confirmed = await ask(`确定要删除 ${asset.file_name} 吗？`, {
        title: '确认删除',
        kind: 'warning',
      });
      
      if (!confirmed) return;
      
      await deleteAssetById(asset.id);
      addToast('🗑️ 已删除', 'success');
    } catch (error) {
      console.error('删除失败:', error);
      addToast('❌ 删除失败', 'error');
    }
  };
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(asset.id);
    addToast(isFavorite ? '💔 已取消收藏' : '⭐ 已收藏', 'success');
  };

  return (
    <div
      className={`asset-card ${selected ? 'asset-card-selected' : ''} ${justCopied ? 'asset-card-copied' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      draggable
      onDragStart={handleDragStart}
      title="可以拖拽到其他应用"
    >
      <div className="asset-card-image">
        <img
          src={imageSrc}
          alt={asset.file_name}
          loading="lazy"
          draggable={false}
        />
        
        {/* GIF 标识 */}
        {isGif && (
          <div className="asset-card-badge">GIF</div>
        )}
        
        {/* 悬浮时显示大复制按钮 */}
        {isHovering && !selected && (
          <div className="asset-card-overlay">
            <button className="asset-card-copy-btn" onClick={handleCopy}>
              <span className="copy-icon">📋</span>
              <span className="copy-text">复制</span>
            </button>
            <div className="asset-card-actions">
              <button 
                className="asset-card-action-btn" 
                title={isFavorite ? "取消收藏" : "收藏"}
                onClick={handleToggleFavorite}
              >
                {isFavorite ? '⭐' : '☆'}
              </button>
              <TagSelector
                assetId={asset.id}
                onTagsChange={loadAssetTags}
                trigger={
                  <button className="asset-card-action-btn" title="添加标签">
                    🏷️
                  </button>
                }
              />
              <button 
                className="asset-card-action-btn" 
                title="删除"
                onClick={handleDelete}
              >
                🗑️
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 底部信息：标签圆点 + 使用次数 */}
      <div className="asset-card-footer">
        <div className="asset-card-tags">
          {assetTags.slice(0, 3).map(tag => (
            <div
              key={tag.id}
              className="tag-dot"
              style={{ background: tag.color || '#6b7280' }}
              title={tag.name}
            />
          ))}
          {assetTags.length > 3 && (
            <div className="tag-more" title={`还有 ${assetTags.length - 3} 个标签`}>
              +{assetTags.length - 3}
            </div>
          )}
        </div>
        {asset.use_count > 0 && (
          <div className="asset-card-count">{asset.use_count}次</div>
        )}
      </div>
      
      {/* 选中标记 */}
      {selected && (
        <div className="asset-card-check">✓</div>
      )}
    </div>
  );
}

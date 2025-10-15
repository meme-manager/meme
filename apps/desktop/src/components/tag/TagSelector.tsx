import { useState, useEffect } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { getAssetTags, addAssetTag, removeAssetTag } from '../../lib/database/operations';
import { Popover } from '../ui/Popover';
import './TagSelector.css';

interface TagSelectorProps {
  assetId: string;
  trigger: React.ReactNode;
  onTagsChange?: () => void;
}

export function TagSelector({ assetId, trigger, onTagsChange }: TagSelectorProps) {
  const { tags: allTags, loadTags } = useTagStore();
  const [assetTagIds, setAssetTagIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  console.log('[TagSelector] 渲染，open:', open);
  
  useEffect(() => {
    console.log('[TagSelector] useEffect 触发，open:', open);
    if (open) {
      console.log('[TagSelector] 加载标签数据');
      loadAssetTags();
      loadTags();
    }
  }, [open, assetId]);
  
  const loadAssetTags = async () => {
    try {
      const tags = await getAssetTags(assetId);
      setAssetTagIds(new Set(tags.map(t => t.id)));
    } catch (error) {
      console.error('Failed to load asset tags:', error);
    }
  };
  
  const handleToggleTag = async (tagId: string) => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (assetTagIds.has(tagId)) {
        await removeAssetTag(assetId, tagId);
        setAssetTagIds(prev => {
          const next = new Set(prev);
          next.delete(tagId);
          return next;
        });
      } else {
        await addAssetTag(assetId, tagId);
        setAssetTagIds(prev => new Set(prev).add(tagId));
      }
      onTagsChange?.();
    } catch (error) {
      console.error('Failed to toggle tag:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const content = (
    <div className="tag-selector">
      <div className="tag-selector-header">选择标签</div>
      <div className="tag-selector-list">
        {allTags.map(tag => {
          const isSelected = assetTagIds.has(tag.id);
          return (
            <div
              key={tag.id}
              className={`tag-option ${isSelected ? 'tag-option-selected' : ''}`}
              onClick={() => handleToggleTag(tag.id)}
            >
              <div className="tag-option-check">
                {isSelected && '✓'}
              </div>
              <div
                className="tag-option-color"
                style={{ background: tag.color || '#6b7280' }}
              />
              <div className="tag-option-name">{tag.name}</div>
            </div>
          );
        })}
        {allTags.length === 0 && (
          <div className="tag-selector-empty">暂无标签</div>
        )}
      </div>
      <div className="tag-selector-footer">
        <button 
          className="tag-selector-create-btn"
          onClick={(e) => {
            e.stopPropagation();
            console.log('[TagSelector] 新建标签按钮被点击');
            alert('新建标签功能待实现');
          }}
        >
          + 新建标签
        </button>
      </div>
    </div>
  );
  
  return (
    <Popover
      trigger={trigger}
      content={content}
      open={open}
      onOpenChange={(newOpen) => {
        console.log('[TagSelector] onOpenChange 被调用，newOpen:', newOpen);
        setOpen(newOpen);
      }}
    />
  );
}

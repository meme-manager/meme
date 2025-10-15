import { useState, useEffect } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { addAssetTag } from '../../lib/database/operations';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import './BatchTagSelector.css';

interface BatchTagSelectorProps {
  open: boolean;
  assetIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BatchTagSelector({ open, assetIds, onClose, onSuccess }: BatchTagSelectorProps) {
  const { tags, loadTags } = useTagStore();
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadTags();
      setSelectedTagIds(new Set());
    }
  }, [open]);

  const toggleTag = (tagId: string) => {
    const newSet = new Set(selectedTagIds);
    if (newSet.has(tagId)) {
      newSet.delete(tagId);
    } else {
      newSet.add(tagId);
    }
    setSelectedTagIds(newSet);
  };

  const handleApply = async () => {
    if (selectedTagIds.size === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      // 为每个资产添加选中的标签
      for (const assetId of assetIds) {
        for (const tagId of selectedTagIds) {
          try {
            await addAssetTag(assetId, tagId);
          } catch (error) {
            // 忽略重复添加的错误
            console.log('标签可能已存在:', error);
          }
        }
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('批量添加标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`批量添加标签（${assetIds.length} 张图片）`}
      footer={
        <div className="batch-tag-footer">
          <Button onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleApply} disabled={loading || selectedTagIds.size === 0}>
            {loading ? '添加中...' : `添加 ${selectedTagIds.size} 个标签`}
          </Button>
        </div>
      }
    >
      <div className="batch-tag-content">
        {tags.length === 0 ? (
          <div className="batch-tag-empty">
            暂无标签，请先创建标签
          </div>
        ) : (
          <div className="batch-tag-list">
            {tags.map(tag => (
              <div
                key={tag.id}
                className={`batch-tag-item ${selectedTagIds.has(tag.id) ? 'batch-tag-item-selected' : ''}`}
                onClick={() => toggleTag(tag.id)}
              >
                <div
                  className="batch-tag-color"
                  style={{ background: tag.color || '#6b7280' }}
                />
                <span className="batch-tag-name">{tag.name}</span>
                {selectedTagIds.has(tag.id) && (
                  <span className="batch-tag-check">✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

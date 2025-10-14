import { useState } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import { useTagStore } from '../../stores/tagStore';
import { Button } from '../ui/Button';
import './FilterPanel.css';

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FilterPanel({ open, onClose }: FilterPanelProps) {
  const { filters, setFilters } = useSearchStore();
  const { tags } = useTagStore();
  const [localFilters, setLocalFilters] = useState(filters);

  if (!open) return null;

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
    setFilters({});
  };

  const toggleTag = (tagId: string) => {
    const currentTags = localFilters.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    setLocalFilters({
      ...localFilters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const toggleMimeType = (mimeType: string) => {
    const currentTypes = localFilters.mimeTypes || [];
    const newTypes = currentTypes.includes(mimeType)
      ? currentTypes.filter(t => t !== mimeType)
      : [...currentTypes, mimeType];
    
    setLocalFilters({
      ...localFilters,
      mimeTypes: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
        <div className="filter-panel-header">
          <h3>高级筛选</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="filter-panel-content">
          {/* 文件类型筛选 */}
          <div className="filter-section">
            <h4>文件类型</h4>
            <div className="filter-options">
              {['image/png', 'image/jpeg', 'image/gif', 'image/webp'].map(type => (
                <button
                  key={type}
                  className={`filter-chip ${localFilters.mimeTypes?.includes(type) ? 'active' : ''}`}
                  onClick={() => toggleMimeType(type)}
                >
                  {type.split('/')[1].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* 标签筛选 */}
          <div className="filter-section">
            <h4>标签</h4>
            <div className="filter-options">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  className={`filter-chip ${localFilters.tags?.includes(tag.id) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span
                    className="chip-color"
                    style={{ background: tag.color || '#6b7280' }}
                  />
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <div className="empty-message">暂无标签</div>
              )}
            </div>
          </div>

          {/* 文件大小筛选 */}
          <div className="filter-section">
            <h4>文件大小</h4>
            <div className="filter-options">
              <button
                className={`filter-chip ${localFilters.sizeRange?.[0] === 0 && localFilters.sizeRange?.[1] === 100 * 1024 ? 'active' : ''}`}
                onClick={() => setLocalFilters({ ...localFilters, sizeRange: [0, 100 * 1024] })}
              >
                &lt; 100KB
              </button>
              <button
                className={`filter-chip ${localFilters.sizeRange?.[0] === 100 * 1024 && localFilters.sizeRange?.[1] === 500 * 1024 ? 'active' : ''}`}
                onClick={() => setLocalFilters({ ...localFilters, sizeRange: [100 * 1024, 500 * 1024] })}
              >
                100KB - 500KB
              </button>
              <button
                className={`filter-chip ${localFilters.sizeRange?.[0] === 500 * 1024 && localFilters.sizeRange?.[1] === 1024 * 1024 ? 'active' : ''}`}
                onClick={() => setLocalFilters({ ...localFilters, sizeRange: [500 * 1024, 1024 * 1024] })}
              >
                500KB - 1MB
              </button>
              <button
                className={`filter-chip ${localFilters.sizeRange?.[0] === 1024 * 1024 ? 'active' : ''}`}
                onClick={() => setLocalFilters({ ...localFilters, sizeRange: [1024 * 1024, Infinity] })}
              >
                &gt; 1MB
              </button>
            </div>
          </div>
        </div>

        <div className="filter-panel-footer">
          <Button onClick={handleReset}>重置</Button>
          <Button onClick={handleApply}>应用</Button>
        </div>
      </div>
    </div>
  );
}

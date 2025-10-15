import { useSearchStore } from '../../stores/searchStore';
import { useTagStore } from '../../stores/tagStore';
import './FilterBar.css';

export function FilterBar() {
  const { filters, setFilters } = useSearchStore();
  const { tags } = useTagStore();
  
  // 检查是否有筛选条件
  const hasFilters = Object.keys(filters).length > 0;
  
  if (!hasFilters) return null;
  
  const removeTag = (tagId: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.filter(id => id !== tagId);
    setFilters({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };
  
  const removeMimeType = (mimeType: string) => {
    const currentTypes = filters.mimeTypes || [];
    const newTypes = currentTypes.filter(t => t !== mimeType);
    setFilters({
      ...filters,
      mimeTypes: newTypes.length > 0 ? newTypes : undefined,
    });
  };
  
  const removeSizeRange = () => {
    const { sizeRange, ...rest } = filters;
    setFilters(rest);
  };
  
  const clearAll = () => {
    setFilters({});
  };
  
  const getSizeRangeLabel = (range: [number, number]) => {
    const [min, max] = range;
    if (max === 100 * 1024) return '< 100KB';
    if (min === 100 * 1024 && max === 500 * 1024) return '100KB - 500KB';
    if (min === 500 * 1024 && max === 1024 * 1024) return '500KB - 1MB';
    if (min === 1024 * 1024) return '> 1MB';
    return '自定义大小';
  };
  
  return (
    <div className="filter-bar">
      <div className="filter-bar-label">筛选条件：</div>
      <div className="filter-bar-tags">
        {/* 文件类型标签 */}
        {filters.mimeTypes?.map(type => (
          <div key={type} className="filter-tag">
            <span className="filter-tag-label">
              {type.split('/')[1].toUpperCase()}
            </span>
            <button 
              className="filter-tag-remove"
              onClick={() => removeMimeType(type)}
              title="移除此筛选"
            >
              ✕
            </button>
          </div>
        ))}
        
        {/* 标签筛选标签 */}
        {filters.tags?.map(tagId => {
          const tag = tags.find(t => t.id === tagId);
          if (!tag) return null;
          return (
            <div key={tagId} className="filter-tag">
              <span
                className="filter-tag-color"
                style={{ background: tag.color || '#6b7280' }}
              />
              <span className="filter-tag-label">{tag.name}</span>
              <button 
                className="filter-tag-remove"
                onClick={() => removeTag(tagId)}
                title="移除此筛选"
              >
                ✕
              </button>
            </div>
          );
        })}
        
        {/* 文件大小标签 */}
        {filters.sizeRange && (
          <div className="filter-tag">
            <span className="filter-tag-label">
              {getSizeRangeLabel(filters.sizeRange)}
            </span>
            <button 
              className="filter-tag-remove"
              onClick={removeSizeRange}
              title="移除此筛选"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      
      <button className="filter-bar-clear" onClick={clearAll}>
        清除全部
      </button>
    </div>
  );
}

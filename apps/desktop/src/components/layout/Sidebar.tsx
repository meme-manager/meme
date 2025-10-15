import { useState, useEffect } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { useSearchStore } from '../../stores/searchStore';
import { useAssetStore, type ViewMode } from '../../stores/assetStore';
import { TagManager } from '../tag/TagManager';
import './Sidebar.css';

export function Sidebar() {
  const { tags, loadTags } = useTagStore();
  const { assets, favoriteAssetIds, viewMode, setViewMode } = useAssetStore();
  const { setFilters } = useSearchStore();
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  
  useEffect(() => {
    loadTags();
  }, [loadTags]);
  
  const handleViewModeClick = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedTagId(null);
    setFilters({}); // 清除筛选条件
  };
  
  const handleTagClick = (tagId: string) => {
    // 切换标签选中状态
    if (selectedTagId === tagId) {
      setSelectedTagId(null);
      setFilters({});
      setViewMode('all');
    } else {
      setSelectedTagId(tagId);
      setFilters({ tags: [tagId] });
    }
  };
  
  return (
    <>
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">库</h3>
            <ul className="nav-list">
              <li 
                className={`nav-item ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => handleViewModeClick('all')}
              >
                <span className="nav-icon">📦</span>
                <span className="nav-label">全部</span>
                <span className="nav-count">{assets.length}</span>
              </li>
              <li 
                className={`nav-item ${viewMode === 'favorite' ? 'active' : ''}`}
                onClick={() => handleViewModeClick('favorite')}
              >
                <span className="nav-icon">⭐</span>
                <span className="nav-label">收藏</span>
                <span className="nav-count">{favoriteAssetIds.size}</span>
              </li>
              <li 
                className={`nav-item ${viewMode === 'recent' ? 'active' : ''}`}
                onClick={() => handleViewModeClick('recent')}
              >
                <span className="nav-icon">🕒</span>
                <span className="nav-label">最近使用</span>
              </li>
            </ul>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-header">
              <h3 className="nav-section-title">标签</h3>
              <button
                className="nav-add-btn"
                title="管理标签"
                onClick={() => setShowTagManager(true)}
              >
                +
              </button>
            </div>
            <ul className="nav-list">
              {tags.slice(0, 10).map(tag => (
                <li 
                  key={tag.id} 
                  className={`nav-item ${selectedTagId === tag.id ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag.id)}
                >
                  <span
                    className="nav-tag"
                    style={{ background: tag.color || '#6b7280' }}
                  />
                  <span className="nav-label">{tag.name}</span>
                  {tag.use_count > 0 && (
                    <span className="nav-count">{tag.use_count}</span>
                  )}
                </li>
              ))}
              {tags.length === 0 && (
                <li className="nav-empty">暂无标签</li>
              )}
            </ul>
          </div>
        </nav>
      </aside>
      
      <TagManager
        open={showTagManager}
        onClose={() => setShowTagManager(false)}
      />
    </>
  );
}

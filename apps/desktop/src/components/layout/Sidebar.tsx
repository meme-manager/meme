import { useState, useEffect } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { useAssetStore } from '../../stores/assetStore';
import { TagManager } from '../tag/TagManager';
import './Sidebar.css';

export function Sidebar() {
  const { tags, loadTags } = useTagStore();
  const { assets } = useAssetStore();
  const [showTagManager, setShowTagManager] = useState(false);
  
  useEffect(() => {
    loadTags();
  }, [loadTags]);
  
  return (
    <>
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">库</h3>
            <ul className="nav-list">
              <li className="nav-item active">
                <span className="nav-icon">📦</span>
                <span className="nav-label">全部</span>
                <span className="nav-count">{assets.length}</span>
              </li>
              <li className="nav-item">
                <span className="nav-icon">⭐</span>
                <span className="nav-label">收藏</span>
              </li>
              <li className="nav-item">
                <span className="nav-icon">🕒</span>
                <span className="nav-label">最近使用</span>
              </li>
            </ul>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-header">
              <h3 className="nav-section-title">集合</h3>
              <button className="nav-add-btn" title="新建集合">+</button>
            </div>
            <ul className="nav-list">
              <li className="nav-item">
                <span className="nav-icon">📁</span>
                <span className="nav-label">工作</span>
              </li>
              <li className="nav-item">
                <span className="nav-icon">📁</span>
                <span className="nav-label">生活</span>
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
                  className="nav-item"
                  onClick={() => {
                    // TODO: 实现标签筛选
                    console.log('Filter by tag:', tag.name);
                  }}
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

import './Sidebar.css';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-section-title">库</h3>
          <ul className="nav-list">
            <li className="nav-item active">
              <span className="nav-icon">📦</span>
              <span className="nav-label">全部</span>
              <span className="nav-count">0</span>
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
            <button className="nav-add-btn" title="新建标签">+</button>
          </div>
          <ul className="nav-list">
            <li className="nav-item">
              <span className="nav-tag" style={{ background: '#ef4444' }}></span>
              <span className="nav-label">搞笑</span>
            </li>
            <li className="nav-item">
              <span className="nav-tag" style={{ background: '#3b82f6' }}></span>
              <span className="nav-label">可爱</span>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}

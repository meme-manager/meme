import { useRef, useState } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import { useAssetStore } from '../../stores/assetStore';
import { ImportUrlDialog } from '../import/ImportUrlDialog';
import { FilterPanel } from '../search/FilterPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import './Header.css';

export function Header() {
  const { query, setQuery, searchHistory, clearHistory } = useSearchStore();
  const { importMultipleAssets, gridSize, setGridSize } = useAssetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await importMultipleAssets(files, {
        source_platform: 'file',
      });
    }
    e.target.value = '';
  };
  
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">表情包管理工具</h1>
      </div>
      
      <div className="header-center">
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="搜索表情包（支持拼音）..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          />
          <button 
            className="search-filter-btn" 
            onClick={() => setShowFilterPanel(true)}
            title="高级筛选"
          >
            🔍
          </button>
          
          {/* 搜索历史下拉框 */}
          {showHistory && searchHistory.length > 0 && (
            <div className="search-history">
              <div className="search-history-header">
                <span>搜索历史</span>
                <button 
                  className="search-history-clear"
                  onClick={clearHistory}
                >
                  清除
                </button>
              </div>
              <div className="search-history-list">
                {searchHistory.map((item, index) => (
                  <div
                    key={index}
                    className="search-history-item"
                    onClick={() => {
                      setQuery(item);
                      setShowHistory(false);
                    }}
                  >
                    <span className="history-icon">🕒</span>
                    <span className="history-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="header-right">
        {/* 网格大小切换 */}
        <div className="grid-size-selector">
          <button 
            className={`grid-size-btn ${gridSize === 'small' ? 'active' : ''}`}
            onClick={() => setGridSize('small')}
            title="小图"
          >
            ⊞
          </button>
          <button 
            className={`grid-size-btn ${gridSize === 'medium' ? 'active' : ''}`}
            onClick={() => setGridSize('medium')}
            title="中图"
          >
            ⊟
          </button>
          <button 
            className={`grid-size-btn ${gridSize === 'large' ? 'active' : ''}`}
            onClick={() => setGridSize('large')}
            title="大图"
          >
            ⊠
          </button>
        </div>
        
        <button className="header-btn" onClick={handleImportClick} title="导入本地图片">
          📁
        </button>
        <button className="header-btn" onClick={() => setShowUrlDialog(true)} title="从URL导入">
          🔗
        </button>
        <button className="header-btn" onClick={() => setShowSettingsPanel(true)} title="设置">
          ⚙️
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
      
      <ImportUrlDialog
        open={showUrlDialog}
        onClose={() => setShowUrlDialog(false)}
      />
      
      <FilterPanel
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
      />
      
      <SettingsPanel
        open={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
      />
    </header>
  );
}

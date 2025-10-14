import { useRef } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import { useAssetStore } from '../../stores/assetStore';
import './Header.css';

export function Header() {
  const { query, setQuery } = useSearchStore();
  const { importMultipleAssets } = useAssetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
        <input
          type="text"
          className="search-input"
          placeholder="搜索表情包..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      
      <div className="header-right">
        <button className="header-btn" onClick={handleImportClick} title="导入图片">
          ➕
        </button>
        <button className="header-btn" title="设置">
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
    </header>
  );
}

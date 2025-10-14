import { useSearchStore } from '../../stores/searchStore';
import './Header.css';

export function Header() {
  const { query, setQuery } = useSearchStore();
  
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
        <button className="header-btn" title="设置">
          ⚙️
        </button>
      </div>
    </header>
  );
}

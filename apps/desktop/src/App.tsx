import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { ToastContainer } from './components/ui/Toast';
import { ImportProgress } from './components/import/ImportProgress';
import { useAssetStore } from './stores/assetStore';
import { useTagStore } from './stores/tagStore';
import { useSearchStore } from './stores/searchStore';
import { useSyncStore } from './stores/syncStore';
import { initDatabase } from './lib/database';
import { useKeyboard } from './hooks/useKeyboard';
import "./App.css";

function App() {
  const { loadAssets, selectAll, clearSelection } = useAssetStore();
  const { loadTags } = useTagStore();
  const { setQuery } = useSearchStore();
  const { initialize: initializeSync } = useSyncStore();

  useEffect(() => {
    const init = async () => {
      try {
        // 初始化数据库
        await initDatabase();
        await loadAssets();
        await loadTags();
        
        // 初始化云同步
        console.log('[App] 初始化云同步管理器');
        initializeSync();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    init();
  }, []);
  
  // 快捷键支持
  useKeyboard({
    'ctrl+a': selectAll,
    'ctrl+d': clearSelection,
    'ctrl+f': () => {
      const searchInput = document.querySelector('.search-input') as HTMLInputElement;
      searchInput?.focus();
    },
    'escape': () => {
      clearSelection();
      setQuery('');
    },
  });

  return (
    <div className="app">
      <Header />
      <div className="app-body">
        <Sidebar />
        <MainContent />
      </div>
      <ToastContainer />
      <ImportProgress />
    </div>
  );
}

export default App;
import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { ToastContainer } from './components/ui/Toast';
import { ImportProgress } from './components/import/ImportProgress';
import { useAssetStore } from './stores/assetStore';
import { useTagStore } from './stores/tagStore';
import { useSearchStore } from './stores/searchStore';
import { initDatabase } from './lib/database';
import { useKeyboard } from './hooks/useKeyboard';
import "./App.css";

function App() {
  const { loadAssets, selectAll, clearSelection } = useAssetStore();
  const { loadTags } = useTagStore();
  const { setQuery } = useSearchStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        await loadAssets();
        await loadTags();
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
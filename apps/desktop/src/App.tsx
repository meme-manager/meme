import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { ToastContainer } from './components/ui/Toast';
import { ImportProgress } from './components/import/ImportProgress';
import { useAssetStore } from './stores/assetStore';
import { useTagStore } from './stores/tagStore';
import { initDatabase } from './lib/database';
import "./App.css";

function App() {
  const { loadAssets } = useAssetStore();
  const { loadTags } = useTagStore();

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
import { useEffect } from "react";
import { useAssetStore } from "./stores/assetStore";
import { initDatabase } from "./lib/database";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { MainContent } from "./components/layout/MainContent";
import "./App.css";

function App() {
  const { loading, error, loadAssets } = useAssetStore();
  
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        await loadAssets();
      } catch (err) {
        console.error('Failed to initialize:', err);
      }
    };
    
    init();
  }, [loadAssets]);
  
  return (
    <div className="app">
      <Header />
      <div className="app-body">
        <Sidebar />
        <MainContent />
      </div>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">加载中...</div>
        </div>
      )}
      
      {error && (
        <div className="error-toast">
          错误: {error}
        </div>
      )}
    </div>
  );
}

export default App;
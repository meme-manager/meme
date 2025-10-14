import { useEffect } from "react";
import { useAssetStore } from "./stores/assetStore";
import { initDatabase } from "./lib/database";
import "./App.css";

function App() {
  const { assets, loading, error, loadAssets } = useAssetStore();
  
  useEffect(() => {
    // 初始化数据库并加载资产
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
    <main className="container">
      <h1>表情包管理工具</h1>
      
      {loading && <div>加载中...</div>}
      {error && <div style={{ color: 'red' }}>错误: {error}</div>}
      
      <div>
        <p>资产数量: {assets.length}</p>
        <p>数据库已初始化，准备开始开发UI界面</p>
      </div>
      
      <div className="placeholder">
        <p>✅ 数据库层已完成</p>
        <p>✅ Tauri后端命令已完成</p>
        <p>🚧 下一步: 实现导入UI和资产展示</p>
      </div>
    </main>
  );
}

export default App;
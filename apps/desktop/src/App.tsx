import { useState, useEffect } from "react";
import { DatabaseAPI, Asset, Tag, CreateAssetRequest, CreateTagRequest } from "./lib/database";
import "./App.css";

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 表单状态
  const [newAsset, setNewAsset] = useState<CreateAssetRequest>({
    file_path: "",
    file_name: "",
    file_size: 0,
    mime_type: "image/jpeg",
  });

  const [newTag, setNewTag] = useState<CreateTagRequest>({
    name: "",
    color: "#3b82f6",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assetsData, tagsData] = await Promise.all([
        DatabaseAPI.listAssets(),
        DatabaseAPI.listTags(),
      ]);
      setAssets(assetsData);
      setTags(tagsData);
    } catch (error) {
      setMessage(`加载数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.file_path || !newAsset.file_name) {
      setMessage("请填写文件路径和文件名");
      return;
    }

    try {
      setLoading(true);
      await DatabaseAPI.createAsset(newAsset);
      setMessage("表情包添加成功！");
      setNewAsset({
        file_path: "",
        file_name: "",
        file_size: 0,
        mime_type: "image/jpeg",
      });
      await loadData();
    } catch (error) {
      setMessage(`添加表情包失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.name) {
      setMessage("请填写标签名称");
      return;
    }

    try {
      setLoading(true);
      await DatabaseAPI.createTag(newTag);
      setMessage("标签添加成功！");
      setNewTag({ name: "", color: "#3b82f6" });
      await loadData();
    } catch (error) {
      setMessage(`添加标签失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      setLoading(true);
      const success = await DatabaseAPI.deleteAsset(id);
      if (success) {
        setMessage("表情包删除成功！");
        await loadData();
      } else {
        setMessage("表情包删除失败");
      }
    } catch (error) {
      setMessage(`删除表情包失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      setLoading(true);
      const success = await DatabaseAPI.deleteTag(id);
      if (success) {
        setMessage("标签删除成功！");
        await loadData();
      } else {
        setMessage("标签删除失败");
      }
    } catch (error) {
      setMessage(`删除标签失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>表情包管理器 - 数据库测试</h1>

      {message && (
        <div className="message" style={{ 
          padding: "10px", 
          margin: "10px 0", 
          backgroundColor: "#f0f0f0", 
          borderRadius: "4px" 
        }}>
          {message}
        </div>
      )}

      {loading && <div>加载中...</div>}

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {/* 添加表情包 */}
        <div style={{ flex: 1 }}>
          <h2>添加表情包</h2>
          <form onSubmit={handleCreateAsset}>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="文件路径"
                value={newAsset.file_path}
                onChange={(e) => setNewAsset({ ...newAsset, file_path: e.target.value })}
                style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="文件名"
                value={newAsset.file_name}
                onChange={(e) => setNewAsset({ ...newAsset, file_name: e.target.value })}
                style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="number"
                placeholder="文件大小 (字节)"
                value={newAsset.file_size}
                onChange={(e) => setNewAsset({ ...newAsset, file_size: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <select
                value={newAsset.mime_type}
                onChange={(e) => setNewAsset({ ...newAsset, mime_type: e.target.value })}
                style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
              >
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
                <option value="image/gif">GIF</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
            <button type="submit" disabled={loading}>
              添加表情包
            </button>
          </form>
        </div>

        {/* 添加标签 */}
        <div style={{ flex: 1 }}>
          <h2>添加标签</h2>
          <form onSubmit={handleCreateTag}>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="标签名称"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="color"
                value={newTag.color}
                onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
              />
            </div>
            <button type="submit" disabled={loading}>
              添加标签
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* 表情包列表 */}
        <div style={{ flex: 1 }}>
          <h2>表情包列表 ({assets.length})</h2>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {assets.map((asset) => (
              <div
                key={asset.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "4px",
                }}
              >
                <div><strong>文件名:</strong> {asset.file_name}</div>
                <div><strong>路径:</strong> {asset.file_path}</div>
                <div><strong>大小:</strong> {asset.file_size} 字节</div>
                <div><strong>类型:</strong> {asset.mime_type}</div>
                <div><strong>创建时间:</strong> {new Date(asset.created_at).toLocaleString()}</div>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  disabled={loading}
                  style={{ marginTop: "5px", backgroundColor: "#ef4444", color: "white" }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 标签列表 */}
        <div style={{ flex: 1 }}>
          <h2>标签列表 ({tags.length})</h2>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {tags.map((tag) => (
              <div
                key={tag.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "4px",
                  backgroundColor: tag.color ? `${tag.color}20` : undefined,
                }}
              >
                <div><strong>名称:</strong> {tag.name}</div>
                <div><strong>颜色:</strong> 
                  <span
                    style={{
                      display: "inline-block",
                      width: "20px",
                      height: "20px",
                      backgroundColor: tag.color,
                      marginLeft: "5px",
                      borderRadius: "2px",
                    }}
                  ></span>
                  {tag.color}
                </div>
                <div><strong>创建时间:</strong> {new Date(tag.created_at).toLocaleString()}</div>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  disabled={loading}
                  style={{ marginTop: "5px", backgroundColor: "#ef4444", color: "white" }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
# 表情包导入功能实现

## 1. 导入方式

### 1.1 拖拽导入
- 主窗口拖拽区域
- 支持批量导入
- 实时进度显示

### 1.2 URL导入
- 支持HTTP/HTTPS链接
- 自动提取文件名
- 后台下载

### 1.3 剪贴板导入
- 监听剪贴板事件
- 支持图片和URL
- 快捷键 Ctrl+V

### 1.4 文件选择
- 系统文件选择器
- 支持多选
- 过滤图片类型

## 2. 导入流程

```
用户操作 → 文件验证 → 计算哈希 → 检查重复
    ↓
保存文件 → 生成缩略图 → 读取元数据
    ↓
写入数据库 → 更新FTS索引 → 触发同步
    ↓
UI更新 → 显示通知
```

## 3. 核心代码

### 3.1 TypeScript实现

```typescript
// assetManager.ts
export async function importAsset(file: File): Promise<Asset> {
  // 1. 计算哈希（去重）
  const hash = await calculateHash(file);
  
  // 2. 检查是否存在
  const existing = await db.query(
    'SELECT * FROM assets WHERE content_hash = ?', 
    [hash]
  );
  if (existing.length > 0) {
    return existing[0];
  }
  
  // 3. 保存文件（调用Tauri后端）
  const filePath = await invoke('save_asset', {
    data: await file.arrayBuffer(),
    name: file.name,
    hash
  });
  
  // 4. 生成缩略图
  const thumbs = await invoke('generate_thumbnails', {
    source: filePath,
    sizes: [128, 256, 512]
  });
  
  // 5. 读取元数据
  const { width, height } = await readImageInfo(file);
  
  // 6. 插入数据库
  const asset = {
    id: uuid(),
    content_hash: hash,
    file_name: file.name,
    file_path: filePath,
    mime_type: file.type,
    file_size: file.size,
    width,
    height,
    thumb_small: thumbs[0],
    thumb_medium: thumbs[1],
    thumb_large: thumbs[2],
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  await db.insert('assets', asset);
  
  // 7. 更新搜索索引
  await updateFTSIndex(asset.id);
  
  return asset;
}
```

### 3.2 Rust后端

```rust
// src-tauri/src/asset.rs
#[tauri::command]
pub async fn save_asset(
    data: Vec<u8>,
    name: String,
    hash: String
) -> Result<String, String> {
    let path = get_asset_path(&hash);
    fs::write(&path, data)?;
    Ok(path)
}

#[tauri::command]
pub async fn generate_thumbnails(
    source: String,
    sizes: Vec<u32>
) -> Result<Vec<String>, String> {
    let img = image::open(&source)?;
    let mut results = Vec::new();
    
    for size in sizes {
        let thumb = img.thumbnail(size, size);
        let path = get_thumb_path(&source, size);
        thumb.save(&path)?;
        results.push(path);
    }
    
    Ok(results)
}
```

## 4. 文件哈希计算

```typescript
async function calculateHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const array = Array.from(new Uint8Array(hash));
  return array.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

## 5. 缩略图规格

- **Small**: 128x128 webp (列表视图)
- **Medium**: 256x256 webp (网格视图)
- **Large**: 512x512 webp (预览)

## 6. 错误处理

- 文件类型不支持
- 文件过大（限制10MB）
- 网络下载失败
- 磁盘空间不足
- 权限问题

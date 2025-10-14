# 同步方案和API设计补充

## 1. 简化的同步流程

### 1.1 核心原则
- 基于时间戳（`updated_at`）而非事件溯源
- Last Write Wins (LWW) 冲突策略
- 先拉后推（Pull then Push）
- 批量操作减少请求

### 1.2 同步伪代码

```typescript
async function sync() {
  const lastSyncTime = await getLastSyncTime();
  
  // 1. Pull: 拉取云端 updated_at > lastSyncTime 的记录
  const cloudUpdates = await GET(`/sync/pull?since=${lastSyncTime}`);
  await applyCloudUpdates(cloudUpdates); // LWW策略合并到本地
  
  // 2. Push: 推送本地 updated_at > lastSyncTime 或 synced=0 的记录
  const localChanges = await collectLocalChanges(lastSyncTime);
  if (localChanges.hasAssets) {
    await uploadAssetsToR2(localChanges.assets); // 先上传图片
  }
  await POST('/sync/push', localChanges); // 再推送元数据
  
  // 3. 更新同步时间
  await setLastSyncTime(cloudUpdates.serverTimestamp);
}
```

### 1.3 冲突处理

```typescript
function mergeAsset(local: Asset, remote: Asset, lastSync: number): Asset {
  // 情况1: 只有云端更新
  if (remote.updated_at > lastSync && local.updated_at <= lastSync) {
    return remote; // 使用云端版本
  }
  
  // 情况2: 只有本地更新
  if (local.updated_at > lastSync && remote.updated_at <= lastSync) {
    return local; // 保留本地版本（稍后推送）
  }
  
  // 情况3: 都更新了（真冲突）
  if (local.updated_at > lastSync && remote.updated_at > lastSync) {
    // LWW: 时间戳大的获胜
    if (remote.updated_at > local.updated_at) {
      showNotification(`表情包 "${local.file_name}" 已同步云端最新版本`);
      return remote;
    } else {
      return local; // 保留本地，推送覆盖云端
    }
  }
  
  // 情况4: 都没更新
  return local;
}
```

## 2. API设计

### 2.1 认证接口

```
POST /auth/device-begin
请求：
{
  "device_id": "uuid",
  "device_name": "MacBook Pro",
  "device_type": "desktop",
  "platform": "macos"
}

响应：
{
  "token": "jwt_token",
  "user_id": "uuid",
  "expires_at": timestamp
}
```

### 2.2 同步接口

```
POST /sync/pull
请求：
{
  "since": 1704067200000,
  "tables": ["assets", "tags", "keywords", "collections", 
             "asset_tags", "asset_keywords", "asset_collections"]
}

响应：
{
  "assets": [...],              // 所有 updated_at > since 的资产
  "tags": [...],
  "keywords": [...],
  "collections": [...],
  "asset_tags": [...],
  "asset_keywords": [...],
  "asset_collections": [...],
  "server_timestamp": 1704153600000,
  "total_count": 15
}

---

POST /sync/push
请求：
{
  "assets": [...],
  "tags": [...],
  "keywords": [...],
  "collections": [...],
  "asset_tags": [...],
  "asset_keywords": [...],
  "asset_collections": [...]
}

响应：
{
  "success": true,
  "synced_count": 10,
  "server_timestamp": 1704153600000
}
```

### 2.3 资产上传接口

```
POST /asset/upload
Headers:
  Authorization: Bearer {token}
  Content-Type: image/png

Body: (binary)

响应：
{
  "success": true,
  "r2_url": "https://pub-xxx.r2.dev/{user_id}/assets/{hash}.png",
  "thumb_url": "https://pub-xxx.r2.dev/{user_id}/thumbs/{hash}.webp"
}
```

### 2.4 分享接口

```
POST /collection/share
请求：
{
  "collection_id": "uuid",
  "expires_in": 86400  // 24小时，可选
}

响应：
{
  "share_token": "random_token",
  "share_url": "https://meme.app/share/{token}",
  "expires_at": timestamp
}

---

GET /share/:token
响应：
{
  "collection": {
    "name": "搞笑表情包",
    "description": "...",
    "assets": [...]
  }
}
```

## 3. 搜索功能实现要点

### 3.1 拼音搜索

```typescript
import { pinyin } from 'pinyin-pro';

function preprocessSearchQuery(query: string): string {
  const tokens = query.split(/\s+/);
  const expanded = tokens.flatMap(token => {
    const variants = [token];
    
    // 如果是中文，添加拼音
    if (/[\u4e00-\u9fa5]/.test(token)) {
      const fullPinyin = pinyin(token, { toneType: 'none' }).replace(/\s/g, '');
      const firstLetters = pinyin(token, { pattern: 'first', toneType: 'none' });
      variants.push(fullPinyin, firstLetters);
    }
    
    // 添加前缀匹配
    variants.push(token + '*');
    
    return variants;
  });
  
  // FTS5查询语法：OR连接
  return expanded.map(v => `"${v}"`).join(' OR ');
}

// 示例：
// 输入："哈哈"
// 输出："哈哈" OR "haha" OR "hh" OR "哈哈*"
```

### 3.2 FTS5索引更新

```typescript
// 当资产被修改时更新FTS索引
async function updateFTSIndex(assetId: string) {
  // 1. 获取资产的标签和关键词
  const tags = await db.getAssetTags(assetId);
  const keywords = await db.getAssetKeywords(assetId);
  const asset = await db.getAssetById(assetId);
  
  // 2. 生成拼音
  const tagsPinyin = tags.map(t => pinyin(t.name, { toneType: 'none' })).join(' ');
  const keywordsPinyin = keywords.map(k => pinyin(k.text, { toneType: 'none' })).join(' ');
  
  // 3. 更新FTS表
  await db.execute(`
    INSERT OR REPLACE INTO assets_fts(asset_id, file_name, keywords, keywords_pinyin, tags, tags_pinyin)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    assetId,
    asset.file_name,
    keywords.map(k => k.text).join(' '),
    keywordsPinyin,
    tags.map(t => t.name).join(' '),
    tagsPinyin
  ]);
}
```

## 4. 跨应用拖拽实现

### 4.1 Tauri端实现（Rust）

```rust
// src-tauri/src/main.rs
use tauri::Manager;

#[tauri::command]
async fn start_drag(file_path: String) -> Result<(), String> {
    // 在macOS上使用NSPasteboard
    #[cfg(target_os = "macos")]
    {
        use cocoa::foundation::NSArray;
        use cocoa::appkit::{NSPasteboard, NSPasteboardTypeFileURL};
        
        unsafe {
            let pasteboard = NSPasteboard::generalPasteboard(nil);
            pasteboard.clearContents();
            
            let url = NSURL::fileURLWithPath_(nil, NSString::from_str(&file_path));
            let objects = NSArray::arrayWithObject(nil, url);
            pasteboard.writeObjects(objects);
        }
    }
    
    Ok(())
}
```

### 4.2 前端实现

```typescript
function AssetCard({ asset }: { asset: Asset }) {
  const handleDragStart = async (e: React.DragEvent) => {
    // 设置拖拽数据
    e.dataTransfer.effectAllowed = 'copy';
    
    // 调用Tauri后端开始拖拽
    await invoke('start_drag', {
      filePath: asset.file_path
    });
    
    // 更新使用统计
    await incrementUseCount(asset.id);
  };
  
  return (
    <div 
      draggable 
      onDragStart={handleDragStart}
      className="asset-card"
    >
      <img src={asset.thumb_medium} alt={asset.file_name} />
    </div>
  );
}
```

## 5. 开发路线图

### 阶段1: MVP（本地功能）- 2周

- [x] 项目初始化（Tauri + React）
- [ ] 本地SQLite数据库
- [ ] 拖拽/URL/剪贴板导入
- [ ] 标签和关键词管理
- [ ] FTS5搜索（含拼音）
- [ ] 列表/网格视图
- [ ] 跨应用拖拽

### 阶段2: 云同步（可选）- 1周

- [ ] Cloudflare Workers API
- [ ] D1数据库迁移
- [ ] 时间戳同步实现
- [ ] R2图片上传
- [ ] 设备注册和认证

### 阶段3: 增强功能 - 1周

- [ ] 集合管理
- [ ] 分享功能
- [ ] 使用统计
- [ ] 全局快捷键
- [ ] 设置面板
- [ ] 数据导入导出

### 阶段4: 优化和发布 - 1周

- [ ] 性能优化（虚拟滚动、缓存）
- [ ] UI/UX打磨
- [ ] 多平台测试
- [ ] 打包和发布
- [ ] 文档编写

## 6. 关键技术决策总结

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 同步方案 | 时间戳 + LWW | 简单可靠，个人使用无需CRDT |
| 冲突解决 | Last Write Wins | 冲突罕见，简单策略即可 |
| 事件溯源 | ❌ 不使用 | 过度设计，增加复杂度 |
| KV缓存 | ❌ 不使用 | 个人数据量小，D1直查即可 |
| 快照系统 | ❌ 不使用 | 增量同步已足够 |
| 搜索引擎 | SQLite FTS5 | 内置、快速、支持中文 |
| 图片存储 | 本地+R2可选 | 本地优先，云备份可选 |
| 认证方式 | JWT | 简单有效，无状态 |

## 7. 数据流图

```
用户操作
  ↓
UI层 (React)
  ↓
业务逻辑 (TypeScript)
  ↓
本地数据库 (SQLite) ←→ 文件系统
  ↓ (同步触发)
Cloudflare Workers
  ↓
D1数据库 + R2存储
```

## 8. 目录结构

```
~/Library/Application Support/com.meme-manager/
├── meme.db              # SQLite数据库
├── assets/              # 原图
│   ├── {hash}.png
│   ├── {hash}.gif
│   └── ...
├── thumbs/              # 缩略图
│   ├── {hash}_128.webp
│   ├── {hash}_256.webp
│   ├── {hash}_512.webp
│   └── ...
├── logs/                # 日志文件
└── temp/                # 临时文件
```

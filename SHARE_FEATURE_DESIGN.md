# 表情包分享功能设计

## 1. 功能概述

### 1.1 用户场景

**分享者（Alice）：**
1. 选中一个或多个表情包
2. 点击"分享"按钮
3. 生成分享链接（可设置有效期）
4. 复制链接发给朋友

**接收者（Bob）：**
1. 打开分享链接
2. 在网页上预览表情包
3. 点击"导入到我的应用"
4. 表情包自动下载到本地应用

### 1.2 核心特性

- ✅ 批量分享（支持多张图片）
- ✅ 在线预览（无需登录）
- ✅ 一键导入（Deep Link 唤起应用）
- ✅ 有效期控制（可选：7天、30天、永久）
- ✅ 访问统计（查看次数）
- ✅ 分享管理（查看、删除分享）

## 2. 技术架构

### 2.1 整体流程

```
┌─────────────────────────────────────────────────────────────┐
│                     分享流程                                  │
└─────────────────────────────────────────────────────────────┘

1. 创建分享
   用户选择图片 → 上传到 R2 → 生成分享 Token → 返回链接

2. 访问分享
   打开链接 → Workers 验证 Token → 返回分享页面 → 显示图片

3. 导入图片
   点击导入 → Deep Link 唤起应用 → 下载图片 → 保存到本地
```

### 2.2 数据模型

#### D1 数据库表

```sql
-- 分享记录表
CREATE TABLE shares (
    share_id TEXT PRIMARY KEY,           -- 短ID，如 "abc123"
    user_id TEXT NOT NULL,               -- 分享者ID
    title TEXT,                          -- 分享标题
    description TEXT,                    -- 分享描述
    
    -- 访问控制
    expires_at INTEGER,                  -- 过期时间（可选）
    max_downloads INTEGER,               -- 最大下载次数（可选）
    password_hash TEXT,                  -- 访问密码（可选）
    
    -- 统计
    view_count INTEGER DEFAULT 0,        -- 查看次数
    download_count INTEGER DEFAULT 0,    -- 下载次数
    
    -- 时间戳
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 分享的资产列表
CREATE TABLE share_assets (
    share_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    PRIMARY KEY (share_id, asset_id),
    FOREIGN KEY (share_id) REFERENCES shares(share_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_shares_user ON shares(user_id);
CREATE INDEX idx_shares_expires ON shares(expires_at);
CREATE INDEX idx_share_assets_share ON share_assets(share_id, display_order);
```

### 2.3 R2 存储结构

```
meme-bucket/
├── {user_id}/
│   ├── assets/
│   │   └── {hash}.{ext}      # 原图（私有）
│   └── thumbs/
│       └── {hash}_256.webp   # 缩略图（私有）
└── shared/
    └── {share_id}/
        ├── {hash}.{ext}      # 分享的原图（公开）
        └── {hash}_thumb.webp # 分享的缩略图（公开）
```

**关键点：**
- 用户的原图是**私有**的
- 分享时**复制**图片到 `shared/` 目录，设置为**公开访问**
- 这样即使分享被删除，原图仍然安全

## 3. API 设计

### 3.1 创建分享

```typescript
// POST /share/create
interface CreateShareRequest {
  asset_ids: string[];          // 要分享的资产ID列表
  title?: string;               // 分享标题
  description?: string;         // 分享描述
  expires_in?: number;          // 有效期（秒），如 604800 = 7天
  max_downloads?: number;       // 最大下载次数
  password?: string;            // 访问密码（可选）
}

interface CreateShareResponse {
  share_id: string;             // "abc123"
  share_url: string;            // "https://meme.app/s/abc123"
  expires_at?: number;          // 过期时间戳
}
```

**实现逻辑：**
```typescript
async function createShare(req: CreateShareRequest, userId: string) {
  // 1. 生成短ID
  const shareId = generateShortId(); // 如 "abc123"
  
  // 2. 复制图片到公开目录
  for (const assetId of req.asset_ids) {
    const asset = await db.getAsset(assetId);
    
    // 从私有目录复制到公开目录
    await r2.copy(
      `${userId}/assets/${asset.content_hash}.${asset.ext}`,
      `shared/${shareId}/${asset.content_hash}.${asset.ext}`,
      { public: true } // 设置为公开访问
    );
    
    // 复制缩略图
    await r2.copy(
      `${userId}/thumbs/${asset.content_hash}_256.webp`,
      `shared/${shareId}/${asset.content_hash}_thumb.webp`,
      { public: true }
    );
  }
  
  // 3. 创建分享记录
  const expiresAt = req.expires_in 
    ? Date.now() + req.expires_in * 1000 
    : null;
  
  await db.execute(`
    INSERT INTO shares (share_id, user_id, title, description, expires_at, max_downloads, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [shareId, userId, req.title, req.description, expiresAt, req.max_downloads, Date.now(), Date.now()]);
  
  // 4. 关联资产
  for (let i = 0; i < req.asset_ids.length; i++) {
    await db.execute(`
      INSERT INTO share_assets (share_id, asset_id, display_order)
      VALUES (?, ?, ?)
    `, [shareId, req.asset_ids[i], i]);
  }
  
  return {
    share_id: shareId,
    share_url: `https://meme.app/s/${shareId}`,
    expires_at: expiresAt
  };
}
```

### 3.2 访问分享

```typescript
// GET /s/:shareId
interface GetShareResponse {
  title: string;
  description: string;
  assets: Array<{
    id: string;
    file_name: string;
    mime_type: string;
    width: number;
    height: number;
    thumb_url: string;        // 公开访问URL
    download_url: string;     // 公开访问URL
  }>;
  expires_at?: number;
  view_count: number;
}
```

**实现逻辑：**
```typescript
async function getShare(shareId: string) {
  // 1. 获取分享记录
  const share = await db.query(`
    SELECT * FROM shares WHERE share_id = ?
  `, [shareId]);
  
  if (!share) {
    throw new Error('分享不存在或已过期');
  }
  
  // 2. 检查是否过期
  if (share.expires_at && share.expires_at < Date.now()) {
    throw new Error('分享已过期');
  }
  
  // 3. 检查下载次数限制
  if (share.max_downloads && share.download_count >= share.max_downloads) {
    throw new Error('已达到最大下载次数');
  }
  
  // 4. 获取资产列表
  const assets = await db.query(`
    SELECT a.*, sa.display_order
    FROM share_assets sa
    JOIN assets a ON sa.asset_id = a.id
    WHERE sa.share_id = ?
    ORDER BY sa.display_order
  `, [shareId]);
  
  // 5. 生成公开访问URL
  const assetsWithUrls = assets.map(asset => ({
    id: asset.id,
    file_name: asset.file_name,
    mime_type: asset.mime_type,
    width: asset.width,
    height: asset.height,
    thumb_url: `https://pub-xxx.r2.dev/shared/${shareId}/${asset.content_hash}_thumb.webp`,
    download_url: `https://pub-xxx.r2.dev/shared/${shareId}/${asset.content_hash}.${asset.ext}`
  }));
  
  // 6. 更新查看次数
  await db.execute(`
    UPDATE shares SET view_count = view_count + 1 WHERE share_id = ?
  `, [shareId]);
  
  return {
    title: share.title,
    description: share.description,
    assets: assetsWithUrls,
    expires_at: share.expires_at,
    view_count: share.view_count + 1
  };
}
```

### 3.3 导入分享

```typescript
// POST /share/:shareId/import
interface ImportShareRequest {
  asset_ids?: string[];  // 可选：只导入部分图片
}

interface ImportShareResponse {
  success: boolean;
  imported_count: number;
  assets: Array<{
    id: string;
    download_url: string;
  }>;
}
```

**客户端实现：**
```typescript
// 1. 通过 Deep Link 唤起应用
// meme://import?share_id=abc123

// 2. 应用内处理
async function handleImportShare(shareId: string) {
  // 获取分享信息
  const share = await fetch(`https://api.meme.app/s/${shareId}`).then(r => r.json());
  
  // 下载所有图片
  for (const asset of share.assets) {
    // 下载图片
    const blob = await fetch(asset.download_url).then(r => r.blob());
    
    // 保存到本地
    await importAsset(blob, {
      file_name: asset.file_name,
      source: 'share',
      share_id: shareId
    });
  }
  
  // 显示成功提示
  showToast(`成功导入 ${share.assets.length} 张表情包`);
}
```

### 3.4 管理分享

```typescript
// GET /share/list
// 获取我的分享列表
interface ListSharesResponse {
  shares: Array<{
    share_id: string;
    title: string;
    asset_count: number;
    view_count: number;
    download_count: number;
    created_at: number;
    expires_at?: number;
  }>;
}

// DELETE /share/:shareId
// 删除分享
interface DeleteShareResponse {
  success: boolean;
}
```

## 4. 分享页面设计

### 4.1 页面结构

```html
<!DOCTYPE html>
<html>
<head>
  <title>表情包分享 - {title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* 简洁美观的样式 */
  </style>
</head>
<body>
  <div class="container">
    <!-- 头部 -->
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <div class="stats">
        <span>👁️ {view_count} 次查看</span>
        <span>📥 {download_count} 次下载</span>
      </div>
    </header>
    
    <!-- 图片网格 -->
    <div class="image-grid">
      {#each assets as asset}
        <div class="image-card">
          <img src="{asset.thumb_url}" alt="{asset.file_name}">
          <div class="image-overlay">
            <button onclick="downloadImage('{asset.download_url}')">
              下载
            </button>
          </div>
        </div>
      {/each}
    </div>
    
    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn-primary" onclick="importToApp()">
        📱 导入到应用
      </button>
      <button class="btn-secondary" onclick="downloadAll()">
        📦 下载全部
      </button>
    </div>
    
    <!-- 底部 -->
    <footer>
      <p>使用 <a href="https://meme.app">表情包管理工具</a> 创建</p>
    </footer>
  </div>
  
  <script>
    function importToApp() {
      // 尝试唤起应用
      window.location.href = 'meme://import?share_id={share_id}';
      
      // 2秒后如果还在页面，显示下载提示
      setTimeout(() => {
        alert('请先安装表情包管理工具');
      }, 2000);
    }
    
    function downloadAll() {
      // 下载所有图片
      assets.forEach(asset => {
        downloadImage(asset.download_url);
      });
    }
    
    function downloadImage(url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.click();
    }
  </script>
</body>
</html>
```

### 4.2 移动端优化

- 响应式布局
- 触摸友好的按钮
- 图片懒加载
- 支持手势操作

## 5. Deep Link 实现

### 5.1 注册 URL Scheme

**macOS (Tauri):**
```json
// tauri.conf.json
{
  "tauri": {
    "bundle": {
      "identifier": "com.meme-manager",
      "macOS": {
        "urlSchemes": ["meme"]
      }
    }
  }
}
```

### 5.2 处理 Deep Link

```typescript
// src-tauri/src/main.rs
use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // 监听 URL 事件
      app.listen_global("deep-link", |event| {
        if let Some(url) = event.payload() {
          // meme://import?share_id=abc123
          if url.starts_with("meme://import") {
            let share_id = extract_share_id(url);
            // 触发导入流程
            app.emit_all("import-share", share_id).unwrap();
          }
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

## 6. 安全考虑

### 6.1 防滥用措施

1. **速率限制**
   - 每个用户每天最多创建 10 个分享
   - 每个 IP 每小时最多访问 100 个分享

2. **内容审核**
   - 可选：图片内容检测（Cloudflare AI）
   - 举报机制

3. **访问控制**
   - 支持密码保护
   - 支持有效期限制
   - 支持下载次数限制

### 6.2 隐私保护

1. **数据隔离**
   - 分享的图片独立存储
   - 删除分享时清理 R2 文件

2. **匿名访问**
   - 访问分享无需登录
   - 不记录访问者信息

## 7. 实现计划

### 阶段 1：后端 API（1-2天）

- [ ] D1 表结构创建
- [ ] 创建分享 API
- [ ] 访问分享 API
- [ ] R2 文件复制逻辑
- [ ] 分享管理 API

### 阶段 2：分享页面（1天）

- [ ] HTML/CSS 页面设计
- [ ] 图片网格展示
- [ ] 下载功能
- [ ] 移动端适配

### 阶段 3：客户端集成（1-2天）

- [ ] Deep Link 注册
- [ ] 导入流程实现
- [ ] 分享按钮 UI
- [ ] 分享管理界面

### 阶段 4：测试优化（1天）

- [ ] 多设备测试
- [ ] 性能优化
- [ ] 错误处理

## 8. 用户体验流程

### 8.1 分享流程

```
1. 用户选中图片
   ↓
2. 点击"分享"按钮
   ↓
3. 设置分享选项（标题、有效期等）
   ↓
4. 生成分享链接
   ↓
5. 复制链接或分享到社交平台
```

### 8.2 导入流程

```
1. 打开分享链接
   ↓
2. 预览表情包
   ↓
3. 点击"导入到应用"
   ↓
4. 唤起本地应用（或提示下载）
   ↓
5. 自动下载并导入
   ↓
6. 显示成功提示
```

## 9. 成本估算

**Cloudflare 免费额度：**
- R2: 10GB 存储 + 1000万读/月
- Workers: 100,000 请求/天
- Pages: 无限静态页面

**预估使用：**
- 每个分享平均 5 张图片 × 500KB = 2.5MB
- 100 个活跃分享 = 250MB
- 完全在免费额度内 ✅

## 10. 未来扩展

- [ ] 分享统计图表
- [ ] 评论功能
- [ ] 点赞收藏
- [ ] 分享到社交平台（一键分享）
- [ ] 二维码生成
- [ ] 自定义域名

---

这个设计完全可以用 Cloudflare 实现，而且成本几乎为零！准备好开始实现了吗？

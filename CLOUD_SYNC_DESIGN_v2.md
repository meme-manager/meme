# 云同步设计方案 v2.0

> 基于当前实现的云同步设计，简化并优化

## 1. 核心原则

- **本地优先**：所有操作本地立即生效，后台异步同步
- **时间戳同步**：基于 `updated_at` 的增量同步
- **LWW 策略**：Last Write Wins，时间戳大的获胜
- **批量操作**：减少网络请求，提高效率
- **可选功能**：云同步完全可选，不影响本地使用

## 2. 数据模型调整

### 2.1 本地数据库（SQLite）

**需要同步的表：**
- `assets` - 资产（图片）
- `tags` - 标签
- `asset_tags` - 资产-标签关联
- `user_settings` - 用户设置（新增）

**不需要同步的表：**
- `assets_fts` - 全文搜索索引（本地生成）
- `sync_log` - 同步日志（本地记录）

### 2.2 新增：用户设置表

```sql
CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 默认设置
INSERT INTO user_settings (key, value, updated_at) VALUES
('auto_play_gif', 'true', strftime('%s', 'now') * 1000),
('theme', 'light', strftime('%s', 'now') * 1000),
('grid_size', 'medium', strftime('%s', 'now') * 1000);
```

### 2.3 资产表调整

```sql
-- 添加收藏字段
ALTER TABLE assets ADD COLUMN is_favorite INTEGER DEFAULT 0;
ALTER TABLE assets ADD COLUMN favorited_at INTEGER;

-- 添加索引
CREATE INDEX idx_assets_favorite ON assets(is_favorite) WHERE is_favorite = 1;
```

## 3. 云端数据库（Cloudflare D1）

### 3.1 简化的表结构

```sql
-- 用户表
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER,
    storage_used INTEGER DEFAULT 0
);

-- 设备表
CREATE TABLE devices (
    device_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    platform TEXT,
    last_seen_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 资产表
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    
    -- R2 存储
    r2_key TEXT NOT NULL,
    thumb_r2_key TEXT,
    
    -- 元数据
    is_favorite INTEGER DEFAULT 0,
    favorited_at INTEGER,
    use_count INTEGER DEFAULT 0,
    last_used_at INTEGER,
    
    -- 时间戳
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- 软删除
    deleted INTEGER DEFAULT 0,
    deleted_at INTEGER,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    use_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- 资产-标签关联表
CREATE TABLE asset_tags (
    asset_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 用户设置表
CREATE TABLE user_settings (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_assets_user_updated ON assets(user_id, updated_at DESC);
CREATE INDEX idx_assets_hash ON assets(content_hash);
CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_asset_tags_asset ON asset_tags(asset_id);
CREATE INDEX idx_asset_tags_tag ON asset_tags(tag_id);
```

## 4. API 设计

### 4.1 认证接口

```typescript
// POST /auth/device-register
interface DeviceRegisterRequest {
  device_id: string;      // UUID
  device_name: string;    // "MacBook Pro"
  device_type: string;    // "desktop"
  platform: string;       // "macos" | "windows" | "linux"
}

interface DeviceRegisterResponse {
  token: string;          // JWT token
  user_id: string;        // UUID
  expires_at: number;     // timestamp
}
```

### 4.2 同步接口

```typescript
// POST /sync/pull
interface SyncPullRequest {
  since: number;          // 上次同步时间戳
}

interface SyncPullResponse {
  assets: Asset[];
  tags: Tag[];
  asset_tags: AssetTag[];
  settings: UserSetting[];
  server_timestamp: number;
  total_count: number;
}

// POST /sync/push
interface SyncPushRequest {
  assets: Asset[];
  tags: Tag[];
  asset_tags: AssetTag[];
  settings: UserSetting[];
}

interface SyncPushResponse {
  success: boolean;
  synced_count: number;
  server_timestamp: number;
  conflicts?: Conflict[];  // 如果有冲突
}
```

### 4.3 文件上传接口

```typescript
// POST /asset/upload
// Headers: Content-Type: image/*
// Body: Binary data

interface AssetUploadResponse {
  success: boolean;
  r2_key: string;          // 原图路径
  thumb_r2_key: string;    // 缩略图路径
  r2_url: string;          // 访问URL
}
```

## 5. 同步流程

### 5.1 完整同步流程

```typescript
async function sync() {
  console.log('[Sync] 开始同步...');
  
  // 1. 获取上次同步时间
  const lastSyncTime = await getLastSyncTime();
  
  // 2. Pull: 拉取云端更新
  const cloudUpdates = await fetch('/sync/pull', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ since: lastSyncTime })
  }).then(r => r.json());
  
  // 3. 合并云端更新到本地（LWW策略）
  await mergeCloudUpdates(cloudUpdates, lastSyncTime);
  
  // 4. 收集本地更改
  const localChanges = await collectLocalChanges(lastSyncTime);
  
  // 5. 上传新增的图片到 R2
  if (localChanges.newAssets.length > 0) {
    for (const asset of localChanges.newAssets) {
      const { r2_key, thumb_r2_key } = await uploadAssetToR2(asset);
      asset.r2_key = r2_key;
      asset.thumb_r2_key = thumb_r2_key;
    }
  }
  
  // 6. Push: 推送本地更改
  const pushResult = await fetch('/sync/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(localChanges)
  }).then(r => r.json());
  
  // 7. 更新同步时间
  await setLastSyncTime(pushResult.server_timestamp);
  
  console.log('[Sync] 同步完成');
}
```

### 5.2 冲突处理（LWW）

```typescript
function mergeAsset(local: Asset, remote: Asset, lastSync: number): Asset {
  // 只有云端更新
  if (remote.updated_at > lastSync && local.updated_at <= lastSync) {
    return remote;
  }
  
  // 只有本地更新
  if (local.updated_at > lastSync && remote.updated_at <= lastSync) {
    return local;
  }
  
  // 都更新了（真冲突）- LWW
  if (local.updated_at > lastSync && remote.updated_at > lastSync) {
    if (remote.updated_at > local.updated_at) {
      console.log(`[Sync] 冲突：使用云端版本 ${remote.file_name}`);
      return remote;
    } else {
      console.log(`[Sync] 冲突：使用本地版本 ${local.file_name}`);
      return local;
    }
  }
  
  // 都没更新
  return local;
}
```

## 6. 实现计划

### 阶段 1：基础设施（1-2天）

- [ ] Cloudflare Workers 项目初始化
- [ ] D1 数据库创建和迁移
- [ ] R2 存储桶配置
- [ ] JWT 认证实现
- [ ] 基础 API 路由

### 阶段 2：同步核心（2-3天）

- [ ] 本地数据库调整（添加字段）
- [ ] SyncManager 实现
- [ ] Pull/Push API 实现
- [ ] 冲突处理逻辑
- [ ] 文件上传到 R2

### 阶段 3：UI 集成（1-2天）

- [ ] 设置面板添加同步选项
- [ ] 登录/注册流程
- [ ] 同步状态显示
- [ ] 同步进度条
- [ ] 错误处理和重试

### 阶段 4：测试和优化（1-2天）

- [ ] 多设备同步测试
- [ ] 冲突场景测试
- [ ] 性能优化
- [ ] 错误处理完善

## 7. 关键决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 同步策略 | 时间戳 + LWW | 简单可靠，适合个人使用 |
| 冲突解决 | Last Write Wins | 冲突罕见，简单有效 |
| 文件存储 | Cloudflare R2 | 免费额度充足，全球加速 |
| 认证方式 | JWT | 无状态，简单有效 |
| 同步触发 | 手动 + 定时 | 可控，节省资源 |
| 删除策略 | 软删除 | 可恢复，安全 |

## 8. 安全考虑

1. **认证**：JWT token，有效期 30 天
2. **授权**：每个请求验证 user_id
3. **数据隔离**：所有查询都带 user_id 过滤
4. **文件访问**：R2 使用签名 URL（可选）
5. **速率限制**：Workers 层面限制请求频率

## 9. 成本估算

**Cloudflare 免费额度：**
- Workers: 100,000 请求/天 ✅
- D1: 5GB 存储 + 500万读/天 ✅
- R2: 10GB 存储 + 1000万读/月 ✅

**个人使用预估：**
- 1000 张图片 ≈ 500MB（原图） + 50MB（缩略图）
- 每天同步 10 次 ≈ 100 请求
- 完全在免费额度内 ✅

## 10. 下一步

准备好开始开发了吗？我建议按以下顺序：

1. **先搭建 Cloudflare Workers 基础设施**
2. **实现认证和基础 API**
3. **本地客户端集成**
4. **测试和优化**

需要我开始实现吗？

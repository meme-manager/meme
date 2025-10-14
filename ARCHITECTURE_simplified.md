# 表情包管理工具技术架构文档（简化版）

> **设计原则**：本地优先、简单可靠、避免过度设计，专注个人使用场景

## 1. 项目概述

### 1.1 项目定位

一个面向**个人使用**的跨平台表情包管理工具，支持便捷的管理、搜索和使用表情包，可选的云同步和分享功能。

### 1.2 核心功能

**基础功能（MVP - 第一阶段）：**
- ✅ 本地表情包管理（拖拽导入、URL导入、剪贴板导入）
- ✅ 标签和关键词管理
- ✅ 全文搜索（支持拼音和模糊匹配）
- ✅ 跨应用拖拽使用和复制
- ✅ 缩略图显示和快速预览
- ✅ 本地SQLite存储

**进阶功能（第二阶段）：**
- 🔄 基于时间戳的简单云同步
- 🔄 图片上传到Cloudflare R2
- 🔄 集合管理和分享功能
- 🔄 使用统计和最近使用记录

**增强功能（第三阶段）：**
- ⏳ 全局快捷键快速唤起
- ⏳ OCR关键词识别（可选）
- ⏳ 自动标签推荐
- ⏳ 数据导入导出

### 1.3 设计原则

- **本地优先**：核心功能离线可用，云同步作为可选增强
- **简单可靠**：避免事件溯源等过度设计，使用简单的时间戳同步
- **快速响应**：本地操作即时生效，后台异步同步
- **数据安全**：本地存储 + 云备份，支持数据导出
- **个人使用**：无需考虑高并发冲突，采用LWW策略

## 2. 技术架构

### 2.1 技术栈选择

**客户端：**
- **框架**：Tauri 2.x（Rust + Web技术，跨平台桌面应用）
- **前端**：React 18 + TypeScript
- **UI库**：shadcn/ui + TailwindCSS
- **图标**：Lucide React
- **状态管理**：Zustand（轻量级，避免Redux复杂度）
- **本地数据库**：SQLite（via Tauri SQL插件）
- **图片处理**：Sharp/Tauri Image插件（缩略图生成）
- **拼音库**：pinyin-pro（支持拼音搜索）

**云端（可选功能）：**
- **API层**：Cloudflare Workers + Hono（快速、轻量）
- **数据库**：Cloudflare D1（SQLite兼容）
- **存储**：Cloudflare R2（图片和备份）
- **认证**：JWT Token（简单有效）

**为什么选择 Cloudflare？**
- ✅ 免费额度充足（R2 10GB、D1 5GB、Workers 10万请求/天）
- ✅ 边缘网络全球加速
- ✅ SQLite兼容，本地和云端统一数据模型
- ✅ 简单可靠，无需维护服务器
- ✅ 个人使用成本几乎为零

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Tauri 桌面应用                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React UI 层                              │  │
│  │  - 表情包网格/列表视图                                 │  │
│  │  - 实时搜索框（防抖）                                  │  │
│  │  - 标签/集合侧边栏                                     │  │
│  │  - 拖拽区域                                           │  │
│  │  - 设置面板                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↕                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Zustand 状态管理                            │  │
│  │  - assetsStore（资产列表、选中状态）                  │  │
│  │  - searchStore（搜索关键词、筛选器）                  │  │
│  │  - syncStore（同步状态、进度）                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↕                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           业务逻辑层（TypeScript）                     │  │
│  │  - AssetManager（CRUD、导入、删除）                   │  │
│  │  - SearchEngine（FTS5查询、拼音匹配）                │  │
│  │  - SyncManager（时间戳同步、冲突处理）                │  │
│  │  - DragDropHandler（跨应用拖拽）                      │  │
│  │  - ThumbnailGenerator（缩略图生成）                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↕                                   │
│  ┌───────────────────┐       ┌────────────────────────┐   │
│  │  Tauri 后端       │       │  文件系统               │   │
│  │  (Rust)           │       │                         │   │
│  │  - SQLite访问     │       │  ~/meme-manager/       │   │
│  │  - 文件操作       │       │    ├── images/         │   │
│  │  - 系统集成       │       │    ├── thumbs/         │   │
│  │  - 拖拽API        │       │    └── meme.db         │   │
│  └───────────────────┘       └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↕ HTTPS（可选）
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Workers API                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  路由（Hono）                                          │  │
│  │  - POST /auth/device-begin（设备注册）                │  │
│  │  - GET  /sync/pull（拉取更新）                        │  │
│  │  - POST /sync/push（推送更新）                        │  │
│  │  - POST /asset/upload（上传图片）                     │  │
│  │  - POST /collection/share（生成分享链接）             │  │
│  │  - GET  /share/:token（访问分享）                     │  │
│  └──────────────────────────────────────────────────────┘  │
│            ↕                              ↕                 │
│  ┌──────────────────┐          ┌─────────────────────┐     │
│  │  Cloudflare D1   │          │  Cloudflare R2      │     │
│  │  (SQLite)        │          │  (对象存储)          │     │
│  │  - users         │          │  - 原图              │     │
│  │  - devices       │          │  - 缩略图            │     │
│  │  - assets        │          │  - 数据备份          │     │
│  │  - tags          │          │                      │     │
│  │  - keywords      │          │  路径设计：          │     │
│  │  - collections   │          │  /{user_id}/        │     │
│  └──────────────────┘          │    /assets/{hash}   │     │
│                                 │    /thumbs/{hash}   │     │
│                                 └─────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 3. 数据模型设计

### 3.1 本地数据库（SQLite）

> 文件位置：`~/Library/Application Support/com.meme-manager/meme.db`（macOS）

```sql
-- ============================================================
-- 核心表
-- ============================================================

-- 资产表（表情包）
CREATE TABLE assets (
    id TEXT PRIMARY KEY,                -- UUID
    content_hash TEXT NOT NULL UNIQUE,  -- SHA256，用于去重
    
    -- 文件信息
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,            -- 本地绝对路径
    mime_type TEXT NOT NULL,            -- image/png, image/gif, image/webp
    file_size INTEGER NOT NULL,         -- 字节数
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    
    -- 来源信息
    source_url TEXT,                    -- 原始URL（如果有）
    source_platform TEXT,               -- 'url', 'clipboard', 'drag', 'file'
    
    -- 缩略图路径（本地）
    thumb_small TEXT,                   -- 128x128 webp
    thumb_medium TEXT,                  -- 256x256 webp
    thumb_large TEXT,                   -- 512x512 webp
    
    -- 时间戳
    created_at INTEGER NOT NULL,        -- Unix时间戳（毫秒）
    updated_at INTEGER NOT NULL,
    last_used_at INTEGER,               -- 最后使用时间
    
    -- 使用统计
    use_count INTEGER DEFAULT 0,        -- 使用次数
    
    -- 云同步状态
    synced INTEGER DEFAULT 0,           -- 0=未同步, 1=已同步
    cloud_url TEXT,                     -- R2 URL（同步后）
    
    -- 软删除
    deleted INTEGER DEFAULT 0,          -- 0=正常, 1=已删除
    deleted_at INTEGER
);

-- 标签表
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,                         -- HEX颜色 #RRGGBB
    description TEXT,
    icon TEXT,                          -- emoji或图标名称
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    use_count INTEGER DEFAULT 0         -- 使用次数（关联资产数）
);

-- 关键词表
CREATE TABLE keywords (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,                 -- 关键词文本
    lang TEXT DEFAULT 'zh',             -- 语言：zh, en
    type TEXT DEFAULT 'manual',         -- manual, auto, ocr
    weight REAL DEFAULT 1.0,            -- 权重 0.0-1.0
    created_at INTEGER NOT NULL
);

-- 集合表（用于组织表情包）
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,                          -- emoji
    color TEXT,                         -- 主题色
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    asset_count INTEGER DEFAULT 0,      -- 缓存的资产数量
    
    -- 分享设置（本地记录）
    is_shared INTEGER DEFAULT 0,
    share_token TEXT UNIQUE,
    share_expires_at INTEGER
);

-- ============================================================
-- 关联表
-- ============================================================

-- 资产-标签关联
CREATE TABLE asset_tags (
    asset_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 资产-关键词关联
CREATE TABLE asset_keywords (
    asset_id TEXT NOT NULL,
    keyword_id TEXT NOT NULL,
    weight REAL DEFAULT 1.0,            -- 关联权重
    created_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, keyword_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- 资产-集合关联
CREATE TABLE asset_collections (
    asset_id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,    -- 在集合中的排序
    created_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, collection_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- ============================================================
-- 系统表
-- ============================================================

-- 同步状态表（键值存储）
CREATE TABLE sync_state (
    key TEXT PRIMARY KEY,               -- 配置键
    value TEXT NOT NULL,                -- 配置值
    updated_at INTEGER NOT NULL
);

-- 预置配置：
-- key='last_sync_time', value=timestamp
-- key='device_id', value=uuid
-- key='user_id', value=uuid
-- key='sync_enabled', value='0'|'1'
-- key='auth_token', value=jwt

-- ============================================================
-- 全文搜索表（FTS5）
-- ============================================================

CREATE VIRTUAL TABLE assets_fts USING fts5(
    asset_id UNINDEXED,
    file_name,                          -- 文件名
    keywords,                           -- 所有关键词（空格分隔）
    keywords_pinyin,                    -- 关键词拼音（全拼+首字母）
    tags,                               -- 所有标签（空格分隔）
    tags_pinyin,                        -- 标签拼音
    tokenize='unicode61'
);

-- FTS5 触发器：自动更新搜索索引
CREATE TRIGGER assets_fts_insert AFTER INSERT ON assets BEGIN
    INSERT INTO assets_fts(asset_id, file_name, keywords, keywords_pinyin, tags, tags_pinyin)
    SELECT 
        NEW.id,
        NEW.file_name,
        COALESCE((SELECT GROUP_CONCAT(k.text, ' ') FROM asset_keywords ak
                  JOIN keywords k ON ak.keyword_id = k.id
                  WHERE ak.asset_id = NEW.id), ''),
        '',  -- 拼音由应用层填充
        COALESCE((SELECT GROUP_CONCAT(t.name, ' ') FROM asset_tags at
                  JOIN tags t ON at.tag_id = t.id
                  WHERE at.asset_id = NEW.id), ''),
        ''   -- 拼音由应用层填充
    WHERE NEW.deleted = 0;
END;

CREATE TRIGGER assets_fts_delete AFTER UPDATE OF deleted ON assets WHEN NEW.deleted = 1 BEGIN
    DELETE FROM assets_fts WHERE asset_id = NEW.id;
END;

-- ============================================================
-- 索引
-- ============================================================

CREATE INDEX idx_assets_updated_at ON assets(updated_at DESC);
CREATE INDEX idx_assets_hash ON assets(content_hash);
CREATE INDEX idx_assets_last_used ON assets(last_used_at DESC) WHERE last_used_at IS NOT NULL;
CREATE INDEX idx_assets_use_count ON assets(use_count DESC);
CREATE INDEX idx_assets_synced ON assets(synced) WHERE synced = 0;
CREATE INDEX idx_assets_deleted ON assets(deleted) WHERE deleted = 0;

CREATE INDEX idx_tags_name ON tags(name COLLATE NOCASE);
CREATE INDEX idx_keywords_text ON keywords(text COLLATE NOCASE);

CREATE INDEX idx_asset_tags_asset ON asset_tags(asset_id);
CREATE INDEX idx_asset_tags_tag ON asset_tags(tag_id);
CREATE INDEX idx_asset_keywords_asset ON asset_keywords(asset_id);
CREATE INDEX idx_asset_collections_asset ON asset_collections(asset_id);
CREATE INDEX idx_asset_collections_collection ON asset_collections(collection_id, display_order);
```

### 3.2 云端数据库（Cloudflare D1）

> 简化原则：只存储必要的同步数据，使用时间戳而非事件溯源

```sql
-- 用户表（简化）
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER,
    storage_used INTEGER DEFAULT 0      -- 使用的存储空间（字节）
);

-- 设备表（简化）
CREATE TABLE devices (
    device_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,          -- 'desktop'
    platform TEXT,                      -- 'macos', 'windows', 'linux'
    last_seen_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 资产表（云端副本）
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    
    -- R2存储路径
    r2_key TEXT NOT NULL,               -- 原图路径
    thumb_r2_key TEXT,                  -- 缩略图路径
    
    -- 时间戳（用于同步）
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,        -- 关键：用于增量同步
    
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
    description TEXT,
    icon TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- 关键词表
CREATE TABLE keywords (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    lang TEXT DEFAULT 'zh',
    type TEXT DEFAULT 'manual',
    weight REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 集合表
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- 分享功能
    is_public INTEGER DEFAULT 0,
    share_token TEXT UNIQUE,
    share_expires_at INTEGER,
    share_view_count INTEGER DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 关联表（带updated_at用于同步）
CREATE TABLE asset_tags (
    asset_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE asset_keywords (
    asset_id TEXT NOT NULL,
    keyword_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, keyword_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE asset_collections (
    asset_id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, collection_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_assets_user_updated ON assets(user_id, updated_at);
CREATE INDEX idx_assets_hash ON assets(content_hash);
CREATE INDEX idx_assets_deleted ON assets(deleted) WHERE deleted = 0;

CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_tags_updated ON tags(updated_at);

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_collections_share ON collections(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX idx_asset_tags_user ON asset_tags(user_id, updated_at);
CREATE INDEX idx_asset_keywords_user ON asset_keywords(user_id, updated_at);
CREATE INDEX idx_asset_collections_user ON asset_collections(user_id, updated_at);
```

---

## 相关文档

本架构文档已按功能模块拆分，详细内容请查看：

### 核心功能文档
- **[ARCHITECTURE_sync_and_api.md](./ARCHITECTURE_sync_and_api.md)** - 同步方案和API设计
  - 简化的同步流程（基于时间戳）
  - LWW冲突处理策略
  - 完整的API接口定义
  
- **[ARCHITECTURE_import.md](./ARCHITECTURE_import.md)** - 表情包导入功能
  - 三种导入方式（拖拽/URL/剪贴板）
  - 文件哈希去重机制
  - 缩略图生成流程
  
- **[ARCHITECTURE_search.md](./ARCHITECTURE_search.md)** - 全文搜索实现
  - FTS5全文搜索引擎
  - 拼音搜索支持
  - 高级筛选和排序

- **[ARCHITECTURE_drag_and_ui.md](./ARCHITECTURE_drag_and_ui.md)** - 跨应用拖拽和UI设计
  - 跨平台拖拽实现（macOS/Windows/Linux）
  - 完整的UI组件设计
  - 交互细节和快捷键

### 项目管理文档
- **[ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md)** - 开发路线图
  - 4个开发阶段规划
  - 时间线和优先级
  - 风险评估和成功指标


---

## 快速导航

**从这里开始**：
1. 阅读本文档的"项目概述"和"技术架构"
2. 查看 [ARCHITECTURE_roadmap.md](./ARCHITECTURE_roadmap.md) 了解开发计划
3. 根据当前阶段查看对应的功能文档
4. 参考 [ARCHITECTURE_sync_and_api.md](./ARCHITECTURE_sync_and_api.md) 了解技术细节

**核心设计决策**：
- ✅ 本地优先，离线可用
- ✅ 简单的时间戳同步，放弃事件溯源
- ✅ Last Write Wins冲突策略
- ✅ Cloudflare全家桶（Workers + D1 + R2）
- ✅ SQLite FTS5全文搜索
- ✅ Tauri跨平台桌面应用

**下一步行动**：
1. 完成本地SQLite数据库实现
2. 实现表情包导入功能
3. 开发全文搜索引擎
4. 构建基础UI界面
5. 实现跨应用拖拽功能

---

*最后更新：2025-01-14*

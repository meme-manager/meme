/**
 * SQLite 数据库表结构定义
 * 参考: ARCHITECTURE_simplified.md - 3.1 本地数据库
 */

export const SCHEMA_VERSION = 1;

/**
 * 创建所有表的SQL语句
 */
export const CREATE_TABLES_SQL = `
-- ============================================================
-- 核心表
-- ============================================================

-- 资产表（表情包）
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL UNIQUE,
    
    -- 文件信息
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    
    -- 来源信息
    source_url TEXT,
    source_platform TEXT,
    
    -- 缩略图路径（本地）
    thumb_small TEXT,
    thumb_medium TEXT,
    thumb_large TEXT,
    
    -- 时间戳
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_used_at INTEGER,
    
    -- 使用统计
    use_count INTEGER DEFAULT 0,
    
    -- 云同步状态
    synced INTEGER DEFAULT 0,
    cloud_url TEXT,
    
    -- 软删除
    deleted INTEGER DEFAULT 0,
    deleted_at INTEGER
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    description TEXT,
    icon TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    use_count INTEGER DEFAULT 0
);

-- 关键词表
CREATE TABLE IF NOT EXISTS keywords (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    lang TEXT DEFAULT 'zh',
    type TEXT DEFAULT 'manual',
    weight REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL
);

-- 集合表（用于组织表情包）
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    asset_count INTEGER DEFAULT 0,
    
    -- 分享设置（本地记录）
    is_shared INTEGER DEFAULT 0,
    share_token TEXT UNIQUE,
    share_expires_at INTEGER
);

-- ============================================================
-- 关联表
-- ============================================================

-- 资产-标签关联
CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 资产-关键词关联
CREATE TABLE IF NOT EXISTS asset_keywords (
    asset_id TEXT NOT NULL,
    keyword_id TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, keyword_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- 资产-集合关联
CREATE TABLE IF NOT EXISTS asset_collections (
    asset_id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (asset_id, collection_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- ============================================================
-- 系统表
-- ============================================================

-- 同步状态表（键值存储）
CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- ============================================================
-- 全文搜索表（FTS5）
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts USING fts5(
    asset_id UNINDEXED,
    file_name,
    keywords,
    keywords_pinyin,
    tags,
    tags_pinyin,
    tokenize='unicode61'
);
`;

/**
 * 创建索引的SQL语句
 */
export const CREATE_INDEXES_SQL = `
-- 资产表索引
CREATE INDEX IF NOT EXISTS idx_assets_updated_at ON assets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_hash ON assets(content_hash);
CREATE INDEX IF NOT EXISTS idx_assets_last_used ON assets(last_used_at DESC) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_use_count ON assets(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_assets_synced ON assets(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_assets_deleted ON assets(deleted) WHERE deleted = 0;

-- 标签表索引
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name COLLATE NOCASE);

-- 关键词表索引
CREATE INDEX IF NOT EXISTS idx_keywords_text ON keywords(text COLLATE NOCASE);

-- 关联表索引
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_asset_keywords_asset ON asset_keywords(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_collections_asset ON asset_collections(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_collections_collection ON asset_collections(collection_id, display_order);
`;

/**
 * 创建触发器的SQL语句
 */
export const CREATE_TRIGGERS_SQL = `
-- FTS5 触发器：插入资产时自动添加到搜索索引
CREATE TRIGGER IF NOT EXISTS assets_fts_insert 
AFTER INSERT ON assets 
WHEN NEW.deleted = 0
BEGIN
    INSERT INTO assets_fts(asset_id, file_name, keywords, keywords_pinyin, tags, tags_pinyin)
    VALUES (
        NEW.id,
        NEW.file_name,
        '',  -- 关键词由应用层填充
        '',  -- 拼音由应用层填充
        '',  -- 标签由应用层填充
        ''   -- 拼音由应用层填充
    );
END;

-- FTS5 触发器：软删除资产时从搜索索引移除
CREATE TRIGGER IF NOT EXISTS assets_fts_delete 
AFTER UPDATE OF deleted ON assets 
WHEN NEW.deleted = 1 
BEGIN
    DELETE FROM assets_fts WHERE asset_id = NEW.id;
END;

-- 更新资产的 updated_at 时间戳
CREATE TRIGGER IF NOT EXISTS assets_update_timestamp
AFTER UPDATE ON assets
WHEN OLD.updated_at = NEW.updated_at
BEGIN
    UPDATE assets SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- 更新标签的 updated_at 时间戳
CREATE TRIGGER IF NOT EXISTS tags_update_timestamp
AFTER UPDATE ON tags
WHEN OLD.updated_at = NEW.updated_at
BEGIN
    UPDATE tags SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- 更新集合的 updated_at 时间戳
CREATE TRIGGER IF NOT EXISTS collections_update_timestamp
AFTER UPDATE ON collections
WHEN OLD.updated_at = NEW.updated_at
BEGIN
    UPDATE collections SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;
`;

/**
 * 初始化同步状态的SQL语句
 */
export const INIT_SYNC_STATE_SQL = `
INSERT OR IGNORE INTO sync_state (key, value, updated_at) VALUES
    ('last_sync_time', '0', 0),
    ('device_id', '', 0),
    ('user_id', '', 0),
    ('sync_enabled', '0', 0),
    ('auth_token', '', 0);
`;

/**
 * 完整的数据库初始化SQL
 */
export const INIT_DATABASE_SQL = `
${CREATE_TABLES_SQL}
${CREATE_INDEXES_SQL}
${CREATE_TRIGGERS_SQL}
${INIT_SYNC_STATE_SQL}
`;

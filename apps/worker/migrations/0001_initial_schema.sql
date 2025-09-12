-- Migration: 0001_initial_schema
-- Description: 创建初始数据库表结构
-- Created: 2024-12-12

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    -- 用户配置
    settings TEXT, -- JSON 格式的用户设置
    -- 存储配额
    storageQuota INTEGER NOT NULL DEFAULT 1073741824, -- 1GB 默认配额
    storageUsed INTEGER NOT NULL DEFAULT 0,
    -- 状态字段
    isActive INTEGER NOT NULL DEFAULT 1,
    lastLoginAt INTEGER
);

-- 设备表
CREATE TABLE IF NOT EXISTS devices (
    deviceId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    deviceName TEXT NOT NULL,
    deviceType TEXT NOT NULL CHECK (deviceType IN ('desktop', 'mobile', 'web')),
    platform TEXT,
    version TEXT,
    createdAt INTEGER NOT NULL,
    lastSeenAt INTEGER NOT NULL,
    -- 同步状态
    lastSyncAt INTEGER,
    lastSyncClock INTEGER NOT NULL DEFAULT 0,
    -- 设备配置
    settings TEXT, -- JSON 格式的设备设置
    -- 状态字段
    isActive INTEGER NOT NULL DEFAULT 1,
    
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 事件日志表（核心同步表）
CREATE TABLE IF NOT EXISTS events (
    eventId TEXT PRIMARY KEY,
    serverClock INTEGER UNIQUE NOT NULL,
    deviceId TEXT NOT NULL,
    userId TEXT NOT NULL,
    clientTimestamp INTEGER NOT NULL,
    serverTimestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    eventType TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'restore', 'add_relation', 'remove_relation', 'update_relation', 'reorder')),
    version INTEGER NOT NULL DEFAULT 1,
    -- 事件关系
    causedBy TEXT, -- 引起此事件的事件ID
    batchId TEXT,  -- 批量操作ID
    -- 事件载荷
    payload TEXT NOT NULL, -- JSON 格式的事件数据
    -- 依赖关系（用于冲突解决）
    dependencies TEXT, -- JSON 数组，依赖的事件ID列表
    
    FOREIGN KEY (deviceId) REFERENCES devices(deviceId) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    FOREIGN KEY (causedBy) REFERENCES events(eventId) ON DELETE SET NULL
);

-- 资产元数据表（物化视图，用于快速查询）
CREATE TABLE IF NOT EXISTS asset_meta (
    assetId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    contentHash TEXT NOT NULL,
    fileName TEXT NOT NULL,
    filePath TEXT NOT NULL,
    formats TEXT NOT NULL, -- JSON 数组
    -- 文件元数据
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    fileSize INTEGER NOT NULL,
    mimeType TEXT NOT NULL,
    sourceUrl TEXT,
    -- 缩略图信息
    thumbnailPath TEXT,
    thumbnailSizes TEXT, -- JSON 对象 {small: "path", medium: "path"}
    -- 时间戳
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    -- 软删除
    tombstone INTEGER NOT NULL DEFAULT 0,
    deletedAt INTEGER,
    
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    tagId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    tagName TEXT NOT NULL,
    aliases TEXT, -- JSON 数组
    color TEXT,
    description TEXT,
    createdAt INTEGER NOT NULL,
    
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    UNIQUE(userId, tagName) -- 同一用户下标签名唯一
);

-- 关键词表
CREATE TABLE IF NOT EXISTS keywords (
    keywordId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    keywordText TEXT NOT NULL,
    lang TEXT,
    weight REAL NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    keywordType TEXT NOT NULL DEFAULT 'manual' CHECK (keywordType IN ('manual', 'auto', 'ocr')),
    confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
    createdAt INTEGER NOT NULL,
    
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 资产-标签关联表
CREATE TABLE IF NOT EXISTS asset_tags (
    assetId TEXT NOT NULL,
    tagId TEXT NOT NULL,
    userId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    
    PRIMARY KEY (assetId, tagId),
    FOREIGN KEY (assetId) REFERENCES asset_meta(assetId) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags(tagId) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 资产-关键词关联表
CREATE TABLE IF NOT EXISTS asset_keywords (
    assetId TEXT NOT NULL,
    keywordId TEXT NOT NULL,
    userId TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    createdAt INTEGER NOT NULL,
    
    PRIMARY KEY (assetId, keywordId),
    FOREIGN KEY (assetId) REFERENCES asset_meta(assetId) ON DELETE CASCADE,
    FOREIGN KEY (keywordId) REFERENCES keywords(keywordId) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 集合表
CREATE TABLE IF NOT EXISTS collections (
    collectionId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    collectionName TEXT NOT NULL,
    description TEXT,
    isPublic INTEGER NOT NULL DEFAULT 0,
    shareToken TEXT UNIQUE,
    shareExpiresAt INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    UNIQUE(userId, collectionName) -- 同一用户下集合名唯一
);

-- 资产-集合关联表
CREATE TABLE IF NOT EXISTS asset_collections (
    assetId TEXT NOT NULL,
    collectionId TEXT NOT NULL,
    userId TEXT NOT NULL,
    displayOrder INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    
    PRIMARY KEY (assetId, collectionId),
    FOREIGN KEY (assetId) REFERENCES asset_meta(assetId) ON DELETE CASCADE,
    FOREIGN KEY (collectionId) REFERENCES collections(collectionId) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 索引状态表
CREATE TABLE IF NOT EXISTS index_state (
    userId TEXT PRIMARY KEY,
    lastIndexClock INTEGER NOT NULL DEFAULT 0,
    lastIndexAt INTEGER,
    indexVersion INTEGER NOT NULL DEFAULT 1,
    -- 索引统计
    totalAssets INTEGER NOT NULL DEFAULT 0,
    totalTags INTEGER NOT NULL DEFAULT 0,
    totalKeywords INTEGER NOT NULL DEFAULT 0,
    -- 更新时间
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),

    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 同步状态表
CREATE TABLE IF NOT EXISTS sync_state (
    userId TEXT PRIMARY KEY,
    lastServerClock INTEGER NOT NULL DEFAULT 0,
    lastSnapshotClock INTEGER NOT NULL DEFAULT 0,
    lastSnapshotAt INTEGER,
    -- 同步统计
    totalEvents INTEGER NOT NULL DEFAULT 0,
    totalAssets INTEGER NOT NULL DEFAULT 0,
    -- 更新时间
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- 快照表
CREATE TABLE IF NOT EXISTS snapshots (
    snapshotId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    snapshotClock INTEGER NOT NULL,
    r2Key TEXT NOT NULL, -- R2 存储键
    fileSize INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    compression TEXT NOT NULL DEFAULT 'gzip',
    includeAssets INTEGER NOT NULL DEFAULT 1,
    -- 元数据统计
    assetsCount INTEGER NOT NULL DEFAULT 0,
    tagsCount INTEGER NOT NULL DEFAULT 0,
    keywordsCount INTEGER NOT NULL DEFAULT 0,
    eventsCount INTEGER NOT NULL DEFAULT 0,
    -- 时间戳
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL,
    -- 状态
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- ================================
-- 索引创建
-- ================================

-- 事件表索引（核心性能）
CREATE INDEX IF NOT EXISTS idx_events_server_clock ON events(serverClock);
CREATE INDEX IF NOT EXISTS idx_events_user_clock ON events(userId, serverClock);
CREATE INDEX IF NOT EXISTS idx_events_device_clock ON events(deviceId, serverClock);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(eventType);
CREATE INDEX IF NOT EXISTS idx_events_batch ON events(batchId) WHERE batchId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(serverTimestamp);

-- 设备表索引
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(userId);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(lastSeenAt);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(isActive) WHERE isActive = 1;

-- 资产表索引
CREATE INDEX IF NOT EXISTS idx_asset_meta_user ON asset_meta(userId);
CREATE INDEX IF NOT EXISTS idx_asset_meta_hash ON asset_meta(contentHash);
CREATE INDEX IF NOT EXISTS idx_asset_meta_created ON asset_meta(createdAt);
CREATE INDEX IF NOT EXISTS idx_asset_meta_updated ON asset_meta(updatedAt);
CREATE INDEX IF NOT EXISTS idx_asset_meta_tombstone ON asset_meta(tombstone) WHERE tombstone = 0;
CREATE INDEX IF NOT EXISTS idx_asset_meta_mime ON asset_meta(mimeType);

-- 标签表索引
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(userId);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tagName);

-- 关键词表索引
CREATE INDEX IF NOT EXISTS idx_keywords_user ON keywords(userId);
CREATE INDEX IF NOT EXISTS idx_keywords_text ON keywords(keywordText);
CREATE INDEX IF NOT EXISTS idx_keywords_type ON keywords(keywordType);

-- 关联表索引
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(assetId);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tagId);
CREATE INDEX IF NOT EXISTS idx_asset_tags_user ON asset_tags(userId);

CREATE INDEX IF NOT EXISTS idx_asset_keywords_asset ON asset_keywords(assetId);
CREATE INDEX IF NOT EXISTS idx_asset_keywords_keyword ON asset_keywords(keywordId);
CREATE INDEX IF NOT EXISTS idx_asset_keywords_user ON asset_keywords(userId);

-- 集合表索引
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(userId);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(isPublic) WHERE isPublic = 1;
CREATE INDEX IF NOT EXISTS idx_collections_share_token ON collections(shareToken) WHERE shareToken IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asset_collections_asset ON asset_collections(assetId);
CREATE INDEX IF NOT EXISTS idx_asset_collections_collection ON asset_collections(collectionId);
CREATE INDEX IF NOT EXISTS idx_asset_collections_order ON asset_collections(collectionId, displayOrder);

-- 快照表索引
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON snapshots(userId);
CREATE INDEX IF NOT EXISTS idx_snapshots_clock ON snapshots(snapshotClock);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(createdAt);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON snapshots(status);

-- ================================
-- 触发器（自动更新时间戳）
-- ================================

-- 用户表更新时间戳触发器
CREATE TRIGGER IF NOT EXISTS trigger_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updatedAt = strftime('%s', 'now') * 1000 WHERE userId = NEW.userId;
END;

-- 集合表更新时间戳触发器
CREATE TRIGGER IF NOT EXISTS trigger_collections_updated_at
    AFTER UPDATE ON collections
    FOR EACH ROW
BEGIN
    UPDATE collections SET updatedAt = strftime('%s', 'now') * 1000 WHERE collectionId = NEW.collectionId;
END;

-- 同步状态表更新时间戳触发器
CREATE TRIGGER IF NOT EXISTS trigger_sync_state_updated_at
    AFTER UPDATE ON sync_state
    FOR EACH ROW
BEGIN
    UPDATE sync_state SET updatedAt = strftime('%s', 'now') * 1000 WHERE userId = NEW.userId;
END;

-- ================================
-- 视图（便于查询）
-- ================================

-- 活跃设备视图
CREATE VIEW IF NOT EXISTS active_devices AS
SELECT 
    d.*,
    u.plan as userPlan
FROM devices d
JOIN users u ON d.userId = u.userId
WHERE d.isActive = 1 AND u.isActive = 1;

-- 资产详情视图（包含标签和关键词）
CREATE VIEW IF NOT EXISTS asset_details AS
SELECT 
    a.*,
    GROUP_CONCAT(DISTINCT t.tagName) as tagNames,
    GROUP_CONCAT(DISTINCT k.keywordText) as keywordTexts,
    COUNT(DISTINCT at.tagId) as tagCount,
    COUNT(DISTINCT ak.keywordId) as keywordCount
FROM asset_meta a
LEFT JOIN asset_tags at ON a.assetId = at.assetId
LEFT JOIN tags t ON at.tagId = t.tagId
LEFT JOIN asset_keywords ak ON a.assetId = ak.assetId
LEFT JOIN keywords k ON ak.keywordId = k.keywordId
WHERE a.tombstone = 0
GROUP BY a.assetId;

-- 用户统计视图
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    u.userId,
    u.plan,
    u.storageQuota,
    u.storageUsed,
    COUNT(DISTINCT d.deviceId) as deviceCount,
    COUNT(DISTINCT a.assetId) as assetCount,
    COUNT(DISTINCT t.tagId) as tagCount,
    COUNT(DISTINCT k.keywordId) as keywordCount,
    COUNT(DISTINCT c.collectionId) as collectionCount,
    ss.lastServerClock,
    ss.totalEvents
FROM users u
LEFT JOIN devices d ON u.userId = d.userId AND d.isActive = 1
LEFT JOIN asset_meta a ON u.userId = a.userId AND a.tombstone = 0
LEFT JOIN tags t ON u.userId = t.userId
LEFT JOIN keywords k ON u.userId = k.userId
LEFT JOIN collections c ON u.userId = c.userId
LEFT JOIN sync_state ss ON u.userId = ss.userId
WHERE u.isActive = 1
GROUP BY u.userId;
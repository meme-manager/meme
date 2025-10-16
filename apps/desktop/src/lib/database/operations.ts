/**
 * 数据库CRUD操作
 */

import type { Asset, Tag, Keyword, Collection } from '../../types/asset';
import { getDatabase, generateUUID, now } from './index';

// ============================================================
// 资产操作
// ============================================================

/**
 * 创建资产
 */
export async function createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<Asset> {
  const db = await getDatabase();
  const id = generateUUID();
  const timestamp = now();
  
  const newAsset: Asset = {
    ...asset,
    id,
    created_at: timestamp,
    updated_at: timestamp,
  };
  
  await db.execute(
    `INSERT INTO assets (
      id, content_hash, file_name, file_path, mime_type, file_size,
      width, height, source_url, source_platform,
      thumb_small, thumb_medium, thumb_large,
      created_at, updated_at, last_used_at, use_count,
      synced, cloud_url, deleted, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newAsset.id,
      newAsset.content_hash,
      newAsset.file_name,
      newAsset.file_path,
      newAsset.mime_type,
      newAsset.file_size,
      newAsset.width,
      newAsset.height,
      newAsset.source_url,
      newAsset.source_platform,
      newAsset.thumb_small,
      newAsset.thumb_medium,
      newAsset.thumb_large,
      newAsset.created_at,
      newAsset.updated_at,
      newAsset.last_used_at,
      newAsset.use_count,
      newAsset.synced,
      newAsset.cloud_url,
      newAsset.deleted,
      newAsset.deleted_at,
    ]
  );
  
  return newAsset;
}

/**
 * 根据ID获取资产
 */
export async function getAssetById(id: string): Promise<Asset | null> {
  const db = await getDatabase();
  const results = await db.select<Array<Asset>>(
    'SELECT * FROM assets WHERE id = ? AND deleted = 0',
    [id]
  );
  return results[0] || null;
}

/**
 * 根据哈希获取资产（用于去重）
 */
export async function getAssetByHash(hash: string): Promise<Asset | null> {
  const db = await getDatabase();
  const results = await db.select<Array<Asset>>(
    'SELECT * FROM assets WHERE content_hash = ? AND deleted = 0',
    [hash]
  );
  return results[0] || null;
}

/**
 * 获取所有资产
 */
export async function listAssets(options?: {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'last_used_at' | 'use_count';
  sortOrder?: 'ASC' | 'DESC';
}): Promise<Asset[]> {
  const db = await getDatabase();
  const {
    limit = 50,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = options || {};
  
  return await db.select<Array<Asset>>(
    `SELECT * FROM assets 
     WHERE deleted = 0 
     ORDER BY ${sortBy} ${sortOrder} 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

/**
 * 更新资产
 */
export async function updateAsset(id: string, updates: Partial<Asset>): Promise<boolean> {
  const db = await getDatabase();
  const fields = Object.keys(updates).filter(k => k !== 'id');
  
  if (fields.length === 0) {
    return false;
  }
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f as keyof Asset]);
  
  await db.execute(
    `UPDATE assets SET ${setClause}, updated_at = ? WHERE id = ?`,
    [...values, now(), id]
  );
  
  return true;
}

/**
 * 软删除资产
 */
export async function deleteAsset(id: string): Promise<boolean> {
  const db = await getDatabase();
  const timestamp = now();
  
  await db.execute(
    'UPDATE assets SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?',
    [timestamp, timestamp, id]
  );
  
  return true;
}

/**
 * 增加使用次数
 */
export async function incrementUseCount(id: string): Promise<void> {
  const db = await getDatabase();
  const timestamp = now();
  
  await db.execute(
    'UPDATE assets SET use_count = use_count + 1, last_used_at = ? WHERE id = ?',
    [timestamp, id]
  );
}

/**
 * 获取自指定时间以来修改的资产（用于同步）
 */
export async function getAssetsModifiedSince(timestamp: number): Promise<Asset[]> {
  const db = await getDatabase();
  const assets = await db.select<Array<Asset>>(
    'SELECT * FROM assets WHERE updated_at > ? ORDER BY updated_at ASC',
    [timestamp]
  );
  
  console.log(`[Database] 查询到 ${assets.length} 个修改的资产`);
  
  // 检查第一个资产的 undefined 字段
  if (assets.length > 0) {
    const firstAsset = assets[0];
    const undefinedFields: string[] = [];
    for (const [key, value] of Object.entries(firstAsset)) {
      if (value === undefined) {
        undefinedFields.push(key);
      }
    }
    if (undefinedFields.length > 0) {
      console.warn(`[Database] 查询结果有 undefined 字段:`, undefinedFields);
      console.log(`[Database] 示例资产:`, firstAsset);
    }
  }
  
  // Tauri SQL 插件会将 SQLite 的 NULL 转换为 undefined
  // 需要规范化为 null
  return assets.map(asset => normalizeAsset(asset));
}

/**
 * 规范化资产对象（将 undefined 转为 null）
 */
function normalizeAsset(asset: any): Asset {
  const normalized: any = {};
  for (const [key, value] of Object.entries(asset)) {
    normalized[key] = value === undefined ? null : value;
  }
  return normalized as Asset;
}

/**
 * 获取所有未同步的资产
 */
export async function getUnsyncedAssets(): Promise<Asset[]> {
  const db = await getDatabase();
  const assets = await db.select<Array<Asset>>(
    'SELECT * FROM assets WHERE synced = 0 AND deleted = 0 ORDER BY created_at ASC'
  );
  return assets.map(asset => normalizeAsset(asset));
}

// ============================================================
// 标签操作
// ============================================================

/**
 * 创建标签
 */
export async function createTag(tag: Omit<Tag, 'id' | 'created_at' | 'updated_at' | 'use_count'>): Promise<Tag> {
  const db = await getDatabase();
  const id = generateUUID();
  const timestamp = now();
  
  const newTag: Tag = {
    ...tag,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    use_count: 0,
  };
  
  await db.execute(
    `INSERT INTO tags (id, name, color, description, icon, created_at, updated_at, use_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newTag.id,
      newTag.name,
      newTag.color,
      newTag.description,
      newTag.icon,
      newTag.created_at,
      newTag.updated_at,
      newTag.use_count,
    ]
  );
  
  return newTag;
}

/**
 * 获取或创建标签
 */
export async function getOrCreateTag(name: string): Promise<Tag> {
  const db = await getDatabase();
  
  // 先查找
  const existing = await db.select<Array<Tag>>(
    'SELECT * FROM tags WHERE name = ?',
    [name]
  );
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // 不存在则创建
  return await createTag({ name, color: null, description: null, icon: null });
}

/**
 * 获取所有标签
 */
export async function listTags(): Promise<Tag[]> {
  const db = await getDatabase();
  return await db.select<Array<Tag>>(
    'SELECT * FROM tags ORDER BY name ASC'
  );
}

/**
 * 删除标签
 */
export async function deleteTag(id: string): Promise<boolean> {
  const db = await getDatabase();
  await db.execute('DELETE FROM tags WHERE id = ?', [id]);
  return true;
}

/**
 * 获取自指定时间以来修改的标签（用于同步）
 */
export async function getTagsModifiedSince(timestamp: number): Promise<Tag[]> {
  const db = await getDatabase();
  return await db.select<Array<Tag>>(
    'SELECT * FROM tags WHERE updated_at > ? ORDER BY updated_at ASC',
    [timestamp]
  );
}

// ============================================================
// 关键词操作
// ============================================================

/**
 * 创建关键词
 */
export async function createKeyword(keyword: Omit<Keyword, 'id' | 'created_at'>): Promise<Keyword> {
  const db = await getDatabase();
  const id = generateUUID();
  const timestamp = now();
  
  const newKeyword: Keyword = {
    ...keyword,
    id,
    created_at: timestamp,
  };
  
  await db.execute(
    `INSERT INTO keywords (id, text, lang, type, weight, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      newKeyword.id,
      newKeyword.text,
      newKeyword.lang,
      newKeyword.type,
      newKeyword.weight,
      newKeyword.created_at,
    ]
  );
  
  return newKeyword;
}

/**
 * 获取或创建关键词
 */
export async function getOrCreateKeyword(text: string): Promise<Keyword> {
  const db = await getDatabase();
  
  const existing = await db.select<Array<Keyword>>(
    'SELECT * FROM keywords WHERE text = ?',
    [text]
  );
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  return await createKeyword({
    text,
    lang: 'zh',
    type: 'manual',
    weight: 1.0,
  });
}

// ============================================================
// 集合操作
// ============================================================

/**
 * 创建集合
 */
export async function createCollection(
  collection: Omit<Collection, 'id' | 'created_at' | 'updated_at' | 'asset_count' | 'is_shared' | 'share_token' | 'share_expires_at'>
): Promise<Collection> {
  const db = await getDatabase();
  const id = generateUUID();
  const timestamp = now();
  
  const newCollection: Collection = {
    ...collection,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    asset_count: 0,
    is_shared: 0,
    share_token: null,
    share_expires_at: null,
  };
  
  await db.execute(
    `INSERT INTO collections (id, name, description, icon, color, created_at, updated_at, asset_count, is_shared, share_token, share_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newCollection.id,
      newCollection.name,
      newCollection.description,
      newCollection.icon,
      newCollection.color,
      newCollection.created_at,
      newCollection.updated_at,
      newCollection.asset_count,
      newCollection.is_shared,
      newCollection.share_token,
      newCollection.share_expires_at,
    ]
  );
  
  return newCollection;
}

/**
 * 获取所有集合
 */
export async function listCollections(): Promise<Collection[]> {
  const db = await getDatabase();
  return await db.select<Array<Collection>>(
    'SELECT * FROM collections ORDER BY name ASC'
  );
}

// ============================================================
// 关联操作
// ============================================================

/**
 * 添加资产标签关联
 */
export async function addAssetTag(assetId: string, tagId: string): Promise<void> {
  const db = await getDatabase();
  const timestamp = now();
  
  await db.execute(
    'INSERT OR IGNORE INTO asset_tags (asset_id, tag_id, created_at) VALUES (?, ?, ?)',
    [assetId, tagId, timestamp]
  );
}

/**
 * 移除资产标签关联
 */
export async function removeAssetTag(assetId: string, tagId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?',
    [assetId, tagId]
  );
}

/**
 * 获取资产的所有标签
 */
export async function getAssetTags(assetId: string): Promise<Tag[]> {
  const db = await getDatabase();
  return await db.select<Array<Tag>>(
    `SELECT t.* FROM tags t
     JOIN asset_tags at ON t.id = at.tag_id
     WHERE at.asset_id = ?
     ORDER BY t.name ASC`,
    [assetId]
  );
}

/**
 * 添加资产关键词关联
 */
export async function addAssetKeyword(assetId: string, keywordId: string, weight: number = 1.0): Promise<void> {
  const db = await getDatabase();
  const timestamp = now();
  
  await db.execute(
    'INSERT OR IGNORE INTO asset_keywords (asset_id, keyword_id, weight, created_at) VALUES (?, ?, ?, ?)',
    [assetId, keywordId, weight, timestamp]
  );
}

/**
 * 获取资产的所有关键词
 */
export async function getAssetKeywords(assetId: string): Promise<Keyword[]> {
  const db = await getDatabase();
  return await db.select<Array<Keyword>>(
    `SELECT k.* FROM keywords k
     JOIN asset_keywords ak ON k.id = ak.keyword_id
     WHERE ak.asset_id = ?
     ORDER BY ak.weight DESC, k.text ASC`,
    [assetId]
  );
}

/**
 * 添加资产到集合
 */
export async function addAssetToCollection(assetId: string, collectionId: string, displayOrder: number = 0): Promise<void> {
  const db = await getDatabase();
  const timestamp = now();
  
  await db.execute(
    'INSERT OR IGNORE INTO asset_collections (asset_id, collection_id, display_order, created_at) VALUES (?, ?, ?, ?)',
    [assetId, collectionId, displayOrder, timestamp]
  );
  
  // 更新集合的资产计数
  await db.execute(
    'UPDATE collections SET asset_count = (SELECT COUNT(*) FROM asset_collections WHERE collection_id = ?) WHERE id = ?',
    [collectionId, collectionId]
  );
}

/**
 * 从集合移除资产
 */
export async function removeAssetFromCollection(assetId: string, collectionId: string): Promise<void> {
  const db = await getDatabase();
  
  await db.execute(
    'DELETE FROM asset_collections WHERE asset_id = ? AND collection_id = ?',
    [assetId, collectionId]
  );
  
  // 更新集合的资产计数
  await db.execute(
    'UPDATE collections SET asset_count = (SELECT COUNT(*) FROM asset_collections WHERE collection_id = ?) WHERE id = ?',
    [collectionId, collectionId]
  );
}

/**
 * 获取自指定时间以来的资产-标签关联（用于同步）
 */
export async function getAssetTagsModifiedSince(timestamp: number): Promise<Array<{ asset_id: string; tag_id: string; created_at: number }>> {
  const db = await getDatabase();
  return await db.select<Array<{ asset_id: string; tag_id: string; created_at: number }>>(
    'SELECT asset_id, tag_id, created_at FROM asset_tags WHERE created_at > ? ORDER BY created_at ASC',
    [timestamp]
  );
}

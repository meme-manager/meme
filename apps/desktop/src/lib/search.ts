/**
 * 搜索引擎实现
 * 参考: ARCHITECTURE_search.md
 */

import { getDatabase } from './database';
import type { Asset } from '../types/asset';
import type { SearchOptions, SearchResult } from '../types/search';

/**
 * 搜索资产
 */
export async function searchAssets(options: SearchOptions): Promise<SearchResult> {
  const startTime = Date.now();
  const db = await getDatabase();
  
  const {
    query = '',
    filters = {},
    sort = 'relevance',
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
  } = options;
  
  let sql = 'SELECT * FROM assets WHERE deleted = 0';
  const params: any[] = [];
  
  // 全文搜索
  if (query.trim()) {
    sql = `
      SELECT a.*, 
             bm25(assets_fts) as rank
      FROM assets a
      JOIN assets_fts ON assets_fts.asset_id = a.id
      WHERE assets_fts MATCH ?
        AND a.deleted = 0
    `;
    params.push(query);
  }
  
  // 应用筛选器
  if (filters.mimeTypes && filters.mimeTypes.length > 0) {
    const placeholders = filters.mimeTypes.map(() => '?').join(',');
    sql += ` AND mime_type IN (${placeholders})`;
    params.push(...filters.mimeTypes);
  }
  
  if (filters.tags && filters.tags.length > 0) {
    const placeholders = filters.tags.map(() => '?').join(',');
    sql += ` AND id IN (
      SELECT asset_id FROM asset_tags 
      WHERE tag_id IN (
        SELECT id FROM tags WHERE name IN (${placeholders})
      )
    )`;
    params.push(...filters.tags);
  }
  
  if (filters.collections && filters.collections.length > 0) {
    const placeholders = filters.collections.map(() => '?').join(',');
    sql += ` AND id IN (
      SELECT asset_id FROM asset_collections 
      WHERE collection_id IN (
        SELECT id FROM collections WHERE name IN (${placeholders})
      )
    )`;
    params.push(...filters.collections);
  }
  
  if (filters.sizeRange) {
    const [minSize, maxSize] = filters.sizeRange;
    sql += ` AND file_size BETWEEN ? AND ?`;
    params.push(minSize, maxSize);
  }
  
  if (filters.dimensionRange) {
    const { minWidth, minHeight, maxWidth, maxHeight } = filters.dimensionRange;
    if (minWidth) {
      sql += ` AND width >= ?`;
      params.push(minWidth);
    }
    if (minHeight) {
      sql += ` AND height >= ?`;
      params.push(minHeight);
    }
    if (maxWidth) {
      sql += ` AND width <= ?`;
      params.push(maxWidth);
    }
    if (maxHeight) {
      sql += ` AND height <= ?`;
      params.push(maxHeight);
    }
  }
  
  if (filters.dateRange) {
    const [startDate, endDate] = filters.dateRange;
    sql += ` AND created_at BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }
  
  if (filters.hasSource !== undefined) {
    if (filters.hasSource) {
      sql += ` AND source_url IS NOT NULL`;
    } else {
      sql += ` AND source_url IS NULL`;
    }
  }
  
  // 排序
  let orderBy = '';
  switch (sort) {
    case 'relevance':
      orderBy = query.trim() ? 'rank ASC' : 'created_at DESC';
      break;
    case 'created_at':
      orderBy = `created_at ${sortOrder.toUpperCase()}`;
      break;
    case 'last_used':
      orderBy = `last_used_at ${sortOrder.toUpperCase()} NULLS LAST`;
      break;
    case 'use_count':
      orderBy = `use_count ${sortOrder.toUpperCase()}`;
      break;
    case 'file_size':
      orderBy = `file_size ${sortOrder.toUpperCase()}`;
      break;
    default:
      orderBy = 'created_at DESC';
  }
  
  sql += ` ORDER BY ${orderBy}`;
  
  // 分页
  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  // 执行查询
  const assets = await db.select<Array<Asset>>(sql, params);
  
  // 获取总数
  let countSql = sql.split('ORDER BY')[0].replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
  const countParams = params.slice(0, -2); // 移除 limit 和 offset
  const countResult = await db.select<Array<{ total: number }>>(countSql, countParams);
  const total = countResult[0]?.total || 0;
  
  const took = Date.now() - startTime;
  
  return {
    assets,
    total,
    hasMore: offset + assets.length < total,
    took,
  };
}

/**
 * 更新FTS索引
 */
export async function updateFTSIndex(assetId: string, data: {
  fileName?: string;
  keywords?: string[];
  tags?: string[];
}): Promise<void> {
  const db = await getDatabase();
  
  const { fileName = '', keywords = [], tags = [] } = data;
  
  // 简单的拼音转换（实际应该使用 pinyin-pro 库）
  const keywordsPinyin = keywords.join(' ');
  const tagsPinyin = tags.join(' ');
  
  await db.execute(
    `INSERT OR REPLACE INTO assets_fts (asset_id, file_name, keywords, keywords_pinyin, tags, tags_pinyin)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      assetId,
      fileName,
      keywords.join(' '),
      keywordsPinyin,
      tags.join(' '),
      tagsPinyin,
    ]
  );
}

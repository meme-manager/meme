/**
 * 搜索引擎实现
 * 参考: ARCHITECTURE_search.md
 */

import { pinyin } from 'pinyin-pro';
import type { Asset } from '../types/asset';
import { listAssets } from './database/operations';

export interface SearchFilters {
  tags?: string[];
  collections?: string[];
  mimeTypes?: string[];
  sizeRange?: [number, number];
  dateRange?: [number, number];
}

export interface SearchResult {
  assets: Asset[];
  total: number;
  took: number;
}

/**
 * 搜索资产（简化版，支持拼音）
 */
export async function searchAssets(
  query: string,
  filters?: SearchFilters
): Promise<SearchResult> {
  const startTime = Date.now();
  
  // 获取所有资产
  const allAssets = await listAssets();
  
  let results = allAssets;
  
  // 如果有查询关键词，进行搜索
  if (query.trim()) {
    const searchTerm = query.toLowerCase();
    // 转换为拼音
    const searchPinyin = pinyin(query, { toneType: 'none', type: 'array' }).join('');
    
    results = allAssets.filter(asset => {
      const fileName = asset.file_name.toLowerCase();
      const filePinyin = pinyin(asset.file_name, { toneType: 'none', type: 'array' }).join('');
      
      // 匹配文件名或拼音
      return fileName.includes(searchTerm) || 
             filePinyin.includes(searchPinyin) ||
             filePinyin.includes(searchTerm);
    });
  }
  
  // 应用筛选器
  if (filters?.tags && filters.tags.length > 0) {
    // TODO: 实现标签筛选
  }
  
  if (filters?.mimeTypes && filters.mimeTypes.length > 0) {
    results = results.filter(asset => 
      filters.mimeTypes!.includes(asset.mime_type)
    );
  }
  
  if (filters?.sizeRange) {
    const [minSize, maxSize] = filters.sizeRange;
    results = results.filter(asset => 
      asset.file_size >= minSize && asset.file_size <= maxSize
    );
  }
  
  if (filters?.dateRange) {
    const [startDate, endDate] = filters.dateRange;
    results = results.filter(asset => 
      asset.created_at >= startDate && asset.created_at <= endDate
    );
  }
  
  const took = Date.now() - startTime;
  
  return {
    assets: results,
    total: results.length,
    took,
  };
}

/**
 * 转换文本为拼音（用于搜索）
 */
export function toPinyin(text: string): string {
  return pinyin(text, { toneType: 'none', type: 'array' }).join('');
}

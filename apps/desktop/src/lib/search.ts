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

export interface AssetSearchMatch {
  asset: Asset;
  matchType: 'filename' | 'tag' | 'both';
  matchedTags?: string[]; // 匹配的标签名称
  score: number; // 相关度分数，越高越相关
}

export interface SearchResult {
  assets: Asset[];
  matches: AssetSearchMatch[]; // 带匹配信息的结果
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
  
  // 存储匹配信息
  let matches: AssetSearchMatch[] = [];
  
  // 如果有查询关键词，进行搜索
  if (query.trim()) {
    const searchTerm = query.toLowerCase();
    // 转换为拼音
    const searchPinyin = pinyin(query, { toneType: 'none', type: 'array' }).join('');
    
    // 导入标签相关函数
    const { getAssetTags } = await import('./database/operations');
    
    // 并行获取所有资产的标签
    const assetTagsMap = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
    await Promise.all(
      allAssets.map(async (asset) => {
        const tags = await getAssetTags(asset.id);
        assetTagsMap.set(asset.id, tags);
      })
    );
    
    // 计算每个资产的匹配信息和分数
    const matchedAssets: AssetSearchMatch[] = [];
    
    for (const asset of allAssets) {
      const fileName = asset.file_name.toLowerCase();
      const filePinyin = pinyin(asset.file_name, { toneType: 'none', type: 'array' }).join('');
      
      // 匹配文件名或拼音
      const matchesFileName = fileName.includes(searchTerm) || 
                             filePinyin.includes(searchPinyin) ||
                             filePinyin.includes(searchTerm);
      
      // 匹配标签名称或拼音
      const assetTags = assetTagsMap.get(asset.id) || [];
      const matchedTags: string[] = [];
      
      for (const tag of assetTags) {
        const tagName = tag.name.toLowerCase();
        const tagPinyin = pinyin(tag.name, { toneType: 'none', type: 'array' }).join('');
        if (tagName.includes(searchTerm) || 
            tagPinyin.includes(searchPinyin) ||
            tagPinyin.includes(searchTerm)) {
          matchedTags.push(tag.name);
        }
      }
      
      const matchesTag = matchedTags.length > 0;
      
      if (matchesFileName || matchesTag) {
        // 计算相关度分数
        let score = 0;
        
        // 文件名完全匹配：100分
        if (fileName === searchTerm) score += 100;
        // 文件名开头匹配：50分
        else if (fileName.startsWith(searchTerm)) score += 50;
        // 文件名包含：20分
        else if (matchesFileName) score += 20;
        
        // 标签完全匹配：80分
        if (matchedTags.some(t => t.toLowerCase() === searchTerm)) score += 80;
        // 标签包含：每个匹配的标签 +15分
        else score += matchedTags.length * 15;
        
        // 使用次数加成
        score += Math.min(asset.use_count * 2, 20);
        
        matchedAssets.push({
          asset,
          matchType: matchesFileName && matchesTag ? 'both' : matchesFileName ? 'filename' : 'tag',
          matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
          score,
        });
      }
    }
    
    // 按分数排序
    matchedAssets.sort((a, b) => b.score - a.score);
    matches = matchedAssets;
    results = matchedAssets.map(m => m.asset);
  }
  
  // 应用筛选器
  if (filters?.tags && filters.tags.length > 0) {
    const { getAssetTags } = await import('./database/operations');
    const tagFilteredAssets: Asset[] = [];
    
    for (const asset of results) {
      const assetTags = await getAssetTags(asset.id);
      const assetTagIds = assetTags.map(t => t.id);
      const hasMatchingTag = filters.tags.some(tagId => assetTagIds.includes(tagId));
      if (hasMatchingTag) {
        tagFilteredAssets.push(asset);
      }
    }
    
    results = tagFilteredAssets;
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
    matches,
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

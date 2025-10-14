/**
 * 搜索相关类型定义
 * 参考: ARCHITECTURE_search.md
 */

import type { Asset } from './asset';

export interface SearchOptions {
  query: string;                      // 搜索关键词
  filters?: {
    mimeTypes?: string[];            // 文件类型过滤
    tags?: string[];                 // 标签过滤
    collections?: string[];          // 集合过滤
    sizeRange?: [number, number];    // 文件大小范围
    dimensionRange?: {               // 尺寸范围
      minWidth?: number;
      minHeight?: number;
      maxWidth?: number;
      maxHeight?: number;
    };
    dateRange?: [number, number];    // 创建时间范围
    hasSource?: boolean;             // 是否有来源URL
  };
  sort?: 'relevance' | 'created_at' | 'last_used' | 'use_count' | 'file_size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  assets: Asset[];
  total: number;
  hasMore: boolean;
  took: number;                       // 搜索耗时（毫秒）
}

export interface SearchFilter {
  type: 'mimeType' | 'tag' | 'collection' | 'size' | 'date';
  label: string;
  value: string | number | [number, number];
  active: boolean;
}

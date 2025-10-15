/**
 * 资产管理器 - 导入功能实现
 * 参考: ARCHITECTURE_import.md
 */

import { invoke } from '@tauri-apps/api/core';
import type { CreateAssetRequest, ImportResult } from '../types/asset';
import {
  createAsset,
  getAssetByHash,
  addAssetTag,
  addAssetKeyword,
  addAssetToCollection,
  getOrCreateTag,
  getOrCreateKeyword,
} from './database/operations';

/**
 * 计算文件哈希（SHA-256）
 */
async function calculateHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 读取图片元数据
 */
async function readImageMetadata(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片'));
    };
    
    img.src = url;
  });
}

/**
 * 导入单个资产
 */
export async function importAsset(request: CreateAssetRequest): Promise<ImportResult> {
  try {
    const { file, source_url, source_platform = 'file', tags = [], keywords = [], collection_id } = request;
    
    // 1. 计算文件哈希
    const hash = await calculateHash(file);
    
    // 2. 检查是否已存在
    const existing = await getAssetByHash(hash);
    if (existing) {
      // 如果指定了集合，添加到集合
      if (collection_id) {
        await addAssetToCollection(existing.id, collection_id);
      }
      
      return {
        success: true,
        asset: existing,
        is_duplicate: true,
      };
    }
    
    // 3. 读取图片元数据
    const metadata = await readImageMetadata(file);
    
    // 4. 保存文件到本地（调用Tauri后端）
    const fileData = await file.arrayBuffer();
    const filePath = await invoke<string>('save_asset_file', {
      fileData: Array.from(new Uint8Array(fileData)),
      fileName: file.name,
      hash,
    });
    
    // 5. 生成缩略图
    const thumbnails = await invoke<Record<string, string>>('generate_thumbnails', {
      sourcePath: filePath,
      sizes: {
        small: 128,
        medium: 256,
        large: 512,
      },
    });
    
    // 6. 创建资产记录
    const asset = await createAsset({
      content_hash: hash,
      file_name: file.name,
      file_path: filePath,
      mime_type: file.type,
      file_size: file.size,
      width: metadata.width,
      height: metadata.height,
      source_url: source_url || null,
      source_platform,
      thumb_small: thumbnails.small || null,
      thumb_medium: thumbnails.medium || null,
      thumb_large: thumbnails.large || null,
      last_used_at: null,
      use_count: 0,
      is_favorite: 0,
      favorited_at: null,
      synced: 0,
      cloud_url: null,
      r2_key: null,
      thumb_r2_key: null,
      deleted: 0,
      deleted_at: null,
    });
    
    // 7. 添加标签
    for (const tagName of tags) {
      const tag = await getOrCreateTag(tagName);
      await addAssetTag(asset.id, tag.id);
    }
    
    // 8. 添加关键词
    for (const keywordText of keywords) {
      const keyword = await getOrCreateKeyword(keywordText);
      await addAssetKeyword(asset.id, keyword.id);
    }
    
    // 9. 添加到集合
    if (collection_id) {
      await addAssetToCollection(asset.id, collection_id);
    }
    
    return {
      success: true,
      asset,
      is_duplicate: false,
    };
    
  } catch (error) {
    console.error('Import asset failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 批量导入资产
 */
export async function importAssets(
  files: File[],
  options?: {
    source_platform?: 'drag' | 'url' | 'clipboard' | 'file';
    tags?: string[];
    keywords?: string[];
    collection_id?: string;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await importAsset({
      file: files[i],
      source_platform: options?.source_platform,
      tags: options?.tags,
      keywords: options?.keywords,
      collection_id: options?.collection_id,
    });
    
    results.push(result);
    
    if (options?.onProgress) {
      options.onProgress(i + 1, files.length);
    }
  }
  
  return results;
}

/**
 * 从URL导入
 */
export async function importFromUrl(
  url: string,
  _options?: {
    tags?: string[];
    keywords?: string[];
    collection_id?: string;
  }
): Promise<ImportResult> {
  try {
    // 调用Tauri后端下载
    await invoke<string>('import_from_url', { url });
    
    // TODO: 需要实现从本地路径读取文件并创建资产记录的逻辑
    
    return {
      success: true,
    };
    
  } catch (error) {
    console.error('Import from URL failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

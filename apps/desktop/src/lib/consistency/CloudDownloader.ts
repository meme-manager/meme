/**
 * 云端下载器
 */

import type { Asset } from '../../types/asset';
import { apiClient } from '../api/client';
import { getAssetById, updateAsset, listAssets } from '../database/operations';

const LOG_PREFIX = '[CloudDownloader]';

export class CloudDownloader {
  /**
   * 从云端下载资产到本地
   */
  async downloadAsset(asset: Asset): Promise<string> {
    console.log(`${LOG_PREFIX} 下载文件: ${asset.file_name}`);
    
    // 1. 生成本地文件路径
    const localPath = await this.generateLocalPath(asset);
    
    // 2. 从 R2 下载文件
    const fileData = await apiClient.downloadFile(asset.r2_key!);
    
    // 3. 保存到本地
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_file_binary', {
      filePath: localPath,
      data: Array.from(new Uint8Array(fileData))
    });
    
    // 4. 更新本地数据库
    await updateAsset(asset.id, {
      file_path: localPath
    });
    
    console.log(`${LOG_PREFIX} ✅ 下载成功: ${asset.file_name} -> ${localPath}`);
    return localPath;
  }
  
  /**
   * 同步时自动下载缺失的文件
   */
  async downloadMissingAssets(cloudAssets?: Asset[]): Promise<{
    downloaded: number;
    skipped: number;
    failed: number;
  }> {
    if (!cloudAssets) {
      // 如果没有传入，从本地数据库查询云端有但本地缺失的资产
      cloudAssets = await listAssets({ limit: 10000 });
    }
    
    let downloaded = 0, skipped = 0, failed = 0;
    
    console.log(`${LOG_PREFIX} 检查 ${cloudAssets.length} 个资产...`);
    
    for (const cloudAsset of cloudAssets) {
      // 跳过已删除的
      if (cloudAsset.deleted) {
        skipped++;
        continue;
      }
      
      const localAsset = await getAssetById(cloudAsset.id);
      
      if (localAsset && localAsset.file_path) {
        // 本地已有文件路径，检查文件是否存在
        const exists = await this.checkLocalFile(localAsset.file_path);
        if (exists) {
          skipped++;
          continue;
        }
      }
      
      // 下载文件
      if (cloudAsset.r2_key) {
        try {
          await this.downloadAsset(cloudAsset);
          downloaded++;
        } catch (error) {
          failed++;
          console.error(`${LOG_PREFIX} 📥 下载失败: ${cloudAsset.file_name}`, error);
        }
      }
    }
    
    console.log(`${LOG_PREFIX} 下载统计: 成功=${downloaded}, 跳过=${skipped}, 失败=${failed}`);
    return { downloaded, skipped, failed };
  }
  
  /**
   * 检查本地文件是否存在
   */
  private async checkLocalFile(filePath: string): Promise<boolean> {
    if (!filePath) return false;
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('file_exists', { filePath });
    } catch {
      return false;
    }
  }
  
  /**
   * 生成本地存储路径
   */
  private async generateLocalPath(asset: Asset): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    const dataDir = await invoke<string>('get_data_dir');
    const ext = asset.file_name.split('.').pop();
    return `${dataDir}/assets/${asset.content_hash}.${ext}`;
  }
}

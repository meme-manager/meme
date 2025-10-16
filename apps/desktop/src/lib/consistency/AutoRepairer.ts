/**
 * 自动修复器
 */

import type { FileIntegrityCheck } from './types';
import { apiClient } from '../api/client';
import { getAssetById, updateAsset } from '../database/operations';

const LOG_PREFIX = '[AutoRepairer]';

export class AutoRepairer {
  /**
   * 修复丢失的文件
   */
  async repairMissingFiles(issues: FileIntegrityCheck[]): Promise<{
    repaired: number;
    failed: string[];
  }> {
    const repaired: string[] = [];
    const failed: string[] = [];
    
    console.log(`${LOG_PREFIX} 开始修复 ${issues.length} 个文件...`);
    
    for (const issue of issues) {
      if (!issue.needsReupload) {
        // 本地文件也不存在，无法修复
        console.warn(`${LOG_PREFIX} 无法修复 ${issue.assetId}: 本地文件不存在`);
        failed.push(issue.assetId);
        continue;
      }
      
      try {
        const asset = await getAssetById(issue.assetId);
        if (!asset) {
          console.warn(`${LOG_PREFIX} 资产不存在: ${issue.assetId}`);
          failed.push(issue.assetId);
          continue;
        }
        
        console.log(`${LOG_PREFIX} 修复文件: ${asset.file_name}`);
        
        // 重新上传文件
        const fileData = await this.readLocalFile(asset.file_path);
        const result = await apiClient.uploadFile(fileData, {
          fileName: asset.file_name,
          contentType: asset.mime_type,
          contentHash: asset.content_hash
        });
        
        // 更新资产的 R2 信息
        await updateAsset(asset.id, {
          r2_key: result.r2_key,
          thumb_r2_key: result.thumb_r2_key,
          cloud_url: result.r2_url,
          synced: 1
        });
        
        repaired.push(issue.assetId);
        console.log(`${LOG_PREFIX} ✅ 修复成功: ${asset.file_name}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} ❌ 修复失败: ${issue.assetId}`, error);
        failed.push(issue.assetId);
      }
    }
    
    console.log(`${LOG_PREFIX} 修复完成: 成功 ${repaired.length}, 失败 ${failed.length}`);
    return { repaired: repaired.length, failed };
  }
  
  /**
   * 读取本地文件
   */
  private async readLocalFile(filePath: string): Promise<ArrayBuffer> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<number[]>('read_file_binary', { filePath });
      return new Uint8Array(data).buffer;
    } catch (error) {
      console.error(`${LOG_PREFIX} 读取文件失败: ${filePath}`, error);
      throw error;
    }
  }
}

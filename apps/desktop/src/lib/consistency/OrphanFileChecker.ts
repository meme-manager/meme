/**
 * R2 孤儿文件检查器
 * 检查 R2 中存在但数据库中没有记录的文件
 */

import { apiClient } from '../api/client';

const LOG_PREFIX = '[OrphanFileChecker]';

export interface OrphanFile {
  r2_key: string;
  size: number;
  uploaded: Date;
}

export interface OrphanCheckResult {
  orphans: OrphanFile[];
  summary: {
    total_r2_files: number;
    total_d1_keys: number;
    orphan_count: number;
    orphan_size_bytes: number;
  };
}

export class OrphanFileChecker {
  /**
   * 检查 R2 孤儿文件
   */
  async checkOrphanFiles(): Promise<OrphanCheckResult> {
    console.log(`${LOG_PREFIX} 开始检查孤儿文件`);
    
    try {
      const result = await apiClient.checkOrphanFiles();
      
      console.log(`${LOG_PREFIX} 检查完成:`);
      console.log(`${LOG_PREFIX} - R2 文件总数: ${result.summary.total_r2_files}`);
      console.log(`${LOG_PREFIX} - D1 记录数: ${result.summary.total_d1_keys}`);
      console.log(`${LOG_PREFIX} - 孤儿文件数: ${result.summary.orphan_count}`);
      console.log(`${LOG_PREFIX} - 孤儿文件大小: ${(result.summary.orphan_size_bytes / 1024 / 1024).toFixed(2)} MB`);
      
      return result;
    } catch (error) {
      console.error(`${LOG_PREFIX} 检查孤儿文件失败:`, error);
      throw error;
    }
  }
  
  /**
   * 清理孤儿文件
   */
  async cleanupOrphans(r2Keys: string[]): Promise<{ deleted: number; failed: number }> {
    console.log(`${LOG_PREFIX} 开始清理孤儿文件: ${r2Keys.length} 个`);
    
    let deleted = 0;
    let failed = 0;
    
    for (const r2Key of r2Keys) {
      try {
        console.log(`${LOG_PREFIX} 删除: ${r2Key}`);
        await apiClient.deleteR2File(r2Key);
        deleted++;
      } catch (error) {
        console.error(`${LOG_PREFIX} 删除失败: ${r2Key}`, error);
        failed++;
      }
    }
    
    console.log(`${LOG_PREFIX} 清理完成: 成功 ${deleted}, 失败 ${failed}`);
    return { deleted, failed };
  }
  
  /**
   * 获取孤儿文件总大小（MB）
   */
  getOrphanSizeMB(orphans: OrphanFile[]): number {
    const totalBytes = orphans.reduce((sum, file) => sum + file.size, 0);
    return totalBytes / 1024 / 1024;
  }
}

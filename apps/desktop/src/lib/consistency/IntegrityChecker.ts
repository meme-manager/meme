/**
 * 文件完整性校验器
 */

import type { Asset } from '../../types/asset';
import type { FileIntegrityCheck } from './types';
import { apiClient, ApiError } from '../api/client';
import { listAssets } from '../database/operations';

const LOG_PREFIX = '[IntegrityChecker]';

export class IntegrityChecker {
  /**
   * 检查单个资产的文件完整性
   */
  async checkAssetIntegrity(asset: Asset): Promise<FileIntegrityCheck> {
    // 先检查本地文件是否存在
    const localExists = await this.checkLocalFile(asset.file_path);
    
    const result: FileIntegrityCheck = {
      assetId: asset.id,
      r2_key: asset.r2_key || '',
      exists: false,
      localExists,
      needsReupload: false
    };
    
    if (!asset.r2_key) {
      // 没有上传过，如果本地文件存在则需要上传
      result.needsReupload = localExists;
      return result;
    }
    
    // 检查 R2 文件是否存在
    try {
      const response = await apiClient.checkFileExists(asset.r2_key);
      result.exists = response.exists;
      
      if (!result.exists) {
        // R2 文件丢失，如果本地文件存在则可以重新上传
        result.needsReupload = localExists;
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 检查文件完整性失败:`, error);
      
      // 如果是认证错误（401/403），应该抛出让上层处理
      if (error instanceof ApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new Error('无法检查文件：未登录或权限不足。请先登录云同步账号。');
        }
      }
      
      // 其他错误只记录但不中断流程（可能是网络临时问题）
    }
    
    return result;
  }
  
  /**
   * 检查本地文件是否存在
   */
  async checkLocalFile(filePath: string): Promise<boolean> {
    if (!filePath) return false;
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('file_exists', { filePath });
    } catch {
      return false;
    }
  }
  
  /**
   * 检查所有资产的完整性（批量）
   */
  async checkAllAssets(): Promise<FileIntegrityCheck[]> {
    console.log(`${LOG_PREFIX} 开始批量检查所有资产`);
    
    // 1. 获取所有资产
    const assets = await listAssets({ limit: 10000 });
    console.log(`${LOG_PREFIX} 共 ${assets.length} 个资产`);
    
    // 2. 过滤需要检查的资产（有 r2_key 且未删除）
    const assetsToCheck = assets.filter(a => a.r2_key && !a.deleted);
    console.log(`${LOG_PREFIX} 需要检查 ${assetsToCheck.length} 个资产`);
    
    if (assetsToCheck.length === 0) {
      return [];
    }
    
    // 3. 批量检查（每批 100 个）
    const BATCH_SIZE = 100;
    const results: FileIntegrityCheck[] = [];
    
    for (let i = 0; i < assetsToCheck.length; i += BATCH_SIZE) {
      const batch = assetsToCheck.slice(i, i + BATCH_SIZE);
      const r2Keys = batch.map(a => a.r2_key!);
      
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(assetsToCheck.length / BATCH_SIZE);
      console.log(`${LOG_PREFIX} 检查批次 ${batchNum}/${totalBatches} (${batch.length} 个文件)`);
      
      try {
        // 调用批量检查 API
        const checkResult = await apiClient.batchCheckFiles(r2Keys);
        
        // 构建结果映射
        const existsMap = new Map(
          checkResult.results.map(r => [r.r2_key, r.exists])
        );
        
        // 对每个资产，检查结果并处理缺失文件
        for (const asset of batch) {
          const exists = existsMap.get(asset.r2_key!) ?? false;
          
          // 检查本地文件是否存在
          const localExists = await this.checkLocalFile(asset.file_path);
          
          const result: FileIntegrityCheck = {
            assetId: asset.id,
            r2_key: asset.r2_key!,
            exists,
            localExists,
            needsReupload: false
          };
          
          // 如果 R2 文件不存在，本地文件存在则可以重新上传
          if (!exists && localExists) {
            result.needsReupload = true;
          }
          
          // 只记录有问题的资产（R2 不存在 或 本地不存在）
          if (!exists || !localExists) {
            results.push(result);
          }
        }
        
        console.log(`${LOG_PREFIX} 批次 ${batchNum} 完成: ${checkResult.summary.missing} 个文件缺失`);
        
      } catch (error) {
        console.error(`${LOG_PREFIX} 批次 ${batchNum} 检查失败:`, error);
        // 如果是认证错误，应该抛出让上层处理
        if (error instanceof ApiError) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            throw new Error('无法检查文件：未登录或权限不足。请先登录云同步账号。');
          }
        }
        // 其他错误只记录但继续下一批
      }
    }
    
    console.log(`${LOG_PREFIX} 检查完成，发现 ${results.length} 个问题`);
    return results;
  }
}

/**
 * 云端数据完整性检查器
 * 检查 D1 数据库与 R2 文件的一致性
 * 检查本地数据库与云端数据库的同步状态
 */

import { apiClient } from '../api/client';
import { listAssets } from '../database/operations';
import type { Asset } from '../../types/asset';

const LOG_PREFIX = '[CloudIntegrityChecker]';

export interface D1IntegrityResult {
  missing: Array<{
    asset_id: string;
    r2_key?: string;
    thumb_r2_key?: string;
  }>;
  summary: {
    total_assets: number;
    total_keys: number;
    missing_count: number;
    affected_assets: number;
  };
}

export interface SyncCompareResult {
  onlyInLocal: Asset[];
  onlyInCloud: Asset[];
  conflicts: Array<{
    local: Asset;
    cloud: Asset;
    reason: 'updated_at' | 'r2_key' | 'content_hash';
  }>;
}

export class CloudIntegrityChecker {
  /**
   * 检查 D1 数据库的文件完整性
   * 检查 D1 中记录的 r2_key 是否在 R2 中真实存在
   */
  async checkD1Integrity(): Promise<D1IntegrityResult> {
    console.log(`${LOG_PREFIX} 检查 D1 文件完整性`);
    
    try {
      const result = await apiClient.checkD1FileIntegrity();
      
      console.log(`${LOG_PREFIX} D1 完整性检查完成:`);
      console.log(`${LOG_PREFIX} - 总资产数: ${result.summary.total_assets}`);
      console.log(`${LOG_PREFIX} - 总 r2_key 数: ${result.summary.total_keys}`);
      console.log(`${LOG_PREFIX} - 缺失文件数: ${result.summary.missing_count}`);
      console.log(`${LOG_PREFIX} - 受影响资产: ${result.summary.affected_assets}`);
      
      return result;
    } catch (error) {
      console.error(`${LOG_PREFIX} 检查 D1 完整性失败:`, error);
      throw error;
    }
  }
  
  /**
   * 检查本地数据库与云端数据库的同步状态
   * 找出只在本地、只在云端、以及存在冲突的资产
   */
  async checkLocalVsCloud(): Promise<SyncCompareResult> {
    console.log(`${LOG_PREFIX} 检查本地与云端数据同步状态`);
    
    try {
      // 1. 获取云端数据
      console.log(`${LOG_PREFIX} 获取云端数据...`);
      const cloudData = await apiClient.getCloudAssets();
      const cloudAssets = new Map(cloudData.assets.map((a: any) => [a.id, a]));
      console.log(`${LOG_PREFIX} 云端资产数: ${cloudAssets.size}`);
      
      // 2. 获取本地数据
      console.log(`${LOG_PREFIX} 获取本地数据...`);
      const localAssets = await listAssets({ limit: 10000 });
      const localMap = new Map(localAssets.map(a => [a.id, a]));
      console.log(`${LOG_PREFIX} 本地资产数: ${localMap.size}`);
      
      // 3. 对比数据
      const onlyInLocal: Asset[] = [];
      const onlyInCloud: Asset[] = [];
      const conflicts: Array<{ local: Asset; cloud: Asset; reason: any }> = [];
      
      // 找出只在本地或有冲突的
      for (const [id, local] of localMap) {
        if (!cloudAssets.has(id)) {
          onlyInLocal.push(local);
        } else {
          const cloud = cloudAssets.get(id)!;
          
          // 检查是否有冲突
          if (local.updated_at !== cloud.updated_at) {
            conflicts.push({
              local,
              cloud,
              reason: 'updated_at'
            });
          } else if (local.r2_key !== cloud.r2_key) {
            conflicts.push({
              local,
              cloud,
              reason: 'r2_key'
            });
          } else if (local.content_hash !== cloud.content_hash) {
            conflicts.push({
              local,
              cloud,
              reason: 'content_hash'
            });
          }
        }
      }
      
      // 找出只在云端的
      for (const [id, cloud] of cloudAssets) {
        if (!localMap.has(id)) {
          onlyInCloud.push(cloud as Asset);
        }
      }
      
      console.log(`${LOG_PREFIX} 对比完成:`);
      console.log(`${LOG_PREFIX} - 只在本地: ${onlyInLocal.length}`);
      console.log(`${LOG_PREFIX} - 只在云端: ${onlyInCloud.length}`);
      console.log(`${LOG_PREFIX} - 冲突数: ${conflicts.length}`);
      
      return { onlyInLocal, onlyInCloud, conflicts };
      
    } catch (error) {
      console.error(`${LOG_PREFIX} 检查本地与云端同步失败:`, error);
      throw error;
    }
  }
  
  /**
   * 判断冲突应该保留哪一方
   */
  resolveConflict(local: Asset, cloud: Asset): 'local' | 'cloud' | 'manual' {
    // 如果更新时间不同，选择较新的
    if (local.updated_at > cloud.updated_at) {
      return 'local';
    } else if (local.updated_at < cloud.updated_at) {
      return 'cloud';
    }
    
    // 如果更新时间相同但内容不同，需要手动处理
    return 'manual';
  }
}

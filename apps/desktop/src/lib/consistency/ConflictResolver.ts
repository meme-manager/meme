/**
 * 冲突解决器
 */

import type { Asset } from '../../types/asset';
import type { ConflictInfo } from './types';
import { getAssetById, updateAsset } from '../database/operations';
import { apiClient } from '../api/client';
import { syncManager } from '../sync/syncManager';

const LOG_PREFIX = '[ConflictResolver]';

export class ConflictResolver {
  /**
   * 检测两个资产之间的冲突
   */
  async detectConflicts(localAsset: Asset, cloudAsset: Asset): Promise<ConflictInfo | null> {
    // 1. 检查是否真的冲突（时间戳相同则无冲突）
    if (localAsset.updated_at === cloudAsset.updated_at) {
      return null;
    }
    
    // 2. r2_key 不匹配
    if (localAsset.r2_key !== cloudAsset.r2_key) {
      return {
        assetId: localAsset.id,
        type: 'r2_key_mismatch',
        local: localAsset,
        cloud: cloudAsset,
        recommendation: 'manual',
        reason: 'R2 文件引用不一致，需要手动确认'
      };
    }
    
    // 3. 一方删除，一方修改
    if (localAsset.deleted !== cloudAsset.deleted) {
      const newer = localAsset.updated_at > cloudAsset.updated_at ? 'local' : 'cloud';
      return {
        assetId: localAsset.id,
        type: 'deleted',
        local: localAsset,
        cloud: cloudAsset,
        recommendation: newer === 'local' ? 'use_local' : 'use_cloud',
        reason: `一方删除，一方修改，建议使用${newer === 'local' ? '本地' : '云端'}版本（更新）`
      };
    }
    
    // 4. 普通修改冲突
    const newer = localAsset.updated_at > cloudAsset.updated_at ? 'local' : 'cloud';
    return {
      assetId: localAsset.id,
      type: 'modified',
      local: localAsset,
      cloud: cloudAsset,
      recommendation: newer === 'local' ? 'use_local' : 'use_cloud',
      reason: `${newer === 'local' ? '本地' : '云端'}版本更新`
    };
  }
  
  /**
   * 检测所有冲突
   */
  async detectAllConflicts(): Promise<ConflictInfo[]> {
    console.log(`${LOG_PREFIX} 开始检测冲突...`);
    
    // 这里需要先拉取云端数据进行比较
    const lastSyncTime = syncManager.getLastSyncTime();
    const cloudData = await apiClient.syncPull({ since: lastSyncTime });
    const conflicts: ConflictInfo[] = [];
    
    for (const cloudAsset of cloudData.assets) {
      const localAsset = await getAssetById(cloudAsset.id);
      if (localAsset) {
        const conflict = await this.detectConflicts(localAsset, cloudAsset);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
    
    console.log(`${LOG_PREFIX} 发现 ${conflicts.length} 个冲突`);
    return conflicts;
  }
  
  /**
   * 解决冲突
   */
  async resolveConflict(
    conflict: ConflictInfo,
    choice: 'use_cloud' | 'use_local' | 'merge'
  ): Promise<void> {
    console.log(`${LOG_PREFIX} 解决冲突: ${conflict.assetId}, 选择: ${choice}`);
    
    switch (choice) {
      case 'use_cloud':
        // 使用云端版本覆盖本地
        await updateAsset(conflict.assetId, conflict.cloud);
        console.log(`${LOG_PREFIX} ✅ 已使用云端版本`);
        break;
        
      case 'use_local':
        // 本地版本会在推送时覆盖云端，这里不需要做什么
        console.log(`${LOG_PREFIX} ✅ 保留本地版本（将在下次推送时同步到云端）`);
        break;
        
      case 'merge':
        // 合并策略：保留两者的特定字段
        await updateAsset(conflict.assetId, {
          ...conflict.cloud,
          use_count: Math.max(conflict.local.use_count, conflict.cloud.use_count),
          last_used_at: Math.max(conflict.local.last_used_at || 0, conflict.cloud.last_used_at || 0)
        });
        console.log(`${LOG_PREFIX} ✅ 已智能合并`);
        break;
    }
  }
  
  /**
   * 批量解决冲突
   */
  async resolveConflicts(
    conflicts: ConflictInfo[],
    resolutions: Map<string, 'use_cloud' | 'use_local' | 'merge'>
  ): Promise<void> {
    console.log(`${LOG_PREFIX} 批量解决 ${conflicts.length} 个冲突...`);
    
    for (const conflict of conflicts) {
      const resolution = resolutions.get(conflict.assetId) || conflict.recommendation;
      await this.resolveConflict(conflict, resolution as any);
    }
    
    console.log(`${LOG_PREFIX} ✅ 所有冲突已解决`);
  }
}

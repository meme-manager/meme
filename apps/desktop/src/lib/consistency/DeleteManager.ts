/**
 * 删除管理器
 */

import type { Asset } from '../../types/asset';
import type { DeleteSyncStrategy } from './types';
import { getAssetById, updateAsset } from '../database/operations';
import { getDatabase } from '../database';
import { apiClient } from '../api/client';

const LOG_PREFIX = '[DeleteManager]';

export class DeleteManager {
  private strategy: DeleteSyncStrategy = {
    localDelete: 'soft',
    cloudDelete: 'soft',
    deleteR2: false,
    retentionDays: 30
  };
  
  /**
   * 设置删除策略
   */
  setStrategy(strategy: Partial<DeleteSyncStrategy>) {
    this.strategy = { ...this.strategy, ...strategy };
    console.log(`${LOG_PREFIX} 更新删除策略:`, this.strategy);
  }
  
  /**
   * 获取当前策略
   */
  getStrategy(): DeleteSyncStrategy {
    return { ...this.strategy };
  }
  
  /**
   * 删除资产
   */
  async deleteAsset(assetId: string, permanent: boolean = false): Promise<void> {
    const asset = await getAssetById(assetId);
    if (!asset) {
      console.warn(`${LOG_PREFIX} 资产不存在: ${assetId}`);
      return;
    }
    
    if (permanent) {
      await this.hardDelete(asset);
    } else {
      await this.softDelete(asset);
    }
  }
  
  /**
   * 软删除：只标记，不删除文件
   */
  private async softDelete(asset: Asset): Promise<void> {
    const now = Date.now();
    await updateAsset(asset.id, {
      deleted: 1,
      deleted_at: now,
      updated_at: now
    });
    console.log(`${LOG_PREFIX} 🗑️ 软删除: ${asset.file_name}`);
  }
  
  /**
   * 硬删除：删除所有数据和文件
   */
  private async hardDelete(asset: Asset): Promise<void> {
    console.log(`${LOG_PREFIX} 永久删除: ${asset.file_name}`);
    
    // 1. 删除 R2 文件
    if (asset.r2_key && this.strategy.deleteR2) {
      try {
        console.log(`${LOG_PREFIX} 删除 R2 文件: ${asset.r2_key}`);
        await apiClient.deleteR2File(asset.r2_key);
        if (asset.thumb_r2_key) {
          await apiClient.deleteR2File(asset.thumb_r2_key);
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} 删除 R2 文件失败:`, error);
      }
    }
    
    // 2. 删除本地文件
    if (asset.file_path) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_file', { filePath: asset.file_path });
        console.log(`${LOG_PREFIX} 删除本地文件: ${asset.file_path}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} 删除本地文件失败:`, error);
      }
    }
    
    // 3. 删除数据库记录
    const db = await getDatabase();
    await db.execute('DELETE FROM asset_tags WHERE asset_id = ?', [asset.id]);
    await db.execute('DELETE FROM asset_keywords WHERE asset_id = ?', [asset.id]);
    await db.execute('DELETE FROM asset_collections WHERE asset_id = ?', [asset.id]);
    await db.execute('DELETE FROM assets WHERE id = ?', [asset.id]);
    
    console.log(`${LOG_PREFIX} 🗑️ 永久删除完成: ${asset.file_name}`);
  }
  
  /**
   * 清理过期的软删除记录
   */
  async cleanupExpiredDeletes(): Promise<number> {
    const retentionMs = (this.strategy.retentionDays || 30) * 24 * 60 * 60 * 1000;
    const expiredTime = Date.now() - retentionMs;
    
    console.log(`${LOG_PREFIX} 清理过期删除记录，保留天数: ${this.strategy.retentionDays}`);
    
    const db = await getDatabase();
    const expiredAssets = await db.select<Array<Asset>>(
      'SELECT * FROM assets WHERE deleted = 1 AND deleted_at < ?',
      [expiredTime]
    );
    
    for (const asset of expiredAssets) {
      await this.hardDelete(asset);
    }
    
    console.log(`${LOG_PREFIX} 🧹 清理了 ${expiredAssets.length} 个过期删除记录`);
    return expiredAssets.length;
  }
}

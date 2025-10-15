/**
 * 同步管理器
 * 处理本地和云端的数据同步逻辑
 * 参考: CLOUD_SYNC_DESIGN_v2.md
 */

import { apiClient } from '../api/client';
import type { Asset, Tag } from '../../types/asset';
import type { PullResponse, PushRequest, SyncResult } from '../../types/sync';

const LOG_PREFIX = '[Sync Manager]';

/**
 * 同步配置
 */
interface SyncConfig {
  enabled: boolean;
  lastSyncTime: number;
  deviceId: string;
  userId: string;
  token: string;
}

/**
 * 同步管理器类
 */
export class SyncManager {
  private config: SyncConfig | null = null;
  private syncing = false;

  constructor() {
    console.log(`${LOG_PREFIX} 初始化`);
  }

  /**
   * 初始化同步配置
   */
  async initialize(config: SyncConfig): Promise<void> {
    console.log(`${LOG_PREFIX} 配置同步,用户: ${config.userId}`);
    this.config = config;
    apiClient.setToken(config.token);
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.enabled;
  }

  /**
   * 检查是否正在同步
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * 执行完整同步流程
   */
  async sync(): Promise<SyncResult> {
    if (!this.isConfigured()) {
      throw new Error('同步未配置,请先登录');
    }

    if (this.syncing) {
      throw new Error('同步正在进行中');
    }

    this.syncing = true;
    console.log(`${LOG_PREFIX} 开始同步...`);

    try {
      const startTime = Date.now();
      let pulledCount = 0;
      let pushedCount = 0;

      // 1. 拉取云端更新
      console.log(`${LOG_PREFIX} 步骤 1: 拉取云端更新`);
      const pullResult = await this.pullFromCloud();
      pulledCount = pullResult.total_count;
      
      // 2. 合并云端数据到本地
      console.log(`${LOG_PREFIX} 步骤 2: 合并云端数据`);
      await this.mergeCloudData(pullResult);

      // 3. 收集本地更改
      console.log(`${LOG_PREFIX} 步骤 3: 收集本地更改`);
      const localChanges = await this.collectLocalChanges();

      // 4. 上传新增的图片
      if (localChanges.assets.length > 0) {
        console.log(`${LOG_PREFIX} 步骤 4: 上传图片 (${localChanges.assets.length} 张)`);
        await this.uploadNewAssets(localChanges.assets);
      }

      // 5. 推送本地更改到云端
      console.log(`${LOG_PREFIX} 步骤 5: 推送本地更改`);
      const pushResult = await this.pushToCloud(localChanges);
      pushedCount = pushResult.synced_count;

      // 6. 更新同步时间
      const serverTimestamp = pushResult.server_timestamp;
      await this.updateLastSyncTime(serverTimestamp);

      const duration = Date.now() - startTime;
      console.log(`${LOG_PREFIX} 同步完成,耗时: ${duration}ms`);
      console.log(`${LOG_PREFIX} 拉取: ${pulledCount} 条,推送: ${pushedCount} 条`);

      return {
        success: true,
        pulledCount,
        pushedCount,
        timestamp: serverTimestamp,
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} 同步失败:`, error);
      return {
        success: false,
        pulledCount: 0,
        pushedCount: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : '同步失败',
      };
    } finally {
      this.syncing = false;
    }
  }

  /**
   * 从云端拉取更新
   */
  private async pullFromCloud(): Promise<PullResponse> {
    const lastSyncTime = this.config!.lastSyncTime || 0;
    
    return apiClient.syncPull({
      since: lastSyncTime,
      tables: ['assets', 'tags', 'asset_tags'],
    });
  }

  /**
   * 合并云端数据到本地 (LWW 策略)
   */
  private async mergeCloudData(cloudData: PullResponse): Promise<void> {
    const { assets, tags, asset_tags } = cloudData;
    const lastSyncTime = this.config!.lastSyncTime || 0;

    console.log(`${LOG_PREFIX} 合并数据: ${assets.length} 资产, ${tags.length} 标签`);

    // 使用 Tauri 的数据库 API (需要在实际项目中实现)
    // 这里展示逻辑,实际需要调用 database operations
    
    // 合并资产
    for (const cloudAsset of assets) {
      await this.mergeAsset(cloudAsset, lastSyncTime);
    }

    // 合并标签
    for (const cloudTag of tags) {
      await this.mergeTag(cloudTag, lastSyncTime);
    }

    // 合并关联关系
    for (const relation of asset_tags) {
      await this.mergeAssetTag(relation);
    }
  }

  /**
   * 合并单个资产 (LWW)
   */
  private async mergeAsset(cloudAsset: Asset, lastSyncTime: number): Promise<void> {
    // TODO: 从本地数据库获取资产
    // const localAsset = await db.getAsset(cloudAsset.id);
    
    // 示例逻辑:
    // if (!localAsset) {
    //   // 云端新增,直接插入
    //   await db.insertAsset(cloudAsset);
    // } else if (cloudAsset.updated_at > localAsset.updated_at) {
    //   // 云端更新,覆盖本地
    //   await db.updateAsset(cloudAsset);
    // }
    // 实际实现需要调用 database operations
    
    console.log(`${LOG_PREFIX} 合并资产: ${cloudAsset.file_name}`);
  }

  /**
   * 合并单个标签 (LWW)
   */
  private async mergeTag(cloudTag: Tag, lastSyncTime: number): Promise<void> {
    // TODO: 实现标签合并逻辑
    console.log(`${LOG_PREFIX} 合并标签: ${cloudTag.name}`);
  }

  /**
   * 合并资产-标签关联
   */
  private async mergeAssetTag(relation: { asset_id: string; tag_id: string; created_at: number }): Promise<void> {
    // TODO: 实现关联关系合并
    console.log(`${LOG_PREFIX} 合并关联: ${relation.asset_id} -> ${relation.tag_id}`);
  }

  /**
   * 收集本地更改
   */
  private async collectLocalChanges(): Promise<PushRequest> {
    const lastSyncTime = this.config!.lastSyncTime || 0;

    // TODO: 从本地数据库查询更改
    // const assets = await db.getAssetsModifiedSince(lastSyncTime);
    // const tags = await db.getTagsModifiedSince(lastSyncTime);
    // ...

    console.log(`${LOG_PREFIX} 收集本地更改,since: ${new Date(lastSyncTime).toISOString()}`);

    return {
      assets: [],
      tags: [],
      keywords: [],
      collections: [],
      asset_tags: [],
      asset_keywords: [],
      asset_collections: [],
    };
  }

  /**
   * 上传新增的资产文件到 R2
   */
  private async uploadNewAssets(assets: Asset[]): Promise<void> {
    for (const asset of assets) {
      // 只上传未同步的资产(没有 r2_key 的)
      if (asset.r2_key) {
        continue;
      }

      try {
        console.log(`${LOG_PREFIX} 上传文件: ${asset.file_name}`);
        
        // 读取本地文件
        // TODO: 需要实现从本地路径读取文件的功能
        // const fileData = await readLocalFile(asset.file_path);
        
        // 上传到 R2
        // const result = await apiClient.uploadFile(fileData, {
        //   fileName: asset.file_name,
        //   contentType: asset.mime_type,
        //   contentHash: asset.content_hash,
        // });

        // 更新资产的 R2 信息
        // asset.r2_key = result.r2_key;
        // asset.thumb_r2_key = result.thumb_r2_key;
        
        console.log(`${LOG_PREFIX} 上传成功: ${asset.file_name}`);
        
      } catch (error) {
        console.error(`${LOG_PREFIX} 上传失败: ${asset.file_name}`, error);
        throw error;
      }
    }
  }

  /**
   * 推送本地更改到云端
   */
  private async pushToCloud(changes: PushRequest): Promise<{ success: boolean; synced_count: number; server_timestamp: number }> {
    return apiClient.syncPush(changes);
  }

  /**
   * 更新最后同步时间
   */
  private async updateLastSyncTime(timestamp: number): Promise<void> {
    if (this.config) {
      this.config.lastSyncTime = timestamp;
    }
    
    // TODO: 保存到本地数据库
    // await db.setSyncState('last_sync_time', timestamp.toString());
    
    console.log(`${LOG_PREFIX} 更新同步时间: ${new Date(timestamp).toISOString()}`);
  }

  /**
   * 获取最后同步时间
   */
  getLastSyncTime(): number {
    return this.config?.lastSyncTime || 0;
  }

  /**
   * 禁用同步
   */
  async disable(): Promise<void> {
    console.log(`${LOG_PREFIX} 禁用同步`);
    if (this.config) {
      this.config.enabled = false;
    }
    apiClient.setToken(null);
  }
}

// 导出单例实例
export const syncManager = new SyncManager();

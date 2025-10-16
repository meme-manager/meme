/**
 * 同步管理器
 * 处理本地和云端的数据同步逻辑
 * 参考: CLOUD_SYNC_DESIGN_v2.md
 */

import { apiClient } from '../api/client';
import type { Asset, Tag } from '../../types/asset';
import type { PullResponse, PushRequest, SyncResult } from '../../types/sync';
import { 
  getAssetsModifiedSince, 
  getTagsModifiedSince, 
  getAssetTagsModifiedSince,
  getAssetById,
  createAsset,
  updateAsset,
  listTags,
  addAssetTag
} from '../database/operations';
import { getDatabase } from '../database';

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
    console.log(`${LOG_PREFIX} 配置同步,用户: ${config.userId}, enabled: ${config.enabled}`);
    console.log(`${LOG_PREFIX} 🔑 设置 Token: ${config.token ? `${config.token.substring(0, 20)}...` : '❌ 无'}`);
    this.config = config;
    apiClient.setToken(config.token);
    
    // 验证 token 是否真的被设置
    const currentToken = apiClient.getToken();
    console.log(`${LOG_PREFIX} 🔍 验证 Token: ${currentToken ? `${currentToken.substring(0, 20)}...` : '❌ 未设置'}`);
    console.log(`${LOG_PREFIX} ✅ 配置完成, isConfigured: ${this.isConfigured()}`);
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
    console.log(`${LOG_PREFIX} 检查配置状态: config=${this.config !== null}, enabled=${this.config?.enabled}`);
    
    if (!this.isConfigured()) {
      console.error(`${LOG_PREFIX} ❌ 同步未配置: config=${this.config}, enabled=${this.config?.enabled}`);
      throw new Error('同步未配置,请先登录');
    }

    if (this.syncing) {
      throw new Error('同步正在进行中');
    }

    this.syncing = true;
    console.log(`${LOG_PREFIX} ✅ 配置检查通过，开始同步...`);

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
      let localChanges = await this.collectLocalChanges();

      // 4. 上传新增的图片
      if (localChanges.assets && localChanges.assets.length > 0) {
        console.log(`${LOG_PREFIX} 步骤 4: 上传图片 (${localChanges.assets.length} 张)`);
        await this.uploadNewAssets(localChanges.assets);
        
        // 上传后重新收集本地更改，确保 r2_key 等字段是最新的
        console.log(`${LOG_PREFIX} 步骤 4.5: 重新收集本地更改（上传后）`);
        localChanges = await this.collectLocalChanges();
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
    });
  }

  /**
   * 合并云端数据到本地 (LWW 策略)
   */
  private async mergeCloudData(cloudData: PullResponse): Promise<void> {
    const { assets, tags, asset_tags, settings } = cloudData;
    const lastSyncTime = this.config!.lastSyncTime || 0;

    console.log(`${LOG_PREFIX} 合并数据: ${assets.length} 资产, ${tags.length} 标签, ${settings.length} 设置`);

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
    
    // 合并设置
    for (const setting of settings) {
      await this.mergeSetting(setting);
    }
  }

  /**
   * 合并单个资产 (LWW - Last Write Wins)
   */
  private async mergeAsset(cloudAsset: Asset, lastSyncTime: number): Promise<void> {
    try {
      const localAsset = await getAssetById(cloudAsset.id);
      
      if (!localAsset) {
        // 云端新增，直接插入到本地
        await createAsset({
          ...cloudAsset,
          // 移除 id、created_at、updated_at，因为 createAsset 会自动生成
          // 但我们要使用云端的值，所以需要直接插入
        });
        
        // 直接插入完整数据
        const db = await getDatabase();
        await db.execute(
          `INSERT OR REPLACE INTO assets (
            id, content_hash, file_name, file_path, mime_type, file_size,
            width, height, source_url, source_platform,
            thumb_small, thumb_medium, thumb_large,
            created_at, updated_at, last_used_at, use_count,
            synced, cloud_url, deleted, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cloudAsset.id,
            cloudAsset.content_hash,
            cloudAsset.file_name,
            cloudAsset.file_path || '',
            cloudAsset.mime_type,
            cloudAsset.file_size,
            cloudAsset.width,
            cloudAsset.height,
            cloudAsset.source_url,
            cloudAsset.source_platform || 'cloud',
            cloudAsset.thumb_small,
            cloudAsset.thumb_medium,
            cloudAsset.thumb_large,
            cloudAsset.created_at,
            cloudAsset.updated_at,
            cloudAsset.last_used_at,
            cloudAsset.use_count,
            1, // 标记为已同步
            cloudAsset.cloud_url,
            cloudAsset.deleted,
            cloudAsset.deleted_at,
          ]
        );
        console.log(`${LOG_PREFIX} ✅ 新增资产: ${cloudAsset.file_name}`);
      } else if (cloudAsset.updated_at > localAsset.updated_at) {
        // 云端更新时间更新，覆盖本地 (LWW)
        await updateAsset(cloudAsset.id, {
          ...cloudAsset,
          synced: 1, // 标记为已同步
        });
        console.log(`${LOG_PREFIX} ✅ 更新资产: ${cloudAsset.file_name}`);
      } else {
        console.log(`${LOG_PREFIX} ⏭️  跳过资产（本地较新）: ${cloudAsset.file_name}`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ 合并资产失败: ${cloudAsset.file_name}`, error);
    }
  }

  /**
   * 合并单个标签 (LWW)
   */
  private async mergeTag(cloudTag: Tag, lastSyncTime: number): Promise<void> {
    try {
      // 查找本地是否存在该标签
      const allTags = await listTags();
      const localTag = allTags.find(t => t.id === cloudTag.id);
      
      const db = await getDatabase();
      
      if (!localTag) {
        // 云端新增，直接插入
        await db.execute(
          `INSERT OR REPLACE INTO tags (id, name, color, description, icon, created_at, updated_at, use_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cloudTag.id,
            cloudTag.name,
            cloudTag.color,
            cloudTag.description,
            cloudTag.icon,
            cloudTag.created_at,
            cloudTag.updated_at,
            cloudTag.use_count,
          ]
        );
        console.log(`${LOG_PREFIX} ✅ 新增标签: ${cloudTag.name}`);
      } else if (cloudTag.updated_at > localTag.updated_at) {
        // 云端更新时间更新，覆盖本地
        await db.execute(
          `UPDATE tags SET name = ?, color = ?, description = ?, icon = ?, updated_at = ?, use_count = ?
           WHERE id = ?`,
          [
            cloudTag.name,
            cloudTag.color,
            cloudTag.description,
            cloudTag.icon,
            cloudTag.updated_at,
            cloudTag.use_count,
            cloudTag.id,
          ]
        );
        console.log(`${LOG_PREFIX} ✅ 更新标签: ${cloudTag.name}`);
      } else {
        console.log(`${LOG_PREFIX} ⏭️  跳过标签（本地较新）: ${cloudTag.name}`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ 合并标签失败: ${cloudTag.name}`, error);
    }
  }

  /**
   * 合并资产-标签关联
   */
  private async mergeAssetTag(relation: { asset_id: string; tag_id: string; created_at: number }): Promise<void> {
    try {
      // 使用 INSERT OR IGNORE 避免重复插入
      await addAssetTag(relation.asset_id, relation.tag_id);
      console.log(`${LOG_PREFIX} ✅ 关联: ${relation.asset_id} -> ${relation.tag_id}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ 合并关联失败:`, error);
    }
  }

  /**
   * 合并设置
   */
  private async mergeSetting(setting: { user_id: string; key: string; value: string; updated_at: number }): Promise<void> {
    try {
      // 暂时使用 localStorage 存储设置
      const key = `user_setting_${setting.key}`;
      const existingValue = localStorage.getItem(key);
      
      if (existingValue) {
        try {
          const existing = JSON.parse(existingValue);
          if (setting.updated_at > existing.updated_at) {
            localStorage.setItem(key, JSON.stringify(setting));
            console.log(`${LOG_PREFIX} ✅ 更新设置: ${setting.key} = ${setting.value}`);
          }
        } catch {
          // 如果解析失败，直接覆盖
          localStorage.setItem(key, JSON.stringify(setting));
        }
      } else {
        localStorage.setItem(key, JSON.stringify(setting));
        console.log(`${LOG_PREFIX} ✅ 新增设置: ${setting.key} = ${setting.value}`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ 合并设置失败:`, error);
    }
  }

  /**
   * 收集本地更改
   */
  private async collectLocalChanges(): Promise<PushRequest> {
    const lastSyncTime = this.config!.lastSyncTime || 0;

    console.log(`${LOG_PREFIX} 收集本地更改,since: ${new Date(lastSyncTime).toISOString()}`);

    try {
      // 查询本地数据库获取修改的数据
      const assets = await getAssetsModifiedSince(lastSyncTime);
      const tags = await getTagsModifiedSince(lastSyncTime);
      const asset_tags = await getAssetTagsModifiedSince(lastSyncTime);
      
      // TODO: 设置同步需要实现用户设置的存储和查询
      const settings: Array<{ user_id: string; key: string; value: string; updated_at: number }> = [];

      console.log(`${LOG_PREFIX} 收集到: ${assets.length} 个资产, ${tags.length} 个标签, ${asset_tags.length} 个关联`);

      // 转换为 API 需要的格式
      return {
        assets: assets.length > 0 ? this.convertAssetsForSync(assets) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        asset_tags: asset_tags.length > 0 ? asset_tags : undefined,
        settings: settings.length > 0 ? settings : undefined,
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} 收集本地更改失败:`, error);
      return {
        assets: undefined,
        tags: undefined,
        asset_tags: undefined,
        settings: undefined,
      };
    }
  }

  /**
   * 转换资产为同步格式（添加 user_id，并将 undefined 转为 null）
   */
  private convertAssetsForSync(assets: Asset[]): any[] {
    const userId = this.config!.userId;
    return assets.map((asset, index) => {
      // 检查并记录所有 undefined 字段
      const undefinedFields: string[] = [];
      for (const [key, value] of Object.entries(asset)) {
        if (value === undefined) {
          undefinedFields.push(key);
        }
      }
      
      if (undefinedFields.length > 0) {
        console.warn(`${LOG_PREFIX} 资产 #${index} (${asset.id}) 有 undefined 字段:`, undefinedFields);
      }
      
      // 将所有 undefined 值转换为 null（D1 不接受 undefined）
      const converted: any = { user_id: userId };
      
      for (const [key, value] of Object.entries(asset)) {
        converted[key] = value === undefined ? null : value;
      }
      
      // 验证转换后没有 undefined
      const stillUndefined: string[] = [];
      for (const [key, value] of Object.entries(converted)) {
        if (value === undefined) {
          stillUndefined.push(key);
        }
      }
      
      if (stillUndefined.length > 0) {
        console.error(`${LOG_PREFIX} ⚠️ 转换后仍有 undefined 字段:`, stillUndefined, converted);
      }
      
      return converted;
    });
  }

  /**
   * 上传新增的资产文件到 R2
   */
  private async uploadNewAssets(assets: Asset[]): Promise<void> {
    console.log(`${LOG_PREFIX} 📤 准备上传 ${assets.length} 个文件`);
    console.log(`${LOG_PREFIX} 🔍 当前 apiClient token: ${apiClient.getToken() ? '存在' : '❌ 不存在'}`);
    
    for (const asset of assets) {
      // 只上传未同步的资产(没有 r2_key 的)
      if (asset.r2_key) {
        console.log(`${LOG_PREFIX} ⏭️  跳过已上传的文件: ${asset.file_name}`);
        continue;
      }

      try {
        console.log(`${LOG_PREFIX} 📤 上传文件: ${asset.file_name} (${this.formatBytes(asset.file_size)})`);
        
        // 读取本地文件
        const fileData = await this.readLocalFile(asset.file_path);
        
        // 上传到 R2
        const result = await apiClient.uploadFile(fileData, {
          fileName: asset.file_name,
          contentType: asset.mime_type,
          contentHash: asset.content_hash,
        });

        // 更新资产的 R2 信息
        await updateAsset(asset.id, {
          r2_key: result.r2_key,
          thumb_r2_key: result.thumb_r2_key,
          cloud_url: result.r2_url,
          synced: 1,
        });
        
        console.log(`${LOG_PREFIX} ✅ 上传成功: ${asset.file_name} -> ${result.r2_key}`);
        
      } catch (error) {
        console.error(`${LOG_PREFIX} ❌ 上传失败: ${asset.file_name}`, error);
        // 不要抛出错误，继续上传其他文件
        // throw error;
      }
    }
  }

  /**
   * 读取本地文件
   */
  private async readLocalFile(filePath: string): Promise<ArrayBuffer> {
    try {
      // 使用 Tauri 命令读取文件
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<number[]>('read_file_binary', { filePath });
      
      // 将 number[] 转换为 Uint8Array，再转换为 ArrayBuffer
      const uint8Array = new Uint8Array(data);
      return uint8Array.buffer;
    } catch (error) {
      console.error(`${LOG_PREFIX} 读取文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 格式化文件大小
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
    
    // 保存到 localStorage
    try {
      localStorage.setItem('sync_last_time', String(timestamp));
      console.log(`${LOG_PREFIX} ✅ 更新同步时间: ${new Date(timestamp).toISOString()}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ 保存同步时间失败:`, error);
    }
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

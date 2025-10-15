/**
 * 分享管理器
 * 处理表情包分享功能
 * 参考: SHARE_FEATURE_DESIGN.md
 */

import { apiClient } from '../api/client';

const LOG_PREFIX = '[Share Manager]';

/**
 * 分享选项
 */
export interface ShareOptions {
  asset_ids: string[];
  title?: string;
  description?: string;
  expires_in?: number;        // 有效期(秒): 604800=7天, 2592000=30天
  max_downloads?: number;     // 最大下载次数
  password?: string;          // 访问密码
}

/**
 * 分享信息
 */
export interface ShareInfo {
  share_id: string;
  share_url: string;
  expires_at?: number;
}

/**
 * 分享列表项
 */
export interface ShareListItem {
  share_id: string;
  title: string;
  asset_count: number;
  view_count: number;
  download_count: number;
  created_at: number;
  expires_at?: number;
}

/**
 * 分享管理器类
 */
export class ShareManager {
  constructor() {
    console.log(`${LOG_PREFIX} 初始化`);
  }

  /**
   * 创建分享
   */
  async createShare(options: ShareOptions): Promise<ShareInfo> {
    console.log(`${LOG_PREFIX} 创建分享,资产数: ${options.asset_ids.length}`);
    
    if (options.asset_ids.length === 0) {
      throw new Error('请至少选择一张图片');
    }

    try {
      const result = await apiClient.createShare(options);
      console.log(`${LOG_PREFIX} 分享创建成功: ${result.share_id}`);
      return result;
    } catch (error) {
      console.error(`${LOG_PREFIX} 创建分享失败:`, error);
      throw error;
    }
  }

  /**
   * 获取分享列表
   */
  async listShares(): Promise<ShareListItem[]> {
    console.log(`${LOG_PREFIX} 获取分享列表`);
    
    try {
      const result = await apiClient.listShares();
      console.log(`${LOG_PREFIX} 获取到 ${result.shares.length} 个分享`);
      return result.shares;
    } catch (error) {
      console.error(`${LOG_PREFIX} 获取分享列表失败:`, error);
      throw error;
    }
  }

  /**
   * 删除分享
   */
  async deleteShare(shareId: string): Promise<void> {
    console.log(`${LOG_PREFIX} 删除分享: ${shareId}`);
    
    try {
      await apiClient.deleteShare(shareId);
      console.log(`${LOG_PREFIX} 分享删除成功`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 删除分享失败:`, error);
      throw error;
    }
  }

  /**
   * 复制分享链接到剪贴板
   */
  async copyShareLink(shareUrl: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      console.log(`${LOG_PREFIX} 分享链接已复制到剪贴板`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 复制失败:`, error);
      throw new Error('复制到剪贴板失败');
    }
  }

  /**
   * 获取有效期选项
   */
  getExpiryOptions(): Array<{ label: string; value: number | undefined }> {
    return [
      { label: '永久有效', value: undefined },
      { label: '7 天', value: 7 * 24 * 60 * 60 },
      { label: '30 天', value: 30 * 24 * 60 * 60 },
      { label: '1 天', value: 24 * 60 * 60 },
    ];
  }

  /**
   * 格式化过期时间
   */
  formatExpiryTime(expiresAt?: number): string {
    if (!expiresAt) {
      return '永久有效';
    }

    const now = Date.now();
    if (expiresAt < now) {
      return '已过期';
    }

    const diff = expiresAt - now;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) {
      return `${days} 天后过期`;
    } else if (hours > 0) {
      return `${hours} 小时后过期`;
    } else {
      return '即将过期';
    }
  }
}

// 导出单例实例
export const shareManager = new ShareManager();

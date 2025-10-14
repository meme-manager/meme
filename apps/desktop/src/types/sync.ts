/**
 * 同步相关类型定义
 * 参考: ARCHITECTURE_sync_and_api.md
 */

import type { Asset, Tag, Keyword, Collection } from './asset';

export interface SyncState {
  enabled: boolean;
  syncing: boolean;
  lastSyncTime: number | null;
  lastSyncSuccess: boolean;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  pulledCount: number;
  pushedCount: number;
  timestamp: number;
  error?: string;
}

export interface PullRequest {
  since: number;                      // 上次同步时间戳
  tables: string[];                   // 需要同步的表
}

export interface PullResponse {
  assets: Asset[];
  tags: Tag[];
  keywords: Keyword[];
  collections: Collection[];
  asset_tags: Array<{ asset_id: string; tag_id: string; created_at: number }>;
  asset_keywords: Array<{ asset_id: string; keyword_id: string; weight: number; created_at: number }>;
  asset_collections: Array<{ asset_id: string; collection_id: string; display_order: number; created_at: number }>;
  server_timestamp: number;
  total_count: number;
}

export interface PushRequest {
  assets: Asset[];
  tags: Tag[];
  keywords: Keyword[];
  collections: Collection[];
  asset_tags: Array<{ asset_id: string; tag_id: string; created_at: number }>;
  asset_keywords: Array<{ asset_id: string; keyword_id: string; weight: number; created_at: number }>;
  asset_collections: Array<{ asset_id: string; collection_id: string; display_order: number; created_at: number }>;
}

export interface PushResponse {
  success: boolean;
  synced_count: number;
  server_timestamp: number;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: 'desktop';
  platform: 'macos' | 'windows' | 'linux';
}

export interface AuthResponse {
  token: string;
  user_id: string;
  expires_at: number;
}

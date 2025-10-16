/**
 * 数据一致性管理相关类型定义
 */

import type { Asset } from '../../types/asset';

export interface FileIntegrityCheck {
  assetId: string;
  r2_key: string;
  exists: boolean;          // R2 文件是否存在
  localExists: boolean;     // 本地文件是否存在
  needsReupload: boolean;   // 是否需要重新上传（本地有但 R2 没有）
}

export interface ConflictInfo {
  assetId: string;
  type: 'modified' | 'deleted' | 'r2_key_mismatch';
  local: Asset;
  cloud: Asset;
  recommendation: 'use_cloud' | 'use_local' | 'manual';
  reason: string;
}

export interface ConsistencyOptions {
  downloadMissing?: boolean;    // 是否下载缺失文件
  autoRepair?: boolean;          // 是否自动修复
  cleanupDeleted?: boolean;      // 是否清理过期删除
}

export interface ConsistencyReport {
  timestamp: number;
  issues: Array<{
    type: 'integrity' | 'conflict' | 'download' | 'orphan' | 'd1_missing' | 'sync_conflict';
    severity: 'error' | 'warning' | 'info';
    data: any;
  }>;
  repairs: Array<{
    type: 'download' | 'reupload' | 'cleanup' | 'orphan_cleanup';
    succeeded: number;
    failed: number;
    failedIds?: string[];
    skipped?: number;
  }>;
  conflicts: ConflictInfo[];
  // 孤儿文件
  orphans?: Array<{
    r2_key: string;
    size: number;
    uploaded: Date;
  }>;
  // D1 缺失文件
  d1Missing?: Array<{
    asset_id: string;
    r2_key?: string;
    thumb_r2_key?: string;
  }>;
  // 本地与云端同步差异
  syncDiff?: {
    onlyInLocal: number;
    onlyInCloud: number;
    conflicts: number;
  };
  summary: {
    totalIssues: number;
    fixedIssues: number;
    pendingIssues: number;
  };
}

export interface HealthScore {
  score: number;           // 0-100
  grade: string;           // 优秀/良好/一般/较差
  totalAssets: number;
  healthyAssets: number;
  issues: {
    missingR2: number;
    missingLocal: number;
    notSynced: number;
  };
}

export interface DeleteSyncStrategy {
  localDelete: 'soft' | 'hard';
  cloudDelete: 'soft' | 'hard';
  deleteR2: boolean;
  retentionDays?: number;
}

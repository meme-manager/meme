/**
 * 资产（表情包）类型定义
 * 参考: ARCHITECTURE_simplified.md - 数据模型设计
 */

export interface Asset {
  id: string;                      // UUID
  content_hash: string;            // SHA256，用于去重
  
  // 文件信息
  file_name: string;
  file_path: string;               // 本地绝对路径
  mime_type: string;               // image/png, image/gif, image/webp
  file_size: number;               // 字节数
  width: number;
  height: number;
  
  // 来源信息
  source_url: string | null;       // 原始URL（如果有）
  source_platform: string;         // 'url', 'clipboard', 'drag', 'file'
  
  // 缩略图路径（本地）
  thumb_small: string | null;      // 128x128 webp
  thumb_medium: string | null;     // 256x256 webp
  thumb_large: string | null;      // 512x512 webp
  
  // 时间戳
  created_at: number;              // Unix时间戳（毫秒）
  updated_at: number;
  last_used_at: number | null;     // 最后使用时间
  
  // 使用统计
  use_count: number;               // 使用次数
  
  // 收藏状态
  is_favorite: number;             // 0=未收藏, 1=已收藏
  favorited_at: number | null;     // 收藏时间
  
  // 云同步状态
  synced: number;                  // 0=未同步, 1=已同步
  cloud_url: string | null;        // R2 URL（同步后）
  r2_key: string | null;           // R2 存储键
  thumb_r2_key: string | null;     // R2 缩略图键
  
  // 软删除
  deleted: number;                 // 0=正常, 1=已删除
  deleted_at: number | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;            // HEX颜色 #RRGGBB
  description: string | null;
  icon: string | null;             // emoji或图标名称
  created_at: number;
  updated_at: number;
  use_count: number;               // 使用次数（关联资产数）
}

export interface Keyword {
  id: string;
  text: string;                    // 关键词文本
  lang: string;                    // 语言：zh, en
  type: string;                    // manual, auto, ocr
  weight: number;                  // 权重 0.0-1.0
  created_at: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;             // emoji
  color: string | null;            // 主题色
  created_at: number;
  updated_at: number;
  asset_count: number;             // 缓存的资产数量
  
  // 分享设置（本地记录）
  is_shared: number;
  share_token: string | null;
  share_expires_at: number | null;
}

// 关联关系
export interface AssetTag {
  asset_id: string;
  tag_id: string;
  created_at: number;
}

export interface AssetKeyword {
  asset_id: string;
  keyword_id: string;
  weight: number;
  created_at: number;
}

export interface AssetCollection {
  asset_id: string;
  collection_id: string;
  display_order: number;
  created_at: number;
}

// 创建资产的请求类型
export interface CreateAssetRequest {
  file: File;
  source_url?: string;
  source_platform?: 'drag' | 'url' | 'clipboard' | 'file';
  tags?: string[];
  keywords?: string[];
  collection_id?: string;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  asset?: Asset;
  error?: string;
  is_duplicate?: boolean;
}

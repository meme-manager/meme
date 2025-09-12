import { z } from 'zod';

// ===========================================
// 基础实体类型定义
// ===========================================

// Asset - 表情包资源实体
export const AssetSchema = z.object({
  id: z.string().uuid(),
  contentHash: z.string(), // 文件内容哈希，用于去重
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  formats: z.array(z.enum(['png', 'webp', 'gif', 'jpg'])),
  meta: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    size: z.number().positive(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    sourceUrl: z.string().url().optional(),
  }),
  thumbnailPath: z.string().optional(), // 缩略图路径
  createdAt: z.number(), // Unix 时间戳
  updatedAt: z.number(), // Unix 时间戳
  tombstone: z.boolean().optional(), // 软删除标记
});

// Tag - 标签实体
export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  aliases: z.array(z.string().max(50)).default([]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional(),
  createdAt: z.number(),
});

// Keyword - 关键词实体
export const KeywordSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(100),
  lang: z.string().length(2).optional(), // ISO 639-1 语言代码
  weight: z.number().min(0).max(1).default(1), // 权重
  type: z.enum(['manual', 'auto', 'ocr']).default('manual'), // 来源类型
  confidence: z.number().min(0).max(1).optional(), // 置信度（自动提取时使用）
  createdAt: z.number(),
});

// AssetTag - 资源标签关联实体
export const AssetTagSchema = z.object({
  assetId: z.string().uuid(),
  tagId: z.string().uuid(),
  createdAt: z.number(),
});

// AssetKeyword - 资源关键词关联实体
export const AssetKeywordSchema = z.object({
  assetId: z.string().uuid(),
  keywordId: z.string().uuid(),
  weight: z.number().min(0).max(1).default(1), // 关联权重
  createdAt: z.number(),
});

// Collection - 集合实体（用于组织表情包）
export const CollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  shareToken: z.string().optional(), // 分享令牌
  shareExpiresAt: z.number().optional(), // 分享过期时间
  createdAt: z.number(),
  updatedAt: z.number(),
});

// AssetCollection - 资源集合关联实体
export const AssetCollectionSchema = z.object({
  assetId: z.string().uuid(),
  collectionId: z.string().uuid(),
  order: z.number().int().min(0).default(0), // 排序
  createdAt: z.number(),
});

// Device - 设备实体（用于同步）
export const DeviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['desktop', 'mobile', 'web']),
  platform: z.string().max(50).optional(), // 操作系统平台
  version: z.string().max(20).optional(), // 应用版本
  lastSyncAt: z.number().optional(),
  createdAt: z.number(),
});

// ===========================================
// 类型导出
// ===========================================

export type Asset = z.infer<typeof AssetSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Keyword = z.infer<typeof KeywordSchema>;
export type AssetTag = z.infer<typeof AssetTagSchema>;
export type AssetKeyword = z.infer<typeof AssetKeywordSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type AssetCollection = z.infer<typeof AssetCollectionSchema>;
export type Device = z.infer<typeof DeviceSchema>;

// ===========================================
// 请求/响应类型
// ===========================================

// 创建请求类型
export const CreateAssetRequestSchema = AssetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateTagRequestSchema = TagSchema.omit({
  id: true,
  createdAt: true,
});

export const CreateKeywordRequestSchema = KeywordSchema.omit({
  id: true,
  createdAt: true,
});

export const CreateCollectionRequestSchema = CollectionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 更新请求类型
export const UpdateAssetRequestSchema = AssetSchema.partial().omit({
  id: true,
  createdAt: true,
});

export const UpdateTagRequestSchema = TagSchema.partial().omit({
  id: true,
  createdAt: true,
});

export const UpdateCollectionRequestSchema = CollectionSchema.partial().omit({
  id: true,
  createdAt: true,
});

// 查询参数类型
export const AssetQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  tagIds: z.array(z.string().uuid()).optional(),
  keywordIds: z.array(z.string().uuid()).optional(),
  collectionId: z.string().uuid().optional(),
  formats: z.array(z.enum(['png', 'webp', 'gif', 'jpg'])).optional(),
  search: z.string().optional(), // 搜索关键词
  sortBy: z.enum(['createdAt', 'updatedAt', 'fileName', 'fileSize']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  since: z.number().optional(), // 同步时间戳
});

// 导出请求类型
export type CreateAssetRequest = z.infer<typeof CreateAssetRequestSchema>;
export type CreateTagRequest = z.infer<typeof CreateTagRequestSchema>;
export type CreateKeywordRequest = z.infer<typeof CreateKeywordRequestSchema>;
export type CreateCollectionRequest = z.infer<typeof CreateCollectionRequestSchema>;

export type UpdateAssetRequest = z.infer<typeof UpdateAssetRequestSchema>;
export type UpdateTagRequest = z.infer<typeof UpdateTagRequestSchema>;
export type UpdateCollectionRequest = z.infer<typeof UpdateCollectionRequestSchema>;

export type AssetQuery = z.infer<typeof AssetQuerySchema>;

// ===========================================
// 响应类型
// ===========================================

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

// API 响应包装
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }).optional(),
    timestamp: z.number(),
    requestId: z.string().uuid().optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
  requestId?: string;
};

// 同步响应类型
export const SyncResponseSchema = z.object({
  serverClock: z.number(), // 服务器时钟
  events: z.array(z.any()), // 事件列表（具体类型在 events.ts 中定义）
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

export type SyncResponse = z.infer<typeof SyncResponseSchema>;

// ===========================================
// 类型守卫函数
// ===========================================

export function isAsset(obj: any): obj is Asset {
  return AssetSchema.safeParse(obj).success;
}

export function isTag(obj: any): obj is Tag {
  return TagSchema.safeParse(obj).success;
}

export function isKeyword(obj: any): obj is Keyword {
  return KeywordSchema.safeParse(obj).success;
}

export function isCollection(obj: any): obj is Collection {
  return CollectionSchema.safeParse(obj).success;
}

// ===========================================
// 验证函数
// ===========================================

export function validateAsset(data: unknown): Asset {
  return AssetSchema.parse(data);
}

export function validateTag(data: unknown): Tag {
  return TagSchema.parse(data);
}

export function validateKeyword(data: unknown): Keyword {
  return KeywordSchema.parse(data);
}

export function validateCollection(data: unknown): Collection {
  return CollectionSchema.parse(data);
}

export function validateAssetQuery(data: unknown): AssetQuery {
  return AssetQuerySchema.parse(data);
}
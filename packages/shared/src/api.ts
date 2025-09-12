import { z } from 'zod';
import { OperationEventSchema, type OperationEvent } from './events.js';

// ===========================================
// 通用响应结构
// ===========================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.number(),
  requestId: z.string().uuid().optional(),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
    timestamp: z.number(),
    requestId: z.string().uuid().optional(),
  });

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
  requestId?: string;
};

// ===========================================
// 错误码定义
// ===========================================

export enum ErrorCode {
  // 通用错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  
  // 同步错误
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  INVALID_CLOCK = 'INVALID_CLOCK',
  EVENT_TOO_OLD = 'EVENT_TOO_OLD',
  DUPLICATE_EVENT = 'DUPLICATE_EVENT',
  
  // 资源错误
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  ASSET_TOO_LARGE = 'ASSET_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // 存储错误
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  R2_ERROR = 'R2_ERROR',
  D1_ERROR = 'D1_ERROR',
  KV_ERROR = 'KV_ERROR',
}

// ===========================================
// 设备认证 API
// ===========================================

// POST /auth/device-begin
export const DeviceBeginRequestSchema = z.object({
  deviceName: z.string().min(1).max(100),
  deviceType: z.enum(['desktop', 'mobile', 'web']),
  platform: z.string().max(50).optional(),
  version: z.string().max(20).optional(),
  userId: z.string().uuid().optional(), // 可选的用户ID，用于多用户支持
});

export const DeviceBeginResponseSchema = z.object({
  deviceId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.number(),
  refreshToken: z.string().optional(),
});

export type DeviceBeginRequest = z.infer<typeof DeviceBeginRequestSchema>;
export type DeviceBeginResponse = z.infer<typeof DeviceBeginResponseSchema>;

// POST /auth/device-refresh
export const DeviceRefreshRequestSchema = z.object({
  refreshToken: z.string(),
});

export const DeviceRefreshResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.number(),
});

export type DeviceRefreshRequest = z.infer<typeof DeviceRefreshRequestSchema>;
export type DeviceRefreshResponse = z.infer<typeof DeviceRefreshResponseSchema>;

// ===========================================
// 同步索引 API
// ===========================================

// GET /index?since={clock}&limit={n}&deviceId={id}
export const IndexQuerySchema = z.object({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  deviceId: z.string().uuid().optional(), // 可选过滤特定设备的事件
  types: z.array(z.string()).optional(), // 可选过滤事件类型
});

export const IndexResponseSchema = z.object({
  events: z.array(OperationEventSchema),
  nextClock: z.number().int().min(0),
  hasMore: z.boolean(),
  serverTime: z.number(),
});

export type IndexQuery = z.infer<typeof IndexQuerySchema>;
export type IndexResponse = z.infer<typeof IndexResponseSchema>;

// POST /index/batch
export const IndexBatchRequestSchema = z.object({
  events: z.array(OperationEventSchema).min(1).max(100),
  clientClock: z.number().int().min(0), // 客户端当前时钟
  expectServerClock: z.number().int().min(0).optional(), // 期望的服务器时钟，用于检测冲突
});

export const EventMappingSchema = z.object({
  clientEventId: z.string().uuid(),
  serverEventId: z.string().uuid(),
  serverClock: z.number().int().min(0),
  status: z.enum(['accepted', 'duplicate', 'conflict', 'rejected']),
  conflictReason: z.string().optional(),
});

export const IndexBatchResponseSchema = z.object({
  mappings: z.array(EventMappingSchema),
  serverClock: z.number().int().min(0),
  conflicts: z.array(z.object({
    eventId: z.string().uuid(),
    reason: z.string(),
    suggestedResolution: z.any().optional(),
  })).default([]),
});

export type IndexBatchRequest = z.infer<typeof IndexBatchRequestSchema>;
export type EventMapping = z.infer<typeof EventMappingSchema>;
export type IndexBatchResponse = z.infer<typeof IndexBatchResponseSchema>;

// ===========================================
// R2 存储 API
// ===========================================

// POST /r2/presign-upload
export const PresignUploadRequestSchema = z.object({
  contentHash: z.string().min(1),
  fileName: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  contentLength: z.number().int().min(1).max(50 * 1024 * 1024), // 最大 50MB
  generateThumbnails: z.boolean().default(true),
});

export const PresignUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  uploadHeaders: z.record(z.string()),
  assetKey: z.string(),
  expiresAt: z.number(),
  thumbnailKeys: z.object({
    small: z.string(), // 256px
    medium: z.string(), // 512px
  }).optional(),
});

export type PresignUploadRequest = z.infer<typeof PresignUploadRequestSchema>;
export type PresignUploadResponse = z.infer<typeof PresignUploadResponseSchema>;

// POST /r2/upload-complete
export const UploadCompleteRequestSchema = z.object({
  assetKey: z.string().min(1),
  contentHash: z.string().min(1),
  actualSize: z.number().int().min(1),
  metadata: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
    format: z.string().min(1),
  }).optional(),
});

export const UploadCompleteResponseSchema = z.object({
  assetId: z.string().uuid(),
  urls: z.object({
    original: z.string().url(),
    thumbnails: z.object({
      small: z.string().url(),
      medium: z.string().url(),
    }).optional(),
  }),
});

export type UploadCompleteRequest = z.infer<typeof UploadCompleteRequestSchema>;
export type UploadCompleteResponse = z.infer<typeof UploadCompleteResponseSchema>;

// GET /asset/{id}/thumb?size={small|medium|original}
export const AssetThumbQuerySchema = z.object({
  size: z.enum(['small', 'medium', 'original']).default('medium'),
  download: z.coerce.boolean().default(false), // 是否强制下载
});

export type AssetThumbQuery = z.infer<typeof AssetThumbQuerySchema>;

// ===========================================
// 快照 API
// ===========================================

// GET /snapshot/latest?userId={id}
export const SnapshotLatestQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  includeAssets: z.coerce.boolean().default(false), // 是否包含资产数据
});

export const SnapshotLatestResponseSchema = z.object({
  snapshotId: z.string().uuid(),
  downloadUrl: z.string().url(),
  snapshotClock: z.number().int().min(0),
  createdAt: z.number(),
  expiresAt: z.number(),
  size: z.number().int().min(0),
  checksum: z.string(),
  metadata: z.object({
    assetsCount: z.number().int().min(0),
    tagsCount: z.number().int().min(0),
    keywordsCount: z.number().int().min(0),
    eventsCount: z.number().int().min(0),
  }),
});

export type SnapshotLatestQuery = z.infer<typeof SnapshotLatestQuerySchema>;
export type SnapshotLatestResponse = z.infer<typeof SnapshotLatestResponseSchema>;

// POST /snapshot/create
export const SnapshotCreateRequestSchema = z.object({
  includeAssets: z.boolean().default(true),
  compression: z.enum(['none', 'gzip', 'brotli']).default('gzip'),
  maxAge: z.number().int().min(3600).max(30 * 24 * 3600).default(7 * 24 * 3600), // 默认7天过期
});

export const SnapshotCreateResponseSchema = z.object({
  snapshotId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  estimatedCompletionTime: z.number().optional(),
});

export type SnapshotCreateRequest = z.infer<typeof SnapshotCreateRequestSchema>;
export type SnapshotCreateResponse = z.infer<typeof SnapshotCreateResponseSchema>;

// ===========================================
// 健康检查和状态 API
// ===========================================

// GET /health
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.number(),
  services: z.object({
    d1: z.enum(['healthy', 'degraded', 'unhealthy']),
    r2: z.enum(['healthy', 'degraded', 'unhealthy']),
    kv: z.enum(['healthy', 'degraded', 'unhealthy']),
  }),
  version: z.string(),
  uptime: z.number(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// GET /stats
export const StatsResponseSchema = z.object({
  totalDevices: z.number().int().min(0),
  totalAssets: z.number().int().min(0),
  totalEvents: z.number().int().min(0),
  storageUsed: z.number().int().min(0), // bytes
  lastSyncTime: z.number().optional(),
  activeDevices24h: z.number().int().min(0),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;

// ===========================================
// WebSocket 实时同步 API（可选）
// ===========================================

export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ping'),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('pong'),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('event'),
    event: OperationEventSchema,
  }),
  z.object({
    type: z.literal('sync_request'),
    since: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('sync_response'),
    events: z.array(OperationEventSchema),
    nextClock: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('error'),
    error: ApiErrorSchema,
  }),
]);

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// ===========================================
// 验证函数
// ===========================================

export function validateDeviceBeginRequest(data: unknown): DeviceBeginRequest {
  return DeviceBeginRequestSchema.parse(data);
}

export function validateIndexQuery(data: unknown): IndexQuery {
  return IndexQuerySchema.parse(data);
}

export function validateIndexBatchRequest(data: unknown): IndexBatchRequest {
  return IndexBatchRequestSchema.parse(data);
}

export function validatePresignUploadRequest(data: unknown): PresignUploadRequest {
  return PresignUploadRequestSchema.parse(data);
}

export function validateUploadCompleteRequest(data: unknown): UploadCompleteRequest {
  return UploadCompleteRequestSchema.parse(data);
}

export function validateSnapshotLatestQuery(data: unknown): SnapshotLatestQuery {
  return SnapshotLatestQuerySchema.parse(data);
}

export function validateSnapshotCreateRequest(data: unknown): SnapshotCreateRequest {
  return SnapshotCreateRequestSchema.parse(data);
}

export function validateWebSocketMessage(data: unknown): WebSocketMessage {
  return WebSocketMessageSchema.parse(data);
}

// ===========================================
// 类型守卫函数
// ===========================================

export function isApiError(obj: any): obj is ApiError {
  return ApiErrorSchema.safeParse(obj).success;
}

export function isWebSocketMessage(obj: any): obj is WebSocketMessage {
  return WebSocketMessageSchema.safeParse(obj).success;
}

// ===========================================
// 辅助函数
// ===========================================

export function createApiResponse<T>(
  data?: T,
  error?: ApiError,
  requestId?: string
): ApiResponse<T> {
  return {
    success: !error,
    data,
    error,
    timestamp: Date.now(),
    requestId,
  };
}

export function createApiError(
  code: ErrorCode,
  message: string,
  details?: any,
  requestId?: string
): ApiError {
  return {
    code,
    message,
    details,
    timestamp: Date.now(),
    requestId,
  };
}

// ===========================================
// HTTP 状态码映射
// ===========================================

export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.RATE_LIMITED]: 429,
  
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.DEVICE_NOT_FOUND]: 404,
  
  [ErrorCode.SYNC_CONFLICT]: 409,
  [ErrorCode.INVALID_CLOCK]: 400,
  [ErrorCode.EVENT_TOO_OLD]: 410,
  [ErrorCode.DUPLICATE_EVENT]: 409,
  
  [ErrorCode.ASSET_NOT_FOUND]: 404,
  [ErrorCode.ASSET_TOO_LARGE]: 413,
  [ErrorCode.UNSUPPORTED_FORMAT]: 415,
  [ErrorCode.UPLOAD_FAILED]: 500,
  
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 507,
  [ErrorCode.R2_ERROR]: 502,
  [ErrorCode.D1_ERROR]: 502,
  [ErrorCode.KV_ERROR]: 502,
};

// ===========================================
// 常量定义
// ===========================================

export const API_CONSTANTS = {
  MAX_EVENTS_PER_BATCH: 100,
  MAX_ASSET_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILENAME_LENGTH: 255,
  DEFAULT_TOKEN_EXPIRY: 30 * 24 * 3600 * 1000, // 30天
  DEFAULT_SNAPSHOT_EXPIRY: 7 * 24 * 3600 * 1000, // 7天
  THUMBNAIL_SIZES: {
    small: 256,
    medium: 512,
  },
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
  RATE_LIMITS: {
    auth: { requests: 10, window: 60 * 1000 }, // 10 requests per minute
    sync: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
    upload: { requests: 50, window: 60 * 1000 }, // 50 requests per minute
  },
} as const;
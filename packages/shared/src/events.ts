import { z } from 'zod';
import { 
  AssetSchema, 
  TagSchema, 
  KeywordSchema, 
  AssetTagSchema, 
  AssetKeywordSchema,
  CollectionSchema,
  AssetCollectionSchema,
  DeviceSchema 
} from './types.js';

// ===========================================
// 事件类型枚举
// ===========================================

export enum EventType {
  // Asset 事件
  ASSET_CREATED = 'asset.created',
  ASSET_UPDATED = 'asset.updated',
  ASSET_DELETED = 'asset.deleted',
  ASSET_RESTORED = 'asset.restored',
  
  // Tag 事件
  TAG_CREATED = 'tag.created',
  TAG_UPDATED = 'tag.updated',
  TAG_DELETED = 'tag.deleted',
  
  // Keyword 事件
  KEYWORD_CREATED = 'keyword.created',
  KEYWORD_UPDATED = 'keyword.updated',
  KEYWORD_DELETED = 'keyword.deleted',
  
  // AssetTag 关联事件
  ASSET_TAG_ADDED = 'asset_tag.added',
  ASSET_TAG_REMOVED = 'asset_tag.removed',
  
  // AssetKeyword 关联事件
  ASSET_KEYWORD_ADDED = 'asset_keyword.added',
  ASSET_KEYWORD_REMOVED = 'asset_keyword.removed',
  ASSET_KEYWORD_UPDATED = 'asset_keyword.updated',
  
  // Collection 事件
  COLLECTION_CREATED = 'collection.created',
  COLLECTION_UPDATED = 'collection.updated',
  COLLECTION_DELETED = 'collection.deleted',
  
  // AssetCollection 关联事件
  ASSET_COLLECTION_ADDED = 'asset_collection.added',
  ASSET_COLLECTION_REMOVED = 'asset_collection.removed',
  ASSET_COLLECTION_REORDERED = 'asset_collection.reordered',
  
  // Device 事件
  DEVICE_REGISTERED = 'device.registered',
  DEVICE_UPDATED = 'device.updated',
  DEVICE_DEREGISTERED = 'device.deregistered',
  
  // 同步事件
  SYNC_STARTED = 'sync.started',
  SYNC_COMPLETED = 'sync.completed',
  SYNC_FAILED = 'sync.failed',
  
  // 批量操作事件
  BATCH_OPERATION_STARTED = 'batch.started',
  BATCH_OPERATION_COMPLETED = 'batch.completed',
  BATCH_OPERATION_FAILED = 'batch.failed',
}

// ===========================================
// 事件操作类型
// ===========================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  ADD_RELATION = 'add_relation',
  REMOVE_RELATION = 'remove_relation',
  UPDATE_RELATION = 'update_relation',
  REORDER = 'reorder',
}

// ===========================================
// 基础事件结构
// ===========================================

export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(EventType),
  operation: z.nativeEnum(OperationType),
  deviceId: z.string().uuid(),
  userId: z.string().uuid().optional(), // 多用户支持预留
  timestamp: z.number(), // Unix 时间戳（毫秒）
  serverTimestamp: z.number().optional(), // 服务器时间戳
  version: z.number().int().min(1).default(1), // 事件版本
  causedBy: z.string().uuid().optional(), // 引起此事件的事件ID（用于追踪因果关系）
  batchId: z.string().uuid().optional(), // 批量操作ID
});

// ===========================================
// 具体事件载荷定义
// ===========================================

// Asset 事件载荷
export const AssetEventPayloadSchema = z.object({
  asset: AssetSchema,
  previousAsset: AssetSchema.optional(), // 更新事件时的旧数据
});

// Tag 事件载荷
export const TagEventPayloadSchema = z.object({
  tag: TagSchema,
  previousTag: TagSchema.optional(),
});

// Keyword 事件载荷
export const KeywordEventPayloadSchema = z.object({
  keyword: KeywordSchema,
  previousKeyword: KeywordSchema.optional(),
});

// AssetTag 关联事件载荷
export const AssetTagEventPayloadSchema = z.object({
  assetTag: AssetTagSchema,
  asset: AssetSchema.optional(), // 可选的关联数据
  tag: TagSchema.optional(),
});

// AssetKeyword 关联事件载荷
export const AssetKeywordEventPayloadSchema = z.object({
  assetKeyword: AssetKeywordSchema,
  previousAssetKeyword: AssetKeywordSchema.optional(),
  asset: AssetSchema.optional(),
  keyword: KeywordSchema.optional(),
});

// Collection 事件载荷
export const CollectionEventPayloadSchema = z.object({
  collection: CollectionSchema,
  previousCollection: CollectionSchema.optional(),
});

// AssetCollection 关联事件载荷
export const AssetCollectionEventPayloadSchema = z.object({
  assetCollection: AssetCollectionSchema,
  previousAssetCollection: AssetCollectionSchema.optional(),
  asset: AssetSchema.optional(),
  collection: CollectionSchema.optional(),
  reorderData: z.object({
    fromOrder: z.number(),
    toOrder: z.number(),
    affectedAssets: z.array(z.string().uuid()),
  }).optional(), // 重排序时的额外数据
});

// Device 事件载荷
export const DeviceEventPayloadSchema = z.object({
  device: DeviceSchema,
  previousDevice: DeviceSchema.optional(),
});

// 同步事件载荷
export const SyncEventPayloadSchema = z.object({
  syncId: z.string().uuid(),
  direction: z.enum(['push', 'pull', 'bidirectional']),
  startTime: z.number(),
  endTime: z.number().optional(),
  eventsCount: z.number().int().min(0).optional(),
  conflictsCount: z.number().int().min(0).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

// 批量操作事件载荷
export const BatchOperationEventPayloadSchema = z.object({
  batchId: z.string().uuid(),
  operationType: z.string(),
  totalItems: z.number().int().min(0),
  processedItems: z.number().int().min(0).optional(),
  failedItems: z.number().int().min(0).optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    failedItemIds: z.array(z.string()),
  }).optional(),
});

// ===========================================
// 完整事件定义
// ===========================================

export const OperationEventSchema = BaseEventSchema.and(
  z.discriminatedUnion('type', [
    // Asset 事件
    z.object({
      type: z.literal(EventType.ASSET_CREATED),
      payload: AssetEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_UPDATED),
      payload: AssetEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_DELETED),
      payload: AssetEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_RESTORED),
      payload: AssetEventPayloadSchema,
    }),
    
    // Tag 事件
    z.object({
      type: z.literal(EventType.TAG_CREATED),
      payload: TagEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.TAG_UPDATED),
      payload: TagEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.TAG_DELETED),
      payload: TagEventPayloadSchema,
    }),
    
    // Keyword 事件
    z.object({
      type: z.literal(EventType.KEYWORD_CREATED),
      payload: KeywordEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.KEYWORD_UPDATED),
      payload: KeywordEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.KEYWORD_DELETED),
      payload: KeywordEventPayloadSchema,
    }),
    
    // AssetTag 关联事件
    z.object({
      type: z.literal(EventType.ASSET_TAG_ADDED),
      payload: AssetTagEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_TAG_REMOVED),
      payload: AssetTagEventPayloadSchema,
    }),
    
    // AssetKeyword 关联事件
    z.object({
      type: z.literal(EventType.ASSET_KEYWORD_ADDED),
      payload: AssetKeywordEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_KEYWORD_REMOVED),
      payload: AssetKeywordEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_KEYWORD_UPDATED),
      payload: AssetKeywordEventPayloadSchema,
    }),
    
    // Collection 事件
    z.object({
      type: z.literal(EventType.COLLECTION_CREATED),
      payload: CollectionEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.COLLECTION_UPDATED),
      payload: CollectionEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.COLLECTION_DELETED),
      payload: CollectionEventPayloadSchema,
    }),
    
    // AssetCollection 关联事件
    z.object({
      type: z.literal(EventType.ASSET_COLLECTION_ADDED),
      payload: AssetCollectionEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_COLLECTION_REMOVED),
      payload: AssetCollectionEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.ASSET_COLLECTION_REORDERED),
      payload: AssetCollectionEventPayloadSchema,
    }),
    
    // Device 事件
    z.object({
      type: z.literal(EventType.DEVICE_REGISTERED),
      payload: DeviceEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.DEVICE_UPDATED),
      payload: DeviceEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.DEVICE_DEREGISTERED),
      payload: DeviceEventPayloadSchema,
    }),
    
    // 同步事件
    z.object({
      type: z.literal(EventType.SYNC_STARTED),
      payload: SyncEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.SYNC_COMPLETED),
      payload: SyncEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.SYNC_FAILED),
      payload: SyncEventPayloadSchema,
    }),
    
    // 批量操作事件
    z.object({
      type: z.literal(EventType.BATCH_OPERATION_STARTED),
      payload: BatchOperationEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.BATCH_OPERATION_COMPLETED),
      payload: BatchOperationEventPayloadSchema,
    }),
    z.object({
      type: z.literal(EventType.BATCH_OPERATION_FAILED),
      payload: BatchOperationEventPayloadSchema,
    }),
  ])
);

// ===========================================
// 类型导出
// ===========================================

export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type OperationEvent = z.infer<typeof OperationEventSchema>;

export type AssetEventPayload = z.infer<typeof AssetEventPayloadSchema>;
export type TagEventPayload = z.infer<typeof TagEventPayloadSchema>;
export type KeywordEventPayload = z.infer<typeof KeywordEventPayloadSchema>;
export type AssetTagEventPayload = z.infer<typeof AssetTagEventPayloadSchema>;
export type AssetKeywordEventPayload = z.infer<typeof AssetKeywordEventPayloadSchema>;
export type CollectionEventPayload = z.infer<typeof CollectionEventPayloadSchema>;
export type AssetCollectionEventPayload = z.infer<typeof AssetCollectionEventPayloadSchema>;
export type DeviceEventPayload = z.infer<typeof DeviceEventPayloadSchema>;
export type SyncEventPayload = z.infer<typeof SyncEventPayloadSchema>;
export type BatchOperationEventPayload = z.infer<typeof BatchOperationEventPayloadSchema>;

// ===========================================
// 事件创建辅助函数
// ===========================================

export function createEvent<T extends EventType>(
  type: T,
  operation: OperationType,
  deviceId: string,
  payload: any,
  options?: {
    userId?: string;
    causedBy?: string;
    batchId?: string;
    version?: number;
  }
): OperationEvent {
  const event = {
    id: crypto.randomUUID(),
    type,
    operation,
    deviceId,
    userId: options?.userId,
    timestamp: Date.now(),
    version: options?.version || 1,
    causedBy: options?.causedBy,
    batchId: options?.batchId,
    payload,
  };
  
  return OperationEventSchema.parse(event);
}

// ===========================================
// 类型守卫函数
// ===========================================

export function isOperationEvent(obj: any): obj is OperationEvent {
  return OperationEventSchema.safeParse(obj).success;
}

export function isAssetEvent(event: OperationEvent): event is OperationEvent & { 
  type: EventType.ASSET_CREATED | EventType.ASSET_UPDATED | EventType.ASSET_DELETED | EventType.ASSET_RESTORED 
} {
  return [
    EventType.ASSET_CREATED,
    EventType.ASSET_UPDATED,
    EventType.ASSET_DELETED,
    EventType.ASSET_RESTORED,
  ].includes(event.type);
}

export function isTagEvent(event: OperationEvent): event is OperationEvent & { 
  type: EventType.TAG_CREATED | EventType.TAG_UPDATED | EventType.TAG_DELETED 
} {
  return [
    EventType.TAG_CREATED,
    EventType.TAG_UPDATED,
    EventType.TAG_DELETED,
  ].includes(event.type);
}

export function isKeywordEvent(event: OperationEvent): event is OperationEvent & { 
  type: EventType.KEYWORD_CREATED | EventType.KEYWORD_UPDATED | EventType.KEYWORD_DELETED 
} {
  return [
    EventType.KEYWORD_CREATED,
    EventType.KEYWORD_UPDATED,
    EventType.KEYWORD_DELETED,
  ].includes(event.type);
}

export function isSyncEvent(event: OperationEvent): event is OperationEvent & { 
  type: EventType.SYNC_STARTED | EventType.SYNC_COMPLETED | EventType.SYNC_FAILED 
} {
  return [
    EventType.SYNC_STARTED,
    EventType.SYNC_COMPLETED,
    EventType.SYNC_FAILED,
  ].includes(event.type);
}

export function isBatchEvent(event: OperationEvent): event is OperationEvent & { 
  type: EventType.BATCH_OPERATION_STARTED | EventType.BATCH_OPERATION_COMPLETED | EventType.BATCH_OPERATION_FAILED 
} {
  return [
    EventType.BATCH_OPERATION_STARTED,
    EventType.BATCH_OPERATION_COMPLETED,
    EventType.BATCH_OPERATION_FAILED,
  ].includes(event.type);
}

// ===========================================
// 验证函数
// ===========================================

export function validateOperationEvent(data: unknown): OperationEvent {
  return OperationEventSchema.parse(data);
}

// ===========================================
// 事件过滤器
// ===========================================

export interface EventFilter {
  types?: EventType[];
  operations?: OperationType[];
  deviceIds?: string[];
  userIds?: string[];
  batchIds?: string[];
  since?: number;
  until?: number;
}

export function filterEvents(events: OperationEvent[], filter: EventFilter): OperationEvent[] {
  return events.filter(event => {
    if (filter.types && !filter.types.includes(event.type)) return false;
    if (filter.operations && !filter.operations.includes(event.operation)) return false;
    if (filter.deviceIds && !filter.deviceIds.includes(event.deviceId)) return false;
    if (filter.userIds && event.userId && !filter.userIds.includes(event.userId)) return false;
    if (filter.batchIds && (!event.batchId || !filter.batchIds.includes(event.batchId))) return false;
    if (filter.since && event.timestamp < filter.since) return false;
    if (filter.until && event.timestamp > filter.until) return false;
    return true;
  });
}

// ===========================================
// 事件排序
// ===========================================

export function sortEventsByTimestamp(events: OperationEvent[], order: 'asc' | 'desc' = 'asc'): OperationEvent[] {
  return [...events].sort((a, b) => {
    const diff = a.timestamp - b.timestamp;
    return order === 'asc' ? diff : -diff;
  });
}

// ===========================================
// 事件统计
// ===========================================

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  eventsByOperation: Record<OperationType, number>;
  eventsByDevice: Record<string, number>;
  timeRange: {
    earliest: number;
    latest: number;
  };
}

export function getEventStats(events: OperationEvent[]): EventStats {
  const stats: EventStats = {
    totalEvents: events.length,
    eventsByType: {} as Record<EventType, number>,
    eventsByOperation: {} as Record<OperationType, number>,
    eventsByDevice: {},
    timeRange: {
      earliest: events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : 0,
      latest: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : 0,
    },
  };

  // 初始化计数器
  Object.values(EventType).forEach(type => {
    stats.eventsByType[type] = 0;
  });
  Object.values(OperationType).forEach(op => {
    stats.eventsByOperation[op] = 0;
  });

  // 统计事件
  events.forEach(event => {
    stats.eventsByType[event.type]++;
    stats.eventsByOperation[event.operation]++;
    stats.eventsByDevice[event.deviceId] = (stats.eventsByDevice[event.deviceId] || 0) + 1;
  });

  return stats;
}
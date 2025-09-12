import { describe, it, expect, beforeEach } from 'vitest';
import {
  EventType,
  OperationType,
  createEvent,
  validateOperationEvent,
  isOperationEvent,
  isAssetEvent,
  isTagEvent,
  isKeywordEvent,
  isSyncEvent,
  isBatchEvent,
  filterEvents,
  sortEventsByTimestamp,
  getEventStats,
  type OperationEvent,
  type AssetEventPayload,
  type TagEventPayload,
  type KeywordEventPayload,
  type SyncEventPayload,
} from '../events.js';
import { 
  type Asset, 
  type Tag, 
  type Keyword,
  type AssetTag,
  type AssetKeyword,
} from '../types.js';

describe('Events', () => {
  let mockDeviceId: string;
  let mockUserId: string;
  let mockAsset: Asset;
  let mockTag: Tag;
  let mockKeyword: Keyword;

  beforeEach(() => {
    mockDeviceId = crypto.randomUUID();
    mockUserId = crypto.randomUUID();
    
    mockAsset = {
      id: crypto.randomUUID(),
      contentHash: 'abc123def456',
      filePath: '/path/to/meme.png',
      fileName: 'funny-meme.png',
      formats: ['png', 'webp'],
      meta: {
        width: 800,
        height: 600,
        size: 102400,
        mimeType: 'image/png',
        sourceUrl: 'https://example.com/meme.png',
      },
      thumbnailPath: '/path/to/thumb.webp',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tombstone: false,
    };

    mockTag = {
      id: crypto.randomUUID(),
      name: 'funny',
      aliases: ['humor', 'comedy'],
      color: '#FF5733',
      description: 'Funny and humorous content',
      createdAt: Date.now(),
    };

    mockKeyword = {
      id: crypto.randomUUID(),
      text: 'cat',
      lang: 'en',
      weight: 0.8,
      type: 'manual',
      confidence: 0.95,
      createdAt: Date.now(),
    };
  });

  describe('Event Creation', () => {
    it('should create a valid asset creation event', () => {
      const payload: AssetEventPayload = {
        asset: mockAsset,
      };

      const event = createEvent(
        EventType.ASSET_CREATED,
        OperationType.CREATE,
        mockDeviceId,
        payload,
        { userId: mockUserId }
      );

      expect(event).toBeDefined();
      expect(event.type).toBe(EventType.ASSET_CREATED);
      expect(event.operation).toBe(OperationType.CREATE);
      expect(event.deviceId).toBe(mockDeviceId);
      expect(event.userId).toBe(mockUserId);
      expect(event.payload.asset).toEqual(mockAsset);
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should create a valid asset update event with previous data', () => {
      const updatedAsset = { ...mockAsset, fileName: 'updated-meme.png', updatedAt: Date.now() + 1000 };
      const payload: AssetEventPayload = {
        asset: updatedAsset,
        previousAsset: mockAsset,
      };

      const event = createEvent(
        EventType.ASSET_UPDATED,
        OperationType.UPDATE,
        mockDeviceId,
        payload
      );

      expect(event.type).toBe(EventType.ASSET_UPDATED);
      expect(event.operation).toBe(OperationType.UPDATE);
      expect(event.payload.asset.fileName).toBe('updated-meme.png');
      expect(event.payload.previousAsset?.fileName).toBe('funny-meme.png');
    });

    it('should create a valid tag creation event', () => {
      const payload: TagEventPayload = {
        tag: mockTag,
      };

      const event = createEvent(
        EventType.TAG_CREATED,
        OperationType.CREATE,
        mockDeviceId,
        payload
      );

      expect(event.type).toBe(EventType.TAG_CREATED);
      expect(event.payload.tag).toEqual(mockTag);
    });

    it('should create a valid keyword creation event', () => {
      const payload: KeywordEventPayload = {
        keyword: mockKeyword,
      };

      const event = createEvent(
        EventType.KEYWORD_CREATED,
        OperationType.CREATE,
        mockDeviceId,
        payload
      );

      expect(event.type).toBe(EventType.KEYWORD_CREATED);
      expect(event.payload.keyword).toEqual(mockKeyword);
    });

    it('should create a valid asset-tag association event', () => {
      const assetTag: AssetTag = {
        assetId: mockAsset.id,
        tagId: mockTag.id,
        createdAt: Date.now(),
      };

      const event = createEvent(
        EventType.ASSET_TAG_ADDED,
        OperationType.ADD_RELATION,
        mockDeviceId,
        {
          assetTag,
          asset: mockAsset,
          tag: mockTag,
        }
      );

      expect(event.type).toBe(EventType.ASSET_TAG_ADDED);
      expect(event.operation).toBe(OperationType.ADD_RELATION);
      expect(event.payload.assetTag.assetId).toBe(mockAsset.id);
      expect(event.payload.assetTag.tagId).toBe(mockTag.id);
    });

    it('should create a valid asset-keyword association event', () => {
      const assetKeyword: AssetKeyword = {
        assetId: mockAsset.id,
        keywordId: mockKeyword.id,
        weight: 0.9,
        createdAt: Date.now(),
      };

      const event = createEvent(
        EventType.ASSET_KEYWORD_ADDED,
        OperationType.ADD_RELATION,
        mockDeviceId,
        {
          assetKeyword,
          asset: mockAsset,
          keyword: mockKeyword,
        }
      );

      expect(event.type).toBe(EventType.ASSET_KEYWORD_ADDED);
      expect(event.payload.assetKeyword.weight).toBe(0.9);
    });

    it('should create a valid sync event', () => {
      const syncId = crypto.randomUUID();
      const payload: SyncEventPayload = {
        syncId,
        direction: 'bidirectional',
        startTime: Date.now(),
        endTime: Date.now() + 5000,
        eventsCount: 42,
        conflictsCount: 2,
      };

      const event = createEvent(
        EventType.SYNC_COMPLETED,
        OperationType.UPDATE,
        mockDeviceId,
        payload
      );

      expect(event.type).toBe(EventType.SYNC_COMPLETED);
      expect(event.payload.syncId).toBe(syncId);
      expect(event.payload.eventsCount).toBe(42);
      expect(event.payload.conflictsCount).toBe(2);
    });

    it('should create event with batch ID', () => {
      const batchId = crypto.randomUUID();
      const payload: AssetEventPayload = { asset: mockAsset };

      const event = createEvent(
        EventType.ASSET_CREATED,
        OperationType.CREATE,
        mockDeviceId,
        payload,
        { batchId }
      );

      expect(event.batchId).toBe(batchId);
    });

    it('should create event with causedBy reference', () => {
      const causedBy = crypto.randomUUID();
      const payload: AssetEventPayload = { asset: mockAsset };

      const event = createEvent(
        EventType.ASSET_UPDATED,
        OperationType.UPDATE,
        mockDeviceId,
        payload,
        { causedBy }
      );

      expect(event.causedBy).toBe(causedBy);
    });
  });

  describe('Event Validation', () => {
    it('should validate a correct event', () => {
      const payload: AssetEventPayload = { asset: mockAsset };
      const event = createEvent(
        EventType.ASSET_CREATED,
        OperationType.CREATE,
        mockDeviceId,
        payload
      );

      expect(() => validateOperationEvent(event)).not.toThrow();
      const validated = validateOperationEvent(event);
      expect(validated).toEqual(event);
    });

    it('should reject invalid event data', () => {
      const invalidEvent = {
        id: 'not-a-uuid',
        type: 'invalid-type',
        operation: 'invalid-operation',
        deviceId: mockDeviceId,
        timestamp: 'not-a-number',
        payload: {},
      };

      expect(() => validateOperationEvent(invalidEvent)).toThrow();
    });

    it('should reject event with missing required fields', () => {
      const incompleteEvent = {
        type: EventType.ASSET_CREATED,
        operation: OperationType.CREATE,
        // missing deviceId, timestamp, etc.
      };

      expect(() => validateOperationEvent(incompleteEvent)).toThrow();
    });
  });

  describe('Type Guards', () => {
    let assetEvent: OperationEvent;
    let tagEvent: OperationEvent;
    let keywordEvent: OperationEvent;
    let syncEvent: OperationEvent;
    let batchEvent: OperationEvent;

    beforeEach(() => {
      assetEvent = createEvent(EventType.ASSET_CREATED, OperationType.CREATE, mockDeviceId, { asset: mockAsset });
      tagEvent = createEvent(EventType.TAG_CREATED, OperationType.CREATE, mockDeviceId, { tag: mockTag });
      keywordEvent = createEvent(EventType.KEYWORD_CREATED, OperationType.CREATE, mockDeviceId, { keyword: mockKeyword });
      syncEvent = createEvent(EventType.SYNC_STARTED, OperationType.CREATE, mockDeviceId, {
        syncId: crypto.randomUUID(),
        direction: 'pull' as const,
        startTime: Date.now(),
      });
      batchEvent = createEvent(EventType.BATCH_OPERATION_STARTED, OperationType.CREATE, mockDeviceId, {
        batchId: crypto.randomUUID(),
        operationType: 'bulk_import',
        totalItems: 100,
        startTime: Date.now(),
      });
    });

    it('should correctly identify operation events', () => {
      expect(isOperationEvent(assetEvent)).toBe(true);
      expect(isOperationEvent(tagEvent)).toBe(true);
      expect(isOperationEvent({})).toBe(false);
      expect(isOperationEvent(null)).toBe(false);
    });

    it('should correctly identify asset events', () => {
      expect(isAssetEvent(assetEvent)).toBe(true);
      expect(isAssetEvent(tagEvent)).toBe(false);
      expect(isAssetEvent(keywordEvent)).toBe(false);
    });

    it('should correctly identify tag events', () => {
      expect(isTagEvent(tagEvent)).toBe(true);
      expect(isTagEvent(assetEvent)).toBe(false);
      expect(isTagEvent(keywordEvent)).toBe(false);
    });

    it('should correctly identify keyword events', () => {
      expect(isKeywordEvent(keywordEvent)).toBe(true);
      expect(isKeywordEvent(assetEvent)).toBe(false);
      expect(isKeywordEvent(tagEvent)).toBe(false);
    });

    it('should correctly identify sync events', () => {
      expect(isSyncEvent(syncEvent)).toBe(true);
      expect(isSyncEvent(assetEvent)).toBe(false);
      expect(isSyncEvent(batchEvent)).toBe(false);
    });

    it('should correctly identify batch events', () => {
      expect(isBatchEvent(batchEvent)).toBe(true);
      expect(isBatchEvent(syncEvent)).toBe(false);
      expect(isBatchEvent(assetEvent)).toBe(false);
    });
  });

  describe('Event Filtering', () => {
    let events: OperationEvent[];

    beforeEach(() => {
      const device1 = crypto.randomUUID();
      const device2 = crypto.randomUUID();
      const user1 = crypto.randomUUID();
      const batchId = crypto.randomUUID();

      events = [
        createEvent(EventType.ASSET_CREATED, OperationType.CREATE, device1, { asset: mockAsset }, { userId: user1 }),
        createEvent(EventType.TAG_CREATED, OperationType.CREATE, device2, { tag: mockTag }),
        createEvent(EventType.ASSET_UPDATED, OperationType.UPDATE, device1, { asset: mockAsset }, { batchId }),
        createEvent(EventType.KEYWORD_CREATED, OperationType.CREATE, device1, { keyword: mockKeyword }),
      ];

      // 设置不同的时间戳
      events[0].timestamp = 1000;
      events[1].timestamp = 2000;
      events[2].timestamp = 3000;
      events[3].timestamp = 4000;
    });

    it('should filter events by type', () => {
      const filtered = filterEvents(events, {
        types: [EventType.ASSET_CREATED, EventType.ASSET_UPDATED],
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.type === EventType.ASSET_CREATED || e.type === EventType.ASSET_UPDATED)).toBe(true);
    });

    it('should filter events by operation', () => {
      const filtered = filterEvents(events, {
        operations: [OperationType.CREATE],
      });

      expect(filtered).toHaveLength(3);
      expect(filtered.every(e => e.operation === OperationType.CREATE)).toBe(true);
    });

    it('should filter events by device ID', () => {
      const deviceId = events[0].deviceId;
      const filtered = filterEvents(events, {
        deviceIds: [deviceId],
      });

      expect(filtered.every(e => e.deviceId === deviceId)).toBe(true);
    });

    it('should filter events by time range', () => {
      const filtered = filterEvents(events, {
        since: 1500,
        until: 3500,
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.timestamp >= 1500 && e.timestamp <= 3500)).toBe(true);
    });

    it('should filter events by batch ID', () => {
      const batchId = events[2].batchId!;
      const filtered = filterEvents(events, {
        batchIds: [batchId],
      });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(e => e.batchId === batchId)).toBe(true);
    });

    it('should apply multiple filters', () => {
      const deviceId = events[0].deviceId;
      const filtered = filterEvents(events, {
        deviceIds: [deviceId],
        operations: [OperationType.CREATE],
        since: 500,
      });

      expect(filtered.every(e => 
        e.deviceId === deviceId && 
        e.operation === OperationType.CREATE && 
        e.timestamp >= 500
      )).toBe(true);
    });
  });

  describe('Event Sorting', () => {
    let events: OperationEvent[];

    beforeEach(() => {
      events = [
        createEvent(EventType.ASSET_CREATED, OperationType.CREATE, mockDeviceId, { asset: mockAsset }),
        createEvent(EventType.TAG_CREATED, OperationType.CREATE, mockDeviceId, { tag: mockTag }),
        createEvent(EventType.KEYWORD_CREATED, OperationType.CREATE, mockDeviceId, { keyword: mockKeyword }),
      ];

      events[0].timestamp = 3000;
      events[1].timestamp = 1000;
      events[2].timestamp = 2000;
    });

    it('should sort events by timestamp in ascending order', () => {
      const sorted = sortEventsByTimestamp(events, 'asc');

      expect(sorted[0].timestamp).toBe(1000);
      expect(sorted[1].timestamp).toBe(2000);
      expect(sorted[2].timestamp).toBe(3000);
    });

    it('should sort events by timestamp in descending order', () => {
      const sorted = sortEventsByTimestamp(events, 'desc');

      expect(sorted[0].timestamp).toBe(3000);
      expect(sorted[1].timestamp).toBe(2000);
      expect(sorted[2].timestamp).toBe(1000);
    });

    it('should not mutate original array', () => {
      const originalOrder = events.map(e => e.timestamp);
      sortEventsByTimestamp(events, 'asc');

      expect(events.map(e => e.timestamp)).toEqual(originalOrder);
    });
  });

  describe('Event Statistics', () => {
    let events: OperationEvent[];

    beforeEach(() => {
      const device1 = crypto.randomUUID();
      const device2 = crypto.randomUUID();

      events = [
        createEvent(EventType.ASSET_CREATED, OperationType.CREATE, device1, { asset: mockAsset }),
        createEvent(EventType.ASSET_UPDATED, OperationType.UPDATE, device1, { asset: mockAsset }),
        createEvent(EventType.TAG_CREATED, OperationType.CREATE, device2, { tag: mockTag }),
        createEvent(EventType.TAG_CREATED, OperationType.CREATE, device1, { tag: mockTag }),
      ];

      events[0].timestamp = 1000;
      events[1].timestamp = 2000;
      events[2].timestamp = 3000;
      events[3].timestamp = 4000;
    });

    it('should calculate correct event statistics', () => {
      const stats = getEventStats(events);

      expect(stats.totalEvents).toBe(4);
      expect(stats.eventsByType[EventType.ASSET_CREATED]).toBe(1);
      expect(stats.eventsByType[EventType.ASSET_UPDATED]).toBe(1);
      expect(stats.eventsByType[EventType.TAG_CREATED]).toBe(2);
      expect(stats.eventsByOperation[OperationType.CREATE]).toBe(3);
      expect(stats.eventsByOperation[OperationType.UPDATE]).toBe(1);
      expect(stats.timeRange.earliest).toBe(1000);
      expect(stats.timeRange.latest).toBe(4000);
    });

    it('should handle empty event array', () => {
      const stats = getEventStats([]);

      expect(stats.totalEvents).toBe(0);
      expect(stats.timeRange.earliest).toBe(0);
      expect(stats.timeRange.latest).toBe(0);
    });

    it('should count events by device', () => {
      const stats = getEventStats(events);
      const device1 = events[0].deviceId;
      const device2 = events[2].deviceId;

      expect(stats.eventsByDevice[device1]).toBe(3);
      expect(stats.eventsByDevice[device2]).toBe(1);
    });
  });

  describe('Complex Event Scenarios', () => {
    it('should handle batch operation with multiple related events', () => {
      const batchId = crypto.randomUUID();
      
      // 批量操作开始事件
      const batchStartEvent = createEvent(
        EventType.BATCH_OPERATION_STARTED,
        OperationType.CREATE,
        mockDeviceId,
        {
          batchId,
          operationType: 'bulk_import',
          totalItems: 3,
          startTime: Date.now(),
        },
        { batchId }
      );

      // 批量操作中的具体事件
      const assetEvents = [
        createEvent(EventType.ASSET_CREATED, OperationType.CREATE, mockDeviceId, { asset: mockAsset }, { batchId }),
        createEvent(EventType.TAG_CREATED, OperationType.CREATE, mockDeviceId, { tag: mockTag }, { batchId }),
        createEvent(EventType.KEYWORD_CREATED, OperationType.CREATE, mockDeviceId, { keyword: mockKeyword }, { batchId }),
      ];

      // 批量操作完成事件
      const batchEndEvent = createEvent(
        EventType.BATCH_OPERATION_COMPLETED,
        OperationType.UPDATE,
        mockDeviceId,
        {
          batchId,
          operationType: 'bulk_import',
          totalItems: 3,
          processedItems: 3,
          failedItems: 0,
          startTime: batchStartEvent.payload.startTime,
          endTime: Date.now(),
        },
        { batchId }
      );

      const allEvents = [batchStartEvent, ...assetEvents, batchEndEvent];

      // 验证所有事件都有相同的 batchId
      expect(allEvents.every(e => e.batchId === batchId)).toBe(true);

      // 验证可以通过 batchId 过滤出所有相关事件
      const batchEvents = filterEvents(allEvents, { batchIds: [batchId] });
      expect(batchEvents).toHaveLength(5);

      // 验证批量事件类型守卫
      expect(isBatchEvent(batchStartEvent)).toBe(true);
      expect(isBatchEvent(batchEndEvent)).toBe(true);
      expect(assetEvents.some(e => isBatchEvent(e))).toBe(false);
    });

    it('should handle event causality chain', () => {
      // 原始事件：创建资源
      const assetCreatedEvent = createEvent(
        EventType.ASSET_CREATED,
        OperationType.CREATE,
        mockDeviceId,
        { asset: mockAsset }
      );

      // 由创建资源引起的事件：添加标签
      const tagAddedEvent = createEvent(
        EventType.ASSET_TAG_ADDED,
        OperationType.ADD_RELATION,
        mockDeviceId,
        {
          assetTag: {
            assetId: mockAsset.id,
            tagId: mockTag.id,
            createdAt: Date.now(),
          },
          asset: mockAsset,
          tag: mockTag,
        },
        { causedBy: assetCreatedEvent.id }
      );

      // 由添加标签引起的事件：添加关键词
      const keywordAddedEvent = createEvent(
        EventType.ASSET_KEYWORD_ADDED,
        OperationType.ADD_RELATION,
        mockDeviceId,
        {
          assetKeyword: {
            assetId: mockAsset.id,
            keywordId: mockKeyword.id,
            weight: 0.8,
            createdAt: Date.now(),
          },
          asset: mockAsset,
          keyword: mockKeyword,
        },
        { causedBy: tagAddedEvent.id }
      );

      // 验证因果关系链
      expect(tagAddedEvent.causedBy).toBe(assetCreatedEvent.id);
      expect(keywordAddedEvent.causedBy).toBe(tagAddedEvent.id);

      // 验证事件类型
      expect(isAssetEvent(assetCreatedEvent)).toBe(true);
      expect(isAssetEvent(tagAddedEvent)).toBe(false);
      expect(isAssetEvent(keywordAddedEvent)).toBe(false);
    });

    it('should handle sync conflict scenario', () => {
      const syncId = crypto.randomUUID();
      
      const syncFailedEvent = createEvent(
        EventType.SYNC_FAILED,
        OperationType.UPDATE,
        mockDeviceId,
        {
          syncId,
          direction: 'bidirectional' as const,
          startTime: Date.now() - 5000,
          endTime: Date.now(),
          eventsCount: 10,
          conflictsCount: 3,
          error: {
            code: 'SYNC_CONFLICT',
            message: 'Multiple devices modified the same asset',
            details: {
              conflictingAssetIds: [mockAsset.id],
              conflictingDevices: [mockDeviceId, crypto.randomUUID()],
            },
          },
        }
      );

      expect(isSyncEvent(syncFailedEvent)).toBe(true);
      expect(syncFailedEvent.payload.error?.code).toBe('SYNC_CONFLICT');
      expect(syncFailedEvent.payload.conflictsCount).toBe(3);
    });
  });
});
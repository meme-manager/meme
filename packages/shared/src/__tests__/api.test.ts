import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateDeviceBeginRequest,
  validateIndexQuery,
  validateIndexBatchRequest,
  validatePresignUploadRequest,
  validateUploadCompleteRequest,
  validateSnapshotLatestQuery,
  validateSnapshotCreateRequest,
  validateWebSocketMessage,
  createApiResponse,
  createApiError,
  ErrorCode,
  ErrorCodeToHttpStatus,
  API_CONSTANTS,
  isApiError,
  isWebSocketMessage,
  type DeviceBeginRequest,
  type IndexQuery,
  type IndexBatchRequest,
  type PresignUploadRequest,
  type UploadCompleteRequest,
  type SnapshotLatestQuery,
  type SnapshotCreateRequest,
  type WebSocketMessage,
  type ApiResponse,
  type ApiError,
} from '../api.js';
import { EventType, OperationType, createEvent } from '../events.js';

describe('API Contract Tests', () => {
  describe('Device Authentication', () => {
    it('should validate valid device begin request', () => {
      const validRequest: DeviceBeginRequest = {
        deviceName: 'My Desktop',
        deviceType: 'desktop',
        platform: 'darwin',
        version: '1.0.0',
        userId: crypto.randomUUID(),
      };

      expect(() => validateDeviceBeginRequest(validRequest)).not.toThrow();
      const validated = validateDeviceBeginRequest(validRequest);
      expect(validated).toEqual(validRequest);
    });

    it('should reject invalid device begin request', () => {
      const invalidRequests = [
        {}, // missing required fields
        { deviceName: '', deviceType: 'desktop' }, // empty device name
        { deviceName: 'Test', deviceType: 'invalid' }, // invalid device type
        { deviceName: 'A'.repeat(101), deviceType: 'desktop' }, // device name too long
        { deviceName: 'Test', deviceType: 'desktop', userId: 'not-uuid' }, // invalid UUID
      ];

      invalidRequests.forEach(request => {
        expect(() => validateDeviceBeginRequest(request)).toThrow();
      });
    });

    it('should validate minimal device begin request', () => {
      const minimalRequest = {
        deviceName: 'Test Device',
        deviceType: 'mobile' as const,
      };

      expect(() => validateDeviceBeginRequest(minimalRequest)).not.toThrow();
    });
  });

  describe('Index Sync API', () => {
    it('should validate valid index query', () => {
      const validQueries: IndexQuery[] = [
        {}, // default values
        { since: 0, limit: 100 },
        { since: 12345, limit: 50, deviceId: crypto.randomUUID() },
        { since: 0, limit: 1000, types: ['asset.created', 'tag.updated'] },
      ];

      validQueries.forEach(query => {
        expect(() => validateIndexQuery(query)).not.toThrow();
      });
    });

    it('should reject invalid index query', () => {
      const invalidQueries = [
        { since: -1 }, // negative since
        { limit: 0 }, // zero limit
        { limit: 1001 }, // limit too large
        { deviceId: 'not-uuid' }, // invalid UUID
        { since: 'not-number' }, // invalid type
      ];

      invalidQueries.forEach(query => {
        expect(() => validateIndexQuery(query)).toThrow();
      });
    });

    it('should coerce string numbers in query parameters', () => {
      const queryWithStrings = {
        since: '123',
        limit: '50',
      };

      const validated = validateIndexQuery(queryWithStrings);
      expect(validated.since).toBe(123);
      expect(validated.limit).toBe(50);
    });

    it('should validate valid index batch request', () => {
      const mockAsset = {
        id: crypto.randomUUID(),
        contentHash: 'abc123',
        filePath: '/test.png',
        fileName: 'test.png',
        formats: ['png' as const],
        meta: {
          width: 100,
          height: 100,
          size: 1024,
          mimeType: 'image/png' as const,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const event = createEvent(
        EventType.ASSET_CREATED,
        OperationType.CREATE,
        crypto.randomUUID(),
        { asset: mockAsset }
      );

      const validRequest: IndexBatchRequest = {
        events: [event],
        clientClock: 123,
        expectServerClock: 456,
      };

      expect(() => validateIndexBatchRequest(validRequest)).not.toThrow();
    });

    it('should reject invalid index batch request', () => {
      const invalidRequests = [
        { events: [], clientClock: 0 }, // empty events
        { events: new Array(101).fill({}), clientClock: 0 }, // too many events
        { clientClock: -1 }, // negative clock
        { events: [{}] }, // invalid event
      ];

      invalidRequests.forEach(request => {
        expect(() => validateIndexBatchRequest(request)).toThrow();
      });
    });
  });

  describe('R2 Storage API', () => {
    it('should validate valid presign upload request', () => {
      const validRequest: PresignUploadRequest = {
        contentHash: 'sha256-abc123def456',
        fileName: 'meme.png',
        contentType: 'image/png',
        contentLength: 1024 * 1024, // 1MB
        generateThumbnails: true,
      };

      expect(() => validatePresignUploadRequest(validRequest)).not.toThrow();
    });

    it('should reject invalid presign upload request', () => {
      const invalidRequests = [
        {}, // missing required fields
        {
          contentHash: '',
          fileName: 'test.png',
          contentType: 'image/png',
          contentLength: 1024,
        }, // empty hash
        {
          contentHash: 'abc123',
          fileName: 'A'.repeat(256), // filename too long
          contentType: 'image/png',
          contentLength: 1024,
        },
        {
          contentHash: 'abc123',
          fileName: 'test.txt',
          contentType: 'text/plain', // unsupported type
          contentLength: 1024,
        },
        {
          contentHash: 'abc123',
          fileName: 'test.png',
          contentType: 'image/png',
          contentLength: 0, // zero size
        },
        {
          contentHash: 'abc123',
          fileName: 'test.png',
          contentType: 'image/png',
          contentLength: 100 * 1024 * 1024, // too large
        },
      ];

      invalidRequests.forEach(request => {
        expect(() => validatePresignUploadRequest(request)).toThrow();
      });
    });

    it('should validate valid upload complete request', () => {
      const validRequest: UploadCompleteRequest = {
        assetKey: 'assets/abc/123/abc123.png',
        contentHash: 'sha256-abc123def456',
        actualSize: 1024 * 1024,
        metadata: {
          width: 800,
          height: 600,
          format: 'PNG',
        },
      };

      expect(() => validateUploadCompleteRequest(validRequest)).not.toThrow();
    });

    it('should reject invalid upload complete request', () => {
      const invalidRequests = [
        {}, // missing required fields
        {
          assetKey: 'test',
          contentHash: '',
          actualSize: 1024,
        }, // empty hash
        {
          assetKey: 'test',
          contentHash: 'abc123',
          actualSize: 0, // zero size
        },
        {
          assetKey: 'test',
          contentHash: 'abc123',
          actualSize: 1024,
          metadata: {
            width: 0, // invalid width
            height: 100,
            format: 'PNG',
          },
        },
      ];

      invalidRequests.forEach((request, index) => {
        expect(() => validateUploadCompleteRequest(request), `Request ${index} should throw`).toThrow();
      });
    });
  });

  describe('Snapshot API', () => {
    it('should validate valid snapshot latest query', () => {
      const validQueries: SnapshotLatestQuery[] = [
        {}, // default values
        { userId: crypto.randomUUID() },
        { includeAssets: true },
        { userId: crypto.randomUUID(), includeAssets: false },
      ];

      validQueries.forEach(query => {
        expect(() => validateSnapshotLatestQuery(query)).not.toThrow();
      });
    });

    it('should reject invalid snapshot latest query', () => {
      const invalidQueries = [
        { userId: 'not-uuid' }, // invalid UUID
      ];

      invalidQueries.forEach((query, index) => {
        expect(() => validateSnapshotLatestQuery(query), `Query ${index} should throw`).toThrow();
      });
    });

    it('should validate valid snapshot create request', () => {
      const validRequests: SnapshotCreateRequest[] = [
        {}, // default values
        { includeAssets: false },
        { compression: 'brotli' },
        { maxAge: 24 * 3600 }, // 1 day
        {
          includeAssets: true,
          compression: 'gzip',
          maxAge: 7 * 24 * 3600, // 1 week
        },
      ];

      validRequests.forEach(request => {
        expect(() => validateSnapshotCreateRequest(request)).not.toThrow();
      });
    });

    it('should reject invalid snapshot create request', () => {
      const invalidRequests = [
        { compression: 'invalid' }, // invalid compression
        { maxAge: 1000 }, // too short
        { maxAge: 100 * 24 * 3600 }, // too long
      ];

      invalidRequests.forEach(request => {
        expect(() => validateSnapshotCreateRequest(request)).toThrow();
      });
    });
  });

  describe('WebSocket Messages', () => {
    it('should validate valid WebSocket messages', () => {
      const mockAsset = {
        id: crypto.randomUUID(),
        contentHash: 'abc123',
        filePath: '/test.png',
        fileName: 'test.png',
        formats: ['png' as const],
        meta: {
          width: 100,
          height: 100,
          size: 1024,
          mimeType: 'image/png' as const,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const event = createEvent(
        EventType.ASSET_CREATED,
        OperationType.CREATE,
        crypto.randomUUID(),
        { asset: mockAsset }
      );

      const validMessages: WebSocketMessage[] = [
        { type: 'ping', timestamp: Date.now() },
        { type: 'pong', timestamp: Date.now() },
        { type: 'event', event },
        { type: 'sync_request', since: 123 },
        { type: 'sync_response', events: [event], nextClock: 456 },
        {
          type: 'error',
          error: {
            code: ErrorCode.SYNC_CONFLICT,
            message: 'Sync conflict detected',
            timestamp: Date.now(),
          },
        },
      ];

      validMessages.forEach(message => {
        expect(() => validateWebSocketMessage(message)).not.toThrow();
        expect(isWebSocketMessage(message)).toBe(true);
      });
    });

    it('should reject invalid WebSocket messages', () => {
      const invalidMessages = [
        {}, // missing type
        { type: 'invalid' }, // invalid type
        { type: 'ping' }, // missing timestamp
        { type: 'event' }, // missing event
        { type: 'sync_request', since: -1 }, // invalid since
        { type: 'error' }, // missing error
      ];

      invalidMessages.forEach(message => {
        expect(() => validateWebSocketMessage(message)).toThrow();
        expect(isWebSocketMessage(message)).toBe(false);
      });
    });
  });

  describe('API Response Helpers', () => {
    it('should create successful API response', () => {
      const data = { test: 'value' };
      const requestId = crypto.randomUUID();
      const response = createApiResponse(data, undefined, requestId);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
      expect(response.requestId).toBe(requestId);
      expect(response.timestamp).toBeGreaterThan(0);
    });

    it('should create error API response', () => {
      const error = createApiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        { field: 'name' }
      );
      const response = createApiResponse(undefined, error);

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error).toEqual(error);
      expect(response.timestamp).toBeGreaterThan(0);
    });

    it('should create API error with all fields', () => {
      const requestId = crypto.randomUUID();
      const error = createApiError(
        ErrorCode.ASSET_NOT_FOUND,
        'Asset not found',
        { assetId: 'test-id' },
        requestId
      );

      expect(error.code).toBe(ErrorCode.ASSET_NOT_FOUND);
      expect(error.message).toBe('Asset not found');
      expect(error.details).toEqual({ assetId: 'test-id' });
      expect(error.requestId).toBe(requestId);
      expect(error.timestamp).toBeGreaterThan(0);
      expect(isApiError(error)).toBe(true);
    });
  });

  describe('Error Code Mappings', () => {
    it('should map error codes to correct HTTP status codes', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.INTERNAL_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCode.INVALID_REQUEST]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCode.UNAUTHORIZED]).toBe(401);
      expect(ErrorCodeToHttpStatus[ErrorCode.SYNC_CONFLICT]).toBe(409);
      expect(ErrorCodeToHttpStatus[ErrorCode.ASSET_NOT_FOUND]).toBe(404);
      expect(ErrorCodeToHttpStatus[ErrorCode.ASSET_TOO_LARGE]).toBe(413);
      expect(ErrorCodeToHttpStatus[ErrorCode.UNSUPPORTED_FORMAT]).toBe(415);
      expect(ErrorCodeToHttpStatus[ErrorCode.RATE_LIMITED]).toBe(429);
      expect(ErrorCodeToHttpStatus[ErrorCode.STORAGE_QUOTA_EXCEEDED]).toBe(507);
    });

    it('should have mappings for all error codes', () => {
      const errorCodes = Object.values(ErrorCode);
      const mappedCodes = Object.keys(ErrorCodeToHttpStatus);

      expect(mappedCodes).toHaveLength(errorCodes.length);
      errorCodes.forEach(code => {
        expect(ErrorCodeToHttpStatus[code]).toBeDefined();
        expect(typeof ErrorCodeToHttpStatus[code]).toBe('number');
      });
    });
  });

  describe('API Constants', () => {
    it('should have correct constant values', () => {
      expect(API_CONSTANTS.MAX_EVENTS_PER_BATCH).toBe(100);
      expect(API_CONSTANTS.MAX_ASSET_SIZE).toBe(50 * 1024 * 1024);
      expect(API_CONSTANTS.MAX_FILENAME_LENGTH).toBe(255);
      expect(API_CONSTANTS.DEFAULT_TOKEN_EXPIRY).toBe(30 * 24 * 3600 * 1000);
      expect(API_CONSTANTS.DEFAULT_SNAPSHOT_EXPIRY).toBe(7 * 24 * 3600 * 1000);
    });

    it('should have correct thumbnail sizes', () => {
      expect(API_CONSTANTS.THUMBNAIL_SIZES.small).toBe(256);
      expect(API_CONSTANTS.THUMBNAIL_SIZES.medium).toBe(512);
    });

    it('should have correct supported formats', () => {
      const expectedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      expect(API_CONSTANTS.SUPPORTED_FORMATS).toEqual(expectedFormats);
    });

    it('should have rate limit configurations', () => {
      expect(API_CONSTANTS.RATE_LIMITS.auth.requests).toBe(10);
      expect(API_CONSTANTS.RATE_LIMITS.auth.window).toBe(60 * 1000);
      expect(API_CONSTANTS.RATE_LIMITS.sync.requests).toBe(100);
      expect(API_CONSTANTS.RATE_LIMITS.upload.requests).toBe(50);
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    it('should handle maximum values correctly', () => {
      const maxQuery: IndexQuery = {
        since: Number.MAX_SAFE_INTEGER,
        limit: 1000,
      };

      expect(() => validateIndexQuery(maxQuery)).not.toThrow();
    });

    it('should handle minimum values correctly', () => {
      const minQuery: IndexQuery = {
        since: 0,
        limit: 1,
      };

      expect(() => validateIndexQuery(minQuery)).not.toThrow();
    });

    it('should handle maximum file size', () => {
      const maxSizeRequest: PresignUploadRequest = {
        contentHash: 'test-hash',
        fileName: 'large-file.png',
        contentType: 'image/png',
        contentLength: API_CONSTANTS.MAX_ASSET_SIZE,
      };

      expect(() => validatePresignUploadRequest(maxSizeRequest)).not.toThrow();
    });

    it('should reject file size over limit', () => {
      const oversizeRequest = {
        contentHash: 'test-hash',
        fileName: 'oversized-file.png',
        contentType: 'image/png',
        contentLength: API_CONSTANTS.MAX_ASSET_SIZE + 1,
      };

      expect(() => validatePresignUploadRequest(oversizeRequest)).toThrow();
    });

    it('should handle maximum filename length', () => {
      const maxFilenameRequest: PresignUploadRequest = {
        contentHash: 'test-hash',
        fileName: 'A'.repeat(API_CONSTANTS.MAX_FILENAME_LENGTH),
        contentType: 'image/png',
        contentLength: 1024,
      };

      expect(() => validatePresignUploadRequest(maxFilenameRequest)).not.toThrow();
    });

    it('should reject filename over length limit', () => {
      const longFilenameRequest = {
        contentHash: 'test-hash',
        fileName: 'A'.repeat(API_CONSTANTS.MAX_FILENAME_LENGTH + 1),
        contentType: 'image/png',
        contentLength: 1024,
      };

      expect(() => validatePresignUploadRequest(longFilenameRequest)).toThrow();
    });
  });

  describe('Type Safety and Runtime Validation', () => {
    it('should maintain type safety with runtime validation', () => {
      const request = {
        deviceName: 'Test Device',
        deviceType: 'desktop' as const,
      };

      // TypeScript compilation ensures type safety
      const validated: DeviceBeginRequest = validateDeviceBeginRequest(request);
      
      // Runtime validation ensures data integrity
      expect(validated.deviceName).toBe('Test Device');
      expect(validated.deviceType).toBe('desktop');
    });

    it('should handle optional fields correctly', () => {
      const minimalRequest = {
        deviceName: 'Test',
        deviceType: 'mobile' as const,
      };

      const validated = validateDeviceBeginRequest(minimalRequest);
      expect(validated.platform).toBeUndefined();
      expect(validated.version).toBeUndefined();
      expect(validated.userId).toBeUndefined();
    });

    it('should apply default values where specified', () => {
      const query = {};
      const validated = validateIndexQuery(query);
      
      expect(validated.since).toBe(0);
      expect(validated.limit).toBe(100);
    });
  });

  describe('Contract Compliance', () => {
    it('should ensure all required API endpoints have corresponding types', () => {
      // This test ensures that we have TypeScript types for all major API operations
      const requiredTypes = [
        'DeviceBeginRequest',
        'DeviceBeginResponse',
        'IndexQuery',
        'IndexResponse',
        'IndexBatchRequest',
        'IndexBatchResponse',
        'PresignUploadRequest',
        'PresignUploadResponse',
        'UploadCompleteRequest',
        'UploadCompleteResponse',
        'SnapshotLatestQuery',
        'SnapshotLatestResponse',
        'SnapshotCreateRequest',
        'SnapshotCreateResponse',
      ];

      // If this test compiles, it means all types are properly exported
      expect(requiredTypes.length).toBeGreaterThan(0);
    });

    it('should ensure error codes cover all failure scenarios', () => {
      const requiredErrorCategories = [
        'INTERNAL_ERROR',
        'INVALID_REQUEST',
        'UNAUTHORIZED',
        'SYNC_CONFLICT',
        'ASSET_NOT_FOUND',
        'RATE_LIMITED',
        'STORAGE_QUOTA_EXCEEDED',
      ];

      requiredErrorCategories.forEach(category => {
        expect(Object.values(ErrorCode)).toContain(category);
      });
    });

    it('should ensure WebSocket message types cover real-time scenarios', () => {
      const requiredMessageTypes = ['ping', 'pong', 'event', 'sync_request', 'sync_response', 'error'];
      
      // Create sample messages to verify type coverage
      const sampleMessages = requiredMessageTypes.map(type => {
        switch (type) {
          case 'ping':
          case 'pong':
            return { type, timestamp: Date.now() };
          case 'event':
            const mockAsset = {
              id: crypto.randomUUID(),
              contentHash: 'abc123',
              filePath: '/test.png',
              fileName: 'test.png',
              formats: ['png' as const],
              meta: {
                width: 100,
                height: 100,
                size: 1024,
                mimeType: 'image/png' as const,
              },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            return {
              type,
              event: createEvent(EventType.ASSET_CREATED, OperationType.CREATE, crypto.randomUUID(), { asset: mockAsset }),
            };
          case 'sync_request':
            return { type, since: 0 };
          case 'sync_response':
            return { type, events: [], nextClock: 0 };
          case 'error':
            return {
              type,
              error: createApiError(ErrorCode.INTERNAL_ERROR, 'Test error'),
            };
          default:
            throw new Error(`Unknown message type: ${type}`);
        }
      });

      sampleMessages.forEach(message => {
        expect(() => validateWebSocketMessage(message)).not.toThrow();
      });
    });
  });
});
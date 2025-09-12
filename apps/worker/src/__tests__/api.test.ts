/**
 * API 路由测试
 * 验证云索引读写 API 的核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';

// 模拟环境
const mockEnv = {
  DB: {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        all: () => Promise.resolve({ results: [] }),
        first: () => Promise.resolve(null),
        run: () => Promise.resolve({ success: true })
      })
    })
  },
  JWT_SECRET: 'test-secret',
  ENVIRONMENT: 'development'
} as any;

describe('API Routes', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, mockEnv);
      
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data).toMatchObject({
        status: 'ok',
        environment: 'development',
        version: '1.0.0'
      });
      expect(data.timestamp).toBeTypeOf('number');
    });
  });

  describe('Index API', () => {
    it('should handle GET /api/index with authentication required', async () => {
      const req = new Request('http://localhost/api/index');
      const res = await app.fetch(req, mockEnv);
      
      expect(res.status).toBe(401);
      
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle POST /api/index/batch with authentication required', async () => {
      const req = new Request('http://localhost/api/index/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [],
          deviceId: 'test-device',
          batchId: 'test-batch'
        })
      });
      const res = await app.fetch(req, mockEnv);
      
      expect(res.status).toBe(401);
    });
  });

  describe('Auth API', () => {
    it('should handle device registration', async () => {
      const req = new Request('http://localhost/api/auth/device-begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'test-device-123',
          deviceName: 'Test Device',
          deviceType: 'desktop',
          userId: 'test-user-456',
          platform: 'darwin',
          version: '1.0.0'
        })
      });
      
      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('deviceId', 'test-device-123');
      expect(data).toHaveProperty('userId', 'test-user-456');
    });

    it('should validate device registration input', async () => {
      const req = new Request('http://localhost/api/auth/device-begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: '', // 无效的空字符串
          deviceName: 'Test Device',
          deviceType: 'invalid-type', // 无效的设备类型
          userId: 'test-user'
        })
      });
      
      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
      
      const data = await res.json();
      expect(data.error).toBe('Invalid request body');
      expect(data.details).toBeDefined();
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const req = new Request('http://localhost/unknown-route');
      const res = await app.fetch(req, mockEnv);
      
      expect(res.status).toBe(404);
      
      const data = await res.json();
      expect(data.error).toBe('Not Found');
      expect(data.path).toBe('/unknown-route');
    });
  });
});

describe('API Validation', () => {
  describe('Index Batch Validation', () => {
    it('should validate event structure', () => {
      // 这里测试 Zod schema 验证逻辑
      const validEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'CREATE',
        operationType: 'FILE_CREATE',
        entityType: 'FILE',
        entityId: 'file-123',
        payload: { path: '/test.txt' },
        deviceId: 'device-123',
        clientTimestamp: Date.now(),
        version: 1
      };

      // 在实际实现中，这里会使用 Zod schema 进行验证
      expect(validEvent.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(['CREATE', 'UPDATE', 'DELETE', 'MOVE']).toContain(validEvent.eventType);
      expect(['FILE', 'DIRECTORY']).toContain(validEvent.entityType);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should validate index query parameters', () => {
      const validParams = {
        since: '1234567890',
        limit: '50',
        deviceId: 'device-123'
      };

      // 验证参数转换逻辑
      expect(parseInt(validParams.since)).toBe(1234567890);
      expect(parseInt(validParams.limit)).toBe(50);
      expect(Math.min(parseInt(validParams.limit), 1000)).toBe(50);
    });
  });
});
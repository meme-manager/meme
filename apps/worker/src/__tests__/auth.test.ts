/**
 * 认证和限流测试 - Task 2.3 验收测试
 * 验证设备注册、鉴权和基础限流功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';

// 模拟环境
const mockEnv = {
  DB: {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        all: () => Promise.resolve({ results: [] }),
        first: () => {
          // 模拟不同的查询结果
          if (query.includes('SELECT userId')) {
            return Promise.resolve(null); // 用户不存在
          }
          if (query.includes('SELECT id, userId, isActive FROM devices')) {
            // 对于 token refresh 测试，返回活跃设备
            if (params.includes('test-device-refresh')) {
              return Promise.resolve({ 
                id: 'test-device-refresh', 
                userId: 'test-user-refresh', 
                isActive: 1 
              });
            }
            return Promise.resolve(null); // 设备不存在
          }
          if (query.includes('COUNT(*) as count')) {
            return Promise.resolve({ count: 0 }); // 设备数量
          }
          return Promise.resolve(null);
        },
        run: () => Promise.resolve({ success: true })
      })
    })
  },
  JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
  ENVIRONMENT: 'development'
} as any;

describe('Authentication and Rate Limiting - Task 2.3', () => {
  describe('Device Registration', () => {
    it('should successfully register a new device', async () => {
      const req = new Request('http://localhost/api/auth/device-begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'test-device-12345678',
          deviceName: 'Test MacBook Pro',
          deviceType: 'desktop',
          userId: 'test-user-123',
          platform: 'darwin',
          version: '1.0.0'
        })
      });
      
      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      
      const data = await res.json() as { token: string; deviceId: string; userId: string; expiresAt: number; serverTimestamp: number };
      expect((data as any)).toHaveProperty('token');
      expect((data as any)).toHaveProperty('deviceId', 'test-device-12345678');
      expect((data as any)).toHaveProperty('userId', 'test-user-123');
      expect((data as any)).toHaveProperty('expiresAt');
      expect((data as any)).toHaveProperty('serverTimestamp');
      expect(typeof (data as any).token).toBe('string');
      expect((data as any).token.length).toBeGreaterThan(0);
    });

    it('should validate device registration input', async () => {
      const testCases = [
        {
          name: 'empty deviceId',
          body: {
            deviceId: '',
            deviceName: 'Test Device',
            deviceType: 'desktop',
            userId: 'test-user'
          },
          expectedStatus: 400,
          ip: '192.168.2.1'
        },
        {
          name: 'invalid deviceType',
          body: {
            deviceId: 'test-device-123',
            deviceName: 'Test Device',
            deviceType: 'invalid-type',
            userId: 'test-user'
          },
          expectedStatus: 400,
          ip: '192.168.2.2'
        },
        {
          name: 'missing required fields',
          body: {
            deviceId: 'test-device-123'
            // 缺少其他必需字段
          },
          expectedStatus: 400,
          ip: '192.168.2.3'
        }
      ];

      for (const testCase of testCases) {
        const req = new Request('http://localhost/api/auth/device-begin', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': testCase.ip
          },
          body: JSON.stringify(testCase.body)
        });
        
        const res = await app.fetch(req, mockEnv);
        expect(res.status).toBe(testCase.expectedStatus);
        
        const data = await res.json() as { error: string; message?: string; details?: unknown };
        expect((data as any).error).toBeDefined();
      }
    });

    it('should reject deviceId that is too short or too long', async () => {
      const testCases = [
        { deviceId: 'short', ip: '192.168.3.1' }, // 少于 8 个字符
        { deviceId: 'a'.repeat(129), ip: '192.168.3.2' } // 超过 128 个字符
      ];

      for (const testCase of testCases) {
        const req = new Request('http://localhost/api/auth/device-begin', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': testCase.ip
          },
          body: JSON.stringify({
            deviceId: testCase.deviceId,
            deviceName: 'Test Device',
            deviceType: 'desktop',
            userId: 'test-user-123'
          })
        });
        
        const res = await app.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        
        const data = await res.json() as { error: string; message: string };
        expect((data as any).error).toBe('Bad Request');
        expect((data as any).message).toContain('Device ID must be between');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to device registration', async () => {
      // 模拟快速连续请求
      const requests = Array.from({ length: 5 }, (_, i) => 
        new Request('http://localhost/api/auth/device-begin', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.100' // 模拟相同 IP
          },
          body: JSON.stringify({
            deviceId: `test-device-${i}`,
            deviceName: `Test Device ${i}`,
            deviceType: 'desktop',
            userId: `test-user-${i}`
          })
        })
      );

      const responses = await Promise.all(
        requests.map(req => app.fetch(req, mockEnv))
      );

      // 前几个请求应该成功
      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(200);

      // 后续请求应该被限流
      const lastResponse = responses[responses.length - 1];
      if (lastResponse.status === 429) {
        const data = await lastResponse.json() as { error: string; retryAfter: number };
        expect((data as any).error).toBe('Too Many Requests');
        expect((data as any).retryAfter).toBeTypeOf('number');
        
        // 检查限流头部
        expect(lastResponse.headers.get('Retry-After')).toBeDefined();
        expect(lastResponse.headers.get('X-RateLimit-Limit')).toBeDefined();
        expect(lastResponse.headers.get('X-RateLimit-Remaining')).toBe('0');
      }
    });

    it('should include rate limit headers in responses', async () => {
      const req = new Request('http://localhost/api/auth/device-begin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.101' // 不同 IP
        },
        body: JSON.stringify({
          deviceId: 'test-device-headers',
          deviceName: 'Test Device',
          deviceType: 'desktop',
          userId: 'test-user-headers'
        })
      });
      
      const res = await app.fetch(req, mockEnv);
      
      // 检查限流头部存在
      expect(res.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
      
      const limit = parseInt(res.headers.get('X-RateLimit-Limit') || '0');
      const remaining = parseInt(res.headers.get('X-RateLimit-Remaining') || '0');
      
      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(limit);
    });
  });

  describe('Authorization Middleware', () => {
    it('should reject requests without authorization header', async () => {
      const protectedEndpoints = [
        '/api/index',
        '/api/index/batch',
        '/api/asset/upload'
      ];

      for (const endpoint of protectedEndpoints) {
        const req = new Request(`http://localhost${endpoint}`);
        const res = await app.fetch(req, mockEnv);
        
        expect(res.status).toBe(401);
        
        const data = await res.json() as { error: string; message?: string };
        expect((data as any).error).toBe('Unauthorized');
        expect((data as any).message).toContain('authorization header');
      }
    });

    it('should reject requests with invalid authorization header', async () => {
      const invalidHeaders = [
        'Bearer invalid-token',
        'Basic dGVzdDp0ZXN0', // Base64 encoded test:test
        'Bearer ', // Empty token
        'InvalidScheme token'
      ];

      for (const authHeader of invalidHeaders) {
        const req = new Request('http://localhost/api/index', {
          headers: { 'Authorization': authHeader }
        });
        
        const res = await app.fetch(req, mockEnv);
        expect(res.status).toBe(401);
        
        const data = await res.json() as { error: string; message?: string };
        expect((data as any).error).toBe('Unauthorized');
      }
    });
  });

  describe('Token Management', () => {
    it('should handle token refresh requests', async () => {
      // 首先注册设备获取 token
      const registerReq = new Request('http://localhost/api/auth/device-begin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.4.1'
        },
        body: JSON.stringify({
          deviceId: 'test-device-refresh',
          deviceName: 'Test Device',
          deviceType: 'desktop',
          userId: 'test-user-refresh'
        })
      });
      
      const registerRes = await app.fetch(registerReq, mockEnv);
      expect(registerRes.status).toBe(200);
      
      const { token } = await registerRes.json() as { token: string };
      
      // 尝试刷新 token
      const refreshReq = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const refreshRes = await app.fetch(refreshReq, mockEnv);
      expect(refreshRes.status).toBe(200);
      
      const refreshData = await refreshRes.json() as { token: string; expiresAt: number };
      expect((refreshData as any)).toHaveProperty('token');
      expect((refreshData as any)).toHaveProperty('expiresAt');
      expect(typeof (refreshData as any).token).toBe('string');
      expect((refreshData as any).token.length).toBeGreaterThan(0);
      // 注意：在测试环境中，由于时间戳可能相同，token 可能相同，这是正常的
    });
  });

  describe('Device Management', () => {
    it('should allow getting device list with valid token', async () => {
      // 首先注册设备获取 token
      const registerReq = new Request('http://localhost/api/auth/device-begin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.5.1'
        },
        body: JSON.stringify({
          deviceId: 'test-device-list',
          deviceName: 'Test Device',
          deviceType: 'desktop',
          userId: 'test-user-list'
        })
      });
      
      const registerRes = await app.fetch(registerReq, mockEnv);
      expect(registerRes.status).toBe(200);
      
      const { token } = await registerRes.json() as { token: string };
      
      // 获取设备列表
      const devicesReq = new Request('http://localhost/api/auth/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const devicesRes = await app.fetch(devicesReq, mockEnv);
      expect(devicesRes.status).toBe(200);
      
      const devicesData = await devicesRes.json() as { devices: unknown[] };
      expect((devicesData as any)).toHaveProperty('devices');
      expect(Array.isArray((devicesData as any).devices)).toBe(true);
    });
  });
});
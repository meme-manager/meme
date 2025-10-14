/**
 * 认证路由 - 设备注册与鉴权
 * POST /auth/device-begin - 发放设备 token
 */

import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { z } from 'zod';
import { sign, verify } from 'hono/jwt';
import type { AppEnv } from '../index';

const authRouter = new Hono<{ Bindings: AppEnv }>();

const DeviceRegistrationSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  deviceType: z.enum(['desktop', 'mobile', 'web']),
  userId: z.string().min(1),
  platform: z.string().optional(),
  version: z.string().optional()
});

// POST /auth/device-begin - 设备注册和获取 token
authRouter.post('/device-begin',
  validator('json', (value, c) => {
    const result = DeviceRegistrationSchema.safeParse(value);
    if (!result.success) {
      return c.json({ 
        error: 'Invalid request body', 
        details: result.error.issues 
      }, 400);
    }
    return result.data;
  }),
  async (c) => {
    const { deviceId, deviceName, deviceType, userId, platform, version } = c.req.valid('json');

    try {
      // 验证设备 ID 格式（应该是唯一标识符）
      if (deviceId.length < 8 || deviceId.length > 128) {
        return c.json({
          error: 'Bad Request',
          message: 'Device ID must be between 8 and 128 characters'
        }, 400);
      }

      // 验证用户 ID 格式
      if (userId.length < 3 || userId.length > 64) {
        return c.json({
          error: 'Bad Request',
          message: 'User ID must be between 3 and 64 characters'
        }, 400);
      }

      // 检查用户是否存在，不存在则创建
      let user = await c.env.Bindings.DB.prepare(
        'SELECT userId, isActive FROM users WHERE userId = ?'
      ).bind(userId).first();

      if (!user) {
        // 创建新用户
        await c.env.Bindings.DB.prepare(`
          INSERT INTO users (userId, plan, createdAt, updatedAt, isActive)
          VALUES (?, 'free', ?, ?, 1)
        `).bind(userId, Date.now(), Date.now()).run();
        
        console.log(`New user created: ${userId}`);
      } else if (!user.isActive) {
        return c.json({
          error: 'Forbidden',
          message: 'User account is inactive'
        }, 403);
      }

      // 检查设备是否已注册
      let device = await c.env.Bindings.DB.prepare(
        'SELECT id, userId, isActive, registeredAt FROM devices WHERE id = ?'
      ).bind(deviceId).first();

      const now = Date.now();

      if (device) {
        // 设备已存在，验证所有权
        if (device.userId !== userId) {
          console.warn(`Device ownership conflict: ${deviceId} belongs to ${device.userId}, requested by ${userId}`);
          return c.json({
            error: 'Forbidden',
            message: 'Device belongs to another user'
          }, 403);
        }

        // 更新设备信息
        await c.env.Bindings.DB.prepare(`
          UPDATE devices SET 
            name = ?, type = ?, platform = ?, version = ?,
            lastSeenAt = ?, isActive = 1
          WHERE id = ?
        `).bind(deviceName, deviceType, platform || null, version || null, now, deviceId).run();
        
        console.log(`Device updated: ${deviceId} for user ${userId}`);
      } else {
        // 检查用户设备数量限制（免费用户最多 3 台设备）
        const deviceCount = await c.env.Bindings.DB.prepare(
          'SELECT COUNT(*) as count FROM devices WHERE userId = ? AND isActive = 1'
        ).bind(userId).first<{ count: number }>();

        const count = Number(deviceCount?.count ?? 0);
        if (count >= 3) {
          return c.json({
            error: 'Forbidden',
            message: 'Maximum number of devices reached (3 devices per user)'
          }, 403);
        }

        // 创建新设备记录
        await c.env.Bindings.DB.prepare(`
          INSERT INTO devices (
            id, userId, name, type, platform, version,
            registeredAt, lastSeenAt, isActive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(deviceId, userId, deviceName, deviceType, platform || null, version || null, now, now).run();
        
        console.log(`New device registered: ${deviceId} for user ${userId}`);
      }

      // 生成 JWT token
      const tokenExpiry = 30 * 24 * 60 * 60 * 1000; // 30天
      const payload = {
        userId,
        deviceId,
        deviceType,
        iat: Math.floor(now / 1000),
        exp: Math.floor((now + tokenExpiry) / 1000)
      };

      if (!c.env.Bindings.JWT_SECRET) {
        return c.json({
          error: 'Internal Server Error',
          message: 'Server JWT secret is not configured'
        }, 500);
      }
      const token = await sign(payload, c.env.Bindings.JWT_SECRET);

      // 记录认证日志
      console.log(`Token issued for device ${deviceId}, user ${userId}, expires at ${new Date(payload.exp * 1000).toISOString()}`);

      return c.json({
        token,
        deviceId,
        userId,
        deviceType,
        expiresAt: payload.exp * 1000,
        serverTimestamp: now,
        message: device ? 'Device updated successfully' : 'Device registered successfully'
      });

    } catch (error) {
      console.error('Device registration failed:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to register device'
      }, 500);
    }
  }
);

// POST /auth/refresh - 刷新 token
authRouter.post('/refresh', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header' 
    }, 401);
  }

  try {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (!token || !c.env.Bindings.JWT_SECRET) {
      return c.json({ 
        error: 'Unauthorized',
        message: 'Missing token or server secret' 
      }, 401);
    }
    const payload = await verify(token, c.env.Bindings.JWT_SECRET);
    
    // 验证设备是否仍然活跃
    const device = await c.env.Bindings.DB.prepare(
      'SELECT id, userId, isActive FROM devices WHERE id = ? AND userId = ?'
    ).bind(payload.deviceId, payload.userId).first();

    if (!device || !device.isActive) {
      return c.json({
        error: 'Unauthorized',
        message: 'Device not found or inactive'
      }, 401);
    }

    // 生成新的 token
    const now = Date.now();
    const tokenExpiry = 30 * 24 * 60 * 60 * 1000; // 30天
    const newPayload = {
      userId: payload.userId,
      deviceId: payload.deviceId,
      deviceType: payload.deviceType,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + tokenExpiry) / 1000)
    };

    const newToken = await sign(newPayload, c.env.Bindings.JWT_SECRET);

    // 更新设备最后活跃时间
    await c.env.Bindings.DB.prepare(
      'UPDATE devices SET lastSeenAt = ? WHERE id = ?'
    ).bind(now, payload.deviceId).run();

    return c.json({
      token: newToken,
      deviceId: payload.deviceId,
      userId: payload.userId,
      expiresAt: newPayload.exp * 1000,
      serverTimestamp: now
    });

  } catch (error) {
    console.error('Token refresh failed:', error);
    return c.json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired token' 
    }, 401);
  }
});

// GET /auth/devices - 获取用户设备列表（需要认证）
authRouter.get('/devices', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header' 
    }, 401);
  }

  try {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (!token || !c.env.Bindings.JWT_SECRET) {
      return c.json({ 
        error: 'Unauthorized',
        message: 'Missing token or server secret' 
      }, 401);
    }
    const payload = await verify(token, c.env.Bindings.JWT_SECRET);

    // 获取用户的所有设备
    const devices = await c.env.Bindings.DB.prepare(`
      SELECT 
        id, name, type, platform, version,
        registeredAt, lastSeenAt, isActive
      FROM devices 
      WHERE userId = ?
      ORDER BY lastSeenAt DESC
    `).bind(payload.userId).all();

    return c.json({
      devices: devices.results.map((device: any) => ({
        ...device,
        isCurrent: device.id === payload.deviceId
      })),
      serverTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Failed to get devices:', error);
    return c.json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired token' 
    }, 401);
  }
});

// DELETE /auth/device/{deviceId} - 注销设备（需要认证）
authRouter.delete('/device/:deviceId', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header' 
    }, 401);
  }

  try {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (!token || !c.env.Bindings.JWT_SECRET) {
      return c.json({ 
        error: 'Unauthorized',
        message: 'Missing token or server secret' 
      }, 401);
    }
    const payload = await verify(token, c.env.Bindings.JWT_SECRET);
    const targetDeviceId = c.req.param('deviceId');
    if (!targetDeviceId) {
      return c.json({
        error: 'Bad Request',
        message: 'Missing required path parameter: deviceId'
      }, 400);
    }

    // 验证设备所有权
    const device = await c.env.Bindings.DB.prepare(
      'SELECT id, userId FROM devices WHERE id = ? AND userId = ?'
    ).bind(targetDeviceId, payload.userId).first();

    if (!device) {
      return c.json({
        error: 'Not Found',
        message: 'Device not found or access denied'
      }, 404);
    }

    // 不能注销当前设备
    if (targetDeviceId === payload.deviceId) {
      return c.json({
        error: 'Bad Request',
        message: 'Cannot deactivate current device'
      }, 400);
    }

    // 注销设备
    await c.env.Bindings.DB.prepare(
      'UPDATE devices SET isActive = 0 WHERE id = ?'
    ).bind(targetDeviceId).run();

    console.log(`Device deactivated: ${targetDeviceId} by user ${payload.userId}`);

    return c.json({
      message: 'Device deactivated successfully',
      deviceId: targetDeviceId,
      serverTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Failed to deactivate device:', error);
    return c.json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired token' 
    }, 401);
  }
});

export { authRouter };
/**
 * 认证中间件 - JWT token 验证
 */

import { verify } from 'hono/jwt';
import type { Context, Next } from 'hono';
import type { Bindings } from '../index';

type Vars = { userId: string; deviceId: string; deviceType: string };

export async function authMiddleware(c: Context<{ Bindings: Bindings; Variables: Vars }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    }, 401);
  }

  try {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (!token || !c.env.JWT_SECRET) {
      return c.json({
        error: 'Unauthorized',
        message: 'Missing token or server secret'
      }, 401);
    }
    const payload = await verify(token, c.env.JWT_SECRET);
    
    // 验证设备是否仍然活跃
    const device = await c.env.DB.prepare(
      'SELECT id, userId, isActive FROM devices WHERE id = ? AND userId = ?'
    ).bind(payload.deviceId, payload.userId).first();

    if (!device || !device.isActive) {
      return c.json({
        error: 'Unauthorized',
        message: 'Device not found or inactive'
      }, 401);
    }

    // 更新设备最后活跃时间
    await c.env.DB.prepare(
      'UPDATE devices SET lastSeenAt = ? WHERE id = ?'
    ).bind(Date.now(), payload.deviceId).run();

    // 将用户信息添加到上下文
    c.set('userId', payload.userId);
    c.set('deviceId', payload.deviceId);
    c.set('deviceType', payload.deviceType);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    }, 401);
  }
}
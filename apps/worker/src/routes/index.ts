/**
 * 索引路由 - 实现云端索引读写 API
 * GET /index?since&limit - 按 serverClock 有序分页
 * POST /index/batch - 批量提交事件，去重与映射
 */

import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { z } from 'zod';
import type { Env } from '../index';

const indexRouter = new Hono<{ Bindings: Env }>();

// 事件类型定义
const EventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'MOVE']),
  operationType: z.enum(['FILE_CREATE', 'FILE_UPDATE', 'FILE_DELETE', 'FILE_MOVE', 'DIR_CREATE', 'DIR_DELETE']),
  entityType: z.enum(['FILE', 'DIRECTORY']),
  entityId: z.string(),
  payload: z.record(z.any()),
  deviceId: z.string(),
  clientTimestamp: z.number().int().positive(),
  batchId: z.string().optional(),
  causedBy: z.string().optional(),
  version: z.number().int().positive().default(1)
});

const BatchRequestSchema = z.object({
  events: z.array(EventSchema).min(1).max(100), // 限制批量大小
  deviceId: z.string(),
  batchId: z.string().uuid()
});

// GET /index - 获取索引事件（按 serverClock 有序分页）
indexRouter.get('/', 
  validator('query', (value, c) => {
    const schema = z.object({
      since: z.string().optional().transform(val => val ? parseInt(val) : 0),
      limit: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 50, 1000) : 50),
      deviceId: z.string().optional()
    });
    
    const result = schema.safeParse(value);
    if (!result.success) {
      return c.json({ error: 'Invalid query parameters', details: result.error.issues }, 400);
    }
    return result.data;
  }),
  async (c) => {
    const { since, limit, deviceId } = c.req.valid('query');
    const userId = c.get('userId'); // 从认证中间件获取

    try {
      // 构建查询条件
      let query = `
        SELECT 
          id, eventType, operationType, entityType, entityId, 
          payload, deviceId, clientTimestamp, serverTimestamp, 
          batchId, causedBy, version
        FROM events 
        WHERE serverTimestamp > ? 
      `;
      const params: any[] = [since];

      // 可选的设备过滤
      if (deviceId) {
        query += ` AND deviceId = ?`;
        params.push(deviceId);
      }

      // 按 serverTimestamp 排序并限制结果数量
      query += ` ORDER BY serverTimestamp ASC LIMIT ?`;
      params.push(limit);

      const { results } = await c.env.DB.prepare(query).bind(...params).all();

      // 获取下一个时间戳用于分页
      const nextSince = results.length > 0 
        ? Math.max(...results.map((r: any) => r.serverTimestamp))
        : since;

      return c.json({
        events: results.map((event: any) => ({
          ...event,
          payload: JSON.parse(event.payload)
        })),
        pagination: {
          since,
          limit,
          nextSince,
          hasMore: results.length === limit
        },
        serverTimestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to fetch index events:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to fetch events'
      }, 500);
    }
  }
);

// POST /index/batch - 批量提交事件
indexRouter.post('/batch',
  validator('json', (value, c) => {
    const result = BatchRequestSchema.safeParse(value);
    if (!result.success) {
      return c.json({ 
        error: 'Invalid request body', 
        details: result.error.issues 
      }, 400);
    }
    return result.data;
  }),
  async (c) => {
    const { events, deviceId, batchId } = c.req.valid('json');
    const userId = c.get('userId');

    try {
      // 验证设备权限
      const device = await c.env.DB.prepare(
        'SELECT id, userId FROM devices WHERE id = ? AND userId = ?'
      ).bind(deviceId, userId).first();

      if (!device) {
        return c.json({
          error: 'Unauthorized',
          message: 'Device not found or access denied'
        }, 403);
      }

      // 开始事务处理
      const serverTimestamp = Date.now();
      const results: any[] = [];
      const duplicates: string[] = [];

      // 检查重复事件（基于 id 和 batchId）
      const existingEvents = await c.env.DB.prepare(`
        SELECT id FROM events 
        WHERE id IN (${events.map(() => '?').join(',')}) 
        OR batchId = ?
      `).bind(...events.map(e => e.id), batchId).all();

      const existingIds = new Set(existingEvents.results.map((r: any) => r.id));

      // 生成单调递增的 serverTimestamp
      let currentServerTime = serverTimestamp;

      for (const event of events) {
        // 跳过重复事件
        if (existingIds.has(event.id)) {
          duplicates.push(event.id);
          continue;
        }

        // 确保 serverTimestamp 单调递增
        currentServerTime = Math.max(currentServerTime + 1, Date.now());

        // 插入事件
        await c.env.DB.prepare(`
          INSERT INTO events (
            id, eventType, operationType, entityType, entityId,
            payload, deviceId, clientTimestamp, serverTimestamp,
            batchId, causedBy, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          event.id,
          event.eventType,
          event.operationType,
          event.entityType,
          event.entityId,
          JSON.stringify(event.payload),
          deviceId,
          event.clientTimestamp,
          currentServerTime,
          batchId,
          event.causedBy || null,
          event.version
        ).run();

        results.push({
          id: event.id,
          serverTimestamp: currentServerTime,
          status: 'inserted'
        });
      }

      // 更新设备最后同步时间
      await c.env.DB.prepare(
        'UPDATE devices SET lastSyncAt = ? WHERE id = ?'
      ).bind(serverTimestamp, deviceId).run();

      return c.json({
        batchId,
        processed: results.length,
        duplicates: duplicates.length,
        results,
        duplicateIds: duplicates,
        serverTimestamp
      });

    } catch (error) {
      console.error('Failed to process batch events:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to process events'
      }, 500);
    }
  }
);

// GET /index/status - 获取索引状态
indexRouter.get('/status', async (c) => {
  const userId = c.get('userId');

  try {
    // 获取用户的事件统计
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as totalEvents,
        MAX(serverTimestamp) as lastEventTime,
        COUNT(DISTINCT deviceId) as deviceCount
      FROM events e
      JOIN devices d ON e.deviceId = d.id
      WHERE d.userId = ?
    `).bind(userId).first();

    // 获取最近的事件
    const recentEvents = await c.env.DB.prepare(`
      SELECT eventType, operationType, serverTimestamp, deviceId
      FROM events e
      JOIN devices d ON e.deviceId = d.id
      WHERE d.userId = ?
      ORDER BY serverTimestamp DESC
      LIMIT 10
    `).bind(userId).all();

    return c.json({
      stats,
      recentEvents: recentEvents.results,
      serverTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Failed to get index status:', error);
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to get status'
    }, 500);
  }
});

export { indexRouter };
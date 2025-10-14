/**
 * Cloudflare Workers 主入口
 * 简化版同步API - 基于时间戳的简单同步
 * 参考: ARCHITECTURE_sync_and_api.md
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { apiRateLimit, deviceRegistrationRateLimit } from './middleware/rateLimit';

// 环境变量类型定义
export interface Bindings {
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  CACHE?: KVNamespace;
  JWT_SECRET?: string;
  MAX_FILE_SIZE?: string;
  ALLOWED_MIME_TYPES?: string;
  ENVIRONMENT?: 'development' | 'staging' | 'production';
  [key: string]: unknown;  // 添加字符串索引签名
}

// 自定义环境类型
export type AppEnv = {
  Bindings: Bindings;
}

// 创建 Hono 应用
const app = new Hono<AppEnv>();

// 全局中间件
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://meme-manager.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Device-ID'],
  credentials: true,
}));

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT || 'development',
    version: '1.0.0-simplified'
  });
});

// 公开路由（不需要认证，但有限流）
app.use('/api/auth/device-begin', deviceRegistrationRateLimit);
app.route('/api/auth', authRouter);

// TODO: 实现简化版同步路由
// app.use('/api/sync/*', apiRateLimit);
// app.use('/api/sync/*', authMiddleware);
// app.route('/api/sync', syncRouter);  // 待实现

// 错误处理
app.onError(errorHandler);

// 404 处理
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: c.req.path,
    timestamp: Date.now()
  }, 404);
});

export default app;